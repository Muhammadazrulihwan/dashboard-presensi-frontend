// Pembantu format tampilan di luar api.ts.
const pad = (n: number) => String(n).padStart(2, "0");

/** 8.37 jam -> "08j 22m" */
export function durationLabel(hours: number | null) {
  if (hours === null) return "-";
  const total = Math.round(hours * 60);
  return `${pad(Math.floor(total / 60))}j ${pad(total % 60)}m`;
}

/** Date object -> "10:30:45" */
export function timeLabel(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function addDays(iso: string, n: number) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** 0 = Minggu ... 6 = Sabtu */
export function weekdayOf(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export const WEEKDAY_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
export const WEEKDAY_LONG = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
