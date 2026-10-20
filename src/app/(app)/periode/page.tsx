"use client";
import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import Overlay from "@/components/ui/Overlay";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import { btnPrimary, btnSecondary, fieldClass } from "@/components/ui/Button";
import { closePeriod, getPeriods, monthLabel, nf, reopenPeriod, type Period } from "@/lib/api";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

type Dialog =
  | { kind: "close"; tahun: number; bulan: number }
  | { kind: "reopen"; row: Period }
  | null;

export default function PeriodePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [rows, setRows] = useState<Period[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [alasan, setAlasan] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getPeriods(year)
      .then((r) => { setRows(r); setError(""); })
      .catch((e: Error) => setError(e.message));
  }, [year]);

  useEffect(load, [load]);

  const closedSet = new Set((rows ?? []).filter((r) => r.ditutup).map((r) => r.periode));
  const infoOf = (periode: string) => rows?.find((r) => r.periode === periode);

  function openClose(bulan: number) {
    setAlasan("");
    setDialog({ kind: "close", tahun: year, bulan });
  }
  function openReopen(row: Period) {
    setAlasan("");
    setDialog({ kind: "reopen", row });
  }

  function submit() {
    if (!dialog) return;
    if (dialog.kind === "reopen" && !alasan.trim()) return;
    setBusy(true);
    const p = dialog.kind === "close"
      ? closePeriod(dialog.tahun, dialog.bulan, alasan.trim())
      : reopenPeriod(dialog.row.tahun, dialog.row.bulan, alasan.trim());
    p.then((r) => {
      setNotice(dialog.kind === "close" ? `Periode ${r.periode} ditutup.` : `Periode ${r.periode} dibuka kembali.`);
      setDialog(null);
      setAlasan("");
      load();
    })
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
  }

  return (
    <div>
      <PageHeader
        title="Tutup Periode"
        description="Kunci data presensi bulan yang sudah lengkap agar tidak berubah. Upload dan hitung ulang pada periode tertutup akan ditolak sampai dibuka kembali dengan alasan."
        actions={
          <select className={fieldClass} value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Tahun">
            {[year - 1, year, year + 1].filter((v, i, a) => a.indexOf(v) === i).map((y) => <option key={y}>{y}</option>)}
          </select>
        }
      />

      <div className="space-y-5">
        {notice && <p className="rounded-xl border border-accent-ring bg-accent-soft px-4 py-3 text-sm text-accent" role="status">{notice}</p>}
        {error && <p className="rounded-xl border border-status-alpa-border bg-status-alpa-bg px-4 py-3 text-sm text-status-alpa-text" role="alert">{error}</p>}

        <Panel title={`Periode ${year}`} subtitle="Satu baris per bulan. Tutup setelah data lengkap dan diverifikasi.">
          <ul className="divide-y divide-line">
            {MONTHS.map((label, i) => {
              const bulan = i + 1;
              const periode = `${year}-${String(bulan).padStart(2, "0")}`;
              const closed = closedSet.has(periode);
              const info = infoOf(periode);
              return (
                <li key={periode} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${closed ? "bg-status-hadir-bg text-status-hadir-text" : "bg-subtle text-muted"}`} aria-hidden="true">
                      <Icon name={closed ? "lock" : "calendar"} size={17} />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{label} {year}</div>
                      <div className="text-xs text-muted">
                        {nf.format(info?.records ?? 0)} baris rekap
                        {closed && info?.ditutup_oleh && ` · ditutup oleh ${info.ditutup_oleh}`}
                        {closed && info?.alasan && ` · ${info.alasan}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${closed ? "border-status-hadir-border bg-status-hadir-bg text-status-hadir-text" : "border-line bg-subtle text-muted"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${closed ? "bg-status-hadir-text" : "bg-faint"}`} aria-hidden="true" />
                      {closed ? "Ditutup" : "Terbuka"}
                    </span>
                    {closed ? (
                      <button onClick={() => info && openReopen(info)} className={btnSecondary}>Buka kembali</button>
                    ) : (
                      <button onClick={() => openClose(bulan)} className={btnPrimary}>Tutup</button>
                    )}
                  </div>
                </li>
              );
            })}
            {!rows && <li className="px-6 py-10 text-center text-sm text-muted">Memuat data...</li>}
          </ul>
        </Panel>

        <p className="rounded-xl border border-line bg-white px-4 py-3 text-[13px] leading-5 text-muted">
          Saat periode ditutup, upload presensi, upload paket empat sumber, dan hitung ulang untuk bulan itu
          ditolak. Rekap Payroll menampilkan status <span className="font-semibold text-ink">DITUTUP</span> bila seluruh
          bulan dalam rentang sudah ditutup. Semua aksi tutup/buka tercatat di audit log.
        </p>
      </div>

      <Overlay open={!!dialog} onClose={() => setDialog(null)} title={dialog?.kind === "reopen" ? "Buka kembali periode" : "Tutup periode"} width={480}>
        <div className="space-y-4 p-6">
          <p className="text-sm text-muted">
            {dialog?.kind === "close"
              ? <>Periode <span className="font-semibold text-ink">{dialog && `${MONTHS[dialog.bulan - 1]} ${dialog.tahun}`}</span> akan dikunci. Data tidak bisa diubah sampai dibuka kembali.</>
              : <>Periode <span className="font-semibold text-ink">{dialog?.kind === "reopen" ? monthLabel(dialog.row.periode) : ""}</span> akan dibuka kembali sehingga data bisa diubah.</>}
          </p>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
            Alasan {dialog?.kind === "reopen" ? "(wajib)" : "(opsional)"}
            <textarea
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={dialog?.kind === "reopen" ? "Contoh: ada koreksi presensi setelah tutup buku" : "Contoh: data sudah lengkap dan diverifikasi"}
              className={`${fieldClass} h-auto w-full py-2 font-normal`}
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button onClick={submit} disabled={busy || (dialog?.kind === "reopen" && !alasan.trim())} className={btnPrimary}>
              {busy ? "Memproses..." : dialog?.kind === "reopen" ? "Buka kembali" : "Tutup periode"}
            </button>
            <button onClick={() => setDialog(null)} className={btnSecondary}>Batal</button>
          </div>
        </div>
      </Overlay>
    </div>
  );
}
