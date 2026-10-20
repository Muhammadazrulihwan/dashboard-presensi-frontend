"use client";
import { useState } from "react";
import Icon from "@/components/ui/Icon";
import type { ValidationError } from "@/lib/api";

const MONO = new Set(["nik", "tanggal", "jam_masuk", "jam_keluar", "shift"]);

export function PreviewTable({ rows }: { rows: Record<string, unknown>[] }) {
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="h-11 border-y border-line bg-paper text-left">
            {headers.map((h, i) => (
              <th key={h} className={`whitespace-nowrap px-3.5 text-[11px] font-bold uppercase tracking-[0.04em] text-muted ${i === 0 ? "pl-6" : ""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="h-12 border-b border-subtle last:border-b-0">
              {headers.map((h, j) => (
                <td key={h} className={`whitespace-nowrap px-3.5 text-[13px] ${j === 0 ? "pl-6" : ""} ${MONO.has(h) ? "num" : ""}`}>
                  {String(r[h] ?? "") || <span className="text-faint">-</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const INITIAL = 5;

// Daftar error bisa dilipat: lima baris pertama dulu, sisanya dibuka sesuai kebutuhan.
export function ErrorList({ errors, total }: { errors: ValidationError[]; total: number }) {
  const [all, setAll] = useState(false);
  const shown = all ? errors : errors.slice(0, INITIAL);
  return (
    <div className="rounded-2xl border border-status-alpa-border bg-status-alpa-bg/60 p-5" role="alert">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-100 text-status-alpa-text" aria-hidden="true">
          <Icon name="alert" size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-red-900">{total} masalah ditemukan. Perbaiki file lalu unggah ulang.</p>
          <p className="mt-0.5 text-[13px] text-red-800/80">
            {total > errors.length ? `Menampilkan ${errors.length} masalah pertama dari ${total}.` : "Nomor baris mengikuti baris di file asli (baris 1 adalah header)."}
          </p>
          <ul className="mt-3 space-y-1.5">
            {shown.map((e, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 rounded-lg bg-white/70 px-3 py-2 text-[13px]">
                <span className="num rounded-md bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold text-status-alpa-text">Baris {e.row}</span>
                <span className="num font-semibold text-red-900">{e.column}</span>
                <span className="text-red-800">{e.message}</span>
              </li>
            ))}
          </ul>
          {errors.length > INITIAL && (
            <button onClick={() => setAll((v) => !v)} aria-expanded={all} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-status-alpa-text hover:underline">
              {all ? "Ringkas daftar" : `Tampilkan semua (${errors.length})`}
              <Icon name="chevronDown" size={15} className={all ? "rotate-180" : ""} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
