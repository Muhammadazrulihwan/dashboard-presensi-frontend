import Icon, { type IconName } from "@/components/ui/Icon";
import { formatMinutes, nf, num1, pct, type SummaryData, type SummaryResponse } from "@/lib/api";

type Cmp = { same: boolean; diff: number; good: boolean } | null;
// higherIsBetter menentukan warna: hijau jika membaik, merah jika memburuk.
function cmp(cur: number | null, prev: number | null, higherIsBetter: boolean, eps = 0.05): Cmp {
  if (cur === null || prev === null) return null;
  const diff = cur - prev;
  if (Math.abs(diff) < eps) return { same: true, diff: 0, good: true };
  return { same: false, diff, good: diff > 0 === higherIsBetter };
}

function DeltaPill({ c, text }: { c: Cmp; text: string }) {
  if (!c || c.same) return null;
  return (
    <span
      className={`inline-flex items-center gap-0.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-bold ${
        c.good ? "border-status-hadir-border bg-status-hadir-bg text-status-hadir-text" : "border-status-alpa-border bg-status-alpa-bg text-status-alpa-text"
      }`}
      title="Dibandingkan periode sebelumnya dengan panjang yang sama"
    >
      <Icon name={c.diff > 0 ? "arrowUp" : "arrowDown"} size={12} stroke={2.4} />
      {text}
    </span>
  );
}

function Card({ title, icon, chip, children }: { title: string; icon: IconName; chip: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted">{title}</span>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${chip}`} aria-hidden="true">
          <Icon name={icon} size={19} />
        </span>
      </div>
      {children}
    </div>
  );
}

const BIG = "text-[32px] font-bold leading-[38px] tracking-tight";
const UNIT = "ml-1.5 text-base font-medium text-muted";
const MUTED = "text-[13px] leading-[18px] text-muted";

const CHIPS: { key: keyof SummaryData; label: string; cls: string }[] = [
  { key: "sakit", label: "Sakit", cls: "border-status-sakit-border bg-status-sakit-bg text-status-sakit-text" },
  { key: "izin", label: "Izin", cls: "border-status-izin-border bg-status-izin-bg text-status-izin-text" },
  { key: "cuti", label: "Cuti", cls: "border-status-cuti-border bg-status-cuti-bg text-status-cuti-text" },
  { key: "dinas_luar", label: "Dinas", cls: "border-status-dinas-border bg-status-dinas-bg text-status-dinas-text" },
];

export default function KpiStrip({ summary }: { summary: SummaryResponse }) {
  const c = summary.current;
  const p = summary.previous && summary.previous.records > 0 ? summary.previous : null;
  const none = <span className={MUTED}>Tanpa periode pembanding</span>;

  const dHadir = cmp(c.kehadiran_pct, p?.kehadiran_pct ?? null, true);
  const dLate = cmp(c.terlambat, p ? p.terlambat : null, false, 0.5);
  const dAbsent = cmp(c.tidak_hadir, p ? p.tidak_hadir : null, false, 0.5);
  const dMasuk = cmp(c.avg_jam_masuk_menit, p?.avg_jam_masuk_menit ?? null, false, 0.5);
  const avgLate = c.terlambat ? Math.round(c.menit_terlambat / c.terlambat) : 0;

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <Card title="Tingkat Kehadiran" icon="userCheck" chip="border-status-hadir-border bg-status-hadir-bg text-status-hadir-text">
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className={BIG}>{pct(c.kehadiran_pct)}</span>
          <DeltaPill c={dHadir} text={dHadir ? `${num1(Math.abs(dHadir.diff))} poin` : ""} />
        </div>
        <div className={`mt-3 ${MUTED}`}>
          <span className="num font-medium text-ink">{nf.format(c.hadir)}</span> dari <span className="num font-medium text-ink">{nf.format(c.hari_kerja)}</span> hari kerja
        </div>
        <div className="mt-1 min-h-[18px]">{p ? null : none}</div>
      </Card>

      <Card title="Keterlambatan" icon="clock" chip="border-status-terlambat-border bg-status-terlambat-bg text-status-terlambat-text">
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className={BIG}>{nf.format(c.terlambat)}<span className={UNIT}>kali</span></span>
          <span className="whitespace-nowrap rounded-full border border-status-terlambat-border bg-status-terlambat-bg px-2 py-0.5 text-xs font-bold text-status-terlambat-text">
            Total {formatMinutes(c.menit_terlambat)}
          </span>
        </div>
        <div className={`mt-3 ${MUTED}`}>
          Rerata keterlambatan: <span className="num font-medium text-ink">{avgLate} mnt</span>
        </div>
        <div className="mt-1 flex min-h-[18px] items-center gap-2">
          {p ? <DeltaPill c={dLate} text={dLate ? `${nf.format(Math.abs(dLate.diff))} kali` : ""} /> : none}
          {p && (dLate === null || dLate.same) && <span className={MUTED}>Sama dengan periode lalu</span>}
          {p && dLate && !dLate.same && <span className={MUTED}>vs periode lalu</span>}
        </div>
      </Card>

      <Card title="Tidak Hadir" icon="userX" chip="border-status-alpa-border bg-status-alpa-bg text-status-alpa-text">
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className={BIG}>{nf.format(c.tidak_hadir)}<span className={UNIT}>hari</span></span>
          <span
            className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-bold ${
              c.alpa > 0 ? "border-status-alpa-border bg-status-alpa-bg text-status-alpa-text" : "border-status-hadir-border bg-status-hadir-bg text-status-hadir-text"
            }`}
          >
            Alpa: {c.alpa}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {CHIPS.map((ch) => (
            <span key={ch.key} className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${ch.cls}`}>
              {ch.label} <span className="num">{nf.format(c[ch.key] as number)}</span>
            </span>
          ))}
        </div>
        <div className="mt-2 flex min-h-[18px] items-center gap-2">
          {p ? <DeltaPill c={dAbsent} text={dAbsent ? `${nf.format(Math.abs(dAbsent.diff))} hari` : ""} /> : none}
          {p && dAbsent && !dAbsent.same && <span className={MUTED}>vs periode lalu</span>}
        </div>
      </Card>

      <Card title="Rata-rata Jam Masuk" icon="clock" chip="border-accent-ring bg-accent-soft text-accent">
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className={BIG}><span className="tabular-nums">{c.avg_jam_masuk ?? "-"}</span>{c.avg_jam_masuk && <span className={UNIT}>WIB</span>}</span>
          <DeltaPill c={dMasuk} text={dMasuk ? `${nf.format(Math.round(Math.abs(dMasuk.diff)))} mnt` : ""} />
        </div>
        <div className={`mt-3 ${MUTED}`}>Dihitung dari karyawan berstatus Hadir</div>
        <div className="mt-1 min-h-[18px]">{p ? (dMasuk && !dMasuk.same ? <span className={MUTED}>{dMasuk.diff < 0 ? "Lebih awal" : "Lebih lambat"} dari periode lalu</span> : <span className={MUTED}>Sama dengan periode lalu</span>) : none}</div>
      </Card>
    </div>
  );
}
