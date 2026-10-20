"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { btnPrimary } from "@/components/ui/Button";
import PeriodPicker from "@/components/layout/PeriodPicker";
import { useAuth } from "@/components/auth/AuthProvider";
import { employeePdfUrl, exportUrl, canPerformance, canPayroll, isHR } from "@/lib/api";
import { useFilters } from "@/lib/filters";
import { useDismiss } from "@/lib/useDismiss";

function ExportMenu() {
  const { user } = useAuth();
  const { filters } = useFilters();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);
  const perf = canPerformance(user);
  const items = [
    ...(perf
      ? [
          { key: "excel", title: "Excel (.xlsx)", sub: "Ringkasan, rekap, dan data harian", href: filters ? exportUrl("excel", filters) : "#" },
          { key: "pdf", title: "PDF (.pdf)", sub: "Ringkasan siap cetak", href: filters ? exportUrl("pdf", filters) : "#" },
          { key: "employee", title: "Rekap Individual (PDF)", sub: "Semua karyawan sesuai filter. Untuk satu orang, buka Detail Presensi", href: filters ? employeePdfUrl(filters) : "#" },
        ]
      : []),
    ...(canPayroll(user) && filters
      ? [{ key: "payroll", title: "Rekap Payroll (Excel)", sub: "Satu baris per karyawan, siap payslip", href: exportUrl("payroll", filters) }]
      : []),
  ];
  return (
    <div ref={ref} className="relative">
      <button
        disabled={!filters}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold transition-colors hover:border-line-strong hover:bg-paper focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
      >
        <Icon name="download" size={17} className="text-muted" />
        <span className="hidden xl:inline">Export Rekap</span>
        <Icon name="chevronDown" size={15} className="text-muted" />
      </button>
      {open && filters && (
        <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 rounded-2xl border border-line bg-white p-1.5 shadow-pop">
          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Sesuai filter aktif</p>
          {items.map((i) => (
            <a key={i.key} role="menuitem" href={i.href} onClick={() => setOpen(false)} className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-subtle">
              <Icon name="file" size={18} className="mt-0.5 text-accent" />
              <span>
                <span className="block text-sm font-semibold">{i.title}</span>
                <span className="block text-xs text-muted">{i.sub}</span>
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { filters, patch } = useFilters();
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);

  // Ctrl+K atau Cmd+K memfokuskan pencarian.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Pencarian karyawan menampilkan semua catatan orang itu, jadi status dan divisi dari filter sebelumnya dilepas.
    patch({ karyawan: q.trim(), status: "", departemen: "" });
    setQ("");
    router.push("/presensi");
  };

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center gap-2 border-b border-line bg-white/90 px-4 backdrop-blur sm:gap-3 sm:px-6 lg:px-8">
      <form onSubmit={submit} role="search" className="relative w-10 min-w-0 shrink sm:w-44 lg:w-48 xl:w-72">
        <Icon name="search" size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={filters?.karyawan ? `Dicari: ${filters.karyawan}` : "Cari NIK, Nama Karyawan..."}
          aria-label="Cari NIK atau nama karyawan"
          className="h-11 w-full rounded-xl border border-transparent bg-subtle pl-10 pr-3 text-sm max-sm:pr-0 xl:pr-14 placeholder:text-muted transition-colors focus-visible:border-accent focus-visible:bg-white focus-visible:outline-2 focus-visible:outline-accent/25"
        />
        <kbd className="pointer-events-none absolute right-3 hidden xl:block top-1/2 -translate-y-1/2 rounded-md bg-white px-1.5 py-0.5 text-[11px] font-semibold text-muted ring-1 ring-line">Ctrl K</kbd>
      </form>
      <PeriodPicker />

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <ExportMenu />
        {isHR(user) && (
          <Link href="/upload" className={`${btnPrimary} h-11`}>
            <Icon name="cloudUpload" size={18} />
            <span className="hidden xl:inline">Upload Presensi</span>
          </Link>
        )}
        <span className="mx-1 hidden h-8 w-px bg-line xl:block" aria-hidden="true" />
        <div className="flex items-center gap-2.5 max-sm:hidden">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-accent-soft text-sm font-bold text-accent-dark ring-2 ring-white" aria-hidden="true">
            {user.full_name.trim().charAt(0).toUpperCase() || "?"}
          </span>
          <div className="hidden leading-tight 2xl:block">
            <div className="max-w-[160px] truncate text-[13px] font-semibold" title={user.email}>{user.full_name}</div>
            <div className="text-[11px] text-muted">{user.departemen ?? "Tanpa akses"}</div>
          </div>
          <button onClick={logout} title="Keluar" aria-label="Keluar"
            className="grid h-10 w-10 place-items-center rounded-xl text-muted transition-colors hover:bg-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-accent">
            <Icon name="logout" size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}
