import { STATUS_CLASS, STATUS_DOT } from "@/lib/theme";

// Hadir dengan menit terlambat > 0 tampil sebagai "Terlambat +14m" (lihat DESIGN.md, bagian Status Badges).
export default function StatusBadge({ status, lateMinutes = 0 }: { status: string; lateMinutes?: number }) {
  const late = status === "Hadir" && lateMinutes > 0;
  const key = late ? "Terlambat" : status;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[key] ?? STATUS_CLASS.Libur}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[key] ?? STATUS_DOT.Libur}`} aria-hidden="true" />
      {key}
      {late && <span className="num font-medium">+{lateMinutes}m</span>}
    </span>
  );
}
