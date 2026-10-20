"use client";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import KpiStrip from "@/components/dashboard/KpiStrip";
import { StatusDonut } from "@/components/dashboard/Charts";
import Icon from "@/components/ui/Icon";
import { btnPrimary, btnSecondary } from "@/components/ui/Button";
import Panel from "@/components/ui/Panel";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  dateLabel, emptyFilters, employeeExcelUrl, employeePdfUrl, getEmployeeDetail, nf,
  type EmployeeDetail, type Filters, type StatusCount,
} from "@/lib/api";
import { durationLabel } from "@/lib/format";
import { avatarClass, initials } from "@/lib/theme";

// Filter diteruskan lewat query string agar tautan dari dashboard membawa periode yang sama.
function filtersFromParams(params: URLSearchParams): Filters {
  return {
    ...emptyFilters,
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
    departemen: params.get("departemen") ?? "",
    status: params.get("status") ?? "",
  };
}
const queryOf = (f: Filters) => new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();

function EmployeeDetail() {
  const { nik } = useParams<{ nik: string }>();
  const search = useSearchParams();
  const filters = useMemo(() => filtersFromParams(new URLSearchParams(search.toString())), [search]);
  const [data, setData] = useState<EmployeeDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let off = false;
    getEmployeeDetail(nik, filters)
      .then((d) => { if (!off) { setData(d); setError(""); } })
      .catch((e: Error) => { if (!off) setError(e.message); });
    return () => { off = true; };
  }, [nik, filters]);

  const backHref = `/dashboard${queryOf(filters) ? `?${queryOf(filters)}` : ""}`;
  const header = (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        {data && (
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-base font-bold ${avatarClass(data.nama)}`} aria-hidden="true">
            {initials(data.nama)}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-[28px] font-bold leading-9 tracking-tight">{data ? data.nama : "Detail karyawan"}</h1>
          <p className="mt-0.5 text-sm text-muted">{data ? `${data.nik}${data.departemen ? ` · ${data.departemen}` : ""}` : "Memuat data..."}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <a href={employeePdfUrl(filters, nik)} className={btnPrimary}>
          <Icon name="download" size={17} />
          Export PDF
        </a>
        <a href={employeeExcelUrl(filters, nik)} className={btnSecondary}>
          <Icon name="download" size={17} />
          Export Excel
        </a>
        <Link href={backHref} className={btnSecondary}>
          <Icon name="chevronLeft" size={17} />
          Kembali
        </Link>
      </div>
    </div>
  );

  if (error) {
    return (
      <div>
        {header}
        <div className="rounded-2xl border border-status-alpa-border bg-status-alpa-bg p-5 text-sm text-red-900" role="alert">
          <p className="font-semibold">Data tidak dapat dimuat</p>
          <p className="mt-1">{error}</p>
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div>
        {header}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="Memuat data">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-[158px] animate-pulse rounded-2xl border border-line bg-white" />)}
        </div>
      </div>
    );
  }

  const r = data.rekap;
  const composition: StatusCount[] = [
    { status: "Hadir", total: Math.max(0, r.hadir - r.dinas_luar) },
    { status: "Terlambat", total: r.terlambat },
    { status: "Izin", total: r.izin },
    { status: "Sakit", total: r.sakit },
    { status: "Cuti", total: r.cuti },
    { status: "Alpa", total: r.alpa },
    { status: "Dinas Luar", total: r.dinas_luar },
  ];

  return (
    <div>
      {header}
      <div className="space-y-5">
        <KpiStrip summary={{ current: r, previous: null }} />
        <div className="grid items-stretch gap-5 lg:grid-cols-3">
          <Panel title="Komposisi Status" subtitle="Jumlah hari kerja per status">
            <StatusDonut data={composition} />
          </Panel>
          <Panel title="Rekap Periode" subtitle={`${nf.format(r.records)} baris data`} className="lg:col-span-2">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-6 pb-6 pt-3 text-sm sm:grid-cols-3">
              {[
                ["Hari kerja", nf.format(r.hari_kerja)],
                ["Hadir", nf.format(r.hadir)],
                ["Dinas luar", nf.format(r.dinas_luar)],
                ["Izin", nf.format(r.izin)],
                ["Sakit", nf.format(r.sakit)],
                ["Cuti", nf.format(r.cuti)],
                ["Alpa", nf.format(r.alpa)],
                ["Terlambat", `${nf.format(r.terlambat)} kali`],
                ["Menit terlambat", nf.format(r.menit_terlambat)],
              ].map(([k, v]) => (
                <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="num mt-0.5 font-semibold">{v}</dd></div>
              ))}
            </dl>
          </Panel>
        </div>

        <Panel title="Data Presensi Harian" subtitle={`${nf.format(data.range.length)} baris pada rentang ini`}>
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <tr>{["Tanggal", "Masuk", "Keluar", "Terlambat", "Durasi", "Status", "Keterangan"].map((h) => <th key={h} className="px-6 py-3 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody>
                {data.range.map((row) => (
                  <tr key={row.id} className="border-t border-line/70 transition-colors hover:bg-subtle">
                    <td className="px-6 py-3">{dateLabel(row.tanggal)}</td>
                    <td className="num px-6 py-3">{row.jam_masuk ?? "-"}</td>
                    <td className="num px-6 py-3">{row.jam_keluar ?? "-"}</td>
                    <td className="num px-6 py-3">{row.menit_terlambat > 0 ? <span className="font-semibold text-status-terlambat-text">{row.menit_terlambat}m</span> : "0"}</td>
                    <td className="num px-6 py-3">{durationLabel(row.durasi_kerja)}</td>
                    <td className="px-6 py-3"><StatusBadge status={row.status} lateMinutes={row.menit_terlambat} /></td>
                    <td className="px-6 py-3"><span className="block max-w-[240px] truncate" title={row.keterangan ?? ""}>{row.keterangan ?? "-"}</span></td>
                  </tr>
                ))}
                {data.range.length === 0 && <tr><td colSpan={7} className="px-6 py-12 text-center text-muted">Tidak ada data pada rentang ini.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

// useSearchParams butuh Suspense boundary saat prerender.
export default function EmployeeDetailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Memuat data...</p>}>
      <EmployeeDetail />
    </Suspense>
  );
}
