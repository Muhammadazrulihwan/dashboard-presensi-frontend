"use client";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import { btnPrimary, btnSecondary, fieldClass } from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  createUser, deactivateUser, getDepartments, getUsers, resetUserPassword, updateUser,
  DEPARTMENTS, type AdminUser,
} from "@/lib/api";

type Notice = { ok: boolean; text: string } | null;
const emptyForm = { email: "", full_name: "", password: "", departemen: "" };

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [depts, setDepts] = useState<string[]>(DEPARTMENTS);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const ok = (text: string) => setNotice({ ok: true, text });
  const fail = (e: Error) => setNotice({ ok: false, text: e.message });

  const load = useCallback(() => {
    getUsers().then(setUsers).catch(fail);
  }, []);
  useEffect(load, [load]);
  useEffect(() => {
    getDepartments().then(setDepts).catch(() => undefined);
  }, []);

  function add() {
    const email = form.email.trim();
    if (!email || !form.full_name.trim() || form.password.length < 8) {
      return setNotice({ ok: false, text: "Isi semua kolom. Password minimal 8 karakter." });
    }
    setBusy(true);
    createUser({ email, full_name: form.full_name.trim(), password: form.password, departemen: form.departemen || null })
      .then(() => { ok(`User ${email} ditambahkan.`); setForm(emptyForm); load(); })
      .catch(fail)
      .finally(() => setBusy(false));
  }

  function patch(u: AdminUser, change: Parameters<typeof updateUser>[1], label: string) {
    updateUser(u.id, change)
      .then(() => { ok(`${u.full_name}: ${label} disimpan.`); load(); })
      .catch(fail);
  }

  function reset(u: AdminUser) {
    const pw = window.prompt(`Password baru untuk ${u.email} (minimal 8 karakter):`);
    if (pw === null) return;
    if (pw.length < 8) return setNotice({ ok: false, text: "Password minimal 8 karakter." });
    resetUserPassword(u.id, pw)
      .then(() => ok(`Password ${u.email} diperbarui.`))
      .catch(fail);
  }

  function remove(u: AdminUser) {
    if (!window.confirm(`Nonaktifkan ${u.full_name} (${u.email})? Riwayat unggahannya tetap tersimpan.`)) return;
    deactivateUser(u.id).then(() => { ok(`${u.full_name} dinonaktifkan.`); load(); }).catch(fail);
  }

  return (
    <div>
      <PageHeader title="Kelola user" description="Tambah akun, atur departemen, nonaktifkan, atau atur ulang password. Hanya departemen IT." />
      <div className="space-y-5">
        {notice && (
          <p className={`rounded-xl px-4 py-3 text-sm ring-1 ${notice.ok ? "bg-accent-soft text-accent ring-accent/30" : "border border-status-alpa-border bg-status-alpa-bg text-status-alpa-text"}`} role="status">
            {notice.text}
          </p>
        )}

        <Panel title="Akun pengguna" subtitle={`${users?.length ?? 0} akun`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  {["Nama", "Email", "Departemen", "Penyetuju", "Status", ""].map((h) => <th key={h} className="px-6 py-3 font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {users?.map((u) => (
                  <tr key={u.id} className={`border-t border-line/70 ${u.is_active ? "" : "opacity-60"}`}>
                    <td className="px-6 py-3 font-medium">{u.full_name}{u.id === user.id && <span className="ml-2 text-xs font-normal text-muted">Anda</span>}</td>
                    <td className="px-6 py-3">{u.email}</td>
                    <td className="px-6 py-3">
                      <select
                        className={fieldClass}
                        value={u.departemen ?? ""}
                        aria-label={`Departemen ${u.full_name}`}
                        onChange={(e) => patch(u, { departemen: e.target.value }, "departemen")}
                      >
                        <option value="">— Tanpa akses —</option>
                        {depts.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-3">
                      {u.departemen === "Sales/Marketing" ? (
                        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted">
                          <input
                            type="checkbox"
                            checked={u.is_approver}
                            aria-label={`Penyetuju ${u.full_name}`}
                            onChange={(e) => patch(u, { is_approver: e.target.checked }, "penyetuju")}
                            className="h-4 w-4 accent-accent"
                          />
                          {u.is_approver ? "Penyetuju" : "Bukan"}
                        </label>
                      ) : (
                        <span className="text-xs text-faint">-</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${u.is_active ? "bg-accent-soft text-accent" : "bg-paper text-muted"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${u.is_active ? "bg-accent" : "bg-muted"}`} aria-hidden="true" />
                        {u.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => reset(u)} className={`${btnSecondary} h-8`}>Reset password</button>
                        {u.is_active && u.id !== user.id && (
                          <button onClick={() => remove(u)} className="rounded-xl px-3 text-sm text-status-alpa-text transition-colors hover:bg-red-50">Nonaktifkan</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!users && <tr><td colSpan={7} className="px-6 py-10 text-center text-muted">Memuat data...</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Tambah akun baru">
          <div className="flex flex-wrap items-end gap-4 px-6 pb-6 pt-3">
            <label className="flex flex-col gap-1.5 text-xs text-muted">Nama<input className={`${fieldClass} w-52`} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></label>
            <label className="flex flex-col gap-1.5 text-xs text-muted">Email<input type="email" className={`${fieldClass} w-56`} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label className="flex flex-col gap-1.5 text-xs text-muted">Password<input type="password" className={`${fieldClass} w-44`} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
            <label className="flex flex-col gap-1.5 text-xs text-muted">
              Departemen
              <select className={fieldClass} value={form.departemen} onChange={(e) => setForm({ ...form, departemen: e.target.value })}>
                <option value="">— Tanpa akses —</option>
                {depts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <button disabled={busy} onClick={add} className={btnPrimary}>{busy ? "Menyimpan..." : "Tambah user"}</button>
          </div>
          <p className="px-6 pb-5 text-xs text-muted">Hanya departemen IT, HR, Audit, dan Sales/Marketing yang dapat membuka dashboard. Upload presensi hanya untuk HR, upload penjualan hanya untuk Sales/Marketing. Penanda Penyetuju (akun Sales/Marketing) memberi hak menyetujui Penilaian Kinerja Penjualan.</p>
        </Panel>
      </div>
    </div>
  );
}
