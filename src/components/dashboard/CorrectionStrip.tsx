import Icon from "@/components/ui/Icon";
import { nf, type SummaryData } from "@/lib/api";

// Ringkasan Rekap Absensi terpadu (PRD F11/F17/F18): koreksi, selisih Report, clock out hilang,
// dan jam kerja nyata. Hanya tampil bila ada datanya (data template lama tidak memilikinya).
export default function CorrectionStrip({ summary }: { summary: SummaryData }) {
  const koreksi = summary.dikoreksi ?? 0;
  const selisih = summary.selisih_report ?? 0;
  const hilang = summary.clock_out_hilang ?? 0;
  const setelahTutup = summary.koreksi_setelah_tutup ?? 0;
  const nyata = summary.jam_kerja_nyata ?? 0;

  if (koreksi === 0 && selisih === 0 && hilang === 0 && setelahTutup === 0 && nyata === 0) return null;

  const items = [
    { label: "Hari dikoreksi", value: nf.format(koreksi), icon: "clipboardCheck" as const, tone: "text-accent" },
    { label: "Selisih Report", value: nf.format(selisih), icon: "alert" as const, tone: "text-status-terlambat-text" },
    { label: "Clock out hilang", value: nf.format(hilang), icon: "clock" as const, tone: "text-status-alpa-text" },
    { label: "Koreksi setelah tutup", value: nf.format(setelahTutup), icon: "lock" as const, tone: "text-status-alpa-text" },
    { label: "Total jam kerja nyata", value: nyata > 0 ? `${nf.format(Math.round(nyata * 100) / 100)} j` : "-", icon: "trending" as const, tone: "text-ink" },
  ];

  return (
    <div className="grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-card sm:grid-cols-3 xl:grid-cols-5">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-3">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-subtle ${it.tone}`} aria-hidden="true">
            <Icon name={it.icon} size={17} />
          </span>
          <div className="min-w-0">
            <div className="text-xs text-muted">{it.label}</div>
            <div className={`num text-sm font-bold ${it.tone}`}>{it.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
