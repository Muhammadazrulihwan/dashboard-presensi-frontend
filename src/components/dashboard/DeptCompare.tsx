import { formatMinutes, nf, pct, type DeptRow } from "@/lib/api";

// Warna garis bawah kartu mengikuti tingkat kehadiran.
function barClass(v: number | null) {
  if (v === null) return "bg-line-strong";
  if (v >= 95) return "bg-status-hadir-text";
  if (v >= 90) return "bg-accent";
  if (v >= 80) return "bg-status-terlambat-text";
  return "bg-status-alpa-text";
}

export default function DeptCompare({ data }: { data: DeptRow[] }) {
  if (data.length === 0) return <p className="px-6 pb-6 pt-3 text-sm text-muted">Belum ada data divisi untuk filter ini.</p>;
  const rows = [...data].sort((a, b) => (b.kehadiran_pct ?? -1) - (a.kehadiran_pct ?? -1));
  const shown = rows.slice(0, 6);
  return (
    <div className="border-t border-line px-6 pb-6 pt-5">
      <div className="grid gap-4 sm:grid-cols-3">
        {shown.map((d) => (
          <div key={d.departemen} className="relative overflow-hidden rounded-xl border border-line bg-paper px-4 pb-5 pt-3.5">
            <div className="truncate text-[13px] font-medium text-muted" title={d.departemen}>{d.departemen}</div>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
              <span className="text-2xl font-bold leading-8 tracking-tight">{pct(d.kehadiran_pct)}</span>
              {d.terlambat === 0 ? (
                <span className="text-xs font-semibold text-status-hadir-text">Tepat waktu</span>
              ) : (
                <span className="text-xs font-semibold text-status-terlambat-text">{nf.format(d.terlambat)} terlambat</span>
              )}
            </div>
            <div className="mt-1 text-xs text-muted">{nf.format(d.karyawan)} karyawan{d.terlambat > 0 && `, ${formatMinutes(d.menit_terlambat)}`}</div>
            <span className={`absolute inset-x-0 bottom-0 h-[3px] ${barClass(d.kehadiran_pct)}`} aria-hidden="true" />
          </div>
        ))}
      </div>
      {rows.length > shown.length && <p className="mt-3 text-xs text-muted">+{rows.length - shown.length} divisi lain. Pilih divisi di bagian atas untuk melihat detailnya.</p>}
    </div>
  );
}
