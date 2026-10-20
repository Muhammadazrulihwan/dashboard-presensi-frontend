"use client";
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { dateLabel, dayShort, monthLabel, nf, num1, type StatusCount, type TrendPoint } from "@/lib/api";
import { statusColor } from "@/lib/theme";

const BLUE = "#2563eb";
const AMBER = "#d97706";
const AXIS = { fontSize: 12, fill: "#94a3b8", fontWeight: 500 };
const isMonth = (p: string) => p.length === 7;

type TipItem = { dataKey?: string | number; value?: number | string | null };
type TipProps = { active?: boolean; payload?: TipItem[]; label?: string | number };

function Dot({ color }: { color: string }) {
  return <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />;
}

export function TrendLegend() {
  return (
    <div className="flex items-center gap-4 text-xs font-semibold text-muted">
      <span className="inline-flex items-center gap-1.5"><Dot color={BLUE} /> Kehadiran</span>
      <span className="inline-flex items-center gap-1.5"><Dot color={AMBER} /> Terlambat</span>
    </div>
  );
}

function TrendTip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null;
  const p = String(label ?? "");
  const get = (k: string) => payload.find((x) => x.dataKey === k)?.value;
  const hadir = get("kehadiran_pct");
  const late = get("terlambat");
  return (
    <div className="min-w-[170px] rounded-xl border border-line bg-white px-3.5 py-3 text-xs shadow-pop">
      <div className="mb-2 flex items-center justify-between gap-4 font-semibold">
        <span>{isMonth(p) ? monthLabel(p) : dateLabel(p)}</span>
        <span className="num text-accent">{typeof hadir === "number" ? `${num1(hadir)}%` : "-"}</span>
      </div>
      <div className="flex items-center justify-between gap-4 text-muted">
        <span className="inline-flex items-center gap-1.5"><Dot color={BLUE} /> Kehadiran</span>
        <span className="num font-semibold text-ink">{typeof hadir === "number" ? `${num1(hadir)}%` : "-"}</span>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-4 text-muted">
        <span className="inline-flex items-center gap-1.5"><Dot color={AMBER} /> Terlambat</span>
        <span className="num font-semibold text-ink">{typeof late === "number" ? `${nf.format(late)} kali` : "-"}</span>
      </div>
    </div>
  );
}

export function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-[300px] px-3 pb-2 pt-3" role="img" aria-label="Grafik tren tingkat kehadiran dan jumlah keterlambatan">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 4, left: 6, bottom: 0 }}>
          <defs>
            <linearGradient id="gHadir" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BLUE} stopOpacity={0.22} />
              <stop offset="100%" stopColor={BLUE} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 5" vertical={false} />
          <XAxis
            dataKey="period"
            tickFormatter={(v) => (isMonth(String(v)) ? monthLabel(String(v)).split(" ")[0] : dayShort(String(v)))}
            tick={AXIS}
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            minTickGap={22}
            padding={{ left: 14, right: 14 }}
          />
          <YAxis
            yAxisId="left"
            domain={[(min: number) => Math.max(0, Math.floor((min - 6) / 5) * 5), 100]}
            tickFormatter={(v) => `${v}%`}
            tick={AXIS}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            allowDecimals={false}
            domain={[0, (max: number) => Math.max(5, Math.ceil(max * 1.3))]}
            tick={{ ...AXIS, fill: AMBER }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            cursor={{ stroke: BLUE, strokeOpacity: 0.3, strokeDasharray: "4 4" }}
            content={({ active, payload, label }) => <TrendTip active={active} payload={payload as unknown as TipItem[]} label={label} />}
          />
          <Area yAxisId="left" type="monotone" dataKey="kehadiran_pct" stroke={BLUE} strokeWidth={2.5} fill="url(#gHadir)" dot={false} activeDot={{ r: 5, fill: BLUE, stroke: "#fff", strokeWidth: 2 }} connectNulls />
          <Line yAxisId="right" type="monotone" dataKey="terlambat" stroke={AMBER} strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ r: 5, fill: AMBER, stroke: "#fff", strokeWidth: 2 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export type WeekdayPoint = { label: string; full: string; value: number; best: boolean };

export function WeekdayChart({ data }: { data: WeekdayPoint[] }) {
  const lo = Math.max(0, Math.floor(Math.min(...data.map((d) => d.value)) - 8));
  return (
    <div className="h-[190px] px-4 pt-2" role="img" aria-label="Grafik rata-rata tingkat kehadiran per hari">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 22, right: 4, left: 4, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ ...AXIS, fontWeight: 600 }} axisLine={false} tickLine={false} tickMargin={8} />
          <YAxis hide domain={[lo, 100]} />
          <Tooltip
            cursor={false}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as WeekdayPoint;
              return (
                <div className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs shadow-pop">
                  <div className="text-muted">{d.full}</div>
                  <div className="num mt-0.5 text-sm font-semibold">{num1(d.value)}%</div>
                </div>
              );
            }}
          />
          <Bar dataKey="value" radius={[10, 10, 10, 10]} maxBarSize={36} background={{ fill: "#f1f5f9", radius: 10 }}>
            {data.map((d) => <Cell key={d.label} fill={d.best ? BLUE : "#cbd5e1"} />)}
            <LabelList dataKey="value" position="top" offset={6} formatter={(v: unknown) => `${Math.round(Number(v))}%`} style={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Gauge({ value }: { value: number | null }) {
  const r = 78;
  const c = Math.PI * r;
  const v = Math.max(0, Math.min(100, value ?? 0));
  const arc = `M ${100 - r} 100 A ${r} ${r} 0 0 1 ${100 + r} 100`;
  return (
    <svg viewBox="0 0 200 118" className="mx-auto w-full max-w-[250px] font-sans" role="img" aria-label={value === null ? "Tidak ada data" : `Ketepatan waktu ${num1(value)} persen`}>
      <defs>
        <linearGradient id="gGauge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <path d={arc} fill="none" stroke="#e2e8f0" strokeWidth="16" strokeLinecap="round" />
      {v > 0 && <path d={arc} fill="none" stroke="url(#gGauge)" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${(c * v) / 100} ${c}`} />}
      <text x="100" y="94" textAnchor="middle" fontSize="34" fontWeight="700" fill="#0f172a" letterSpacing="-0.02em">
        {value === null ? "-" : `${num1(value)}%`}
      </text>
    </svg>
  );
}

function SliceTip({ active, payload }: { active?: boolean; payload?: { payload: StatusCount }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs shadow-pop">
      <div className="text-muted">{d.status}</div>
      <div className="num mt-0.5 text-sm font-semibold">{nf.format(d.total)} hari</div>
    </div>
  );
}

export function StatusDonut({ data }: { data: StatusCount[] }) {
  const total = data.reduce((s, d) => s + d.total, 0);
  const slices = data.filter((d) => d.total > 0);
  return (
    <div className="px-6 pb-6 pt-3">
      <div className="relative mx-auto h-[184px] w-[184px]" role="img" aria-label="Diagram donat komposisi status presensi">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="total" nameKey="status" innerRadius={62} outerRadius={90} paddingAngle={slices.length > 1 ? 2 : 0} cornerRadius={5} stroke="none" startAngle={90} endAngle={-270}>
              {slices.map((d) => <Cell key={d.status} fill={statusColor(d.status)} />)}
            </Pie>
            <Tooltip content={({ active, payload }) => <SliceTip active={active} payload={payload as unknown as { payload: StatusCount }[]} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="num text-[26px] font-bold leading-8">{nf.format(total)}</div>
            <div className="text-xs text-muted">hari kerja</div>
          </div>
        </div>
      </div>
      <ul className="mt-5 space-y-2.5 text-[13px]">
        {data.map((d) => (
          <li key={d.status} className="flex items-center gap-2">
            <Dot color={statusColor(d.status)} />
            <span className="min-w-0 flex-1 truncate text-muted">{d.status}</span>
            <span className="num font-semibold">{nf.format(d.total)}</span>
            <span className="w-12 text-right text-xs tabular-nums text-faint">{total ? `${num1((d.total * 100) / total)}%` : "-"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
