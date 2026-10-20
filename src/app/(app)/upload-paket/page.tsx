"use client";
import Link from "next/link";
import { useState } from "react";
import Icon from "@/components/ui/Icon";
import Overlay from "@/components/ui/Overlay";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import { btnPrimary, btnSecondary } from "@/components/ui/Button";
import {
  confirmPackage, dateLabel, nf, packagePreview, type ConflictMode, type PackageConfirm, type PackagePreview, type SourceKind,
} from "@/lib/api";
import { useFilters } from "@/lib/filters";

const SOURCES: { key: SourceKind; label: string; hint: string }[] = [
  { key: "activity", label: "Activity", hint: "Ketukan clock in/out mentah" },
  { key: "report", label: "Report Attendance", hint: "Jadwal shift dan pembanding" },
  { key: "timeoff", label: "Time Off", hint: "Izin, cuti, sakit" },
  { key: "approval", label: "Approval", hint: "Koreksi absen disetujui" },
];

const ALERT = "rounded-xl border border-status-alpa-border bg-status-alpa-bg px-4 py-3 text-sm text-status-alpa-text";
const WARN = "rounded-2xl border border-status-terlambat-border bg-status-terlambat-bg p-5";

export default function UploadPaketPage() {
  const { reload } = useFilters();
  const [files, setFiles] = useState<Partial<Record<SourceKind, File>>>({});
  const [progress, setProgress] = useState(0);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<PackagePreview | null>(null);
  const [stats, setStats] = useState<PackageConfirm | null>(null);
  const [error, setError] = useState("");
  const [askMode, setAskMode] = useState(false);

  const anyFile = Object.values(files).some(Boolean);

  function pick(kind: SourceKind, f: File | null) {
    setFiles((prev) => ({ ...prev, [kind]: f ?? undefined }));
    setResult(null);
    setStats(null);
    setError("");
  }

  async function check() {
    if (!anyFile) return;
    setError("");
    setChecking(true);
    setResult(null);
    try {
      setResult(await packagePreview(files, setProgress));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memeriksa paket");
    } finally {
      setChecking(false);
    }
  }

  async function save(mode: ConflictMode | null) {
    if (!result) return;
    setAskMode(false);
    setSaving(true);
    setError("");
    try {
      setStats(await confirmPackage(result.upload_id, mode ?? undefined));
      reload(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan paket");
    } finally {
      setSaving(false);
    }
  }

  const reset = () => { setFiles({}); setResult(null); setStats(null); setError(""); setProgress(0); };

  return (
    <div>
      <PageHeader
        title="Upload Paket Empat Sumber"
        description="Unggah Activity, Report Attendance, Time Off, dan Approval untuk rentang tanggal yang sama. Sistem menggabungkannya menjadi Rekap Absensi terpadu. File yang belum ada boleh diunggah belakangan."
        actions={<Link href="/upload" className={btnSecondary}>Upload template lama</Link>}
      />

      <div className="space-y-5">
        <Panel title="Pilih file" subtitle="Minimal satu file. Format CSV atau XLSX.">
          <div className="grid gap-4 px-6 pb-6 pt-3 sm:grid-cols-2">
            {SOURCES.map((s) => {
              const f = files[s.key];
              return (
                <div key={s.key} className={`rounded-xl border p-4 ${f ? "border-accent-ring bg-accent-soft/40" : "border-line bg-paper"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold">{s.label}</div>
                      <div className="text-xs text-muted">{s.hint}</div>
                    </div>
                    {f && <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-status-hadir-bg text-status-hadir-text"><Icon name="check" size={15} stroke={2.4} /></span>}
                  </div>
                  <div className="mt-3">
                    <input
                      type="file"
                      accept=".csv,.xlsx"
                      aria-label={`File ${s.label}`}
                      onChange={(e) => pick(s.key, e.target.files?.[0] ?? null)}
                      className="block w-full text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-accent-dark"
                    />
                    {f && <p className="mt-1.5 truncate text-xs font-medium text-ink">{f.name}</p>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 border-t border-line px-6 py-4">
            <button disabled={!anyFile || checking || saving} onClick={check} className={btnPrimary}>
              <Icon name="search" size={17} />
              {checking ? `Memeriksa... ${progress}%` : "Periksa Paket"}
            </button>
            {anyFile && <button disabled={checking || saving} onClick={reset} className={btnSecondary}>Bersihkan</button>}
          </div>
        </Panel>

        {error && <p className={ALERT} role="alert">{error}</p>}

        {result && (
          <Panel title={stats ? "Hasil penyimpanan" : "Hasil pemeriksaan"}>
            <div className="space-y-4 px-6 pb-6 pt-3">
              {result.errors.length > 0 && (
                <div className={ALERT} role="alert">
                  <p className="font-semibold">Paket tidak bisa disimpan</p>
                  <ul className="mt-1 list-disc pl-5 text-[13px]">{result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {result.files.map((f) => (
                  <div key={f.jenis_sumber} className="rounded-xl border border-line bg-paper px-4 py-3">
                    <div className="text-xs font-medium capitalize text-muted">{f.jenis_sumber}</div>
                    <div className="num mt-0.5 text-[15px] font-bold">{nf.format(f.row_count)} baris</div>
                    {f.date_from && <div className="text-[11px] text-muted">{dateLabel(f.date_from)} – {dateLabel(f.date_to ?? f.date_from)}</div>}
                  </div>
                ))}
              </div>

              {result.files.some((f) => f.warnings.length > 0) && (
                <div className={WARN} role="status">
                  <p className="text-sm font-bold text-amber-900">Peringatan, paket tetap bisa disimpan</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-amber-800">
                    {result.files.flatMap((f) => f.warnings.map((w, i) => <li key={`${f.jenis_sumber}-${i}`}><span className="font-semibold capitalize">{f.jenis_sumber}:</span> {w}</li>))}
                  </ul>
                </div>
              )}

              {result.can_save && (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-line bg-white px-4 py-3"><div className="text-xs text-muted">Rekap baris</div><div className="num text-[15px] font-bold">{nf.format(result.rekap_rows)}</div></div>
                  <div className="rounded-xl border border-line bg-white px-4 py-3"><div className="text-xs text-muted">Karyawan</div><div className="num text-[15px] font-bold">{nf.format(result.employee_count)}</div></div>
                  <div className="rounded-xl border border-line bg-white px-4 py-3"><div className="text-xs text-muted">Rentang</div><div className="text-[13px] font-bold">{result.date_from ? `${dateLabel(result.date_from)} – ${dateLabel(result.date_to ?? result.date_from)}` : "-"}</div></div>
                  <div className="rounded-xl border border-line bg-white px-4 py-3"><div className="text-xs text-muted">Baris bentrok</div><div className="num text-[15px] font-bold">{nf.format(result.conflict_count)}</div></div>
                </div>
              )}

              {result.can_save && Object.keys(result.status_counts).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(result.status_counts).map(([s, n]) => (
                    <span key={s} className="rounded-full border border-line bg-subtle px-2.5 py-0.5 text-xs font-semibold text-muted">{s}: {nf.format(n)}</span>
                  ))}
                </div>
              )}

              {stats && (
                <div className="flex items-start gap-4 rounded-2xl border border-line bg-white p-5">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-status-hadir-border bg-status-hadir-bg text-status-hadir-text"><Icon name="check" size={22} stroke={2.4} /></span>
                  <div>
                    <p className="text-base font-bold">Rekap Absensi berhasil disimpan</p>
                    <p className="mt-1 text-sm text-muted">
                      {nf.format(stats.inserted)} baris rekap, {nf.format(stats.employees)} karyawan pada master.{" "}
                      {Object.entries(stats.sumber).map(([k, n]) => `${k}: ${nf.format(n)}`).join(", ")}.
                      {stats.overwritten > 0 && ` ${nf.format(stats.overwritten)} baris lama ditimpa.`}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link href="/dashboard" className={btnPrimary}>Lihat dashboard</Link>
                      <Link href="/kelengkapan" className={btnSecondary}>Periksa kelengkapan</Link>
                      <button onClick={reset} className={btnSecondary}>Upload paket lain</button>
                    </div>
                  </div>
                </div>
              )}

              {result.can_save && !stats && (
                <div className="flex flex-wrap gap-3">
                  <button disabled={saving} onClick={() => (result.conflict_count > 0 ? setAskMode(true) : save(null))} className={btnPrimary}>
                    <Icon name="check" size={17} stroke={2.2} />
                    {saving ? "Menyimpan..." : "Simpan & Gabungkan"}
                  </button>
                </div>
              )}
            </div>
          </Panel>
        )}

        <p className="rounded-xl border border-line bg-white px-4 py-3 text-[13px] leading-5 text-muted">
          Aturan penggabungan: Time Off disetujui menentukan status hari; Approval disetujui menimpa jam
          clock in/out; Activity dipakai untuk clock in paling awal dan clock out paling akhir; Report
          Attendance dipakai sebagai pembanding, bukan menimpa hasil sistem.
        </p>
      </div>

      <Overlay open={askMode} onClose={() => setAskMode(false)} title="Data bentrok ditemukan" width={520}>
        <div className="p-6">
          <p className="text-sm leading-6 text-muted">
            <span className="font-semibold text-ink">{nf.format(result?.conflict_count ?? 0)} baris</span> sudah tersimpan
            pada NIK dan tanggal yang sama. Pilih cara menanganinya.
          </p>
          <div className="mt-5 space-y-3">
            <button onClick={() => save("skip")} className="w-full rounded-xl border border-line p-4 text-left transition-colors hover:border-accent hover:bg-accent-soft">
              <span className="block text-sm font-bold">Lewati baris bentrok</span>
              <span className="mt-0.5 block text-[13px] text-muted">Data lama dipertahankan.</span>
            </button>
            <button onClick={() => save("overwrite")} className="w-full rounded-xl border border-status-alpa-border bg-status-alpa-bg/50 p-4 text-left transition-colors hover:bg-status-alpa-bg">
              <span className="block text-sm font-bold text-status-alpa-text">Timpa data lama</span>
              <span className="mt-0.5 block text-[13px] text-muted">Baris yang sama diganti hasil gabungan baru.</span>
            </button>
          </div>
          <button onClick={() => setAskMode(false)} className="mt-5 text-sm font-semibold text-muted hover:text-ink">Kembali</button>
        </div>
      </Overlay>
    </div>
  );
}
