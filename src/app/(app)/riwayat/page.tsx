"use client";
import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import PageHeader from "@/components/ui/PageHeader";
import { deleteUpload, getUploads, nf, type UploadHistory } from "@/lib/api";
import { useFilters } from "@/lib/filters";

const STATUS = {
  saved: { label: "Tersimpan", cls: "border-status-hadir-border bg-status-hadir-bg text-status-hadir-text", dot: "bg-status-hadir-text" },
  failed: { label: "Gagal", cls: "border-status-alpa-border bg-status-alpa-bg text-status-alpa-text", dot: "bg-status-alpa-text" },
  deleted: { label: "Dihapus", cls: "border-line bg-subtle text-muted", dot: "bg-faint" },
} as const;
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

  const load = useCallback(() => {
    getUploads({ status: tab, limit: PAGE_SIZE, offset: 0 })
      .then((r) => {
        setItems(r);
        setHasMore(r.length === PAGE_SIZE);
        setError("");
      })
      .catch((e: Error) => setError(e.message));
  }, [tab]);

  useEffect(load, [load]);

  function changeTab(key: string) {
    setItems(null);
    setTab(key);
  }

  function loadMore() {
    getUploads({ status: tab, limit: PAGE_SIZE, offset: items?.length ?? 0 })
      .then((r) => {
        setItems((prev) => [...(prev ?? []), ...r]);
        setHasMore(r.length === PAGE_SIZE);
      })
      .catch((e: Error) => setError(e.message));
  }

  function remove(u: UploadHistory) {
    if (!window.confirm(`Hapus upload ${u.filename}? Semua data dari file ini ikut terhapus.`)) return;
    deleteUpload(u.id)
      .then(() => {
        load();
        reload(); // rentang tanggal dan divisi bisa berubah
      })
      .catch((e: Error) => setError(e.message));
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

        <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="h-11 border-b border-line bg-paper text-left">
                  {["File", "Pengunggah", "Waktu", "Jumlah baris", "Status", ""].map((h, i) => (
                    <th key={h + i} className={`whitespace-nowrap px-4 text-[11px] font-bold uppercase tracking-[0.04em] text-muted ${i === 0 ? "pl-6" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items?.map((u) => {
                  const s = STATUS[u.status];
                  return (
                    <tr key={u.id} className="h-14 border-b border-subtle transition-colors last:border-b-0 hover:bg-paper">
                      <td className="pl-6 pr-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-accent-ring bg-accent-soft text-accent" aria-hidden="true">
                            <Icon name="file" size={17} />
                          </span>
                          <span className="font-semibold">{u.filename}</span>
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
                          <button onClick={() => remove(u)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-status-alpa-text transition-colors hover:bg-status-alpa-bg focus-visible:outline-2 focus-visible:outline-status-alpa-text">
                            <Icon name="trash" size={15} />
                            Hapus
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {items && items.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-14 text-center text-muted">Tidak ada data pada tab ini.</td></tr>
                )}
                {!items && !error && (
                  <tr><td colSpan={6} className="px-6 py-14 text-center text-muted">Memuat data...</td></tr>
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
    </div>
  );
}
