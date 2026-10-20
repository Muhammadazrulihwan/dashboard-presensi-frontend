"use client";
import { useEffect, useMemo, useState } from "react";
import {
  createColumnHelper, flexRender, getCoreRowModel, useReactTable,
  type PaginationState, type SortingState,
} from "@tanstack/react-table";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import StatusBadge from "@/components/ui/StatusBadge";
import RecordDrawer from "@/components/dashboard/RecordDrawer";
import { dateLabel, getRecords, nf, type AttendanceRow, type Filters, type SortKey } from "@/lib/api";
import { durationLabel } from "@/lib/format";

const col = createColumnHelper<AttendanceRow>();
const RIGHT = new Set(["menit_terlambat"]);

function pageList(cur: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const s = Math.max(2, cur - 1);
  const e = Math.min(total - 1, cur + 1);
  if (s > 2) out.push("…");
  for (let i = s; i <= e; i++) out.push(i);
  if (e < total - 1) out.push("…");
  out.push(total);
  return out;
}

const STATUS_OPTIONS = ["Hadir", "Terlambat", "Izin", "Sakit", "Cuti", "Dinas Luar", "Alpa"];

// Pagination, sorting, dan pencarian dijalankan di server. Komponen ini di-remount (lewat key) saat filter global berubah.
export default function DataTable({ filters, title = "Log Presensi & Anomali Harian", pageSizeDefault = 10 }: { filters: Filters; title?: string; pageSizeDefault?: number }) {
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "tanggal", desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: pageSizeDefault });
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<AttendanceRow | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(query);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const { pageIndex, pageSize } = pagination;
  useEffect(() => {
    let off = false;
    const s = sorting[0];
    getRecords(
      { ...filters, status: status || filters.status },
      { page: pageIndex + 1, pageSize, sort: s ? (s.id as SortKey) : undefined, order: s ? (s.desc ? "desc" : "asc") : undefined, q: debounced }
    )
      .then((r) => {
        if (off) return;
        setRows(r.items);
        setTotal(r.total);
        setError("");
        setLoading(false);
      })
      .catch((e: Error) => {
        if (off) return;
        setError(e.message);
        setLoading(false);
      });
    return () => {
      off = true;
    };
  }, [filters, status, pageIndex, pageSize, sorting, debounced]);

  const columns = useMemo(
    () => [
      col.accessor("tanggal", { header: "Tanggal", cell: (c) => <span className="whitespace-nowrap text-[13px] text-muted">{dateLabel(c.getValue())}</span> }),
      col.accessor("nama", {
        header: "Karyawan / NIK",
        cell: (c) => (
          <div className="flex items-center gap-3">
            <Avatar name={c.getValue()} size={34} />
            <div className="min-w-0">
              <div className="whitespace-nowrap text-sm font-semibold leading-5">{c.getValue()}</div>
              <div className="num text-[11px] leading-4 text-muted">{c.row.original.nik}</div>
            </div>
          </div>
        ),
      }),
      col.accessor("departemen", { header: "Departemen", cell: (c) => <span className="whitespace-nowrap text-[13px] text-status-dinas-text">{c.getValue()}</span> }),
      col.accessor("jam_masuk", {
        header: "Jam Masuk",
        cell: (c) => {
          const late = c.row.original.status === "Hadir" && c.row.original.menit_terlambat > 0;
          return c.getValue() ? (
            <span className={`num text-[13px] font-medium ${late ? "text-status-terlambat-text" : "text-ink"}`}>{c.getValue()}</span>
          ) : (
            <span className="num text-[13px] text-faint">--:--</span>
          );
        },
      }),
      col.accessor("jam_keluar", {
        header: "Jam Keluar",
        enableSorting: false,
        cell: (c) => <span className={`num text-[13px] ${c.getValue() ? "font-medium text-ink" : "text-faint"}`}>{c.getValue() ?? "--:--"}</span>,
      }),
      col.accessor("status", { header: "Status", cell: (c) => <StatusBadge status={c.getValue()} lateMinutes={c.row.original.menit_terlambat} /> }),
      col.accessor("menit_terlambat", {
        header: "Deviasi",
        cell: (c) =>
          c.getValue() > 0 ? (
            <span className="num whitespace-nowrap text-[13px] font-semibold text-status-terlambat-text">+{nf.format(c.getValue())} Menit</span>
          ) : (
            <span className="text-faint">-</span>
          ),
      }),
      col.accessor("durasi_kerja", { header: "Durasi", cell: (c) => <span className="num whitespace-nowrap text-[13px]">{durationLabel(c.getValue())}</span> }),
      col.display({
        id: "aksi",
        header: "",
        cell: (c) => (
          <button
            onClick={() => setSelected(c.row.original)}
            aria-label={`Lihat detail presensi ${c.row.original.nama}`}
            title="Lihat detail" className="relative grid h-8 w-8 place-items-center rounded-lg text-accent transition-colors hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent"
          >
            <Icon name="eye" size={16} />
            <span className="sr-only">Lihat</span>
          </button>
        ),
      }),
    ],
    []
  );

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, pagination },
    pageCount,
    manualPagination: true,
    manualSorting: true,
    onSortingChange: (u) => {
      setSorting(u);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
  });

  const from = total ? pageIndex * pageSize + 1 : 0;
  const to = Math.min((pageIndex + 1) * pageSize, total);
  const nav = "inline-flex h-9 items-center rounded-xl border border-line bg-white px-3.5 text-[13px] font-semibold text-ink transition-colors hover:bg-paper disabled:cursor-not-allowed disabled:text-faint disabled:hover:bg-white";

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-card" aria-busy={loading}>
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 pb-4 pt-5">
        <div className="min-w-0 max-w-xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-[17px] font-bold leading-6 tracking-tight">{title}</h2>
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">{nf.format(total)} Catatan</span>
          </div>
          <p className="mt-1 text-[13px] leading-[18px] text-muted">Daftar rekap kehadiran individu karyawan, jam masuk dan keluar, serta status verifikasi hari kerja.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              placeholder="Filter NIK / Nama..."
              aria-label="Cari nama atau NIK"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 w-56 rounded-xl border border-transparent bg-subtle pl-9 pr-3 text-sm placeholder:text-muted transition-colors focus-visible:border-accent focus-visible:bg-white focus-visible:outline-2 focus-visible:outline-accent/25"
            />
          </div>
          <select
            aria-label="Filter status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
            className="h-10 rounded-xl border border-line bg-white px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-accent"
          >
            <option value="">Semua Status</option>
            {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className={`overflow-x-auto transition-opacity ${loading ? "opacity-60" : ""}`}>
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="h-11 border-y border-line bg-paper text-left">
                {hg.headers.map((h, i) => {
                  const sorted = h.column.getIsSorted();
                  return (
                    <th
                      key={h.id}
                      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                      className={`whitespace-nowrap px-3.5 text-[11px] font-bold uppercase tracking-[0.04em] text-muted ${i === 0 ? "pl-6" : ""} ${RIGHT.has(h.column.id) ? "text-right" : ""}`}
                    >
                      {h.column.getCanSort() ? (
                        <button onClick={h.column.getToggleSortingHandler()} className="inline-flex items-center gap-1 uppercase transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-accent">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {sorted && <Icon name={sorted === "asc" ? "arrowUp" : "arrowDown"} size={12} stroke={2.4} className="text-accent" />}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((r) => (
              <tr key={r.id} className="h-14 border-b border-subtle transition-colors hover:bg-paper">
                {r.getVisibleCells().map((c, i) => (
                  <td key={c.id} className={`px-3.5 ${i === 0 ? "pl-6" : ""} ${RIGHT.has(c.column.id) ? "text-right" : ""}`}>
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {!loading && (rows.length === 0 || error) && (
              <tr>
                <td colSpan={columns.length} className={`px-6 py-12 text-center ${error ? "text-status-alpa-text" : "text-muted"}`}>
                  {error || "Tidak ada catatan presensi yang cocok dengan filter ini."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-[13px] text-muted">
        <span>
          Menampilkan <span className="num font-semibold text-ink">{nf.format(from)} - {nf.format(to)}</span> dari <span className="num font-semibold text-ink">{nf.format(total)}</span> catatan presensi
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Baris per halaman"
            value={pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="mr-2 h-9 rounded-xl border border-line bg-white px-2.5 text-[13px] font-medium text-ink"
          >
            {[10, 25, 50].map((n) => <option key={n} value={n}>{n} per halaman</option>)}
          </select>
          <button className={nav} onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Sebelumnya</button>
          <div className="flex items-center gap-1" role="navigation" aria-label="Halaman">
            {pageList(pageIndex + 1, pageCount).map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} className="px-1 text-faint">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => table.setPageIndex(p - 1)}
                  aria-current={p === pageIndex + 1 ? "page" : undefined}
                  className={`num grid h-9 min-w-9 place-items-center rounded-xl px-2 text-[13px] font-semibold transition-colors ${p === pageIndex + 1 ? "bg-accent text-white shadow-glow" : "text-muted hover:bg-subtle hover:text-ink"}`}
                >
                  {p}
                </button>
              )
            )}
          </div>
          <button className={nav} onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Berikutnya</button>
        </div>
      </div>
      <RecordDrawer row={selected} filters={filters} onClose={() => setSelected(null)} />
    </section>
  );
}
