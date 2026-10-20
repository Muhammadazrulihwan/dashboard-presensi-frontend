"use client";
import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import Overlay from "@/components/ui/Overlay";
import { btnPrimary, btnSecondary, fieldClass } from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  archiveDownloadUrl, dateLabel, getArchive, getArchiveUploaders, isHR, nf, purgeArchive, restoreArchive, trashArchive,
  type ArchiveQuery, type ArchiveStatus, type ArchivedFile,
} from "@/lib/api";

const TABS: { key: ArchiveStatus; label: string }[] = [
  { key: "aktif", label: "Aktif" },
  { key: "sampah", label: "Tempat Sampah" },
  { key: "dihapus", label: "Dihapus" },
];

const JENIS = [
  { value: "", label: "Semua jenis" },
  { value: "presensi", label: "Presensi" },
  { value: "penjualan", label: "Penjualan" },
];

function sizeLabel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_BADGE: Record<ArchiveStatus, string> = {
  aktif: "border-status-hadir-border bg-status-hadir-bg text-status-hadir-text",
  sampah: "border-status-terlambat-border bg-status-terlambat-bg text-status-terlambat-text",
  dihapus: "border-line bg-subtle text-muted",
};

export default function ArsipPage() {
  const { user } = useAuth();
  const hr = isHR(user);
  const [tab, setTab] = useState<ArchiveStatus>("aktif");
  const [jenis, setJenis] = useState("");
  const [q, setQ] = useState("");
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [uploaders, setUploaders] = useState<{ id: number; full_name: string; email: string }[]>([]);
  const [pengunggah, setPengunggah] = useState("");
  const [data, setData] = useState<{ items: ArchivedFile[]; total: number } | null>(null);
  const [error, setError] = useState("");
  const [trashTarget, setTrashTarget] = useState<ArchivedFile | null>(null);
  const [alasan, setAlasan] = useState("");

  useEffect(() => {
    getArchiveUploaders().then(setUploaders).catch(() => undefined);
  }, []);

  const load = useCallback(() => {
    const query: ArchiveQuery = {
      status: tab, jenis_sumber: jenis || undefined, q: q.trim() || undefined,
      dari: dari || undefined, sampai: sampai || undefined,
      pengunggah_id: pengunggah ? Number(pengunggah) : undefined, page_size: 50,
    };
    getArchive(query)
      .then((r) => { setData({ items: r.items, total: r.total }); setError(""); })
      .catch((e: Error) => setError(e.message));
  }, [tab, jenis, q, dari, sampai, pengunggah]);

  useEffect(load, [load]);

  function doTrash() {
    if (!trashTarget || !alasan.trim()) return;
    trashArchive(trashTarget.id, alasan.trim())
      .then(() => { setTrashTarget(null); setAlasan(""); load(); })
      .catch((e: Error) => setError(e.message));
  }

  function doRestore(f: ArchivedFile) {
    restoreArchive(f.id).then(load).catch((e: Error) => setError(e.message));
  }

  function doPurge(f: ArchivedFile) {
    if (!window.confirm(`Hapus permanen ${f.nama_asli}? Tindakan ini tidak dapat dibatalkan.`)) return;
    purgeArchive(f.id).then(load).catch((e: Error) => setError(e.message));
  }

  return (
    <div>
      <PageHeader
        title="Arsip File"
        description="Salinan file upload asli dengan checksum SHA-256. Riwayat upload hanya menyimpan metadata; isi file ada di sini."
      />

      <div className="space-y-5">
        <div className="inline-flex gap-1 rounded-xl border border-line bg-white p-1 shadow-card" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-accent ${tab === t.key ? "bg-accent text-white shadow-glow" : "text-muted hover:text-ink"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <Panel title="Pencarian" subtitle="Saring menurut jenis, pengunggah, nama file, dan rentang tanggal data">
          <div className="grid gap-4 px-6 pb-5 pt-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
              Nama file
              <input className={`${fieldClass} w-full`} placeholder="Cari nama file" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
              Jenis
              <select className={`${fieldClass} w-full`} value={jenis} onChange={(e) => setJenis(e.target.value)}>
                {JENIS.map((j) => <option key={j.value} value={j.value}>{j.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
              Pengunggah
              <select className={`${fieldClass} w-full`} value={pengunggah} onChange={(e) => setPengunggah(e.target.value)}>
                <option value="">Semua pengunggah</option>
                {uploaders.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
              Dari tanggal data
              <input type="date" className={`${fieldClass} w-full`} value={dari} max={sampai || undefined} onChange={(e) => setDari(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
              Sampai tanggal data
              <input type="date" className={`${fieldClass} w-full`} value={sampai} min={dari || undefined} onChange={(e) => setSampai(e.target.value)} />
            </label>
          </div>
        </Panel>

        {error && <p className="rounded-xl border border-status-alpa-border bg-status-alpa-bg px-4 py-3 text-sm text-status-alpa-text" role="alert">{error}</p>}

        <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          <div className="flex items-center justify-between gap-3 px-6 pb-3 pt-5">
            <h2 className="text-[17px] font-bold tracking-tight">File {TABS.find((t) => t.key === tab)?.label}</h2>
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">
              {data ? `${nf.format(data.total)} file` : "Memuat..."}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="h-11 border-y border-line bg-paper text-left text-[11px] font-bold uppercase tracking-[0.04em] text-muted">
                  <th className="pl-6 pr-3.5">File</th>
                  <th className="px-3.5">Jenis</th>
                  <th className="px-3.5">Periode data</th>
                  <th className="px-3.5">Pengunggah</th>
                  <th className="px-3.5">Ukuran</th>
                  <th className="px-3.5">Checksum</th>
                  <th className="px-3.5">Status</th>
                  <th className="px-3.5 pr-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((f) => (
                  <tr key={f.id} className="h-14 border-b border-subtle last:border-b-0 hover:bg-paper">
                    <td className="pl-6 pr-3.5">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-accent-ring bg-accent-soft text-accent" aria-hidden="true"><Icon name="file" size={17} /></span>
                        <div className="min-w-0">
                          <div className="truncate font-semibold" title={f.nama_asli}>{f.nama_asli}</div>
                          <div className="text-xs text-muted">Diunggah {new Date(f.created_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 text-[13px] capitalize">{f.jenis_sumber}</td>
                    <td className="whitespace-nowrap px-3.5 text-[13px] text-muted">
                      {f.periode_awal && f.periode_akhir ? `${dateLabel(f.periode_awal)} – ${dateLabel(f.periode_akhir)}` : "-"}
                    </td>
                    <td className="px-3.5 text-[13px]">{f.pengunggah ?? "-"}</td>
                    <td className="num px-3.5 text-[13px]">{sizeLabel(f.ukuran)}</td>
                    <td className="px-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${f.checksum_terverifikasi ? "border-status-hadir-border bg-status-hadir-bg text-status-hadir-text" : "border-status-alpa-border bg-status-alpa-bg text-status-alpa-text"}`}
                        title={f.checksum}
                      >
                        <Icon name={f.checksum_terverifikasi ? "check" : "alert"} size={12} stroke={2.4} />
                        {f.checksum_terverifikasi ? "Cocok" : "Berbeda"}
                      </span>
                    </td>
                    <td className="px-3.5">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[f.status]}`}>{f.status}</span>
                      {f.status === "sampah" && f.alasan_hapus && (
                        <div className="mt-0.5 max-w-[180px] truncate text-[11px] text-muted" title={f.alasan_hapus}>{f.alasan_hapus}</div>
                      )}
                    </td>
                    <td className="px-3.5 pr-6">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {f.status !== "dihapus" && (
                          <a href={archiveDownloadUrl(f.id)} className="rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-accent transition-colors hover:bg-accent-soft">
                            Unduh
                          </a>
                        )}
                        {hr && f.status === "aktif" && (
                          <button onClick={() => { setTrashTarget(f); setAlasan(""); }} className="rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-status-alpa-text transition-colors hover:bg-status-alpa-bg">
                            Hapus
                          </button>
                        )}
                        {hr && f.status === "sampah" && (
                          <>
                            <button onClick={() => doRestore(f)} className="rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-accent transition-colors hover:bg-accent-soft">
                              Pulihkan
                            </button>
                            <button
                              onClick={() => doPurge(f)}
                              disabled={!f.bisa_dihapus_permanen}
                              title={f.bisa_dihapus_permanen ? "Hapus permanen" : "Masa tunggu tempat sampah belum habis"}
                              className="rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-status-alpa-text transition-colors hover:bg-status-alpa-bg disabled:cursor-not-allowed disabled:text-faint disabled:hover:bg-transparent"
                            >
                              Hapus permanen
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {data && data.items.length === 0 && (
                  <tr><td colSpan={8} className="px-6 py-14 text-center text-muted">Tidak ada file pada tab ini.</td></tr>
                )}
                {!data && !error && (
                  <tr><td colSpan={8} className="px-6 py-14 text-center text-muted">Memuat data...</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="rounded-xl border border-line bg-white px-4 py-3 text-[13px] leading-5 text-muted">
          Menghapus file memindahkannya ke <span className="font-semibold text-ink">Tempat Sampah</span>. Hapus permanen hanya
          dapat dilakukan setelah masa tunggu habis, dan tercatat di audit log. Data Rekap Absensi yang sudah terbentuk tidak ikut terhapus.
        </p>
      </div>

      <Overlay open={!!trashTarget} onClose={() => setTrashTarget(null)} title="Pindahkan ke tempat sampah" width={480}>
        <div className="space-y-4 p-6">
          <p className="text-sm text-muted">
            File <span className="font-semibold text-ink">{trashTarget?.nama_asli}</span> akan dipindahkan ke tempat sampah.
            File masih bisa dipulihkan sebelum dihapus permanen.
          </p>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
            Alasan (wajib)
            <textarea
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Contoh: salah unggah, file rusak, duplikat"
              className={`${fieldClass} h-auto w-full py-2 font-normal`}
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button onClick={doTrash} disabled={!alasan.trim()} className={btnPrimary}>Pindahkan</button>
            <button onClick={() => setTrashTarget(null)} className={btnSecondary}>Batal</button>
          </div>
        </div>
      </Overlay>
    </div>
  );
}
