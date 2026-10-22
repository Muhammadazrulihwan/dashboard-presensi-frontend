"use client";
import Link from "next/link";
import { useState } from "react";
import Dropzone from "@/components/upload/Dropzone";
import { ErrorList, PreviewTable } from "@/components/upload/PreviewTable";
import { btnPrimary, btnSecondary } from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Overlay from "@/components/ui/Overlay";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import {
  confirmUpload, dateLabel, nf, uploadPreview,
  type ConfirmResponse, type ConflictMode, type PreviewResponse,
} from "@/lib/api";
import { useFilters } from "@/lib/filters";

// Satu item = satu file dalam antrean upload. File diperiksa satu per satu, lalu semua yang lolos disimpan berurutan.
type Phase = "queued" | "uploading" | "checked" | "error" | "saving" | "saved" | "save_error";
type Item = { id: number; file: File; phase: Phase; progress: number; result?: PreviewResponse; error?: string; stats?: ConfirmResponse };

const STEPS = ["Pilih file", "Periksa data", "Simpan"];

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-3 text-sm" aria-label="Langkah upload">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center gap-3" aria-current={i === current ? "step" : undefined}>
          <span
            className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${
              i < current ? "bg-accent text-white" : i === current ? "bg-accent-soft text-accent ring-1 ring-accent-ring" : "bg-white text-muted ring-1 ring-line"
            }`}
          >
            {i < current ? <Icon name="check" size={14} stroke={2.6} /> : i + 1}
          </span>
          <span className={i === current ? "font-semibold" : "text-muted"}>{label}</span>
          {i < STEPS.length - 1 && <span className="h-px w-8 bg-line-strong" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper px-4 py-3">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="mt-0.5 text-[15px] font-bold tracking-tight">{value}</div>
    </div>
  );
}

const ALERT = "rounded-xl border border-status-alpa-border bg-status-alpa-bg px-4 py-3 text-sm text-status-alpa-text";
const PILL = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold";

function StatusPill({ item }: { item: Item }) {
  const r = item.result;
  switch (item.phase) {
    case "queued": return <span className={`${PILL} bg-subtle text-muted`}>Menunggu</span>;
    case "uploading": return <span className={`${PILL} bg-accent-soft text-accent`}>{item.progress < 100 ? `Mengunggah ${item.progress}%` : "Memeriksa..."}</span>;
    case "error": return <span className={`${PILL} bg-status-alpa-bg text-status-alpa-text`}>Gagal dibaca</span>;
    case "saving": return <span className={`${PILL} bg-accent-soft text-accent`}>Menyimpan...</span>;
    case "saved": return <span className={`${PILL} bg-status-hadir-bg text-status-hadir-text`}>Tersimpan</span>;
    case "save_error": return <span className={`${PILL} bg-status-alpa-bg text-status-alpa-text`}>Gagal disimpan</span>;
    default:
      return r?.can_save
        ? <span className={`${PILL} bg-status-hadir-bg text-status-hadir-text`}>Siap disimpan</span>
        : <span className={`${PILL} bg-status-alpa-bg text-status-alpa-text`}>{nf.format(r?.error_count ?? 0)} kesalahan</span>;
  }
}

function FileRow({ item }: { item: Item }) {
  const r = item.result;
  const rangeText = r?.date_from && r?.date_to ? `${dateLabel(r.date_from)} - ${dateLabel(r.date_to)}` : "-";
  const detail = r && (r.preview_rows.length > 0 || r.error_count > 0);
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-paper text-accent" aria-hidden="true"><Icon name="file" size={17} /></span>
        <div className="min-w-0 flex-1 basis-56">
          <p className="truncate text-sm font-semibold">{item.file.name}</p>
          <p className="text-xs text-muted">
            {r ? `${nf.format(r.row_count)} baris · ${nf.format(r.employee_count)} karyawan · ${rangeText}` : `${(item.file.size / 1024).toFixed(0)} KB`}
            {r && r.conflict_count > 0 && <span className="text-status-terlambat-text"> · {nf.format(r.conflict_count)} bentrok</span>}
          </p>
        </div>
        <StatusPill item={item} />
      </div>
      {item.phase === "error" && <p className={`${ALERT} mt-2`} role="alert">{item.error}</p>}
      {item.phase === "save_error" && <p className={`${ALERT} mt-2`} role="alert">{item.error}</p>}
      {item.phase === "saved" && item.stats && (
        <p className="mt-1.5 pl-[52px] text-xs text-muted">
          {nf.format(item.stats.inserted)} baris disimpan
          {item.stats.overwritten > 0 && `, ${nf.format(item.stats.overwritten)} menimpa data lama`}
          {item.stats.skipped > 0 && `, ${nf.format(item.stats.skipped)} bentrok dilewati`}.
        </p>
      )}
      {detail && item.phase === "checked" && (
        <details className="mt-2 pl-[52px]" open={!r.can_save}>
          <summary className="cursor-pointer text-[13px] font-semibold text-accent">{r.can_save ? "Lihat pratinjau" : "Lihat kesalahan"}</summary>
          <div className="mt-2 space-y-3">
            {r.error_count > 0 && <ErrorList errors={r.errors} total={r.error_count} />}
            {r.can_save && r.preview_rows.length > 0 && <PreviewTable rows={r.preview_rows} />}
          </div>
        </details>
      )}
    </li>
  );
}

export default function UploadPage() {
  const { reload } = useFilters();
  const [items, setItems] = useState<Item[]>([]);
  const [message, setMessage] = useState("");
  const [askMode, setAskMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const patch = (id: number, p: Partial<Item>) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...p } : i)));

  // Periksa file satu per satu (urut) agar server tidak kewalahan dan progres mudah diikuti.
  async function handleFiles(files: File[]) {
    setMessage("");
    setDone(false);
    const base = Date.now();
    const queue: Item[] = files.map((file, n) => ({ id: base + n, file, phase: "queued", progress: 0 }));
    setItems(queue);
    for (const it of queue) {
      patch(it.id, { phase: "uploading", progress: 0 });
      try {
        const result = await uploadPreview(it.file, (progress) => patch(it.id, { progress }));
        patch(it.id, { phase: "checked", progress: 100, result });
      } catch (e) {
        patch(it.id, { phase: "error", error: e instanceof Error ? e.message : "File tidak dapat diperiksa" });
      }
    }
  }

  // Simpan berurutan menurut tanggal awal data supaya hasil timpa konsisten (file yang lebih baru menang).
  async function saveAll(mode: ConflictMode | null) {
    setAskMode(false);
    setSaving(true);
    const ready = items
      .filter((i) => i.phase === "checked" && i.result?.can_save)
      .sort((a, b) => (a.result!.date_from ?? "").localeCompare(b.result!.date_from ?? "") || a.file.name.localeCompare(b.file.name));
    // Banyak file bisa saling tumpang tindih (NIK dan tanggal sama). Tanpa pilihan khusus, file berikutnya menimpa yang sebelumnya.
    const effective: ConflictMode | undefined = mode ?? (items.length > 1 ? "overwrite" : undefined);
    for (const it of ready) {
      patch(it.id, { phase: "saving" });
      try {
        const stats = await confirmUpload(it.result!.upload_id, effective);
        patch(it.id, { phase: "saved", stats });
      } catch (e) {
        patch(it.id, { phase: "save_error", error: e instanceof Error ? e.message : "Gagal menyimpan" });
      }
    }
    setSaving(false);
    setDone(true);
    reload(true); // rentang tanggal dan divisi berubah setelah data baru masuk
  }

  const reset = () => { setItems([]); setMessage(""); setDone(false); setAskMode(false); };

  const checking = items.some((i) => i.phase === "queued" || i.phase === "uploading");
  const checked = items.filter((i) => i.phase === "checked");
  const ready = checked.filter((i) => i.result?.can_save);
  const failedCount = items.filter((i) => i.phase === "error" || (i.phase === "checked" && !i.result?.can_save)).length;
  const totalRows = ready.reduce((n, i) => n + (i.result?.row_count ?? 0), 0);
  const totalConflicts = ready.reduce((n, i) => n + (i.result?.conflict_count ?? 0), 0);
  const savedItems = items.filter((i) => i.phase === "saved");
  const saveFailed = items.filter((i) => i.phase === "save_error").length;
  const current = items.length === 0 ? 0 : done ? 3 : 1;

  return (
    <div>
      <PageHeader
        title="Upload Data Presensi (Template Lama)"
        description="Unggah satu atau beberapa file CSV atau XLSX sekaligus (misalnya satu file per minggu), periksa isinya, lalu simpan semuanya. Keterlambatan, durasi, dan lembur dihitung otomatis."
      />

      <p className="mb-5 flex items-start gap-2 rounded-xl border border-line bg-white px-4 py-3 text-[13px] leading-5 text-muted">
        <Icon name="info" size={16} className="mt-0.5 shrink-0 text-accent" />
        <span>
          Halaman ini memakai template presensi tunggal (legacy). Untuk menggabungkan Activity, Report Attendance,
          Time Off, dan Approval menjadi Rekap Absensi terpadu, gunakan{" "}
          <Link href="/upload-paket" className="font-semibold text-accent hover:underline">Upload Paket 4 Sumber</Link>.
        </span>
      </p>

      <div className="space-y-5">
        <Stepper current={current} />

        {items.length === 0 && (
          <>
            <Dropzone onFiles={handleFiles} onReject={setMessage} />
            {message && <p className={ALERT} role="alert">{message}</p>}
          </>
        )}

        {items.length > 0 && (
          <div className="space-y-4">
            {!checking && !done && (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Stat label="File dipilih" value={nf.format(items.length)} />
                <Stat label="Siap disimpan" value={`${nf.format(ready.length)} file · ${nf.format(totalRows)} baris`} />
                <Stat label="Bermasalah" value={`${nf.format(failedCount)} file`} />
                <Stat label="Baris bentrok" value={nf.format(totalConflicts)} />
              </div>
            )}

            <Panel title={done ? "Hasil penyimpanan" : checking ? "Memeriksa file..." : "Daftar file"} subtitle={done ? undefined : "File diperiksa satu per satu. File dengan kesalahan tidak akan disimpan."}>
              <ul className="divide-y divide-line px-5">
                {items.map((i) => <FileRow key={i.id} item={i} />)}
              </ul>
            </Panel>

            {!checking && !done && failedCount > 0 && ready.length > 0 && (
              <p className="flex items-start gap-2 text-[13px] text-muted">
                <Icon name="info" size={16} className="mt-0.5 text-accent" />
                <span>{nf.format(failedCount)} file bermasalah akan dilewati. Perbaiki file itu lalu unggah ulang secara terpisah.</span>
              </p>
            )}

            {!checking && !done && ready.length > 1 && totalConflicts === 0 && (
              <p className="flex items-start gap-2 text-[13px] text-muted">
                <Icon name="info" size={16} className="mt-0.5 text-accent" />
                <span>Bila ada NIK dan tanggal yang sama di lebih dari satu file, file yang lebih baru menimpa yang lebih lama.</span>
              </p>
            )}

            {totalConflicts > 0 && !checking && !done && (
              <div className="flex items-start gap-3 rounded-2xl border border-status-terlambat-border bg-status-terlambat-bg p-5" role="status">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-status-terlambat-text" aria-hidden="true"><Icon name="alert" size={19} /></span>
                <div>
                  <p className="text-sm font-bold text-amber-900">{nf.format(totalConflicts)} baris sudah ada di database</p>
                  <p className="mt-0.5 text-[13px] text-amber-800">NIK dan tanggalnya sama dengan data yang tersimpan. Anda akan memilih Timpa atau Lewati sekali untuk semua file.</p>
                </div>
              </div>
            )}

            {done && (
              <div className="flex items-start gap-4 rounded-2xl border border-line bg-white p-6 shadow-card">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-status-hadir-border bg-status-hadir-bg text-status-hadir-text" aria-hidden="true"><Icon name="check" size={22} stroke={2.4} /></span>
                <div>
                  <p className="text-base font-bold">{saveFailed === 0 ? "Semua file berhasil disimpan" : `${nf.format(savedItems.length)} file tersimpan, ${nf.format(saveFailed)} gagal`}</p>
                  <p className="mt-1 text-sm text-muted">{nf.format(savedItems.reduce((n, i) => n + (i.stats?.inserted ?? 0), 0))} baris disimpan dari {nf.format(savedItems.length)} file.</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link href="/dashboard" className={btnPrimary}>Lihat dashboard</Link>
                    <button onClick={reset} className={btnSecondary}>Upload file lain</button>
                  </div>
                </div>
              </div>
            )}

            {!done && (
              <div className="flex flex-wrap gap-3">
                <button
                  disabled={checking || saving || ready.length === 0}
                  onClick={() => (totalConflicts > 0 ? setAskMode(true) : saveAll(null))}
                  className={btnPrimary}
                >
                  <Icon name="check" size={17} stroke={2.2} />
                  {saving ? "Menyimpan..." : ready.length > 1 ? `Simpan ${nf.format(ready.length)} File & Proses Data` : "Simpan & Proses Data"}
                </button>
                <button disabled={checking || saving} onClick={reset} className={btnSecondary}>Batalkan</button>
              </div>
            )}

            <Overlay open={askMode} onClose={() => setAskMode(false)} title="Data bentrok ditemukan" width={520}>
              <div className="p-6">
                <p className="text-sm leading-6 text-muted">
                  <span className="font-semibold text-ink">{nf.format(totalConflicts)} baris</span> memiliki NIK dan tanggal yang sudah tersimpan. Pilihan ini berlaku untuk semua file.
                </p>
                <div className="mt-5 space-y-3">
                  <button onClick={() => saveAll("skip")} className="w-full rounded-xl border border-line p-4 text-left transition-colors hover:border-accent hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent">
                    <span className="block text-sm font-bold">Lewati baris bentrok</span>
                    <span className="mt-0.5 block text-[13px] text-muted">Data lama dipertahankan. Hanya baris baru yang disimpan.</span>
                  </button>
                  <button onClick={() => saveAll("overwrite")} className="w-full rounded-xl border border-status-alpa-border bg-status-alpa-bg/50 p-4 text-left transition-colors hover:bg-status-alpa-bg focus-visible:outline-2 focus-visible:outline-status-alpa-text">
                    <span className="block text-sm font-bold text-status-alpa-text">Timpa data lama</span>
                    <span className="mt-0.5 block text-[13px] text-muted">Baris yang sama diganti dengan isi file, lalu dihitung ulang. Data lama tidak dapat dikembalikan.</span>
                  </button>
                </div>
                <button onClick={() => setAskMode(false)} className="mt-5 text-sm font-semibold text-muted hover:text-ink">Kembali</button>
              </div>
            </Overlay>
          </div>
        )}
      </div>
    </div>
  );
}
