"use client";
import Link from "next/link";
import DataTable from "@/components/dashboard/DataTable";
import { ActiveChips, AdvancedFilter, DeptTabs } from "@/components/dashboard/FilterControls";
import Panel from "@/components/ui/Panel";
import { btnPrimary } from "@/components/ui/Button";
import { dateLabel } from "@/lib/api";
import { useFilters } from "@/lib/filters";

export default function PresensiPage() {
  const { meta, filters, error } = useFilters();
  const period = filters?.from && filters?.to ? `${dateLabel(filters.from)} sampai ${dateLabel(filters.to)}` : "Semua periode";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-xl">
          <h1 className="text-[28px] font-bold leading-9 tracking-tight">Data Presensi</h1>
          <p className="mt-1 text-sm leading-5 text-muted">Seluruh catatan presensi harian per karyawan. Periode: <span className="font-semibold text-ink">{period}</span>.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DeptTabs />
          <AdvancedFilter />
        </div>
      </div>
      <ActiveChips />
      {error ? (
        <div className="rounded-2xl border border-status-alpa-border bg-status-alpa-bg p-5 text-sm text-red-900" role="alert">{error}</div>
      ) : !filters || !meta ? (
        <div className="h-64 animate-pulse rounded-2xl border border-line bg-white" aria-busy="true" />
      ) : !meta.max_date ? (
        <Panel>
          <div className="px-6 py-14 text-center">
            <p className="text-base font-semibold">Belum ada data presensi</p>
            <Link href="/upload" className={`${btnPrimary} mt-5`}>Upload Presensi</Link>
          </div>
        </Panel>
      ) : (
        <DataTable key={JSON.stringify(filters)} filters={filters} title="Data Presensi Karyawan" pageSizeDefault={25} />
      )}
    </div>
  );
}
