"use client";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import { btnPrimary, btnSecondary } from "@/components/ui/Button";
import Overlay from "@/components/ui/Overlay";
import StatusBadge from "@/components/ui/StatusBadge";
import { useAuth } from "@/components/auth/AuthProvider";
import { canPerformance, dateLabel, employeeExcelUrl, employeePdfUrl, nf, type AttendanceRow, type Filters } from "@/lib/api";
import { durationLabel } from "@/lib/format";

function Item({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-semibold">{children}</dd>
    </div>
  );
}

function periodText(f: Filters): string {
  if (f.from && f.to) return `${dateLabel(f.from)} sampai ${dateLabel(f.to)}`;
  return "semua periode";
}

export default function RecordDrawer({ row, filters, onClose }: { row: AttendanceRow | null; filters: Filters; onClose: () => void }) {
  const { user } = useAuth();
  const perf = canPerformance(user); // IT hanya melihat detail baris, tanpa rekap individual
  // Tautan ke halaman detail membawa periode yang sama; filter status dan divisi sengaja tidak ikut.
  const detailQuery = new URLSearchParams(Object.entries({ from: filters.from, to: filters.to }).filter(([, v]) => v) as [string, string][]).toString();
  return (
    <Overlay open={!!row} onClose={onClose} title="Detail Presensi" side="right" width={440}>
      {row && (
        <div className="p-6">
          <div className="flex items-center gap-4">
            <Avatar name={row.nama} size={52} />
            <div className="min-w-0">
              <div className="truncate text-lg font-bold leading-6 tracking-tight">{row.nama}</div>
              <div className="mt-0.5 truncate text-[13px] text-muted"><span className="num">{row.nik}</span> · {row.departemen}</div>
            </div>
          </div>
          <div className="mt-5"><StatusBadge status={row.status} lateMinutes={row.menit_terlambat} /></div>
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 rounded-2xl border border-line bg-paper p-5">
            <Item label="Tanggal" wide>{dateLabel(row.tanggal)}</Item>
            <Item label="Jam masuk"><span className="num">{row.jam_masuk ?? "--:--"}</span></Item>
            <Item label="Jam keluar"><span className="num">{row.jam_keluar ?? "--:--"}</span></Item>
            <Item label="Durasi kerja"><span className="num">{durationLabel(row.durasi_kerja)}</span></Item>
            <Item label="Menit terlambat"><span className={`num ${row.menit_terlambat > 0 ? "text-status-terlambat-text" : ""}`}>{nf.format(row.menit_terlambat)} mnt</span></Item>
            {row.jam_kerja_nyata != null && <Item label="Jam kerja nyata"><span className="num">{durationLabel(row.jam_kerja_nyata)}</span></Item>}
            {row.dikoreksi && (
              <Item label="Koreksi" wide>
                <span className="rounded-full border border-accent-ring bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
                  Dikoreksi{row.koreksi_approver ? ` oleh ${row.koreksi_approver}` : ""}
                </span>
                {row.koreksi_alasan && <span className="mt-1 block text-xs font-normal text-muted">{row.koreksi_alasan}</span>}
              </Item>
            )}
            {row.selisih_report && <Item label="Selisih Report" wide><span className="text-xs font-normal text-status-terlambat-text">{row.selisih_report}</span></Item>}
            <Item label="Keterangan" wide><span className="font-medium">{row.keterangan ?? "Tidak ada keterangan"}</span></Item>
          </dl>
          {perf && (
          <div className="mt-5 rounded-2xl border border-line p-5">
            <div className="text-sm font-semibold">Rekap individual {row.nama}</div>
            <p className="mt-1 text-xs leading-5 text-muted">Rekap satu karyawan ini saja untuk periode {periodText(filters)}, bukan seluruh karyawan.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href={employeePdfUrl({ ...filters, status: "", departemen: "", karyawan: "" }, row.nik)} className={btnPrimary}>
                <Icon name="download" size={17} />
                Export PDF
              </a>
              <a href={employeeExcelUrl({ ...filters, status: "", departemen: "", karyawan: "" }, row.nik)} className={btnSecondary}>
                <Icon name="download" size={17} />
                Export Excel
              </a>
              <Link href={`/karyawan/${encodeURIComponent(row.nik)}${detailQuery ? `?${detailQuery}` : ""}`} className={btnSecondary}>
                Lihat rekap lengkap
              </Link>
            </div>
          </div>
          )}
          <p className="mt-4 text-xs leading-5 text-muted">Data presensi tidak dapat diubah dari dashboard. Untuk koreksi, perbaiki file sumber lalu unggah ulang dan pilih Timpa pada data yang bentrok.</p>
        </div>
      )}
    </Overlay>
  );
}
