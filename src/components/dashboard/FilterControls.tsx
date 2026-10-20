"use client";
import { useCallback, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { btnSecondary, fieldClass } from "@/components/ui/Button";
import { useFilters } from "@/lib/filters";
import { useDismiss } from "@/lib/useDismiss";

// Tab divisi (segmen pil). Jika divisi lebih dari 4, berubah menjadi dropdown agar tidak meluber.
export function DeptTabs() {
  const { meta, filters, patch } = useFilters();
  if (!meta || !filters) return null;
  const depts = meta.departemen;
  if (depts.length === 0) return null;
  if (depts.length > 4) {
    return (
      <select
        aria-label="Filter divisi"
        value={filters.departemen}
        onChange={(e) => patch({ departemen: e.target.value })}
        className="h-11 rounded-xl border border-line bg-white px-3.5 text-sm font-semibold shadow-card focus-visible:outline-2 focus-visible:outline-accent"
      >
        <option value="">Semua Divisi</option>
        {depts.map((d) => <option key={d}>{d}</option>)}
      </select>
    );
  }
  const tabs = [{ key: "", label: "Semua Divisi" }, ...depts.map((d) => ({ key: d, label: d }))];
  return (
    <div role="tablist" aria-label="Filter divisi" className="inline-flex gap-1 rounded-xl border border-line bg-white p-1 shadow-card">
      {tabs.map((t) => {
        const on = filters.departemen === t.key;
        return (
          <button
            key={t.label}
            role="tab"
            aria-selected={on}
            onClick={() => patch({ departemen: t.key })}
            className={`rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-accent ${on ? "bg-accent text-white shadow-glow" : "text-muted hover:text-ink"}`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// Filter lanjutan: status dan karyawan. Rentang tanggal ada di pemilih periode pada header.
export function AdvancedFilter() {
  const { meta, filters, patch } = useFilters();
  const [open, setOpen] = useState(false);
  const [karyawan, setKaryawan] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);
  if (!meta || !filters) return null;
  const count = (filters.status ? 1 : 0) + (filters.karyawan ? 1 : 0);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setKaryawan(filters.karyawan);
          setOpen((v) => !v);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`${btnSecondary} h-11 shadow-card`}
      >
        <Icon name="filter" size={17} className="text-muted" />
        Filter Lanjutan
        {count > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">{count}</span>}
        <Icon name="chevronDown" size={15} className="text-muted" />
      </button>
      {open && (
        <div role="dialog" aria-label="Filter lanjutan" className="absolute right-0 top-[calc(100%+8px)] z-50 w-[300px] rounded-2xl border border-line bg-white p-4 shadow-pop">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
            Status
            <select className={`${fieldClass} w-full font-normal`} value={filters.status} onChange={(e) => patch({ status: e.target.value })}>
              <option value="">Semua status</option>
              {meta.statuses.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="mt-3 flex flex-col gap-1.5 text-xs font-semibold text-muted">
            Karyawan
            <input
              className={`${fieldClass} w-full font-normal`}
              placeholder="NIK atau nama"
              value={karyawan}
              onChange={(e) => setKaryawan(e.target.value)}
              onBlur={() => karyawan.trim() !== filters.karyawan && patch({ karyawan: karyawan.trim() })}
              onKeyDown={(e) => e.key === "Enter" && patch({ karyawan: karyawan.trim() })}
            />
          </label>
          {count > 0 && (
            <button
              onClick={() => {
                setKaryawan("");
                patch({ status: "", karyawan: "" });
              }}
              className="mt-3 text-sm font-semibold text-accent hover:underline"
            >
              Atur ulang filter
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Chip filter aktif (status dan karyawan), supaya terlihat jelas saat pencarian di header membatasi data.
export function ActiveChips() {
  const { filters, patch } = useFilters();
  if (!filters || (!filters.status && !filters.karyawan)) return null;
  const chips = [
    filters.status && { label: `Status: ${filters.status}`, clear: () => patch({ status: "" }) },
    filters.karyawan && { label: `Karyawan: ${filters.karyawan}`, clear: () => patch({ karyawan: "" }) },
  ].filter(Boolean) as { label: string; clear: () => void }[];
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2" aria-label="Filter aktif">
      <span className="text-xs font-semibold text-muted">Filter aktif:</span>
      {chips.map((c) => (
        <span key={c.label} className="inline-flex items-center gap-1.5 rounded-full border border-accent-ring bg-accent-soft py-1 pl-3 pr-1.5 text-xs font-semibold text-accent">
          {c.label}
          <button onClick={c.clear} aria-label={`Hapus filter ${c.label}`} className="grid h-5 w-5 place-items-center rounded-full transition-colors hover:bg-accent-ring">
            <Icon name="x" size={12} stroke={2.4} />
          </button>
        </span>
      ))}
    </div>
  );
}
