// Semua komunikasi dengan backend FastAPI ada di file ini.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ---------- Tipe ----------
// Hak akses v0.4 ditentukan departemen akun, bukan peran.
export type Department = "IT" | "HR" | "Audit" | "Sales/Marketing";
export type Me = { id: number; email: string; full_name: string; departemen: string | null; is_approver?: boolean };

// Departemen yang boleh membuka dashboard.
export const DASHBOARD_DEPTS: Department[] = ["IT", "HR", "Audit", "Sales/Marketing"];
// Departemen yang boleh menilai kinerja dan export rekap individu (bukan IT).
export const PERFORMANCE_DEPTS: Department[] = ["HR", "Audit", "Sales/Marketing"];

export const DEPARTMENTS: Department[] = DASHBOARD_DEPTS;

export const canDashboard = (m: Me | null) => !!m?.departemen && DASHBOARD_DEPTS.includes(m.departemen as Department);
export const canPerformance = (m: Me | null) => !!m?.departemen && PERFORMANCE_DEPTS.includes(m.departemen as Department);
export const isHR = (m: Me | null) => m?.departemen === "HR";
// Rekap Payroll: HR dan Audit (lihat). IT dan Sales/Marketing tidak.
export const canPayroll = (m: Me | null) => m?.departemen === "HR" || m?.departemen === "Audit";
export const isIT = (m: Me | null) => m?.departemen === "IT";
// Kinerja Penjualan: upload oleh Sales/Marketing, dashboard untuk HR, Audit, Sales/Marketing, persetujuan hanya akun penyetuju.
export const isSalesTeam = (m: Me | null) => m?.departemen === "Sales/Marketing";
export const isApprover = (m: Me | null) => isSalesTeam(m) && !!m?.is_approver;

export type Filters = { from: string; to: string; departemen: string; status: string; karyawan: string }; // from/to: YYYY-MM-DD
export const emptyFilters: Filters = { from: "", to: "", departemen: "", status: "", karyawan: "" };

export type Meta = { min_date: string | null; max_date: string | null; departemen: string[]; statuses: string[] };
export type SummaryData = {
  hari_kerja: number; hadir: number; kehadiran_pct: number | null;
  terlambat: number; menit_terlambat: number;
  izin: number; sakit: number; cuti: number; alpa: number; dinas_luar: number; tidak_hadir: number;
  avg_jam_masuk: string | null; avg_jam_masuk_menit: number | null; avg_selisih_masuk_menit: number | null;
  karyawan: number; records: number;
  dikoreksi?: number; selisih_report?: number; clock_out_hilang?: number; koreksi_setelah_tutup?: number; jam_kerja_nyata?: number | null;
};
export type SummaryResponse = { current: SummaryData; previous: SummaryData | null };
export type TrendPoint = { period: string; kehadiran_pct: number | null; terlambat: number };
export type StatusCount = { status: string; total: number };
export type DeptRow = {
  departemen: string; karyawan: number; hari_kerja: number; hadir: number;
  kehadiran_pct: number | null; terlambat: number; menit_terlambat: number;
};
export type TopEmployee = { nik: string; nama: string; departemen: string; terlambat: number; menit_terlambat: number; alpa: number };
export type AttendanceRow = {
  id: number; tanggal: string; nik: string; nama: string; departemen: string;
  jam_masuk: string | null; jam_keluar: string | null; menit_terlambat: number;
  durasi_kerja: number | null; status: string; keterangan: string | null;
  jam_kerja_nyata?: number | null; dikoreksi?: boolean; koreksi_alasan?: string | null;
  koreksi_approver?: string | null; clock_out_hilang?: boolean; selisih_report?: string | null;
};
export type RecordsPage = { items: AttendanceRow[]; total: number; page: number; page_size: number };
export type SortKey = "tanggal" | "nik" | "nama" | "departemen" | "jam_masuk" | "menit_terlambat" | "durasi_kerja" | "status";

export type ValidationError = { row: number; column: string; message: string };
export type PreviewResponse = {
  upload_id: number; filename: string; row_count: number;
  preview_rows: Record<string, unknown>[]; errors: ValidationError[]; error_count: number; can_save: boolean;
  conflict_count: number; date_from: string | null; date_to: string | null; employee_count: number; mapped_columns: string[];
};
export type UploadHistory = {
  id: number; filename: string; uploader: string; created_at: string; row_count: number | null;
  status: "saved" | "failed" | "deleted";
};
export type ConflictMode = "overwrite" | "skip";
export type ConfirmResponse = { upload: UploadHistory; inserted: number; overwritten: number; skipped: number };

export type Shift = { kode: string; jam_masuk: string; jam_pulang: string; toleransi_menit: number; lintas_hari: boolean };
export type ShiftInput = { jam_masuk: string; jam_pulang: string; toleransi_menit: number };
export type Holiday = { id: number; tanggal: string; nama: string };

// ---------- Helper request ----------
export class ApiError extends Error {
  constructor(message: string, public status = 0) {
    super(message);
  }
}

// Sesi habis di tengah pemakaian: kembali ke halaman login (kecuali permintaan auth itu sendiri).
function onUnauthorized(path: string) {
  if (typeof window === "undefined" || path.startsWith("/auth/") || window.location.pathname.startsWith("/login")) return;
  window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}&expired=1`;
}
const NETWORK_MSG = `Tidak dapat terhubung ke server. Pastikan backend berjalan di ${API_URL}`;

function detailOf(body: unknown): string | null {
  const d = (body as { detail?: unknown } | null)?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d) && d.length) return "Input tidak valid";
  return null;
}

const jsonInit = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

async function request<T>(path: string, init?: RequestInit, params?: Record<string, string | number | undefined>): Promise<T> {
  const q = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== "") q.set(k, String(v));
  });
  const qs = q.toString();
  let res: Response;
  try {
    // credentials: "include" agar cookie sesi (httpOnly) ikut terkirim ke API.
    res = await fetch(`${API_URL}${path}${qs ? `?${qs}` : ""}`, { cache: "no-store", credentials: "include", ...init });
  } catch {
    throw new ApiError(NETWORK_MSG);
  }
  if (!res.ok) {
    if (res.status === 401) onUnauthorized(path);
    const body = await res.json().catch(() => null);
    throw new ApiError(detailOf(body) ?? "Terjadi kesalahan pada server", res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const filterParams = (f: Filters) => ({ from: f.from, to: f.to, departemen: f.departemen, status: f.status, karyawan: f.karyawan });

// ---------- Auth ----------
export const login = (email: string, password: string) => request<Me>("/auth/login", jsonInit("POST", { email, password }));
export const logout = () => request<void>("/auth/logout", { method: "POST" });
export const getMe = () => request<Me>("/auth/me");

// ---------- Dashboard ----------
export const getMeta = () => request<Meta>("/dashboard/meta");
export const getSummary = (f: Filters) => request<SummaryResponse>("/dashboard/summary", undefined, filterParams(f));
export const getTrend = (f: Filters, granularity: "day" | "month") =>
  request<TrendPoint[]>("/dashboard/trend", undefined, { ...filterParams(f), granularity });
export const getStatusComposition = (f: Filters) => request<StatusCount[]>("/dashboard/status-composition", undefined, filterParams(f));
export const getByDepartment = (f: Filters) => request<DeptRow[]>("/dashboard/by-department", undefined, filterParams(f));
export const getTopEmployees = (f: Filters, metric: "terlambat" | "alpa") =>
  request<TopEmployee[]>("/dashboard/top-employees", undefined, { ...filterParams(f), metric, limit: 5 });

// Kinerja Karyawan (PRD F26): peringkat per karyawan untuk HR, Audit, Sales/Marketing (IT tidak).
export type PerformanceRow = {
  nik: string; nama: string; departemen: string;
  hari_kerja: number; hadir: number; dinas_luar: number; kehadiran_pct: number | null;
  terlambat: number; menit_terlambat: number; tepat_waktu_pct: number | null;
  izin: number; sakit: number; cuti: number; alpa: number; pulang_cepat: number;
  jam_kerja: number; menit_lembur: number; dikoreksi: number;
};
export type PerformanceSort =
  | "nama" | "departemen" | "kehadiran_pct" | "tepat_waktu_pct" | "terlambat"
  | "menit_terlambat" | "alpa" | "jam_kerja" | "menit_lembur";
export const getPerformance = (f: Filters, sort: PerformanceSort = "kehadiran_pct", order: "asc" | "desc" = "desc") =>
  request<PerformanceRow[]>("/dashboard/performance", undefined, { ...filterParams(f), sort, order });

export type EmployeeTrendPoint = { period: string; status: string; kehadiran_pct: number | null; terlambat: number };
export type EmployeeDetail = {
  nik: string; nama: string; departemen: string;
  rekap: SummaryData; range: AttendanceRow[]; trend: EmployeeTrendPoint[];
};
export const getEmployeeDetail = (nik: string, f: Filters) =>
  request<EmployeeDetail>(`/dashboard/employee/${encodeURIComponent(nik)}`, undefined, filterParams(f));

export const getRecords = (
  f: Filters,
  o: { page: number; pageSize: number; sort?: SortKey; order?: "asc" | "desc"; q?: string }
) =>
  request<RecordsPage>("/dashboard/records", undefined, {
    ...filterParams(f), page: o.page, page_size: o.pageSize, sort: o.sort, order: o.order, q: o.q,
  });

// ---------- Kelengkapan Data (PRD F12, HR) ----------
export type CompletenessTanpaData = {
  nik: string; nama: string; departemen: string; hari_kerja_tercatat: number; hari_tanpa_data: number;
};
export type CompletenessKetukan = {
  nik: string; nama: string; departemen: string; tanggal: string; jam_masuk: string | null; jam_keluar: string | null;
};
export type CompletenessCakupan = { periode: string; karyawan: number; baris: number; hari_kerja: number };
export type CompletenessSumber = { kode: string; nama: string; status: "tersedia" | "belum"; catatan: string };
export type CompletenessSelisih = { nik: string; nama: string; departemen: string; tanggal: string; selisih: string; menit_terlambat: number };
export type CompletenessKoreksiTutup = { nik: string; nama: string; departemen: string; tanggal: string; alasan: string | null; approver: string | null };
export type Completeness = {
  periode: { from: string | null; to: string | null };
  hari_kerja_kalender: number;
  ringkasan: {
    karyawan: number; karyawan_lengkap: number; karyawan_tanpa_data: number;
    hari_tanpa_data: number; baris_clock_out_hilang: number; baris_clock_in_hilang: number;
    baris_selisih_report?: number; baris_koreksi_setelah_tutup?: number;
  };
  karyawan_tanpa_data: CompletenessTanpaData[];
  clock_out_hilang: CompletenessKetukan[];
  clock_in_hilang: CompletenessKetukan[];
  selisih_report: CompletenessSelisih[];
  koreksi_setelah_tutup: CompletenessKoreksiTutup[];
  cakupan_bulan: CompletenessCakupan[];
  sumber: CompletenessSumber[];
};
export const getCompleteness = (f: Filters) => request<Completeness>("/dashboard/completeness", undefined, filterParams(f));

// ---------- Tutup/buka periode (PRD F13, HR) ----------
export type Period = {
  tahun: number; bulan: number; periode: string; ditutup: boolean;
  ditutup_oleh: string | null; ditutup_at: string | null; alasan: string | null; records: number;
};
export const getPeriods = (tahun?: number) => request<Period[]>("/periods", undefined, { tahun });
export const closePeriod = (tahun: number, bulan: number, alasan?: string) =>
  request<Period>("/periods/close", jsonInit("POST", { tahun, bulan, alasan: alasan || undefined }));
export const reopenPeriod = (tahun: number, bulan: number, alasan: string) =>
  request<Period>("/periods/reopen", jsonInit("POST", { tahun, bulan, alasan }));

// ---------- Upload paket empat sumber (PRD F4-F9, Rilis B) ----------
export type SourceKind = "activity" | "report" | "timeoff" | "approval";
export type SourceFileInfo = {
  jenis_sumber: SourceKind; nama_file: string; row_count: number; warnings: string[];
  mapped_columns: string[]; date_from: string | null; date_to: string | null;
};
export type PackagePreview = {
  upload_id: number; files: SourceFileInfo[]; errors: string[]; can_save: boolean;
  date_from: string | null; date_to: string | null; employee_count: number; rekap_rows: number;
  status_counts: Record<string, number>; conflict_count: number;
};
export type PackageConfirm = {
  upload: UploadHistory; inserted: number; overwritten: number; skipped: number;
  sumber: Record<string, number>; employees: number;
};

export function packagePreview(files: Partial<Record<SourceKind, File>>, onProgress: (pct: number) => void): Promise<PackagePreview> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/uploads/package/preview`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body: unknown = null;
      try { body = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as PackagePreview);
      else {
        if (xhr.status === 401) onUnauthorized("/uploads/package/preview");
        reject(new ApiError(detailOf(body) ?? "Upload paket gagal", xhr.status));
      }
    };
    xhr.onerror = () => reject(new ApiError(NETWORK_MSG));
    const fd = new FormData();
    (Object.keys(files) as SourceKind[]).forEach((k) => {
      const f = files[k];
      if (f) fd.append(k, f);
    });
    xhr.send(fd);
  });
}
export const confirmPackage = (id: number, mode?: ConflictMode) =>
  request<PackageConfirm>(`/uploads/package/${id}/confirm`, jsonInit("POST", mode ? { mode } : {}));

// ---------- Arsip file upload (PRD F22-F24, HR & Audit) ----------
export type ArchiveStatus = "aktif" | "sampah" | "dihapus";
export type ArchivedFile = {
  id: number; upload_id: number | null; jenis_sumber: string; nama_asli: string; ukuran: number;
  checksum: string; checksum_terverifikasi: boolean; pengunggah: string | null;
  periode_awal: string | null; periode_akhir: string | null; status: ArchiveStatus;
  created_at: string; dihapus_at: string | null; alasan_hapus: string | null; bisa_dihapus_permanen: boolean;
};
export type ArchivedFilePage = { items: ArchivedFile[]; total: number; page: number; page_size: number };
export type ArchiveQuery = {
  status?: ArchiveStatus | "semua"; jenis_sumber?: string; pengunggah_id?: number;
  q?: string; dari?: string; sampai?: string; page?: number; page_size?: number;
};
export const getArchive = (o: ArchiveQuery = {}) => request<ArchivedFilePage>("/archive", undefined, o);
export const getArchiveUploaders = () => request<{ id: number; full_name: string; email: string }[]>("/archive/uploaders");
export const archiveDownloadUrl = (id: number) => `${API_URL}/archive/${id}/download`;
export const trashArchive = (id: number, alasan: string) => request<ArchivedFile>(`/archive/${id}/trash`, jsonInit("POST", { alasan }));
export const restoreArchive = (id: number) => request<ArchivedFile>(`/archive/${id}/restore`, { method: "POST" });
export const purgeArchive = (id: number) => request<ArchivedFile>(`/archive/${id}`, { method: "DELETE" });
export const canArchive = (m: Me | null) => m?.departemen === "HR" || m?.departemen === "Audit";

// ---------- Upload ----------
export const getUploads = (o: { status?: string; limit?: number; offset?: number } = {}) =>
  request<UploadHistory[]>("/uploads", undefined, o);
export const confirmUpload = (id: number, mode?: ConflictMode) =>
  request<ConfirmResponse>(`/uploads/${id}/confirm`, jsonInit("POST", mode ? { mode } : {}));
export const deleteUpload = (id: number) => request<UploadHistory>(`/uploads/${id}`, { method: "DELETE" });
export const templateUrl = `${API_URL}/uploads/template`;

// XMLHttpRequest dipakai karena fetch belum mendukung progres upload.
export function uploadPreview(file: File, onProgress: (pct: number) => void): Promise<PreviewResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/uploads/preview`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as PreviewResponse);
      else {
        if (xhr.status === 401) onUnauthorized("/uploads/preview");
        reject(new ApiError(detailOf(body) ?? "Upload gagal", xhr.status));
      }
    };
    xhr.onerror = () => reject(new ApiError(NETWORK_MSG));
    const fd = new FormData();
    fd.append("file", file);
    xhr.send(fd);
  });
}

// ---------- Kinerja Penjualan ----------
export type SalesValidationError = { sheet: string; row: number; column: string; message: string };
export type SalesReupload = { periode: string; cabang: string[]; penjualan_diganti: number; penilaian_diputuskan: number };
export type SalesPreview = {
  upload_id: number; filename: string; row_count_penjualan: number; row_count_target: number;
  errors: SalesValidationError[]; error_count: number; warnings: string[]; can_save: boolean;
  reupload: SalesReupload[]; perlu_konfirmasi: boolean;
};
export type SalesConfirm = {
  upload: { id: number; filename: string; uploader: string; created_at: string; row_count: number | null; status: string };
  inserted_performance: number; inserted_targets: number; assessments_created: number;
  assessments_reset: number; assessments_removed: number;
};
export type SalesMeta = { periodes: string[]; cabang: string[] };
export type AssessmentStatus = "Draf" | "Disetujui" | "Ditolak";
export type Kelayakan = "Layak" | "Tidak Layak" | "Target belum ada";
export type Salesman = {
  employee_id: string; nama: string; cabang: string; periode: string;
  penjualan: number; penerimaan: number | null; piutang_outlet: number | null; sisa_bad_debt: number | null;
  target: number | null; capaian_pct: number | null; kontribusi_cabang_pct: number | null; peringkat_cabang: number | null;
  status_kelayakan: Kelayakan; assessment_status: AssessmentStatus; approved_by: string | null; approved_at: string | null;
  catatan: string | null;
  hari_kerja: number | null; hari_hadir: number | null; kehadiran_pct: number | null; terlambat_hari: number | null;
};
export type CabangRow = {
  cabang: string; periode: string; total_penjualan: number; target_cabang: number | null; capaian_pct: number | null;
  sisa_target: number; jumlah_salesman: number; salesman_layak: number; salesman_tidak_layak: number;
  peringkat: number | null; status: "Tercapai" | "Perlu dikejar" | "Jauh dari target";
};
export type PerusahaanData = {
  periode: string; total_penjualan: number; target_perusahaan: number | null; capaian_pct: number | null;
  sisa_target: number; jumlah_cabang: number; cabang_tercapai: number;
};

export const salesTemplateUrl = `${API_URL}/sales/template`;
export const getSalesMeta = () => request<SalesMeta>("/sales/meta");
export const getSalesmen = (periode: string, cabang?: string) => request<Salesman[]>("/sales/salesman", undefined, { periode, cabang });
export const getCabangPerf = (periode: string) => request<CabangRow[]>("/sales/cabang", undefined, { periode });
export const getPerusahaanPerf = (periode: string) => request<PerusahaanData>("/sales/perusahaan", undefined, { periode });
export const confirmSales = (id: number, timpa = false) =>
  request<SalesConfirm>(`/sales/${id}/confirm`, { method: "POST" }, { timpa: timpa ? "true" : undefined });
export const updateAssessment = (employeeId: string, periode: string, body: { status: AssessmentStatus; notes?: string }) =>
  request<{ message: string }>(`/sales/assessment/${encodeURIComponent(employeeId)}/${encodeURIComponent(periode)}`, jsonInit("PATCH", body));

export function salesPreview(file: File, onProgress: (pct: number) => void): Promise<SalesPreview> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/sales/preview`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as SalesPreview);
      else {
        if (xhr.status === 401) onUnauthorized("/sales/preview");
        reject(new ApiError(detailOf(body) ?? "Upload gagal", xhr.status));
      }
    };
    xhr.onerror = () => reject(new ApiError(NETWORK_MSG));
    const fd = new FormData();
    fd.append("file", file);
    xhr.send(fd);
  });
}

export const rupiah = (n: number | null) => (n === null ? "-" : `Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n)}`);
export const ratioPct = (a: number | null, b: number) => (a === null || b <= 0 ? null : (a / b) * 100);

// ---------- Pengaturan ----------
export const getShifts = () => request<Shift[]>("/settings/shifts");
export const saveShift = (kode: string, s: ShiftInput) => request<Shift>(`/settings/shifts/${encodeURIComponent(kode)}`, jsonInit("PUT", s));
export const removeShift = (kode: string) => request<void>(`/settings/shifts/${encodeURIComponent(kode)}`, { method: "DELETE" });
export const getHolidays = (year: number) => request<Holiday[]>("/settings/holidays", undefined, { year });
export const addHoliday = (h: { tanggal: string; nama: string }) => request<Holiday>("/settings/holidays", jsonInit("POST", h));
export const removeHoliday = (id: number) => request<void>(`/settings/holidays/${id}`, { method: "DELETE" });
export const recalculate = (from: string, to: string) => request<{ updated: number }>("/settings/recalculate", jsonInit("POST", { from, to }));

// Pembagi hari kerja Rekap Payroll (PRD F29). Default 25; dipakai untuk gaji_prorata_persen.
export type PayrollSettings = { payroll_workdays: number };
export const getPayrollSettings = () => request<PayrollSettings>("/settings/payroll");
export const savePayrollSettings = (payroll_workdays: number) =>
  request<PayrollSettings>("/settings/payroll", jsonInit("PUT", { payroll_workdays }));

// ---------- Audit log (HR, IT, Audit) ----------
export type AuditUser = { id: number; full_name: string; email: string };
export type AuditAction = { value: string; label: string };
// Pengguna yang muncul di audit log (bukan seluruh akun; /admin/users khusus IT).
export const getAuditUsers = () => request<AuditUser[]>("/admin/audit-log/users");
export const getAuditActions = () => request<{ actions: AuditAction[] }>("/admin/audit-log/actions");

// ---------- Kelola user (departemen IT) ----------
export type AdminUser = {
  id: number; email: string; full_name: string;
  departemen: string | null; is_approver: boolean; is_active: boolean; created_at: string;
};
export type UserCreateInput = { email: string; full_name: string; password: string; departemen: string | null };
export type UserUpdateInput = { full_name?: string; departemen?: string | null; is_active?: boolean; is_approver?: boolean };

export const getUsers = () => request<AdminUser[]>("/admin/users");
export const getDepartments = () => request<string[]>("/admin/users/departments");
export const createUser = (u: UserCreateInput) => request<AdminUser>("/admin/users", jsonInit("POST", u));
export const updateUser = (id: number, u: UserUpdateInput) => request<AdminUser>(`/admin/users/${id}`, jsonInit("PATCH", u));
export const resetUserPassword = (id: number, password: string) => request<void>(`/admin/users/${id}/password`, jsonInit("POST", { password }));
export const deactivateUser = (id: number) => request<void>(`/admin/users/${id}`, { method: "DELETE" });

// ---------- Export ----------
export function exportUrl(kind: "excel" | "pdf" | "payroll", f: Filters) {
  const q = new URLSearchParams();
  // Rekap Payroll memuat semua status, jadi filter status tidak dikirim.
  Object.entries(filterParams(f)).forEach(([k, v]) => v && !(kind === "payroll" && k === "status") && q.set(k, v));
  const qs = q.toString();
  return `${API_URL}/exports/${kind}${qs ? `?${qs}` : ""}`;
}

// Rekap individual PDF: satu karyawan per halaman. Tanpa nik, memuat semua karyawan pada filter.
export function employeePdfUrl(f: Filters, nik?: string) {
  const q = new URLSearchParams();
  Object.entries(filterParams(f)).forEach(([k, v]) => v && q.set(k, v));
  if (nik) q.set("nik", nik);
  const qs = q.toString();
  return `${API_URL}/exports/employee/pdf${qs ? `?${qs}` : ""}`;
}

// Rekap individual Excel untuk satu karyawan (nik wajib).
export function employeeExcelUrl(f: Filters, nik: string) {
  const q = new URLSearchParams();
  Object.entries(filterParams(f)).forEach(([k, v]) => v && q.set(k, v));
  q.set("nik", nik);
  return `${API_URL}/exports/employee/excel?${q.toString()}`;
}

// ---------- Format tampilan ----------
export const nf = new Intl.NumberFormat("id-ID");
const nf1 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const num1 = (n: number) => nf1.format(n);
export const pct = (v: number | null) => (v === null ? "-" : `${nf1.format(v)}%`);

export function formatMinutes(n: number) {
  if (n < 60) return `${n} mnt`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m ? `${h} j ${m} mnt` : `${h} j`;
}

const ymd = (iso: string) => iso.slice(0, 10).split("-").map(Number) as [number, number, number];
export function dateLabel(iso: string) {
  const [y, m, d] = ymd(iso);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}
export function dayShort(iso: string) {
  const [y, m, d] = ymd(iso);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}
// "2026-03" -> "Mar 2026"
export function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "short", year: "numeric" });
}
export const monthStart = (iso: string) => `${iso.slice(0, 8)}01`;
export function daysBetween(a: string, b: string) {
  const [y1, m1, d1] = ymd(a);
  const [y2, m2, d2] = ymd(b);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}
export function granularityOf(f: Filters): "day" | "month" {
  return f.from && f.to && daysBetween(f.from, f.to) <= 62 ? "day" : "month";
}
