"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { emptyFilters, getMeta, monthStart, type Filters, type Meta } from "@/lib/api";

// Default filter: bulan dari tanggal data terbaru.
export function defaultsFor(meta: Meta): Filters {
  if (!meta.max_date) return emptyFilters;
  const start = monthStart(meta.max_date);
  return { ...emptyFilters, from: meta.min_date && meta.min_date > start ? meta.min_date : start, to: meta.max_date };
}

type Ctx = {
  meta: Meta | null;
  filters: Filters | null;
  defaults: Filters;
  error: string;
  setFilters: (f: Filters) => void;
  patch: (p: Partial<Filters>) => void;
  /** Muat ulang rentang tanggal dan divisi dari server. reset=true juga mengembalikan filter ke default (mis. setelah upload). */
  reload: (reset?: boolean) => void;
};

const FilterContext = createContext<Ctx | null>(null);

// Filter dipakai bersama oleh header (periode, pencarian), dashboard, dan halaman Data Presensi.
export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [error, setError] = useState("");
  const defaults = useMemo(() => (meta ? defaultsFor(meta) : emptyFilters), [meta]);

  const reload = useCallback((reset = false) => {
    getMeta()
      .then((m) => {
        setMeta(m);
        setFilters((f) => (reset || !f ? defaultsFor(m) : f));
        setError("");
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => reload(), [reload]);

  const patch = useCallback((p: Partial<Filters>) => setFilters((f) => (f ? { ...f, ...p } : f)), []);
  const value = useMemo(() => ({ meta, filters, defaults, error, setFilters, patch, reload }), [meta, filters, defaults, error, patch, reload]);
  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters() {
  const c = useContext(FilterContext);
  if (!c) throw new Error("useFilters harus dipakai di dalam FilterProvider");
  return c;
}
