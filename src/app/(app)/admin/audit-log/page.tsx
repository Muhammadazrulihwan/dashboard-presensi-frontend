"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import Icon from "@/components/ui/Icon";
import { btnSecondary, fieldClass } from "@/components/ui/Button";
import { dateLabel, getAuditActions, getAuditLog, getAuditUsers, nf, type AuditAction, type AuditLogPage, type AuditUser } from "@/lib/api";
import { timeLabel } from "@/lib/format";
import { useDismiss } from "@/lib/useDismiss";

// Label aksi dalam Bahasa Indonesia. Harus sama dengan action yang ditulis audit.log()
// di backend (lihat backend/app/routers/audit.py ACTION_LABELS).
const ACTION_LABELS: Record<string, string> = {
  // Autentikasi
  login: "Login",
  login_failed: "Login Gagal",
  login_blocked: "Login Diblokir",
  // Upload presensi (HR)
  upload_preview: "Periksa File Presensi",
  upload_confirm: "Simpan File Presensi",
  upload_delete: "Hapus Upload Presensi",
  upload_bulk_delete: "Hapus Beberapa Upload Presensi",
  package_preview: "Periksa Paket Empat Sumber",
  package_confirm: "Simpan Paket Empat Sumber",
  // Kinerja penjualan (Sales/Marketing)
  sales_preview: "Periksa File Penjualan",
  sales_confirm: "Simpan File Penjualan",
  sales_assessment_update: "Persetujuan Penilaian",
  // Export
  export_excel: "Export Excel Rekap",
  export_pdf: "Export PDF Rekap",
  export_employee_pdf: "Export PDF Individual",
  export_employee_excel: "Export Excel Individual",
  export_payroll: "Export Rekap Payroll",
  // Kelola user (IT)
  user_create: "Buat User",
  user_update: "Ubah User",
  user_password_reset: "Reset Password",
  user_deactivate: "Nonaktifkan User",
  // Pengaturan (HR)
  shift_upsert: "Simpan Shift",
  recalculate: "Hitung Ulang Presensi",
  payroll_settings_update: "Ubah Pembagi Hari Kerja Payroll",
  // Tutup periode (HR)
  period_close: "Tutup Periode",
  period_reopen: "Buka Kembali Periode",
  // Arsip file (HR dan Audit)
  archive_download: "Unduh Arsip",
  archive_trash: "Pindah Arsip ke Tempat Sampah",
  archive_restore: "Pulihkan Arsip",
  archive_purge: "Hapus Arsip Permanen",
};

// Badge warna per kategori aksi
function actionBadge(action: string): string {
  if (action === "login") return "border-accent-ring bg-accent-soft text-accent";
  if (action.startsWith("login_")) return "border-status-alpa-border bg-status-alpa-bg text-status-alpa-text";
  if (action.includes("delete") || action.includes("deactivate")) return "border-status-terlambat-border bg-status-terlambat-bg text-status-terlambat-text";
  if (action.startsWith("export_")) return "border-status-dinas-border bg-status-dinas-bg text-status-dinas-text";
  if (action.startsWith("upload_") || action.startsWith("package_")) return "border-status-hadir-border bg-status-hadir-bg text-status-hadir-text";
  if (action.startsWith("sales_")) return "border-status-izin-border bg-status-izin-bg text-status-izin-text";
  if (action.startsWith("user_")) return "border-status-izin-border bg-status-izin-bg text-status-izin-text";
  if (action.startsWith("period_")) return "border-status-cuti-border bg-status-cuti-bg text-status-cuti-text";
  if (action.startsWith("archive_")) return "border-status-sakit-border bg-status-sakit-bg text-status-sakit-text";
  return "border-line bg-subtle text-muted";
}

function formatDetail(action: string, detail: Record<string, unknown> | null): string {
  if (!detail) return "-";
  const s = (k: string) => (detail[k] == null ? "" : String(detail[k]));
  const n = (k: string) => Number(detail[k] ?? 0);
  const period = () => {
    const from = s("from");
    const to = s("to");
    return from && to ? `${dateLabel(from)} – ${dateLabel(to)}` : "-";
  };

  // Autentikasi
  if (action === "login" || action === "login_failed" || action === "login_blocked") return s("email") || "-";

  // Upload presensi
  if (action === "upload_preview") {
    const err = n("errors");
    return `${s("filename") || "-"} (${err ? `${nf.format(err)} masalah` : "valid"})`;
  }
  if (action === "upload_confirm") {
    const parts = [`${nf.format(n("inserted"))} baris disimpan`];
    if (n("overwritten")) parts.push(`${nf.format(n("overwritten"))} ditimpa`);
    if (n("skipped")) parts.push(`${nf.format(n("skipped"))} dilewati`);
    return `#${s("upload_id")} · ${parts.join(", ")}`;
  }
  if (action === "upload_delete") return s("filename") || `#${s("upload_id")}`;
  if (action === "upload_bulk_delete") {
    const ids = Array.isArray(detail.upload_ids) ? (detail.upload_ids as number[]) : [];
    const lewat = Array.isArray(detail.tidak_ditemukan) ? (detail.tidak_ditemukan as number[]).length : 0;
    return `${nf.format(n("jumlah"))} file${ids.length ? ` (#${ids.slice(0, 5).join(", #")}${ids.length > 5 ? ", …" : ""})` : ""}${lewat ? ` · ${nf.format(lewat)} tidak ditemukan` : ""}${s("alasan") ? ` · ${s("alasan")}` : ""}`;
  }
  if (action === "package_preview") {
    const sumber = Array.isArray(detail.sumber) ? (detail.sumber as string[]).join(", ") : s("sumber");
    return `#${s("upload_id")} · ${sumber || "-"} · ${nf.format(n("rekap_rows"))} baris${n("errors") ? `, ${nf.format(n("errors"))} masalah` : ""}`;
  }
  if (action === "package_confirm") {
    const parts = [`${nf.format(n("inserted"))} baris rekap`];
    if (n("overwritten")) parts.push(`${nf.format(n("overwritten"))} ditimpa`);
    if (n("skipped")) parts.push(`${nf.format(n("skipped"))} dilewati`);
    if (n("employees")) parts.push(`${nf.format(n("employees"))} karyawan`);
    return `#${s("upload_id")} · ${parts.join(", ")}`;
  }

  // Kinerja penjualan
  if (action === "sales_preview") {
    const err = n("errors");
    return `${s("filename") || "-"} · ${nf.format(n("penjualan"))} penjualan, ${nf.format(n("target"))} target${err ? `, ${nf.format(err)} masalah` : ""}`;
  }
  if (action === "sales_confirm") {
    const parts = [`${nf.format(n("inserted_performance"))} penjualan`, `${nf.format(n("inserted_targets"))} target`];
    if (n("assessments_created")) parts.push(`${nf.format(n("assessments_created"))} penilaian baru`);
    if (n("assessments_reset")) parts.push(`${nf.format(n("assessments_reset"))} direset`);
    if (n("assessments_removed")) parts.push(`${nf.format(n("assessments_removed"))} dihapus`);
    return `#${s("upload_id")} · ${parts.join(", ")}`;
  }
  if (action === "sales_assessment_update") {
    return `${s("employee_id")} ${s("periode")} · ${s("old_status")} → ${s("new_status")}${s("notes") ? ` (${s("notes")})` : ""}`;
  }

  // Pengaturan
  if (action === "shift_upsert") {
    return `${s("kode")} · ${s("jam_masuk")}–${s("jam_pulang")}${detail.toleransi_menit != null ? `, toleransi ${nf.format(n("toleransi_menit"))} mnt` : ""}`;
  }
  if (action === "recalculate") return `${period()} · ${nf.format(n("rows"))} baris`;
  if (action === "payroll_settings_update") return `Pembagi hari kerja: ${nf.format(n("payroll_workdays"))}`;

  // Tutup/buka periode
  if (action === "period_close" || action === "period_reopen") {
    return `${s("periode") || "-"}${s("alasan") ? ` · ${s("alasan")}` : ""}`;
  }

  // Arsip file
  if (action.startsWith("archive_")) {
    return `${s("nama") || "-"}${s("alasan") ? ` · ${s("alasan")}` : ""}`;
  }

  // Export
  if (action.startsWith("export_")) {
    const rows = n("rows");
    const extra = s("departemen") || s("karyawan") || s("status");
    return `${period()}${rows ? ` (${nf.format(rows)} baris)` : ""}${extra ? ` · ${extra}` : ""}`;
  }

  // Kelola user
  if (action === "user_create") return `${s("email")}${s("departemen") ? ` · ${s("departemen")}` : " · tanpa akses"}`;
  if (action === "user_update") {
    const changes: string[] = [];
    if (detail.departemen !== undefined) changes.push(`departemen: ${s("departemen") || "tanpa akses"}`);
    if (detail.is_approver !== undefined) changes.push(`penyetuju: ${detail.is_approver ? "ya" : "tidak"}`);
    if (detail.is_active !== undefined) changes.push(`aktif: ${detail.is_active ? "ya" : "tidak"}`);
    if (detail.full_name !== undefined) changes.push(`nama: ${s("full_name")}`);
    return `#${s("user_id")}${changes.length ? ` · ${changes.join(", ")}` : ""}`;
  }
  if (action === "user_password_reset") return `#${s("user_id")}`;
  if (action === "user_deactivate") return `${s("email") || "-"} (#${s("user_id")})`;

  return JSON.stringify(detail).slice(0, 60);
}

// Dropdown pengguna: nama tebal + email muted, agar tetap terbaca sebagai identitas unik (email)
// tanpa membuat nama yang panjang terpotong. Nilai yang dikirim tetap user id.
function UserFilter({
  users, value, onChange,
}: {
  users: AuditUser[]; value: string; onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);
  const selected = users.find((u) => String(u.id) === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Filter pengguna"
        className={`${fieldClass} flex w-full items-center justify-between gap-2 text-left`}
      >
        <span className="min-w-0 truncate">
          {selected ? selected.full_name : "Semua pengguna"}
        </span>
        <Icon name="chevronDown" size={15} className="shrink-0 text-muted" />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Pilih pengguna"
          className="absolute left-0 top-[calc(100%+6px)] z-50 max-h-72 w-full min-w-[260px] overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-pop"
        >
          <li>
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => { onChange(""); setOpen(false); }}
              className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors ${!value ? "bg-accent-soft font-semibold text-accent" : "text-ink hover:bg-subtle"}`}
            >
              Semua pengguna
            </button>
          </li>
          {users.map((u) => {
            const on = String(u.id) === value;
            return (
              <li key={u.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => { onChange(String(u.id)); setOpen(false); }}
                  className={`flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors ${on ? "bg-accent-soft" : "hover:bg-subtle"}`}
                >
                  <span className={`truncate text-sm ${on ? "font-semibold text-accent" : "font-medium text-ink"}`}>{u.full_name}</span>
                  <span className="truncate text-xs text-muted">{u.email}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function AuditLogPage() {
  const [data, setData] = useState<AuditLogPage | null>(null);
  const [users, setUsers] = useState<AuditUser[]>([]);
  const [actions, setActions] = useState<AuditAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filterUser, setFilterUser] = useState<string>("");
  const [filterAction, setFilterAction] = useState<string>("");
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);

    getAuditLog({
      user_id: filterUser ? Number(filterUser) : undefined,
      action: filterAction || undefined,
      from_date: filterFrom || undefined,
      to_date: filterTo || undefined,
      page,
      page_size: 50,
    })
      .then((d) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filterUser, filterAction, filterFrom, filterTo, page]);

  useEffect(() => {
    // Pilihan filter memakai endpoint audit-log sendiri, bukan /admin/users (khusus IT),
    // agar HR dan Audit juga bisa memakainya.
    getAuditUsers().then(setUsers).catch(console.error);
    getAuditActions().then((d) => setActions(d.actions)).catch(console.error);
  }, []);

  useEffect(() => {
    // Ditunda satu microtask agar setState tidak dipanggil sinkron di badan effect
    // (aturan react-hooks/set-state-in-effect), mengikuti pola halaman dashboard.
    queueMicrotask(load);
  }, [load]);

  function resetFilters() {
    setFilterUser("");
    setFilterAction("");
    setFilterFrom("");
    setFilterTo("");
    setPage(1);
  }

  const hasFilters = filterUser || filterAction || filterFrom || filterTo;

  return (
    <div>
      <PageHeader 
        title="Audit Log" 
        description="Riwayat aktivitas pengguna: login, upload, export, dan perubahan pengaturan"
      />

      <div className="space-y-5">
        {/* Filter Panel */}
        <Panel title="Filter" subtitle="Saring berdasarkan pengguna, aksi, dan tanggal">
          <div className="grid gap-4 px-6 pb-5 pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5 text-xs font-medium text-muted">
              Pengguna
              <UserFilter
                users={users}
                value={filterUser}
                onChange={(id) => { setFilterUser(id); setPage(1); }}
              />
            </div>

            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
              Aksi
              <select
                value={filterAction}
                onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
                className={`${fieldClass} w-full`}
              >
                <option value="">Semua aksi</option>
                {actions && actions.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
              Dari Tanggal
              <input
                type="date"
                value={filterFrom}
                max={filterTo || undefined}
                onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }}
                className={`${fieldClass} w-full`}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
              Sampai Tanggal
              <input
                type="date"
                value={filterTo}
                min={filterFrom || undefined}
                onChange={(e) => { setFilterTo(e.target.value); setPage(1); }}
                className={`${fieldClass} w-full`}
              />
            </label>
          </div>

          {hasFilters && (
            <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-4">
              <p className="text-sm text-muted">
                {data ? `Menampilkan ${data.items.length} dari ${data.total} log` : "Memuat..."}
              </p>
              <button onClick={resetFilters} className={btnSecondary}>
                Reset Filter
              </button>
            </div>
          )}
        </Panel>

        {/* Error State */}
        {error && (
          <div className="rounded-xl border border-status-alpa-border bg-status-alpa-bg px-4 py-3 text-sm text-status-alpa-text">
            {error}
          </div>
        )}

        {/* Audit Log Table */}
        <Panel title="Riwayat Aktivitas" subtitle={data ? `${data.total} log tercatat` : "Memuat..."}>
          {loading && !data ? (
            <div className="px-6 py-12 text-center text-sm text-muted">Memuat audit log...</div>
          ) : data && data.items.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-muted">Tidak ada log yang sesuai dengan filter</p>
              {hasFilters && (
                <button onClick={resetFilters} className={`${btnSecondary} mt-3`}>
                  Reset Filter
                </button>
              )}
            </div>
          ) : data ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-line bg-paper text-left text-[11px] font-bold uppercase tracking-[0.04em] text-muted">
                    <tr className="h-11">
                      <th className="px-6 font-semibold">Waktu</th>
                      <th className="px-6 font-semibold">Pengguna</th>
                      <th className="px-6 font-semibold">Aksi</th>
                      <th className="px-6 font-semibold">Detail</th>
                      <th className="px-6 font-semibold">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.items.map((log) => {
                      const dt = new Date(log.created_at);
                      const detailText = formatDetail(log.action, log.detail);
                      return (
                        <tr key={log.id} className="hover:bg-subtle/50">
                          <td className="whitespace-nowrap px-6 py-3.5">
                            <div className="font-medium text-ink">{dateLabel(log.created_at.split("T")[0])}</div>
                            <div className="text-xs text-muted">{timeLabel(dt)}</div>
                          </td>
                          <td className="px-6 py-3.5">
                            {log.user_name ? (
                              <>
                                <div className="font-medium text-ink">{log.user_name}</div>
                                <div className="text-xs text-muted">{log.user_email}</div>
                              </>
                            ) : (
                              <span className="text-muted">(sistem)</span>
                            )}
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={`inline-flex whitespace-nowrap rounded-lg border px-2.5 py-1 text-xs font-semibold ${actionBadge(log.action)}`}>
                              {ACTION_LABELS[log.action] || log.action}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-muted">
                            <span className="block max-w-[32rem] truncate" title={detailText}>{detailText}</span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-3.5 font-mono text-xs text-muted">
                            {log.ip_address || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data.total > data.page_size && (
                <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-4">
                  <p className="text-sm text-muted">
                    Halaman {data.page} dari {Math.ceil(data.total / data.page_size)}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className={btnSecondary}
                    >
                      ← Sebelumnya
                    </button>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= Math.ceil(data.total / data.page_size)}
                      className={btnSecondary}
                    >
                      Berikutnya →
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
