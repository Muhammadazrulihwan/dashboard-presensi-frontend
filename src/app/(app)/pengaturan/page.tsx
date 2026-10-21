"use client";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import {
  addHoliday, dateLabel, getHolidays, getPayrollSettings, getShifts, nf, recalculate, removeHoliday, removeShift,
  savePayrollSettings, saveShift, type Holiday, type Shift, type ShiftInput,
} from "@/lib/api";

const field = "h-10 rounded-xl border border-line bg-white px-3 text-sm text-ink placeholder:text-faint transition-colors hover:border-line-strong focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent/30";
const PRIMARY =
  "inline-flex h-10 items-center rounded-xl bg-accent px-5 text-sm font-medium text-white shadow-glow transition-colors hover:bg-accent-dark disabled:opacity-40 disabled:shadow-none";
const SECONDARY =
  "inline-flex h-10 items-center rounded-xl border border-line bg-white px-4 text-sm font-semibold transition-colors hover:border-line-strong hover:bg-paper disabled:opacity-40";
const TH = "px-6 py-3 font-medium";

type Notice = { ok: boolean; text: string } | null;
const toDraft = (s: Shift): ShiftInput => ({ jam_masuk: s.jam_masuk, jam_pulang: s.jam_pulang, toleransi_menit: s.toleransi_menit });

export default function PengaturanPage() {
  const [shifts, setShifts] = useState<Shift[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ShiftInput>>({});
  const [newShift, setNewShift] = useState({ kode: "", jam_masuk: "08:00", jam_pulang: "17:00", toleransi_menit: 0 });
  const [year, setYear] = useState(new Date().getFullYear());
  const [holidays, setHolidays] = useState<Holiday[] | null>(null);
  const [newHoliday, setNewHoliday] = useState({ tanggal: "", nama: "" });
  const [range, setRange] = useState({ from: "", to: "" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  // Pembagi hari kerja Rekap Payroll (PRD F29). Disimpan terpisah agar input tidak hilang saat gagal simpan.
  const [payrollDays, setPayrollDays] = useState<number | null>(null);
  const [payrollInput, setPayrollInput] = useState("25");
  const [savingPayroll, setSavingPayroll] = useState(false);

  const ok = (text: string) => setNotice({ ok: true, text });
  const fail = (e: Error) => setNotice({ ok: false, text: e.message });

  const loadShifts = useCallback(() => {
    getShifts()
      .then((list) => {
        setShifts(list);
        setDrafts(Object.fromEntries(list.map((s) => [s.kode, toDraft(s)])));
      })
      .catch(fail);
  }, []);
  const loadHolidays = useCallback(() => {
    getHolidays(year).then(setHolidays).catch(fail);
  }, [year]);
  const loadPayroll = useCallback(() => {
    getPayrollSettings()
      .then((s) => {
        setPayrollDays(s.payroll_workdays);
        setPayrollInput(String(s.payroll_workdays));
      })
      .catch(fail);
  }, []);

  useEffect(loadShifts, [loadShifts]);
  useEffect(loadHolidays, [loadHolidays]);
  useEffect(loadPayroll, [loadPayroll]);

  const setDraft = (kode: string, patch: Partial<ShiftInput>) => setDrafts((d) => ({ ...d, [kode]: { ...d[kode], ...patch } }));

  function save(kode: string, input: ShiftInput, created = false) {
    saveShift(kode, input)
      .then((s) => {
        ok(`Shift ${s.kode} disimpan. Hitung ulang periode di bawah agar data lama mengikuti aturan baru.`);
        if (created) setNewShift({ kode: "", jam_masuk: "08:00", jam_pulang: "17:00", toleransi_menit: 0 });
        loadShifts();
      })
      .catch(fail);
  }

  function dropShift(kode: string) {
    if (!window.confirm(`Hapus shift ${kode}?`)) return;
    removeShift(kode).then(() => { ok(`Shift ${kode} dihapus.`); loadShifts(); }).catch(fail);
  }

  function addHol() {
    if (!newHoliday.tanggal || !newHoliday.nama.trim()) return setNotice({ ok: false, text: "Isi tanggal dan nama hari libur." });
    addHoliday({ tanggal: newHoliday.tanggal, nama: newHoliday.nama.trim() })
      .then(() => {
        ok("Hari libur ditambahkan. Hitung ulang periode terkait agar data lama ikut berubah.");
        setNewHoliday({ tanggal: "", nama: "" });
        loadHolidays();
      })
      .catch(fail);
  }

  function runRecalc() {
    if (!range.from || !range.to) return setNotice({ ok: false, text: "Isi tanggal awal dan tanggal akhir periode." });
    setBusy(true);
    recalculate(range.from, range.to)
      .then((r) => ok(`${nf.format(r.updated)} baris dihitung ulang.`))
      .catch(fail)
      .finally(() => setBusy(false));
  }

  function savePayroll() {
    const n = Number(payrollInput);
    if (!Number.isInteger(n) || n < 1 || n > 31) {
      return setNotice({ ok: false, text: "Pembagi hari kerja harus bilangan bulat 1 sampai 31." });
    }
    setSavingPayroll(true);
    savePayrollSettings(n)
      .then((s) => {
        setPayrollDays(s.payroll_workdays);
        setPayrollInput(String(s.payroll_workdays));
        ok("Pembagi hari kerja disimpan. Rekap Payroll berikutnya memakai angka ini.");
      })
      .catch(fail)
      .finally(() => setSavingPayroll(false));
  }

  return (
    <div>
      <PageHeader title="Pengaturan Shift & Libur" description="Jam kerja per shift, hari libur, dan hitung ulang data presensi" />
      <div className="space-y-5">
        {notice && (
          <p className={`rounded-xl border px-4 py-3 text-sm ${notice.ok ? "border-accent-ring bg-accent-soft text-accent" : "border-status-alpa-border bg-status-alpa-bg text-status-alpa-text"}`} role="status">
            {notice.text}
          </p>
        )}

        <Panel title="Jam kerja per shift" subtitle="Shift yang jam pulangnya lebih awal dari jam masuk dianggap lintas hari (shift malam)">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  {["Kode", "Jam masuk", "Jam pulang", "Toleransi (menit)", ""].map((h) => <th key={h} className={TH}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {shifts?.map((s) => {
                  const d = drafts[s.kode] ?? toDraft(s);
                  const dirty = JSON.stringify(d) !== JSON.stringify(toDraft(s));
                  return (
                    <tr key={s.kode} className="border-t border-line/70">
                      <td className="px-6 py-3 font-medium">
                        {s.kode}
                        {s.lintas_hari && <span className="ml-2 rounded-full bg-paper px-2 py-0.5 text-xs font-normal text-muted">lintas hari</span>}
                      </td>
                      <td className="px-6 py-3"><input type="time" className={field} value={d.jam_masuk} onChange={(e) => setDraft(s.kode, { jam_masuk: e.target.value })} aria-label={`Jam masuk ${s.kode}`} /></td>
                      <td className="px-6 py-3"><input type="time" className={field} value={d.jam_pulang} onChange={(e) => setDraft(s.kode, { jam_pulang: e.target.value })} aria-label={`Jam pulang ${s.kode}`} /></td>
                      <td className="px-6 py-3">
                        <input type="number" min={0} max={240} className={`${field} w-24`} value={d.toleransi_menit} onChange={(e) => setDraft(s.kode, { toleransi_menit: Number(e.target.value) })} aria-label={`Toleransi ${s.kode}`} />
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex justify-end gap-2">
                          <button disabled={!dirty} onClick={() => save(s.kode, d)} className={PRIMARY}>Simpan</button>
                          {s.kode !== "REGULER" && <button onClick={() => dropShift(s.kode)} className="rounded-xl px-3 text-sm font-semibold text-status-alpa-text transition-colors hover:bg-status-alpa-bg">Hapus</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!shifts && <tr><td colSpan={5} className="px-6 py-10 text-center text-muted">Memuat data...</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-end gap-4 border-t border-line/70 px-6 py-4">
            <label className="flex flex-col gap-1.5 text-xs text-muted">Shift baru<input className={`${field} w-32 uppercase`} placeholder="Kode" value={newShift.kode} onChange={(e) => setNewShift({ ...newShift, kode: e.target.value })} /></label>
            <label className="flex flex-col gap-1.5 text-xs text-muted">Jam masuk<input type="time" className={field} value={newShift.jam_masuk} onChange={(e) => setNewShift({ ...newShift, jam_masuk: e.target.value })} /></label>
            <label className="flex flex-col gap-1.5 text-xs text-muted">Jam pulang<input type="time" className={field} value={newShift.jam_pulang} onChange={(e) => setNewShift({ ...newShift, jam_pulang: e.target.value })} /></label>
            <label className="flex flex-col gap-1.5 text-xs text-muted">Toleransi (menit)<input type="number" min={0} max={240} className={`${field} w-28`} value={newShift.toleransi_menit} onChange={(e) => setNewShift({ ...newShift, toleransi_menit: Number(e.target.value) })} /></label>
            <button
              disabled={!newShift.kode.trim()}
              onClick={() => save(newShift.kode.trim(), { jam_masuk: newShift.jam_masuk, jam_pulang: newShift.jam_pulang, toleransi_menit: newShift.toleransi_menit }, true)}
              className={SECONDARY}
            >
              Tambah shift
            </button>
          </div>
        </Panel>

        <Panel
          title="Hari libur dan cuti bersama"
          subtitle="Akhir pekan otomatis bukan hari kerja. Daftar ini untuk libur nasional dan cuti bersama"
          action={
            <select className={`${field} h-9`} value={year} onChange={(e) => { setHolidays(null); setYear(Number(e.target.value)); }} aria-label="Tahun">
              {[year - 1, year, year + 1].filter((v, i, a) => a.indexOf(v) === i).map((y) => <option key={y}>{y}</option>)}
            </select>
          }
        >
          <ul>
            {holidays?.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-4 border-t border-line/70 px-6 py-3 text-sm first:border-t-0">
                <span><span className="font-medium">{dateLabel(h.tanggal)}</span><span className="ml-3 text-muted">{h.nama}</span></span>
                <button onClick={() => removeHoliday(h.id).then(loadHolidays).catch(fail)} className="rounded-xl px-3 py-1 font-semibold text-status-alpa-text transition-colors hover:bg-status-alpa-bg">Hapus</button>
              </li>
            ))}
            {holidays && holidays.length === 0 && <li className="px-6 py-8 text-center text-sm text-muted">Belum ada hari libur untuk tahun {year}.</li>}
            {!holidays && <li className="px-6 py-8 text-center text-sm text-muted">Memuat data...</li>}
          </ul>
          <div className="flex flex-wrap items-end gap-4 border-t border-line/70 px-6 py-4">
            <label className="flex flex-col gap-1.5 text-xs text-muted">Tanggal<input type="date" className={field} value={newHoliday.tanggal} onChange={(e) => setNewHoliday({ ...newHoliday, tanggal: e.target.value })} /></label>
            <label className="flex flex-col gap-1.5 text-xs text-muted">Nama<input className={`${field} w-64`} placeholder="Contoh: Hari Kemerdekaan" value={newHoliday.nama} onChange={(e) => setNewHoliday({ ...newHoliday, nama: e.target.value })} /></label>
            <button onClick={addHol} className={SECONDARY}>Tambah hari libur</button>
          </div>
        </Panel>

        <Panel
          title="Pembagi hari kerja Rekap Payroll"
          subtitle="Dipakai menghitung gaji prorata: hari dibayar dibagi pembagi ini, dikali 100. Sistem tidak menghitung nominal gaji"
        >
          <div className="flex flex-wrap items-end gap-4 px-6 pb-6 pt-3">
            <label className="flex flex-col gap-1.5 text-xs text-muted">
              Pembagi hari kerja
              <input
                type="number"
                min={1}
                max={31}
                className={`${field} w-28`}
                value={payrollInput}
                onChange={(e) => setPayrollInput(e.target.value)}
                aria-label="Pembagi hari kerja payroll"
              />
            </label>
            <button
              disabled={savingPayroll || payrollDays === null || Number(payrollInput) === payrollDays}
              onClick={savePayroll}
              className={PRIMARY}
            >
              {savingPayroll ? "Menyimpan..." : "Simpan"}
            </button>
            <p className="basis-full text-xs leading-5 text-muted sm:basis-auto">
              Nilai awal 25 sesuai rekap gaji perusahaan. Mengubahnya memengaruhi kolom <span className="font-semibold text-ink">gaji_prorata_persen</span> pada Rekap Payroll.
            </p>
          </div>
        </Panel>

        <Panel title="Hitung ulang periode" subtitle="Terapkan jam kerja dan hari libur terbaru pada data presensi yang sudah tersimpan">
          <div className="flex flex-wrap items-end gap-4 px-6 pb-6 pt-3">
            <label className="flex flex-col gap-1.5 text-xs text-muted">Dari tanggal<input type="date" className={field} value={range.from} max={range.to || undefined} onChange={(e) => setRange({ ...range, from: e.target.value })} /></label>
            <label className="flex flex-col gap-1.5 text-xs text-muted">Sampai tanggal<input type="date" className={field} value={range.to} min={range.from || undefined} onChange={(e) => setRange({ ...range, to: e.target.value })} /></label>
            <button disabled={busy} onClick={runRecalc} className={PRIMARY}>{busy ? "Menghitung..." : "Hitung ulang"}</button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
