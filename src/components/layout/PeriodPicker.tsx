"use client";
import { useCallback, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { btnPrimary, fieldClass } from "@/components/ui/Button";
import { dateLabel, monthStart, type Meta } from "@/lib/api";
import { useFilters } from "@/lib/filters";
import { addDays } from "@/lib/format";
import { useDismiss } from "@/lib/useDismiss";

type Preset = { key: string; label: string; from: string; to: string };

// Preset dihitung dari tanggal data terbaru, bukan tanggal hari ini, karena file presensi biasanya diunggah setelah periode berakhir.
function presetsOf(meta: Meta): Preset[] {
  if (!meta.max_date || !meta.min_date) return [];
  const max = meta.max_date;
  const min = meta.min_date;
  const clamp = (d: string) => (d < min ? min : d);
  return [
    { key: "bulan", label: "Bulan terbaru", from: clamp(monthStart(max)), to: max },
    { key: "30", label: "30 hari terakhir", from: clamp(addDays(max, -29)), to: max },
    { key: "7", label: "7 hari terakhir", from: clamp(addDays(max, -6)), to: max },
    { key: "all", label: "Semua periode", from: min, to: max },
  ];
}

export default function PeriodPicker() {
  const { meta, filters, patch } = useFilters();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState({ from: "", to: "" });
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  if (!meta || !filters) return <div className="h-11 w-64 animate-pulse rounded-xl bg-subtle" aria-hidden="true" />;
  const presets = presetsOf(meta);
  const active = presets.find((p) => p.from === filters.from && p.to === filters.to);
  const text = filters.from && filters.to ? `${dateLabel(filters.from)} - ${dateLabel(filters.to)}` : filters.from ? `Sejak ${dateLabel(filters.from)}` : filters.to ? `Sampai ${dateLabel(filters.to)}` : "Semua periode";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setCustom({ from: filters.from, to: filters.to });
          setOpen((v) => !v);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Periode: ${text}`} className="flex h-11 shrink-0 items-center gap-2.5 rounded-xl border border-line bg-subtle px-3.5 text-left text-[13px] font-medium transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-accent"
      >
        <Icon name="calendar" size={17} className="text-muted" />
        <span className="whitespace-nowrap max-md:hidden">{text}</span>
        <span className="hidden items-center gap-1.5 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-muted ring-1 ring-line xl:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-status-hadir-text" aria-hidden="true" />
          {active ? active.label : "Kustom"}
        </span>
      </button>

      {open && (
        <div role="dialog" aria-label="Pilih periode" className="absolute left-0 top-[calc(100%+8px)] z-50 w-[min(340px,calc(100vw-2rem))] rounded-2xl border border-line bg-white p-3 shadow-pop">
          <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-muted">Periode cepat</p>
          <ul className="space-y-0.5">
            {presets.map((p) => (
              <li key={p.key}>
                <button
                  onClick={() => {
                    patch({ from: p.from, to: p.to });
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${active?.key === p.key ? "bg-accent-soft font-semibold text-accent" : "hover:bg-subtle"}`}
                >
                  <span>{p.label}</span>
                  <span className="text-xs font-normal text-muted">{dateLabel(p.from)} - {dateLabel(p.to)}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-line px-2 pt-3">
            <p className="pb-2 text-xs font-semibold uppercase tracking-wide text-muted">Rentang kustom</p>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" aria-label="Dari tanggal" className={`${fieldClass} w-full px-2`} value={custom.from} min={meta.min_date ?? undefined} max={custom.to || meta.max_date || undefined} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
              <input type="date" aria-label="Sampai tanggal" className={`${fieldClass} w-full px-2`} value={custom.to} min={custom.from || meta.min_date || undefined} max={meta.max_date ?? undefined} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
            </div>
            <button
              disabled={!custom.from || !custom.to}
              onClick={() => {
                patch({ from: custom.from, to: custom.to });
                setOpen(false);
              }}
              className={`${btnPrimary} mt-3 w-full`}
            >
              Terapkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
