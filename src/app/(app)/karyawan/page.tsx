"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "@/components/ui/Icon";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import { btnSecondary, fieldClass } from "@/components/ui/Button";
import {
  getEmployeeMeta, getEmployees, nf,
  type EmployeeMeta, type EmployeeQuery, type EmployeeRow,
} from "@/lib/api";

const PAGE_SIZE = 25;

function Badge({ children, tone = "muted" }: { children: React.ReactNode; tone?: "ok" | "bad" | "muted" }) {
  const cls = {
    ok: "border-status-hadir-border bg-status-hadir-bg text-status-hadir-text",
    bad: "border-status-alpa-border bg-status-alpa-bg text-status-alpa-text",
    muted: "border-line bg-subtle text-muted",
  }[tone];
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>{children}</span>;
}

export default function KaryawanPage() {
  const [meta, setMeta] = useState<EmployeeMeta | null>(null);
  const [data, setData] = useState<{ items: EmployeeRow[]; total: number } | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [organisasi, setOrganisasi] = useState("");
  const [cabang, setCabang] = useState("");
  const [resign, setResign] = useState("");
  const [page, setPage] = useState(1);
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    getEmployeeMeta().then(setMeta).catch(() => undefined);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(() => {
    const query: EmployeeQuery = {
      q: debounced.trim() || undefined,
      organisasi: organisasi || undefined,
      cabang: cabang || undefined,
      resign: resign === "" ? undefined : resign === "true",
      page, page_size: PAGE_SIZE,
    };
    getEmployees(query)
      .then((r) => { setData({ items: r.items, total: r.total }); setError(""); })
      .catch((e: Error) => setError(e.message));
  }, [debounced, organisasi, cabang, resign, page]);

  useEffect(load, [load]);

  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const hasFilter = q || organisasi || cabang || resign;

  function reset() {
    setQ(""); setOrganisasi(""); setCabang(""); setResign(""); setPage(1);
  }

  const range = useMemo(() => {
    if (!data || data.total === 0) return "0";
    const from = (page - 1) * PAGE_SIZE + 1;
    const to = Math.min(page * PAGE_SIZE, data.total);
    return `${nf.format(from)}–${nf.format(to)} dari ${nf.format(data.total)}`;
  }, [data, page]);

  return (
    <div>
      <PageHeader
        title="Master Karyawan"
        description="Data karyawan yang terbentuk otomatis dari file upload (Report Attendance dan Activity). Dipakai untuk mencocokkan NIK pada data presensi dan Kinerja Penjualan."
      />

      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <div className="text-xs font-medium text-muted">Total karyawan</div>
            <div className="num mt-1 text-2xl font-bold tracking-tight">{nf.format(meta?.total ?? 0)}</div>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <div className="text-xs font-medium text-muted">Status resign</div>
            <div className="num mt-1 text-2xl font-bold tracking-tight text-status-alpa-text">{nf.format(meta?.resign_count ?? 0)}</div>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <div className="text-xs font-medium text-muted">Organisasi</div>
            <div className="num mt-1 text-2xl font-bold tracking-tight">{nf.format(meta?.organisasi.length ?? 0)}</div>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <div className="text-xs font-medium text-muted">Cabang</div>
            <div className="num mt-1 text-2xl font-bold tracking-tight">{nf.format(meta?.cabang.length ?? 0)}</div>
          </div>
        </div>

        <Panel title="Pencarian" subtitle="Cari berdasarkan Employee ID atau nama, lalu saring organisasi, cabang, dan status resign">
          <div className="grid gap-4 px-6 pb-5 pt-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted lg:col-span-2">
              Employee ID / Nama
              <div className="relative">
                <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input className={`${fieldClass} w-full pl-9`} placeholder="Contoh: LS019 atau Kamaludin" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
              Organisasi
              <select className={`${fieldClass} w-full`} value={organisasi} onChange={(e) => { setOrganisasi(e.target.value); setPage(1); }}>
                <option value="">Semua organisasi</option>
                {meta?.organisasi.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
              Cabang
              <select className={`${fieldClass} w-full`} value={cabang} onChange={(e) => { setCabang(e.target.value); setPage(1); }}>
                <option value="">Semua cabang</option>
                {meta?.cabang.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
              Status
              <select className={`${fieldClass} w-full`} value={resign} onChange={(e) => { setResign(e.target.value); setPage(1); }}>
                <option value="">Semua status</option>
                <option value="false">Aktif</option>
                <option value="true">Resign</option>
              </select>
            </label>
          </div>
          {hasFilter && (
            <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-3">
              <p className="text-xs text-muted">Menampilkan {range}</p>
              <button onClick={reset} className={btnSecondary}>Atur ulang filter</button>
            </div>
          )}
        </Panel>

        {error && <p className="rounded-xl border border-status-alpa-border bg-status-alpa-bg px-4 py-3 text-sm text-status-alpa-text" role="alert">{error}</p>}

        <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          <div className="flex items-center justify-between gap-3 px-6 pb-3 pt-5">
            <h2 className="text-[17px] font-bold tracking-tight">Daftar karyawan</h2>
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">
              {data ? `${nf.format(data.total)} karyawan` : "Memuat..."}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="h-11 border-y border-line bg-paper text-left text-[11px] font-bold uppercase tracking-[0.04em] text-muted">
                  <th className="pl-6 pr-3.5">Karyawan / NIK</th>
                  <th className="px-3.5">Jabatan</th>
                  <th className="px-3.5">Organisasi</th>
                  <th className="px-3.5">Cabang</th>
                  <th className="px-3.5">Status kerja</th>
                  <th className="px-3.5 pr-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((e) => (
                  <tr key={e.employee_id} className="h-14 border-b border-subtle last:border-b-0 hover:bg-paper">
                    <td className="pl-6 pr-3.5">
                      <div className="whitespace-nowrap text-sm font-semibold leading-5">{e.nama}</div>
                      <div className="num text-[11px] leading-4 text-muted">{e.employee_id}</div>
                    </td>
                    <td className="px-3.5 text-[13px]">{e.jabatan ?? "-"}</td>
                    <td className="px-3.5 text-[13px]">{e.organisasi ?? "-"}</td>
                    <td className="px-3.5 text-[13px] text-muted">{e.cabang ?? "-"}</td>
                    <td className="px-3.5">
                      <Badge tone={e.resign ? "bad" : "ok"}>{e.resign ? "Resign" : (e.status_kerja ?? "Aktif")}</Badge>
                    </td>
                    <td className="px-3.5 pr-6 text-right">
                      <Link href={`/karyawan/${encodeURIComponent(e.employee_id)}`} className="text-[13px] font-semibold text-accent hover:underline">
                        Lihat presensi
                      </Link>
                    </td>
                  </tr>
                ))}
                {data && data.items.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-14 text-center text-muted">Tidak ada karyawan pada filter ini.</td></tr>
                )}
                {!data && !error && (
                  <tr><td colSpan={6} className="px-6 py-14 text-center text-muted">Memuat data...</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-[13px] text-muted">
            <span>Menampilkan {range}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className={btnSecondary}>Sebelumnya</button>
              <span className="num px-1">Halaman {page} / {pageCount}</span>
              <button onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page >= pageCount} className={btnSecondary}>Berikutnya</button>
            </div>
          </div>
        </section>

        <p className="rounded-xl border border-line bg-white px-4 py-3 text-[13px] leading-5 text-muted">
          Master karyawan dibangun dari kolom Employee ID, nama, organisasi, dan cabang pada file Report Attendance
          (dilengkapi Activity). Data di halaman ini hanya untuk dibaca; perubahan dilakukan dengan mengunggah ulang file sumber.
        </p>
      </div>
    </div>
  );
}
