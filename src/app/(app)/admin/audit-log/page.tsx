"use client";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import { btnSecondary, fieldClass } from "@/components/ui/Button";
import { API_URL, dateLabel, getUsers, type AdminUser } from "@/lib/api";
import { timeLabel } from "@/lib/format";

type AuditLogItem = {
  id: number;
  user_id: number | null;
  user_name: string | null;
  user_email: string | null;
  action: string;
  detail: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

type AuditLogResponse = {
  items: AuditLogItem[];
  total: number;
  page: number;
  page_size: number;
};

type ActionOption = { value: string; label: string };

// Label aksi dalam Bahasa Indonesia
const ACTION_LABELS: Record<string, string> = {
  login: "Login",
  login_failed: "Login Gagal",
  login_blocked: "Login Diblokir",
  logout: "Logout",
  upload: "Upload File",
  upload_confirmed: "Upload Dikonfirmasi",
  upload_deleted: "Upload Dihapus",
  export_excel: "Export Excel",
  export_pdf: "Export PDF",
  export_employee_pdf: "Export PDF Karyawan",
  export_employee_excel: "Export Excel Karyawan",
  export_payroll: "Export Payroll",
  user_created: "Buat User",
  user_updated: "Update User",
  user_password_reset: "Reset Password",
  user_deactivated: "Nonaktifkan User",
  shift_created: "Buat Shift",
  shift_updated: "Update Shift",
  shift_deleted: "Hapus Shift",
  holiday_created: "Tambah Libur",
  holiday_deleted: "Hapus Libur",
  recalculate: "Hitung Ulang",
};

// Badge warna per kategori aksi
function actionBadge(action: string): string {
  if (action === "login") return "border-accent-ring bg-accent-soft text-accent";
  if (action.startsWith("login_")) return "border-status-alpa-border bg-status-alpa-bg text-status-alpa-text";
  if (action.startsWith("export_")) return "border-status-dinas-border bg-status-dinas-bg text-status-dinas-text";
  if (action.startsWith("upload")) return "border-status-hadir-border bg-status-hadir-bg text-status-hadir-text";
  if (action.includes("delete") || action.includes("deactivate")) return "border-status-terlambat-border bg-status-terlambat-bg text-status-terlambat-text";
  if (action.includes("created") || action.includes("updated") || action.includes("reset")) return "border-status-izin-border bg-status-izin-bg text-status-izin-text";
  return "border-line bg-subtle text-muted";
}

function formatDetail(action: string, detail: Record<string, unknown> | null): string {
  if (!detail) return "-";
  
  if (action === "login" || action === "login_failed" || action === "login_blocked") {
    return detail.email as string || "-";
  }
  if (action === "upload" || action === "upload_confirmed" || action === "upload_deleted") {
    return detail.filename as string || "-";
  }
  if (action.startsWith("export_")) {
    const from = detail.from as string || "";
    const to = detail.to as string || "";
    const rows = detail.rows as number || 0;
    if (from && to) return `${dateLabel(from)} - ${dateLabel(to)} (${rows} baris)`;
    if (rows) return `${rows} baris`;
    return "-";
  }
  if (action === "user_created") {
    return detail.new_user as string || "-";
  }
  if (action === "user_updated" || action === "user_password_reset" || action === "user_deactivated") {
    return detail.target_email as string || "-";
  }
  if (action.includes("shift")) {
    return detail.kode as string || "-";
  }
  if (action.includes("holiday")) {
    return detail.tanggal as string || "-";
  }
  if (action === "recalculate") {
    const from = detail.from as string || "";
    const to = detail.to as string || "";
    if (from && to) return `${dateLabel(from)} - ${dateLabel(to)}`;
    return "-";
  }
  
  return JSON.stringify(detail).slice(0, 50);
}

export default function AuditLogPage() {
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [actions, setActions] = useState<ActionOption[]>([]);
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

    const params = new URLSearchParams();
    if (filterUser) params.set("user_id", filterUser);
    if (filterAction) params.set("action", filterAction);
    if (filterFrom) params.set("from_date", filterFrom);
    if (filterTo) params.set("to_date", filterTo);
    params.set("page", String(page));
    params.set("page_size", "50");

    fetch(`${API_URL}/admin/audit-log?${params}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Gagal memuat audit log");
        return r.json();
      })
      .then((d: AuditLogResponse) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filterUser, filterAction, filterFrom, filterTo, page]);

  useEffect(() => {
    // Load users untuk dropdown
    getUsers().then(setUsers).catch(console.error);

    // Load actions untuk dropdown
    fetch(`${API_URL}/admin/audit-log/actions`, { credentials: "include" })
      .then((r) => r.json())
      .then((d: { actions: ActionOption[] }) => setActions(d.actions))
      .catch(console.error);
  }, []);

  useEffect(() => {
    load();
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="filter-user" className="mb-1.5 block text-sm font-medium text-ink">
                Pengguna
              </label>
              <select
                id="filter-user"
                value={filterUser}
                onChange={(e) => { setFilterUser(e.target.value); setPage(1); }}
                className={fieldClass}
              >
                <option value="">Semua pengguna</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-action" className="mb-1.5 block text-sm font-medium text-ink">
                Aksi
              </label>
              <select
                id="filter-action"
                value={filterAction}
                onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
                className={fieldClass}
              >
                <option value="">Semua aksi</option>
                {actions && actions.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-from" className="mb-1.5 block text-sm font-medium text-ink">
                Dari Tanggal
              </label>
              <input
                type="date"
                id="filter-from"
                value={filterFrom}
                onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }}
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="filter-to" className="mb-1.5 block text-sm font-medium text-ink">
                Sampai Tanggal
              </label>
              <input
                type="date"
                id="filter-to"
                value={filterTo}
                onChange={(e) => { setFilterTo(e.target.value); setPage(1); }}
                className={fieldClass}
              />
            </div>
          </div>

          {hasFilters && (
            <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
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
            <div className="py-12 text-center text-sm text-muted">Memuat audit log...</div>
          ) : data && data.items.length === 0 ? (
            <div className="py-12 text-center">
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
                  <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-6 py-3 font-medium">Waktu</th>
                      <th className="px-6 py-3 font-medium">Pengguna</th>
                      <th className="px-6 py-3 font-medium">Aksi</th>
                      <th className="px-6 py-3 font-medium">Detail</th>
                      <th className="px-6 py-3 font-medium">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.items.map((log) => {
                      const dt = new Date(log.created_at);
                      return (
                        <tr key={log.id} className="hover:bg-subtle/50">
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="font-medium text-ink">{dateLabel(log.created_at.split("T")[0])}</div>
                            <div className="text-xs text-muted">{timeLabel(dt)}</div>
                          </td>
                          <td className="px-6 py-4">
                            {log.user_name ? (
                              <>
                                <div className="font-medium text-ink">{log.user_name}</div>
                                <div className="text-xs text-muted">{log.user_email}</div>
                              </>
                            ) : (
                              <span className="text-muted">(sistem)</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${actionBadge(log.action)}`}>
                              {ACTION_LABELS[log.action] || log.action}
                            </span>
                          </td>
                          <td className="max-w-xs truncate px-6 py-4 text-muted">
                            {formatDetail(log.action, log.detail)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-muted">
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
                <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
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
