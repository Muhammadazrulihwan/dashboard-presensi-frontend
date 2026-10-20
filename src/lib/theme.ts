// Warna status presensi, sesuai tabel "Semantic Status Palette" di DESIGN.md.
export const STATUS_HEX: Record<string, string> = {
  Hadir: "#059669",
  Terlambat: "#d97706",
  Izin: "#2563eb",
  Sakit: "#7c3aed",
  Cuti: "#0d9488",
  Alpa: "#dc2626",
  "Dinas Luar": "#475569",
  Libur: "#94a3b8",
};
export const statusColor = (s: string) => STATUS_HEX[s] ?? "#64748b";

// Kelas penuh ditulis lengkap supaya terdeteksi Tailwind.
export const STATUS_CLASS: Record<string, string> = {
  Hadir: "border-status-hadir-border bg-status-hadir-bg text-status-hadir-text",
  Terlambat: "border-status-terlambat-border bg-status-terlambat-bg text-status-terlambat-text",
  Izin: "border-status-izin-border bg-status-izin-bg text-status-izin-text",
  Sakit: "border-status-sakit-border bg-status-sakit-bg text-status-sakit-text",
  Cuti: "border-status-cuti-border bg-status-cuti-bg text-status-cuti-text",
  Alpa: "border-status-alpa-border bg-status-alpa-bg text-status-alpa-text",
  "Dinas Luar": "border-status-dinas-border bg-status-dinas-bg text-status-dinas-text",
  Libur: "border-line bg-subtle text-muted",
};
export const STATUS_DOT: Record<string, string> = {
  Hadir: "bg-status-hadir-text",
  Terlambat: "bg-status-terlambat-text",
  Izin: "bg-status-izin-text",
  Sakit: "bg-status-sakit-text",
  Cuti: "bg-status-cuti-text",
  Alpa: "bg-status-alpa-text",
  "Dinas Luar": "bg-status-dinas-text",
  Libur: "bg-faint",
};

// Warna avatar inisial karyawan, dipilih dari hash nama agar konsisten.
const AVATARS = [
  "bg-accent-soft text-accent-dark",
  "bg-status-hadir-bg text-status-hadir-text",
  "bg-status-sakit-bg text-status-sakit-text",
  "bg-status-terlambat-bg text-status-terlambat-text",
  "bg-status-cuti-bg text-status-cuti-text",
  "bg-status-alpa-bg text-status-alpa-text",
  "bg-subtle text-status-dinas-text",
];
export function avatarClass(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATARS[h % AVATARS.length];
}
export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}
