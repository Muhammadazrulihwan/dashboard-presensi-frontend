"use client";
import { useEffect, useState } from "react";
import Avatar from "@/components/ui/Avatar";
import Panel from "@/components/ui/Panel";
import { formatMinutes, getTopEmployees, nf, type Filters, type TopEmployee } from "@/lib/api";

const TABS = [
  { key: "terlambat", label: "Terlambat" },
  { key: "alpa", label: "Alpa" },
] as const;

export default function TopEmployees({ filters }: { filters: Filters }) {
  const [metric, setMetric] = useState<"terlambat" | "alpa">("terlambat");
  const [rows, setRows] = useState<TopEmployee[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let off = false;
    getTopEmployees(filters, metric)
      .then((r) => {
        if (off) return;
        setRows(r);
        setError("");
      })
      .catch((e: Error) => {
        if (!off) setError(e.message);
      });
    return () => {
      off = true;
    };
  }, [filters, metric]);

  return (
    <Panel
      title="Perlu Perhatian"
      subtitle="Terlambat dan alpa terbanyak"
      className="h-full"
      action={
        <div className="inline-flex gap-0.5 rounded-xl bg-subtle p-1" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={metric === t.key}
              onClick={() => {
                setRows(null);
                setMetric(t.key);
              }}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${metric === t.key ? "bg-white text-accent shadow-sm" : "text-muted hover:text-ink"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="px-6 pb-5 pt-3">
        {error ? (
          <p className="text-sm text-status-alpa-text">{error}</p>
        ) : !rows ? (
          <p className="text-sm text-muted">Memuat data...</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Tidak ada data untuk ditampilkan.</p>
        ) : (
          <ol className="space-y-3.5">
            {rows.map((r) => (
              <li key={r.nik} className="flex items-center gap-3">
                <Avatar name={r.nama} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{r.nama}</div>
                  <div className="truncate text-xs text-muted"><span className="num">{r.nik}</span> · {r.departemen}</div>
                </div>
                <div className="shrink-0 text-right">
                  {metric === "terlambat" ? (
                    <>
                      <div className="text-sm font-bold text-status-terlambat-text">{nf.format(r.terlambat)} kali</div>
                      <div className="text-xs text-muted">{formatMinutes(r.menit_terlambat)}</div>
                    </>
                  ) : (
                    <div className="text-sm font-bold text-status-alpa-text">{nf.format(r.alpa)} hari</div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Panel>
  );
}
