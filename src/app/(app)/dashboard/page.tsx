"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import DataTable from "@/components/dashboard/DataTable";
import DeptCompare from "@/components/dashboard/DeptCompare";
import { ActiveChips, AdvancedFilter, DeptTabs } from "@/components/dashboard/FilterControls";
import KpiStrip from "@/components/dashboard/KpiStrip";
import SourcePanel from "@/components/dashboard/SourcePanel";
import TopEmployees from "@/components/dashboard/TopEmployees";
import { Gauge, StatusDonut, TrendChart, TrendLegend, WeekdayChart, type WeekdayPoint } from "@/components/dashboard/Charts";
import Panel from "@/components/ui/Panel";
import { btnPrimary } from "@/components/ui/Button";
import {
  dateLabel, getByDepartment, getStatusComposition, getSummary, getTrend, getUploads, granularityOf, isHR, nf, num1,
  type DeptRow, type Filters, type StatusCount, type SummaryResponse, type TrendPoint, type UploadHistory,
} from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { useFilters } from "@/lib/filters";
import { WEEKDAY_LONG, WEEKDAY_SHORT, weekdayOf } from "@/lib/format";

type DashData = { summary: SummaryResponse; trend: TrendPoint[]; dayTrend: TrendPoint[]; status: StatusCount[]; dept: DeptRow[] };

function periodText(f: Filters) {
  if (f.from && f.to) return `${dateLabel(f.from)} sampai ${dateLabel(f.to)}`;
  if (f.from) return `Sejak ${dateLabel(f.from)}`;
  if (f.to) return `Sampai ${dateLabel(f.to)}`;
  return "Semua periode";
}

// Rata-rata tingkat kehadiran harian dikelompokkan menurut hari dalam seminggu.
function weekdayStats(points: TrendPoint[]): WeekdayPoint[] {
  const acc = new Map<number, { s: number; n: number }>();
  for (const p of points) {
    if (p.kehadiran_pct === null) continue;
    const w = weekdayOf(p.period);
    const a = acc.get(w) ?? { s: 0, n: 0 };
    a.s += p.kehadiran_pct;
    a.n += 1;
    acc.set(w, a);
  }
  const rows = [1, 2, 3, 4, 5, 6, 0]
    .filter((w) => acc.has(w))
    .map((w) => ({ label: WEEKDAY_SHORT[w], full: WEEKDAY_LONG[w], value: Math.round((acc.get(w)!.s / acc.get(w)!.n) * 10) / 10, best: false }));
  const max = Math.max(...rows.map((r) => r.value));
  rows.forEach((r) => (r.best = r.value === max));
  return rows;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const hr = isHR(user);
  const { meta, filters, patch, error: metaError, reload } = useFilters();
  const [data, setData] = useState<DashData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [latest, setLatest] = useState<UploadHistory | null>(null);

  // Riwayat upload khusus HR; departemen lain tidak memanggilnya (akan 403) dan tidak melihat panel Sumber Data.
  useEffect(() => {
    if (!hr) return;
    getUploads({ status: "saved", limit: 1 }).then((u) => setLatest(u[0] ?? null)).catch(() => {});
  }, [hr]);

  useEffect(() => {
    if (!filters) return;
    let off = false;
    queueMicrotask(() => {
      if (!off) setLoading(true);
    });
    const g = granularityOf(filters);
    Promise.all([
      getSummary(filters),
      getTrend(filters, g),
      g === "day" ? Promise.resolve(null) : getTrend(filters, "day"),
      getStatusComposition(filters),
      getByDepartment(filters),
    ])
      .then(([summary, trend, dayTrend, status, dept]) => {
        if (off) return;
        setData({ summary, trend, dayTrend: dayTrend ?? trend, status, dept });
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
  }, [filters]);

  const header = (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 max-w-xl">
        <h1 className="text-[28px] font-bold leading-9 tracking-tight">Dashboard Presensi Karyawan</h1>
        <p className="mt-1 text-sm leading-5 text-muted">Analisis keterlambatan, rekonsiliasi data kehadiran, dan validasi jam kerja seluruh unit organisasi.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <DeptTabs />
        <AdvancedFilter />
      </div>
    </div>
  );

  const failure = metaError || (error && !data ? error : "");
  if (failure) {
    return (
      <div>
        {header}
        <div className="rounded-2xl border border-status-alpa-border bg-status-alpa-bg p-5 text-sm text-red-900" role="alert">
          <p className="font-semibold">Data tidak dapat dimuat</p>
          <p className="mt-1">{failure}</p>
          <button onClick={() => (metaError ? reload() : patch({}))} className="mt-3 font-semibold underline">Coba lagi</button>
        </div>
      </div>
    );
  }
  if (!filters || !meta || !data) {
    return (
      <div>
        {header}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="Memuat data">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-[158px] animate-pulse rounded-2xl border border-line bg-white" />)}
        </div>
      </div>
    );
  }
  if (!meta.max_date) {
    return (
      <div>
        {header}
        <Panel>
          <div className="px-6 py-14 text-center">
            <p className="text-base font-semibold">Belum ada data presensi</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Unggah file presensi bulanan dari mesin absen atau HRIS untuk mulai melihat ringkasan.</p>
            <Link href="/upload" className={`${btnPrimary} mt-5`}>Upload Presensi</Link>
          </div>
        </Panel>
      </div>
    );
  }

  const { summary, trend, dayTrend, status, dept } = data;
  const c = summary.current;
  const empty = c.records === 0;
  const hadirBase = c.hadir - c.dinas_luar; // hanya yang berstatus Hadir yang dinilai ketepatan waktunya
  const onTime = hadirBase > 0 ? ((hadirBase - c.terlambat) * 100) / hadirBase : null;
  const weekdays = weekdayStats(dayTrend);
  const lowest = weekdays.length ? weekdays.reduce((a, b) => (b.value < a.value ? b : a)) : null;
  const late = filters.status === "Terlambat";

  return (
    <div>
      {header}
      <p className="-mt-3 mb-5 text-[13px] text-muted">
        Periode <span className="font-semibold text-ink">{periodText(filters)}</span>
        {filters.departemen && <> , divisi <span className="font-semibold text-ink">{filters.departemen}</span></>}
      </p>
      <ActiveChips />
      {error && <p className="mb-4 rounded-xl border border-status-alpa-border bg-status-alpa-bg px-4 py-3 text-sm text-status-alpa-text" role="alert">{error}</p>}

      <div className={`space-y-5 transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
        <KpiStrip summary={summary} />

        {empty ? (
          <Panel>
            <div className="p-12 text-center text-sm text-muted">Tidak ada data presensi untuk filter ini. Ubah periode, divisi, atau status.</div>
          </Panel>
        ) : (
          <>
            <div className="grid items-stretch gap-5 xl:grid-cols-12">
              <Panel
                title="Tren Kehadiran & Ketepatan Waktu"
                subtitle={granularityOf(filters) === "day" ? "Pergerakan tingkat kehadiran dan jumlah keterlambatan per hari" : "Pergerakan tingkat kehadiran dan jumlah keterlambatan per bulan"}
                action={<TrendLegend />}
                className="xl:col-span-8"
              >
                <TrendChart data={trend} />
                <DeptCompare data={dept} />
              </Panel>

              <div className="flex flex-col gap-5 xl:col-span-4">
                <Panel title="Kehadiran per Hari" subtitle="Rata-rata tingkat kehadiran menurut hari dalam seminggu" className="flex-1">
                  {weekdays.length >= 3 ? (
                    <>
                      <WeekdayChart data={weekdays} />
                      {lowest && (
                        <p className="px-6 pb-5 pt-2 text-[13px] text-muted">
                          Kehadiran terendah: <span className="font-semibold text-ink">{lowest.full}</span> (<span className="tabular-nums">{num1(lowest.value)}%</span>)
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="px-6 pb-6 pt-3 text-sm text-muted">Butuh data minimal tiga hari berbeda dalam seminggu untuk menampilkan perbandingan.</p>
                  )}
                </Panel>
                <Panel title="Ketepatan Waktu" subtitle="Hadir tanpa terlambat dari seluruh kehadiran" className="flex-1">
                  <div className="px-6 pb-5 pt-2">
                    <Gauge value={onTime} />
                    <p className="mt-1 text-center text-[13px] text-muted">
                      <span className="num font-semibold text-ink">{nf.format(Math.max(0, hadirBase - c.terlambat))}</span> dari <span className="num font-semibold text-ink">{nf.format(hadirBase)}</span> kehadiran tepat waktu
                    </p>
                    <button
                      onClick={() => patch({ status: late ? "" : "Terlambat" })}
                      className="mx-auto mt-3 flex items-center rounded-xl border border-line px-4 py-2 text-[13px] font-semibold transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      {late ? "Tampilkan semua status" : "Lihat yang terlambat"}
                    </button>
                  </div>
                </Panel>
              </div>
            </div>

            <div className={`grid items-stretch gap-5 ${hr ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
              <Panel title="Komposisi Status" subtitle="Jumlah hari kerja per status" className="h-full">
                <StatusDonut data={status} />
              </Panel>
              <TopEmployees filters={filters} />
              {hr && <SourcePanel latest={latest} records={c.records} />}
            </div>

            <DataTable key={JSON.stringify(filters)} filters={filters} />
          </>
        )}
      </div>
    </div>
  );
}
