"use client";
import Link from "next/link";
import { useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { useAuth } from "@/components/auth/AuthProvider";
import { btnPrimary, btnSecondary } from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Overlay from "@/components/ui/Overlay";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import {
  confirmSales, isSalesTeam, nf, salesPreview, salesTemplateUrl,
  type SalesConfirm, type SalesPreview, type SalesValidationError,
} from "@/lib/api";

const MAX_MB = 50;
const STEPS = ["Pilih file", "Periksa data", "Simpan"];
const ALERT = "rounded-xl border border-status-alpa-border bg-status-alpa-bg px-4 py-3 text-sm text-status-alpa-text";
const COL = "num mr-1 rounded-md px-1.5 py-0.5 text-[12px]";

type Phase = "idle" | "uploading" | "checked" | "saving" | "saved";

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-3 text-sm" aria-label="Langkah upload">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center gap-3" aria-current={i === current ? "step" : undefined}>
          <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${i < current ? "bg-accent text-white" : i === current ? "bg-accent-soft text-accent ring-1 ring-accent-ring" : "bg-white text-muted ring-1 ring-line"}`}>
            {i < current ? <Icon name="check" size={14} stroke={2.6} /> : i + 1}
          </span>
          <span className={i === current ? "font-semibold" : "text-muted"}>{label}</span>
          {i < STEPS.length - 1 && <span className="h-px w-8 bg-line-strong" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "bad" | "warn" }) {
  const color = tone === "bad" ? "text-status-alpa-text" : tone === "warn" ? "text-status-terlambat-text" : "";
  return (
    <div className="rounded-xl border border-line bg-paper px-4 py-3">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className={`mt-0.5 text-[15px] font-bold tracking-tight ${color}`}>{value}</div>
    </div>
  );
}

function ErrorList({ errors, total }: { errors: SalesValidationError[]; total: number }) {
  const [all, setAll] = useState(false);
  const shown = all ? errors : errors.slice(0, 8);
  return (
    <div className="rounded-2xl border border-status-alpa-border bg-status-alpa-bg/60 p-5" role="alert">
      <p className="text-sm font-bold text-red-900">{nf.format(total)} masalah ditemukan. Perbaiki file lalu unggah ulang.</p>
      <p className="mt-0.5 text-[13px] text-red-800/80">
        {total > errors.length ? `Menampilkan ${errors.length} masalah pertama dari ${total}. ` : ""}Nomor baris mengikuti baris di sheet asli (baris 1 adalah header).
      </p>
      <ul className="mt-3 space-y-1.5">
        {shown.map((e, i) => (
          <li key={i} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 rounded-lg bg-white/70 px-3 py-2 text-[13px]">
            <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold text-status-alpa-text">{e.sheet}</span>
            <span className="num rounded-md bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold text-status-alpa-text">Baris {e.row}</span>
            <span className="num font-semibold text-red-900">{e.column}</span>
            <span className="text-red-800">{e.message}</span>
          </li>
        ))}
      </ul>
      {errors.length > 8 && (
        <button onClick={() => setAll(!all)} className="mt-3 text-[13px] font-semibold text-status-alpa-text hover:underline">
          {all ? "Tampilkan lebih sedikit" : `Tampilkan semua (${errors.length})`}
        </button>
      )}
    </div>
  );
}

export default function SalesUploadPage() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SalesPreview | null>(null);
  const [stats, setStats] = useState<SalesConfirm | null>(null);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleFile(f: File) {
    setError("");
    setFile(f);
    setProgress(0);
    setPhase("uploading");
    try {
      setResult(await salesPreview(f, setProgress));
      setPhase("checked");
    } catch (e) {
      setError(e instanceof Error ? e.message : "File tidak dapat diperiksa");
      setFile(null);
      setPhase("idle");
    }
  }

  async function save(timpa = false) {
    if (!result) return;
    setError("");
    setPhase("saving");
    try {
      setStats(await confirmSales(result.upload_id, timpa));
      setPhase("saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan data");
      setPhase("checked");
    }
  }

  const reset = () => { setPhase("idle"); setFile(null); setResult(null); setStats(null); setError(""); setProgress(0); setConfirmOpen(false); };
  const diputuskan = result?.reupload.reduce((n, r) => n + r.penilaian_diputuskan, 0) ?? 0;

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    multiple: false,
    maxFiles: 1,
    noClick: true,
    noKeyboard: true,
    maxSize: MAX_MB * 1024 * 1024,
    accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] },
    disabled: phase !== "idle",
    onDropAccepted: (files) => handleFile(files[0]),
    onDropRejected: (r: FileRejection[]) => {
      const code = r[0]?.errors[0]?.code;
      setError(code === "file-too-large" ? `Ukuran file melebihi ${MAX_MB} MB.` : code === "too-many-files" ? "Unggah satu file saja." : "Format file tidak didukung. Gunakan .xlsx.");
    },
  });

  if (!isSalesTeam(user)) {
    return (
      <div>
        <PageHeader title="Upload Kinerja Penjualan" />
        <Panel><p className="px-6 py-8 text-sm text-muted">Halaman ini hanya untuk departemen Sales/Marketing.</p></Panel>
      </div>
    );
  }

  const current = phase === "saved" ? 3 : phase === "idle" ? 0 : 1;
  const busy = phase === "uploading" || phase === "saving";
  return (
    <div>
      <PageHeader
        title="Upload Kinerja Penjualan"
        description="Unggah satu file XLSX berisi sheet Penjualan dan Target. Sistem memeriksa isinya, lalu menyusun rekomendasi kelayakan per salesman untuk disetujui."
      />

      <div className="space-y-5">
        <Stepper current={current} />

        {phase === "idle" && (
          <div className="rounded-2xl border border-line bg-white p-3 shadow-card">
            <div {...getRootProps()} className={`rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors ${isDragActive ? "border-accent bg-accent-soft" : "border-[#93c5fd] bg-paper"}`}>
              <input {...getInputProps()} />
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-accent ring-8 ring-white">
                <Icon name="cloudUpload" size={30} stroke={1.6} />
              </span>
              <p className="mt-5 text-lg font-bold tracking-tight">{isDragActive ? "Lepaskan file di sini" : "Seret file Kinerja Penjualan ke sini"}</p>
              <p className="mt-1 text-sm text-muted">Format XLSX, maksimal {MAX_MB} MB</p>
              <button type="button" onClick={open} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-colors hover:bg-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                <Icon name="upload" size={17} />
                Pilih File
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-3 pb-2 pt-4">
              <div className="min-w-0 text-[13px] leading-7 text-muted">
                <span className="font-semibold text-ink">Sheet Penjualan, wajib:</span>{" "}
                {["employee_id", "nama", "cabang", "periode", "penjualan"].map((c) => <code key={c} className={`${COL} bg-accent-soft text-accent-dark`}>{c}</code>)}
                <br />
                <span className="font-semibold text-ink">Opsional:</span>{" "}
                {["penerimaan", "piutang_outlet", "sisa_bad_debt"].map((c) => <code key={c} className={`${COL} bg-subtle text-muted`}>{c}</code>)}
                <br />
                <span className="font-semibold text-ink">Sheet Target, wajib:</span>{" "}
                {["level", "periode", "target_penjualan"].map((c) => <code key={c} className={`${COL} bg-accent-soft text-accent-dark`}>{c}</code>)}
                <span className="font-semibold text-ink"> Opsional:</span>{" "}
                {["cabang", "employee_id"].map((c) => <code key={c} className={`${COL} bg-subtle text-muted`}>{c}</code>)}
              </div>
              <a href={salesTemplateUrl} className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
                <Icon name="download" size={16} />
                Unduh Template Penjualan (.xlsx)
              </a>
            </div>
          </div>
        )}

        <p className="flex items-start gap-2 text-[13px] text-muted">
          <Icon name="info" size={16} className="mt-0.5 shrink-0 text-accent" />
          <span>Menyimpan file akan mengganti data penjualan dan target untuk cabang dan periode yang ada di file. Cabang lain tidak berubah. Penilaian yang sudah Disetujui atau Ditolak pada data yang diganti kembali ke Draf dan perlu disetujui ulang. Jangan sertakan data gaji atau rekening.</span>
        </p>

        {error && <p className={ALERT} role="alert">{error}</p>}

        {file && phase !== "idle" && (
          <Panel title={phase === "saved" ? "Hasil penyimpanan" : busy ? (phase === "saving" ? "Menyimpan..." : "Memeriksa file...") : "Hasil pemeriksaan"}>
            <div className="space-y-4 px-6 pb-6 pt-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-paper text-accent" aria-hidden="true"><Icon name="file" size={17} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{file.name}</p>
                  <p className="text-xs text-muted">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                {phase === "uploading" && <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">{progress < 100 ? `Mengunggah ${progress}%` : "Memeriksa..."}</span>}
              </div>

              {result && phase !== "uploading" && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Stat label="Baris Penjualan" value={nf.format(result.row_count_penjualan)} />
                    <Stat label="Baris Target" value={nf.format(result.row_count_target)} />
                    <Stat label="Kesalahan" value={nf.format(result.error_count)} tone={result.error_count > 0 ? "bad" : undefined} />
                    <Stat label="Peringatan" value={nf.format(result.warnings.length)} tone={result.warnings.length > 0 ? "warn" : undefined} />
                  </div>
                  {result.error_count > 0 && <ErrorList errors={result.errors} total={result.error_count} />}
                  {result.reupload.length > 0 && (
                    <div className="rounded-2xl border border-status-terlambat-border bg-status-terlambat-bg p-5" role="status">
                      <p className="text-sm font-bold text-amber-900">Data periode ini sudah ada dan akan diganti</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-amber-800">
                        {result.reupload.map((r) => (
                          <li key={r.periode}>
                            <span className="num font-semibold">{r.periode}</span>, cabang {r.cabang.join(", ")}: {nf.format(r.penjualan_diganti)} baris penjualan diganti
                            {r.penilaian_diputuskan > 0 && `, ${nf.format(r.penilaian_diputuskan)} penilaian yang sudah diputuskan kembali ke Draf`}.
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.warnings.length > 0 && (
                    <div className="rounded-2xl border border-status-terlambat-border bg-status-terlambat-bg p-5" role="status">
                      <p className="text-sm font-bold text-amber-900">Peringatan, file tetap bisa disimpan</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-amber-800">
                        {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {phase === "saved" && stats && (
                <div className="flex items-start gap-4 rounded-2xl border border-line bg-white p-5">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-status-hadir-border bg-status-hadir-bg text-status-hadir-text" aria-hidden="true"><Icon name="check" size={22} stroke={2.4} /></span>
                  <div>
                    <p className="text-base font-bold">Data berhasil disimpan</p>
                    <p className="mt-1 text-sm text-muted">
                      {nf.format(stats.inserted_performance)} baris penjualan dan {nf.format(stats.inserted_targets)} baris target disimpan.
                      {" "}{nf.format(stats.assessments_created)} penilaian baru berstatus Draf, menunggu persetujuan penyetuju.
                      {stats.assessments_reset > 0 && ` ${nf.format(stats.assessments_reset)} penilaian yang sudah diputuskan dikembalikan ke Draf.`}
                      {stats.assessments_removed > 0 && ` ${nf.format(stats.assessments_removed)} penilaian dihapus karena salesmannya tidak ada di file baru.`}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link href="/sales/dashboard" className={btnPrimary}>Lihat dashboard</Link>
                      <button onClick={reset} className={btnSecondary}>Upload file lain</button>
                    </div>
                  </div>
                </div>
              )}

              {(phase === "checked" || phase === "saving") && result && (
                <div className="flex flex-wrap gap-3">
                  <button disabled={!result.can_save || phase === "saving"} onClick={() => (result.perlu_konfirmasi ? setConfirmOpen(true) : save())} className={btnPrimary}>
                    <Icon name="check" size={17} stroke={2.2} />
                    {phase === "saving" ? "Menyimpan..." : "Simpan & Proses Data"}
                  </button>
                  <button disabled={phase === "saving"} onClick={reset} className={btnSecondary}>Batalkan</button>
                </div>
              )}
            </div>
          </Panel>
        )}
      </div>

      <Overlay open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Konfirmasi unggah ulang" width={520}>
        <div className="space-y-4 p-6">
          <p className="text-sm leading-6">
            Ada <span className="font-bold">{nf.format(diputuskan)} penilaian</span> yang sudah Disetujui atau Ditolak pada data yang akan diganti.
            Setelah disimpan, semuanya kembali ke Draf dengan rekomendasi yang dihitung ulang dari angka baru. Catatan penyetuju sebelumnya
            dikosongkan, tetapi tetap tercatat di audit log.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => { setConfirmOpen(false); save(true); }} className={btnPrimary}>Ya, ganti data</button>
            <button onClick={() => setConfirmOpen(false)} className={btnSecondary}>Batal</button>
          </div>
        </div>
      </Overlay>
    </div>
  );
}
