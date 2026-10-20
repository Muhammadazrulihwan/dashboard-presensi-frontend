"use client";
import { useMemo, useState } from "react";
import Icon from "@/components/ui/Icon";

export type Column<T> = {
  key: string;
  label: string;
  align?: "left" | "right";
  /** Nilai untuk pengurutan. null selalu ditaruh paling bawah. */
  value: (row: T) => string | number | null;
  render?: (row: T) => React.ReactNode;
};

type Sort = { key: string; dir: "asc" | "desc" };

// Tabel dengan pengurutan di sisi klien. Gaya mengikuti DataTable di halaman presensi.
export default function SortableTable<T>({
  rows, columns, rowKey, initialSort, minWidth = 960, empty = "Tidak ada data.",
}: {
  rows: T[]; columns: Column<T>[]; rowKey: (row: T) => string; initialSort?: Sort; minWidth?: number; empty?: string;
}) {
  const [sort, setSort] = useState<Sort | undefined>(initialSort);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort?.key);
    if (!sort || !col) return rows;
    const mul = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = col.value(a);
      const y = col.value(b);
      if (x === null && y === null) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      if (typeof x === "number" && typeof y === "number") return (x - y) * mul;
      return String(x).localeCompare(String(y), "id") * mul;
    });
  }, [rows, columns, sort]);

  // Kolom angka mulai dari terbesar, kolom teks mulai dari A ke Z.
  const toggle = (c: Column<T>) =>
    setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" } : { key: c.key, dir: c.align === "right" ? "desc" : "asc" }));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead>
          <tr className="h-11 border-y border-line bg-paper text-left">
            {columns.map((c, i) => {
              const active = sort?.key === c.key ? sort.dir : null;
              return (
                <th
                  key={c.key}
                  aria-sort={active === "asc" ? "ascending" : active === "desc" ? "descending" : undefined}
                  className={`whitespace-nowrap px-3.5 text-[11px] font-bold uppercase tracking-[0.04em] text-muted ${i === 0 ? "pl-6" : ""} ${c.align === "right" ? "text-right" : ""}`}
                >
                  <button onClick={() => toggle(c)} className="inline-flex items-center gap-1 uppercase transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-accent">
                    {c.label}
                    {active && <Icon name={active === "asc" ? "arrowUp" : "arrowDown"} size={12} stroke={2.4} className="text-accent" />}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={rowKey(r)} className="h-14 border-b border-subtle transition-colors hover:bg-paper">
              {columns.map((c, i) => (
                <td key={c.key} className={`px-3.5 ${i === 0 ? "pl-6" : ""} ${c.align === "right" ? "text-right" : ""}`}>
                  {c.render ? c.render(r) : (c.value(r) ?? "-")}
                </td>
              ))}
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-muted">{empty}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
