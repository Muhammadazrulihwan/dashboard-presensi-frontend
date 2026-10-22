"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import AssessmentModal from "@/components/sales/AssessmentModal";
import SalesBadge, { ProgressBar } from "@/components/sales/Badges";
import SortableTable, { type Column } from "@/components/sales/SortableTable";
import { btnPrimary, btnSecondary, fieldClass } from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import {
  canPerformance, deleteSalesUpload, getCabangPerf, getPerusahaanPerf, getSalesMeta, getSalesUploads, getSalesmen,
  isApprover, isSalesTeam, monthLabel, nf, pct, ratioPct, rupiah,
  type CabangRow, type PerusahaanData, type SalesGranularity, type SalesMeta, type Salesman, type SalesUploadRow,
} from "@/lib/api";

type Tab = "salesman" | "cabang" | "perusahaan";
const TABS: { id: Tab; label: string }[] = [
  { id: "salesman", label: "Salesman" },
  { id: "cabang", label: "Cabang" },
  { id: "perusahaan", label: "Perusahaan" },
];

const msg = (e: unknown) => (e instanceof Error ? e.message : "Gagal memuat data");

function Kpi({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

const Capaian = ({ v }: { v: number | null }) =>
  v === null ? <span className="text-muted">-</span> : (
    <span className="inline-flex items-center justify-end gap-2">
      <ProgressBar pct={v} />
      <span className="num w-14 text-right font-semibold">{pct(v)}</span>
    </span>
  );

function SalesmanTab({ rows, canApprove, onReview }: { rows: Salesman[]; canApprove: boolean; onReview: (r: Salesman) => void }) {
  const columns: Column<Salesman>[] = [
    {
      key: "nama", label: "Salesman", value: (r) => r.nama,
      render: (r) => (
        <div className="min-w-0">
          <div className="truncate font-semibold">{r.nama}</div>
          <div className="num text-xs text-muted">{r.employee_id}</div>
        </div>
      ),
    },
    { key: "cabang", label: "Cabang", value: (r) => r.cabang },
    { key: "penjualan", label: "Penjualan", align: "right", value: (r) => r.penjualan, render: (r) => <span className="num">{rupiah(r.penjualan)}</span> },
    { key: "target", label: "Target", align: "right", value: (r) => r.target, render: (r) => <span className="num">{rupiah(r.target)}</span> },
    { key: "capaian", label: "Capaian", align: "right", value: (r) => r.capaian_pct, render: (r) => <Capaian v={r.capaian_pct} /> },
    { key: "kontribusi", label: "Kontribusi", align: "right", value: (r) => r.kontribusi_cabang_pct, render: (r) => <span className="num">{pct(r.kontribusi_cabang_pct)}</span> },
    { key: "peringkat", label: "Peringkat", align: "right", value: (r) => r.peringkat_cabang, render: (r) => <span className="num">{r.peringkat_cabang ? `#${r.peringkat_cabang}` : "-"}</span> },
    {
      key: "kehadiran", label: "Kehadiran", align: "right", value: (r) => r.kehadiran_pct,
      render: (r) => r.kehadiran_pct === null
        ? <span className="num text-muted" title="NIK tidak ditemukan di data presensi periode ini">-</span>
        : <span className="num" title={`${r.hari_hadir} dari ${r.hari_kerja} hari kerja`}>{pct(r.kehadiran_pct)}</span>,
    },
    { key: "terlambat", label: "Terlambat", align: "right", value: (r) => r.terlambat_hari, render: (r) => <span className="num">{r.terlambat_hari === null ? "-" : `${r.terlambat_hari} hari`}</span> },
    { key: "r_terima", label: "Penerimaan", align: "right", value: (r) => ratioPct(r.penerimaan, r.penjualan), render: (r) => <span className="num">{pct(ratioPct(r.penerimaan, r.penjualan))}</span> },
    { key: "r_piutang", label: "Piutang", align: "right", value: (r) => ratioPct(r.piutang_outlet, r.penjualan), render: (r) => <span className="num">{pct(ratioPct(r.piutang_outlet, r.penjualan))}</span> },
    { key: "r_bad", label: "Bad debt", align: "right", value: (r) => ratioPct(r.sisa_bad_debt, r.penjualan), render: (r) => <span className="num">{pct(ratioPct(r.sisa_bad_debt, r.penjualan))}</span> },
    { key: "kelayakan", label: "Kelayakan", value: (r) => r.status_kelayakan, render: (r) => <SalesBadge label={r.status_kelayakan} /> },
    {
      key: "persetujuan", label: "Persetujuan", value: (r) => r.assessment_status,
      render: (r) => (
        <div>
          <SalesBadge label={r.assessment_status} />
          {r.approved_by && <div className="mt-0.5 text-[11px] text-muted">oleh {r.approved_by}</div>}
        </div>
      ),
    },
  ];
  if (canApprove) {
    columns.push({
      key: "aksi", label: "", value: () => null,
      render: (r) => <button onClick={() => onReview(r)} className={`${btnSecondary} h-8`}>{r.assessment_status === "Draf" ? "Tinjau" : "Ubah"}</button>,
    });
  }
  return <SortableTable rows={rows} columns={columns} rowKey={(r) => `${r.employee_id}-${r.periode}`} initialSort={{ key: "penjualan", dir: "desc" }} minWidth={1700} empty="Belum ada data salesman untuk filter ini." />;
}

const CABANG_COLUMNS: Column<CabangRow>[] = [
  { key: "peringkat", label: "Peringkat", value: (r) => r.peringkat, render: (r) => <span className="num font-semibold">{r.peringkat ? `#${r.peringkat}` : "-"}</span> },
  { key: "cabang", label: "Cabang", value: (r) => r.cabang, render: (r) => <span className="font-semibold">{r.cabang}</span> },
  { key: "total", label: "Total penjualan", align: "right", value: (r) => r.total_penjualan, render: (r) => <span className="num">{rupiah(r.total_penjualan)}</span> },
  { key: "target", label: "Target cabang", align: "right", value: (r) => r.target_cabang, render: (r) => <span className="num">{rupiah(r.target_cabang)}</span> },
  { key: "capaian", label: "Capaian", align: "right", value: (r) => r.capaian_pct, render: (r) => <Capaian v={r.capaian_pct} /> },
  { key: "sisa", label: "Sisa target", align: "right", value: (r) => r.sisa_target, render: (r) => <span className="num">{rupiah(r.sisa_target)}</span> },
  { key: "kebutuhan", label: "Per hari kerja", align: "right", value: (r) => r.kebutuhan_per_hari_kerja ?? null,
    render: (r) => r.kebutuhan_per_hari_kerja == null
      ? <span className="text-faint">-</span>
      : <span className="num" title={r.sisa_hari_kerja ? `Sisa ${r.sisa_hari_kerja} hari kerja` : undefined}>{rupiah(r.kebutuhan_per_hari_kerja)}</span> },
  { key: "salesman", label: "Salesman", align: "right", value: (r) => r.jumlah_salesman, render: (r) => <span className="num">{nf.format(r.jumlah_salesman)}</span> },
  { key: "layak", label: "Layak", align: "right", value: (r) => r.salesman_layak, render: (r) => <span className="num">{nf.format(r.salesman_layak)}</span> },
  { key: "belum", label: "Belum layak", align: "right", value: (r) => r.salesman_tidak_layak,
    render: (r) => r.salesman_belum_layak && r.salesman_belum_layak.length > 0
      ? <span className="num font-semibold text-status-alpa-text" title={r.salesman_belum_layak.join(", ")}>{nf.format(r.salesman_tidak_layak)}</span>
      : <span className="num">{nf.format(r.salesman_tidak_layak)}</span> },
  { key: "status", label: "Status", value: (r) => r.status, render: (r) => <SalesBadge label={r.status} /> },
];

function PerusahaanTab({ d }: { d: PerusahaanData }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total penjualan" value={<span className="num">{rupiah(d.total_penjualan)}</span>} />
        <Kpi label="Target perusahaan" value={<span className="num">{rupiah(d.target_perusahaan)}</span>} hint={d.target_perusahaan === null ? "Target perusahaan belum ada di file" : undefined} />
        <Kpi label="Capaian" value={<span className="num">{pct(d.capaian_pct)}</span>} />
        <Kpi label="Sisa target" value={<span className="num">{rupiah(d.sisa_target)}</span>} />
      </div>
      <Panel title="Cabang">
        <div className="flex flex-wrap items-center gap-4 px-6 pb-6 pt-2">
          <ProgressBar pct={d.capaian_pct} width={240} />
          <p className="text-sm text-muted">
            <span className="num font-bold text-ink">{nf.format(d.cabang_tercapai)}</span> dari <span className="num font-bold text-ink">{nf.format(d.jumlah_cabang)}</span> cabang mencapai target.
          </p>
        </div>
        {d.cabang_belum_tercapai && d.cabang_belum_tercapai.length > 0 && (
          <div className="border-t border-line px-6 py-4">
            <p className="text-xs font-medium text-muted">Cabang belum mencapai target (capaian terendah lebih dulu)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {d.cabang_belum_tercapai.map((c) => (
                <span key={c} className="rounded-full border border-status-terlambat-border bg-status-terlambat-bg px-2.5 py-0.5 text-xs font-semibold text-status-terlambat-text">{c}</span>
              ))}
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

export default function SalesDashboardPage() {
  const { user } = useAuth();
  const allowed = canPerformance(user);
  const approver = isApprover(user);

  const [meta, setMeta] = useState<SalesMeta | null>(null);
  const [periode, setPeriode] = useState("");
  const [cabang, setCabang] = useState("");
  const [tab, setTab] = useState<Tab>("salesman");
  // PRD F31/F35: agregasi kuartal dan tahun hanya untuk tab Cabang & Perusahaan.
  const [granularitas, setGranularitas] = useState<SalesGranularity>("bulan");
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [cabangRows, setCabangRows] = useState<CabangRow[]>([]);
  const [perusahaan, setPerusahaan] = useState<PerusahaanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Salesman | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Pengelolaan upload penjualan (khusus Sales/Marketing): hapus membersihkan penjualan, target, penilaian.
  const [uploads, setUploads] = useState<SalesUploadRow[] | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    if (!allowed) return;
    getSalesMeta()
      .then((m) => { setMeta(m); setPeriode(m.periodes[0] ?? ""); })
      .catch((e) => setError(msg(e)));
  }, [allowed]);

  const loadUploads = useCallback(() => {
    if (!isSalesTeam(user)) return;
    getSalesUploads().then(setUploads).catch(() => setUploads([]));
  }, [user]);
  useEffect(loadUploads, [loadUploads, reloadKey]);

  function removeUpload(row: SalesUploadRow) {
    if (!window.confirm(`Hapus upload "${row.filename}"? Data penjualan, target, dan penilaian periode ${row.periode.join(", ")} akan dibersihkan. File asli masuk tempat sampah arsip dan masih bisa dipulihkan.`)) return;
    setDeleting(row.id);
    deleteSalesUpload(row.id)
      .then(() => { setReloadKey((k) => k + 1); })
      .catch((e) => setError(msg(e)))
      .finally(() => setDeleting(null));
  }

  // Tab Salesman memakai data bulanan; pilihan agregasi hanya berlaku di tab Cabang/Perusahaan.
  useEffect(() => {
    if (tab === "salesman" && granularitas !== "bulan") setGranularitas("bulan");
  }, [tab, granularitas]);

  // Opsi periode menyesuaikan granularitas: bulan (YYYY-MM), kuartal (YYYY-Qn), tahun (YYYY).
  const periodeOptions = useMemo(() => {
    const months = meta?.periodes ?? [];
    if (granularitas === "bulan") return months;
    if (granularitas === "kuartal") {
      return Array.from(new Set(months.map((m) => `${m.slice(0, 4)}-Q${Math.floor((Number(m.slice(5, 7)) - 1) / 3) + 1}`))).sort().reverse();
    }
    return Array.from(new Set(months.map((m) => m.slice(0, 4)))).sort().reverse();
  }, [meta, granularitas]);

  // Saat granularitas berubah, pilih periode pertama yang valid.
  useEffect(() => {
    if (periodeOptions.length > 0 && !periodeOptions.includes(periode)) setPeriode(periodeOptions[0]);
  }, [periodeOptions, periode]);

  useEffect(() => {
    if (!allowed || !periode) return;
    let alive = true;
    // Ditunda satu microtask agar setState tidak dipanggil sinkron di badan effect
    // (aturan react-hooks/set-state-in-effect), mengikuti pola halaman dashboard.
    queueMicrotask(() => {
      if (!alive) return;
      setLoading(true);
      setError("");
    });
    const run =
      tab === "salesman" ? getSalesmen(periode, cabang || undefined).then((d) => alive && setSalesmen(d))
      : tab === "cabang" ? getCabangPerf(periode, granularitas).then((d) => alive && setCabangRows(d))
      : getPerusahaanPerf(periode, granularitas).then((d) => alive && setPerusahaan(d));
    run.catch((e) => alive && setError(msg(e))).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [allowed, periode, cabang, tab, granularitas, reloadKey]);

  const summary = useMemo(() => ({
    layak: salesmen.filter((s) => s.status_kelayakan === "Layak").length,
    belum: salesmen.filter((s) => s.status_kelayakan === "Tidak Layak").length,
    draf: salesmen.filter((s) => s.assessment_status === "Draf").length,
    total: salesmen.reduce((n, s) => n + s.penjualan, 0),
  }), [salesmen]);

  if (!allowed) {
    return (
      <div>
        <PageHeader title="Kinerja Penjualan" />
        <Panel><p className="px-6 py-8 text-sm text-muted">Halaman ini hanya untuk departemen HR, Audit, dan Sales/Marketing.</p></Panel>
      </div>
    );
  }

  const empty = meta !== null && meta.periodes.length === 0;
  return (
    <div>
      <PageHeader
        title="Kinerja Penjualan"
        description="Capaian penjualan terhadap target per salesman, cabang, dan perusahaan, beserta kelayakan performance dan status persetujuannya."
        actions={
          <>
            {tab !== "salesman" && (
              <label className="flex flex-col gap-1 text-xs font-medium text-muted">
                Agregasi
                <select className={fieldClass} value={granularitas} onChange={(e) => setGranularitas(e.target.value as SalesGranularity)} disabled={!meta || empty} aria-label="Agregasi periode">
                  <option value="bulan">Bulanan</option>
                  <option value="kuartal">Kuartal</option>
                  <option value="tahun">Tahunan</option>
                </select>
              </label>
            )}
            <label className="flex flex-col gap-1 text-xs font-medium text-muted">
              Periode
              <select className={fieldClass} value={periode} onChange={(e) => setPeriode(e.target.value)} disabled={!meta || empty} aria-label="Periode">
                {periodeOptions.map((p) => (
                  <option key={p} value={p}>
                    {granularitas === "bulan" ? monthLabel(p) : granularitas === "kuartal" ? p.replace("-", " ") : `Tahun ${p}`}
                  </option>
                ))}
              </select>
            </label>
            {tab === "salesman" && (
              <label className="flex flex-col gap-1 text-xs font-medium text-muted">
                Cabang
                <select className={fieldClass} value={cabang} onChange={(e) => setCabang(e.target.value)} disabled={!meta || empty} aria-label="Cabang">
                  <option value="">Semua cabang</option>
                  {meta?.cabang.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            )}
          </>
        }
      />

      {empty ? (
        <Panel>
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-muted">Belum ada data Kinerja Penjualan.</p>
            {isSalesTeam(user) && <Link href="/sales/upload" className={`${btnPrimary} mt-4`}>Upload data penjualan</Link>}
          </div>
        </Panel>
      ) : (
        <div className="space-y-5">
          <div role="tablist" aria-label="Tingkat kinerja" className="inline-flex gap-1 rounded-xl border border-line bg-white p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-accent ${tab === t.id ? "bg-accent-soft text-accent" : "text-muted hover:bg-subtle hover:text-ink"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {error && <p role="alert" className="rounded-xl border border-status-alpa-border bg-status-alpa-bg px-4 py-3 text-sm text-status-alpa-text">{error}</p>}

          {tab === "salesman" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Kpi label="Total penjualan" value={<span className="num">{rupiah(summary.total)}</span>} hint={`${nf.format(salesmen.length)} salesman`} />
                <Kpi label="Layak performance" value={<span className="num">{nf.format(summary.layak)}</span>} />
                <Kpi label="Belum layak" value={<span className="num">{nf.format(summary.belum)}</span>} hint="Kekurangan tidak ditutup salesman lain" />
                <Kpi label="Menunggu persetujuan" value={<span className="num">{nf.format(summary.draf)}</span>} />
              </div>
              <Panel title="Per salesman" subtitle="Klik judul kolom untuk mengurutkan. Rasio dihitung terhadap penjualan.">
                {loading && salesmen.length === 0 ? <p className="px-6 py-10 text-center text-sm text-muted">Memuat data...</p> : (
                  <SalesmanTab rows={salesmen} canApprove={approver} onReview={setSelected} />
                )}
              </Panel>
            </>
          )}

          {tab === "cabang" && (
            <Panel title="Per cabang" subtitle="Capaian cabang adalah jumlah penjualan semua salesman cabang, jadi bisa saling menutupi.">
              {loading && cabangRows.length === 0 ? <p className="px-6 py-10 text-center text-sm text-muted">Memuat data...</p> : (
                <SortableTable rows={cabangRows} columns={CABANG_COLUMNS} rowKey={(r) => `${r.cabang}-${r.periode}`} initialSort={{ key: "peringkat", dir: "asc" }} minWidth={1100} empty="Belum ada data cabang untuk periode ini." />
              )}
            </Panel>
          )}

          {tab === "perusahaan" && (
            perusahaan && !loading ? <PerusahaanTab d={perusahaan} /> : <p className="py-10 text-center text-sm text-muted">Memuat data...</p>
          )}
        </div>
      )}

      {selected && (
        <AssessmentModal
          key={`${selected.employee_id}-${selected.periode}`}
          row={selected}
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); setReloadKey((k) => k + 1); }}
        />
      )}

      {isSalesTeam(user) && uploads && uploads.length > 0 && (
        <div className="mt-5">
          <Panel title="Kelola Upload Penjualan" subtitle="Hapus upload membersihkan data penjualan, target, dan penilaian. File asli dipindah ke tempat sampah arsip.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="h-11 border-y border-line bg-paper text-left text-[11px] font-bold uppercase tracking-[0.04em] text-muted">
                    <th className="pl-6 pr-3.5">File</th>
                    <th className="px-3.5">Periode</th>
                    <th className="px-3.5">Pengunggah</th>
                    <th className="px-3.5">Waktu</th>
                    <th className="px-3.5">Baris</th>
                    <th className="px-3.5 pr-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.map((u) => (
                    <tr key={u.id} className="h-14 border-b border-subtle last:border-b-0 hover:bg-paper">
                      <td className="max-w-[240px] truncate pl-6 pr-3.5 font-semibold" title={u.filename}>{u.filename}</td>
                      <td className="num px-3.5 text-[13px]">{u.periode.join(", ") || "-"}</td>
                      <td className="px-3.5 text-[13px]">{u.uploader}</td>
                      <td className="whitespace-nowrap px-3.5 text-[13px] text-muted">
                        {new Date(u.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                      </td>
                      <td className="num px-3.5 text-[13px]">{nf.format(u.row_count ?? 0)}</td>
                      <td className="px-3.5 pr-6 text-right">
                        <button
                          onClick={() => removeUpload(u)}
                          disabled={deleting === u.id}
                          className="rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-status-alpa-text transition-colors hover:bg-status-alpa-bg disabled:opacity-40"
                        >
                          {deleting === u.id ? "Menghapus..." : "Hapus"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
