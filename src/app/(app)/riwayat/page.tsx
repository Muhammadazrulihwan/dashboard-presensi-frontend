"use client";
import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import Overlay from "@/components/ui/Overlay";
import PageHeader from "@/components/ui/PageHeader";
import { btnDanger, btnSecondary, fieldClass } from "@/components/ui/Button";
import { bulkDeleteUploads, dateLabel, deleteUpload, getUploads, nf, type UploadHistory } from "@/lib/api";
import { useFilters } from "@/lib/filters";

const STATUS = {
  saved: { label: "Tersimpan", cls: "border-status-hadir-border bg-status-hadir-bg text-status-hadir-text", dot: "bg-status-hadir-text" },
  failed: { label: "Gagal", cls: "border-status-alpa-border bg-status-alpa-bg text-status-alpa-text", dot: "bg-status-alpa-text" },
  deleted: { label: "Dihapus", cls: "border-line bg-subtle text-muted", dot: "bg-faint" },
} as const;

const SUMBER_LABEL: Record<string, string> = {
  activity: "Activity",
  report: "Report",
  timeoff: "Time Off",
  approval: "Approval",
};
const TABS = [
  { key: "saved", label: "Tersimpan" },
  { key: "failed", label: "Gagal" },
  { key: "deleted", label: "Dihapus" },
  { key: "", label: "Semua" },
];
const PAGE_SIZE = 20;

export default function RiwayatPage() {
  const { reload } = useFilters();
  const [tab, setTab] = useState("saved");
  const [items, setItems] = useState<UploadHistory[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [target, setTarget] = useState<UploadHistory | null>(null);
  const [alasan, setAlasan] = useState("");
  const [busy, setBusy] = useState(false);
  // Seleksi massal: hanya baris berstatus "saved" yang bisa dihapus.
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const load = useCallback(() => {
    getUploads({ status: tab, limit: PAGE_SIZE, offset: 0 })
      .then((r) => {
        setItems(r);
        setHasMore(r.length === PAGE_SIZE);
        setSelected(new Set());
        setError("");
      })
      .catch((e: Error) => setError(e.message));
  }, [tab]);

  useEffect(load, [load]);

  function changeTab(key: string) {
    setItems(null);
    setSelected(new Set());
    setTab(key);
  }

  const deletable = (items ?? []).filter((u) => u.status === "saved");
  const allSelected = deletable.length > 0 && deletable.every((u) => selected.has(u.id));
  const selectedItems = deletable.filter((u) => selected.has(u.id));

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(deletable.map((u) => u.id)));
  }

  function removeBulk() {
    if (selectedItems.length === 0) return;
    setBusy(true);
    bulkDeleteUploads(selectedItems.map((u) => u.id), alasan.trim() || undefined)
      .then(() => {
        setBulkOpen(false);
        setAlasan("");
        load();
        reload();
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
  }

  function loadMore() {
    getUploads({ status: tab, limit: PAGE_SIZE, offset: items?.length ?? 0 })
      .then((r) => {
        setItems((prev) => [...(prev ?? []), ...r]);
        setHasMore(r.length === PAGE_SIZE);
      })
      .catch((e: Error) => setError(e.message));
  }

  function remove() {
    if (!target) return;
    setBusy(true);
    deleteUpload(target.id, alasan.trim() || undefined)
      .then(() => {
        setTarget(null);
        setAlasan("");
        load();
        reload(); // rentang tanggal dan divisi bisa berubah
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
  }

  return (
    <div>
      <PageHeader title="Riwayat Upload" description="File presensi yang pernah diunggah beserta statusnya. Upload yang gagal dibersihkan otomatis setelah beberapa waktu." />

      <div className="space-y-5">
        <div className="inline-flex gap-1 rounded-xl border border-line bg-white p-1 shadow-card" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.label}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => changeTab(t.key)}
              className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                tab === t.key ? "bg-accent text-white shadow-glow" : "text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && <p className="rounded-xl border border-status-alpa-border bg-status-alpa-bg px-4 py-3 text-sm text-status-alpa-text" role="alert">{error}</p>}

        {deletable.length > 0 && (
          <div className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${selected.size > 0 ? "border-accent-ring bg-accent-soft" : "border-line bg-white"}`}>
            <label className="inline-flex cursor-pointer items-center gap-2 font-medium">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = selected.size > 0 && !allSelected; }}
                onChange={toggleAll}
                aria-label="Pilih semua file yang bisa dihapus"
                className="h-4 w-4 accent-accent"
              />
              {allSelected ? "Batalkan semua" : "Pilih semua"}
            </label>
            <span className="text-muted">
              {selected.size > 0
                ? <><span className="font-semibold text-ink">{nf.format(selected.size)}</span> file dipilih</>
                : <>{nf.format(deletable.length)} file bisa dihapus</>}
            </span>
            <button
              disabled={selected.size === 0}
              onClick={() => { setAlasan(""); setBulkOpen(true); }}
              className={`${btnDanger} ml-auto h-9 disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <Icon name="trash" size={16} />
              Hapus terpilih{selected.size > 0 ? ` (${nf.format(selected.size)})` : ""}
            </button>
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="h-11 border-b border-line bg-paper text-left">
                  <th className="w-10 pl-6 pr-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      disabled={deletable.length === 0}
                      aria-label="Pilih semua file yang bisa dihapus"
                      className="h-4 w-4 accent-accent disabled:opacity-40"
                    />
                  </th>
                  {["File", "Pengunggah", "Waktu", "Jumlah baris", "Status", ""].map((h, i) => (
                    <th key={h + i} className={`whitespace-nowrap px-4 text-[11px] font-bold uppercase tracking-[0.04em] text-muted`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items?.map((u) => {
                  const s = STATUS[u.status];
                  const canSelect = u.status === "saved";
                  const isSel = selected.has(u.id);
                  return (
                    <tr key={u.id} className={`h-14 border-b border-subtle transition-colors last:border-b-0 ${isSel ? "bg-accent-soft/50" : "hover:bg-paper"}`}>
                      <td className="pl-6 pr-2">
                        {canSelect ? (
                          <input
                            type="checkbox"
                            checked={isSel}
                            onChange={() => toggleOne(u.id)}
                            aria-label={`Pilih ${u.filename}`}
                            className="h-4 w-4 accent-accent"
                          />
                        ) : (
                          <span className="block h-4 w-4" aria-hidden="true" />
                        )}
                      </td>
                      <td className="pr-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-accent-ring bg-accent-soft text-accent" aria-hidden="true">
                            <Icon name="file" size={17} />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold" title={u.filename}>{u.filename}</span>
                            {u.date_from && u.date_to ? (
                              <span className="block text-[11px] text-muted">
                                Periode {dateLabel(u.date_from)} – {dateLabel(u.date_to)}
                              </span>
                            ) : (
                              <span className="block text-[11px] text-faint">Periode tidak tercatat</span>
                            )}
                            {u.sumber && u.sumber.length > 0 && (
                              <span className="mt-1 flex flex-wrap gap-1">
                                {u.sumber.map((s) => (
                                  <span
                                    key={s.jenis_sumber}
                                    title={`${s.nama_file}${s.warnings.length ? ` · ${s.warnings.length} peringatan` : ""}`}
                                    className="inline-flex items-center gap-1 rounded-md border border-line bg-subtle px-1.5 py-0.5 text-[11px] font-semibold text-muted"
                                  >
                                    {SUMBER_LABEL[s.jenis_sumber] ?? s.jenis_sumber}
                                    <span className="num text-ink">{nf.format(s.row_count ?? 0)}</span>
                                    {s.warnings.length > 0 && <span className="text-status-terlambat-text">!</span>}
                                  </span>
                                ))}
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 text-[13px]">{u.uploader}</td>
                      <td className="whitespace-nowrap px-4 text-[13px] text-muted">{new Date(u.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</td>
                      <td className="num px-4 text-[13px]">{nf.format(u.row_count ?? 0)}</td>
                      <td className="px-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${s.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 pr-6 text-right">
                        {/* TODO Fase 4: tampilkan hanya untuk HR Admin */}
                        {u.status === "saved" && (
                          <button onClick={() => setTarget(u)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-status-alpa-text transition-colors hover:bg-status-alpa-bg focus-visible:outline-2 focus-visible:outline-status-alpa-text">
                            <Icon name="trash" size={15} />
                            Hapus
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {items && items.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-14 text-center text-muted">Tidak ada data pada tab ini.</td></tr>
                )}
                {!items && !error && (
                  <tr><td colSpan={7} className="px-6 py-14 text-center text-muted">Memuat data...</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {hasMore && (
          <div className="text-center">
            <button onClick={loadMore} className="h-10 rounded-xl border border-line bg-white px-5 text-sm font-semibold transition-colors hover:bg-paper">
              Muat lebih banyak
            </button>
          </div>
        )}
      </div>

      <Overlay open={!!target} onClose={() => !busy && setTarget(null)} title="Hapus upload" width={520}>
        <div className="space-y-4 p-6">
          <div className="flex items-start gap-3 rounded-xl border border-status-terlambat-border bg-status-terlambat-bg p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-status-terlambat-text" aria-hidden="true">
              <Icon name="alert" size={19} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-amber-900">Data presensi dihapus, file asli tetap aman</p>
              <p className="mt-1 text-[13px] text-amber-800">
                Upload <span className="font-semibold">{target?.filename}</span> beserta {nf.format(target?.row_count ?? 0)} baris
                rekap presensi akan dihapus dari dashboard. File aslinya dipindahkan ke{" "}
                <span className="font-semibold">Tempat Sampah</span> di halaman Arsip File dan masih bisa dipulihkan
                selama masa tunggu belum habis.
              </p>
            </div>
          </div>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
            Alasan (opsional)
            <textarea
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Contoh: salah unggah, data duplikat"
              className={`${fieldClass} h-auto w-full py-2 font-normal`}
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button onClick={remove} disabled={busy} className={btnDanger}>
              <Icon name="trash" size={16} />
              {busy ? "Menghapus..." : "Ya, hapus dari dashboard"}
            </button>
            <button onClick={() => setTarget(null)} disabled={busy} className={btnSecondary}>Batal</button>
          </div>
        </div>
      </Overlay>

      <Overlay open={bulkOpen} onClose={() => !busy && setBulkOpen(false)} title="Hapus beberapa upload" width={560}>
        <div className="space-y-4 p-6">
          <div className="flex items-start gap-3 rounded-xl border border-status-terlambat-border bg-status-terlambat-bg p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-status-terlambat-text" aria-hidden="true">
              <Icon name="alert" size={19} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-amber-900">
                {nf.format(selectedItems.length)} file akan dihapus dari dashboard
              </p>
              <p className="mt-1 text-[13px] text-amber-800">
                Data presensi dari file-file ini dihapus dari dashboard. Semua file aslinya dipindahkan ke{" "}
                <span className="font-semibold">Tempat Sampah</span> di halaman Arsip File dan masih bisa dipulihkan
                selama masa tunggu belum habis.
              </p>
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto rounded-xl border border-line">
            <ul className="divide-y divide-line text-sm">
              {selectedItems.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate font-medium" title={u.filename}>{u.filename}</span>
                    <span className="text-[11px] text-muted">{nf.format(u.row_count ?? 0)} baris</span>
                  </span>
                  <span className="shrink-0 rounded-full border border-line bg-subtle px-2 py-0.5 text-[11px] font-semibold text-muted">
                    {u.uploader}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
            Alasan (opsional, berlaku untuk semua file)
            <textarea
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Contoh: salah unggah, data duplikat"
              className={`${fieldClass} h-auto w-full py-2 font-normal`}
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button onClick={removeBulk} disabled={busy || selectedItems.length === 0} className={btnDanger}>
              <Icon name="trash" size={16} />
              {busy ? "Menghapus..." : `Ya, hapus ${nf.format(selectedItems.length)} file`}
            </button>
            <button onClick={() => setBulkOpen(false)} disabled={busy} className={btnSecondary}>Batal</button>
          </div>
        </div>
      </Overlay>
    </div>
  );
}

