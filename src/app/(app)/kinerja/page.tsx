"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ActiveChips, AdvancedFilter, DeptTabs } from "@/components/dashboard/FilterControls";
import SortableTable, { type Column } from "@/components/sales/SortableTable";
import Icon from "@/components/ui/Icon";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import { btnSecondary } from "@/components/ui/Button";
import {
  canPerformance, dateLabel, employeePdfUrl, formatMinutes, getPerformance, nf, num1, pct,
  type Filters, type PerformanceRow,
} from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { useFilters } from "@/lib/filters";

const RANK_STYLE = [
  "bg-amber-100 text-amber-700", // #1
  "bg-slate-100 text-slate-600", // #2
  "bg-orange-100 text-orange-700", // #3
];

function periodText(f: Filters): string {
  if (f.from && f.to) return `${dateLabel(f.from)} sampai ${dateLabel(f.to)}`;
  if (f.from) return `Sejak ${dateLabel(f.from)}`;
  if (f.to) return `Sampai ${dateLabel(f.to)}`;
  return "semua periode";
}

export default function KinerjaPage() {
  const { user } = useAuth();
  const allowed = canPerformance(user);
  const { meta, filters, error: metaError } = useFilters();
  const [rows, setRows] = useState<PerformanceRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!allowed || !filters) return;
    let alive = true;
    getPerformance(filters)
      .then((d) => {
        if (!alive) return;
        setRows(d);
        setError("");
      })
      .catch((e: Error) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [allowed, filters]);

  if (!allowed) {
    return (
      <div>
        <PageHeader title="Kinerja Karyawan" description="Indikator kehadiran, ketepatan waktu, jam kerja, dan lembur per karyawan" />
        <div className="rounded-2xl border border-status-alpa-border bg-status-alpa-bg p-5 text-sm text-status-alpa-text" role="alert">
          Halaman ini hanya untuk departemen HR, Audit, dan Sales/Marketing. Akun IT hanya melihat dashboard ringkas.
        </div>
      </div>
    );
  }

  const failure = metaError || error;
  const total = rows?.length ?? 0;

  // Peringkat: urutan baris mengikuti default kehadiran menurun dari server.
  const ranked = rows ? [...rows].sort((a, b) => (b.kehadiran_pct ?? -1) - (a.kehadiran_pct ?? -1)) : [];
  const rankOf = new Map(ranked.map((r, i) => [r.nik, i + 1]));

  const columns: Column<PerformanceRow>[] = [
    {
      key: "nama", label: "Karyawan", value: (r) => r.nama,
      render: (r) => {
        const rank = rankOf.get(r.nik) ?? 0;
        const badge = rank <= 3 ? RANK_STYLE[rank - 1] : "bg-subtle text-muted";
        return (
          <div className="flex items-center gap-3">
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${badge}`} aria-label={`Peringkat ${rank}`}>{rank}</span>
            <span className="min-w-0">
              <Link href={`/karyawan/${encodeURIComponent(r.nik)}`} className="block truncate font-semibold hover:text-accent">{r.nama}</Link>
              <span className="num text-[11px] text-muted">{r.nik}</span>
            </span>
          </div>
        );
      },
    },
    { key: "departemen", label: "Departemen", value: (r) => r.departemen },
    {
      key: "kehadiran_pct", label: "Kehadiran", align: "right", value: (r) => r.kehadiran_pct,
      render: (r) => <span className="num">{pct(r.kehadiran_pct)}</span>,
    },
    {
      key: "tepat_waktu_pct", label: "Tepat waktu", align: "right", value: (r) => r.tepat_waktu_pct,
      render: (r) => <span className="num">{pct(r.tepat_waktu_pct)}</span>,
    },
    {
      key: "terlambat", label: "Terlambat", align: "right", value: (r) => r.terlambat,
      render: (r) => (
        <span className={`num ${r.terlambat > 0 ? "font-semibold text-status-terlambat-text" : ""}`}>
          {nf.format(r.terlambat)}× <span className="text-[11px] text-muted">{formatMinutes(r.menit_terlambat)}</span>
        </span>
      ),
    },
    {
      key: "izin", label: "Izin/Sakit/Cuti", align: "right", value: (r) => r.izin + r.sakit + r.cuti,
      render: (r) => <span className="num">{nf.format(r.izin + r.sakit + r.cuti)}</span>,
    },
    {
      key: "alpa", label: "Alpa", align: "right", value: (r) => r.alpa,
      render: (r) => <span className={`num ${r.alpa > 0 ? "font-semibold text-status-alpa-text" : ""}`}>{nf.format(r.alpa)}</span>,
    },
    {
      key: "jam_kerja", label: "Jam kerja", align: "right", value: (r) => r.jam_kerja,
      render: (r) => <span className="num">{num1(r.jam_kerja)} j</span>,
    },
    {
      key: "menit_lembur", label: "Lembur", align: "right", value: (r) => r.menit_lembur,
      render: (r) => <span className="num">{formatMinutes(r.menit_lembur)}</span>,
    },
    {
      key: "dikoreksi", label: "Dikoreksi", align: "right", value: (r) => r.dikoreksi,
      render: (r) => r.dikoreksi > 0
        ? <span className="rounded-full border border-accent-ring bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">{nf.format(r.dikoreksi)}</span>
        : <span className="text-faint">-</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Kinerja Karyawan"
        description="Indikator kehadiran, ketepatan waktu, jam kerja, dan lembur per karyawan pada periode aktif"
        actions={
          filters ? (
            <a href={employeePdfUrl(filters)} className={btnSecondary}>
              <Icon name="download" size={16} />
              Export rekap individu
            </a>
          ) : undefined
        }
      />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <p className="text-[13px] text-muted">Periode <span className="font-semibold text-ink">{periodText(filters ?? { from: "", to: "", departemen: "", status: "", karyawan: "" })}</span></p>
        <div className="flex flex-wrap items-center gap-3">
          <DeptTabs />
          <AdvancedFilter />
        </div>
      </div>
      <ActiveChips />

      {failure ? (
        <div className="rounded-2xl border border-status-alpa-border bg-status-alpa-bg p-5 text-sm text-red-900" role="alert">
          <p className="font-semibold">Data tidak dapat dimuat</p>
          <p className="mt-1">{failure}</p>
        </div>
      ) : !filters || !meta || !rows ? (
        <div className="h-64 animate-pulse rounded-2xl border border-line bg-white" aria-busy="true" aria-label="Memuat data" />
      ) : total === 0 ? (
        <Panel>
          <div className="px-6 py-14 text-center text-sm text-muted">Tidak ada data kinerja untuk filter ini.</div>
        </Panel>
      ) : (
        <Panel
          title={`Peringkat ${nf.format(total)} karyawan`}
          subtitle="Diurutkan dari tingkat kehadiran tertinggi. Klik judul kolom untuk mengubah urutan"
        >
          <SortableTable
            rows={rows}
            columns={columns}
            rowKey={(r) => r.nik}
            initialSort={{ key: "kehadiran_pct", dir: "desc" }}
            minWidth={1180}
            empty="Tidak ada karyawan pada filter ini."
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 px-6 py-4">
            <p className="text-xs leading-5 text-muted">
              Tingkat kehadiran = (Hadir + Dinas Luar) dibagi hari kerja. Tepat waktu = Hadir tanpa terlambat dibagi Hadir. Angka mengikuti definisi dashboard.
            </p>
            <Link href="/dashboard" className={btnSecondary}>
              <Icon name="dashboard" size={16} />
              Buka dashboard
            </Link>
          </div>
        </Panel>
      )}
    </div>
  );
}
