// Lencana status untuk Kinerja Penjualan. Memakai token warna status yang sama dengan dashboard presensi.
const TONE = {
  ok: { box: "border-status-hadir-border bg-status-hadir-bg text-status-hadir-text", dot: "bg-status-hadir-text" },
  warn: { box: "border-status-terlambat-border bg-status-terlambat-bg text-status-terlambat-text", dot: "bg-status-terlambat-text" },
  bad: { box: "border-status-alpa-border bg-status-alpa-bg text-status-alpa-text", dot: "bg-status-alpa-text" },
  muted: { box: "border-line bg-subtle text-muted", dot: "bg-muted" },
} as const;

type Tone = keyof typeof TONE;

const LABEL_TONE: Record<string, Tone> = {
  Layak: "ok",
  "Tidak Layak": "bad",
  "Target belum ada": "muted",
  Disetujui: "ok",
  Ditolak: "bad",
  Draf: "warn",
  Tercapai: "ok",
  "Perlu dikejar": "warn",
  "Jauh dari target": "bad",
};

export default function SalesBadge({ label }: { label: string }) {
  const t = TONE[LABEL_TONE[label] ?? "muted"];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${t.box}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}

// Batang capaian: hijau bila mencapai 100%, kuning mulai 70%, merah di bawahnya.
export function ProgressBar({ pct, width = 96 }: { pct: number | null; width?: number }) {
  if (pct === null) return null;
  const color = pct >= 100 ? "bg-status-hadir-text" : pct >= 70 ? "bg-status-terlambat-text" : "bg-status-alpa-text";
  return (
    <span className="inline-block h-1.5 overflow-hidden rounded-full bg-subtle align-middle" style={{ width }} role="presentation">
      <span className={`block h-full rounded-full ${color}`} style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }} />
    </span>
  );
}
