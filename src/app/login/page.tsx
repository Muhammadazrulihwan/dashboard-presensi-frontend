"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, getMe, login } from "@/lib/api";

// Hanya path internal yang boleh jadi tujuan setelah login (mencegah open redirect).
function safeNext(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : "/dashboard";
}

// Pesan "sesi berakhir" dibaca sekali saat komponen pertama dirender. Halaman ini dirender di klien untuk
// query string, jadi nilainya di-set lewat efek mikro agar tidak memicu peringatan setState-in-effect sekaligus
// menghindari hydration mismatch (server selalu merender null).
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("expired")) {
      queueMicrotask(() => setNotice("Sesi Anda berakhir. Silakan masuk kembali."));
    }
    // Sudah punya sesi aktif: langsung ke dashboard.
    getMe().then(() => router.replace(safeNext())).catch(() => {});
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.replace(safeNext());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan. Coba lagi.");
      setPassword("");
      setBusy(false);
    }
  }

  const field = "h-11 w-full rounded-xl bg-white px-3.5 text-sm ring-1 ring-line transition-shadow placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent";

  return (
    <main className="grid min-h-screen place-items-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-white" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 20V10M12 20V4M19 20v-7" /></svg>
          </span>
          <span className="text-xl font-semibold tracking-tight">Presensi</span>
        </div>

        <form onSubmit={onSubmit} className="rounded-2xl bg-white p-7 shadow-card ring-1 ring-line/70">
          <h1 className="text-xl font-semibold tracking-tight">Masuk</h1>
          <p className="mt-1 text-sm text-muted">Dashboard presensi karyawan untuk HR dan atasan.</p>

          {notice && !error && <p role="status" className="mt-4 rounded-xl bg-accent-soft px-3.5 py-2.5 text-sm text-accent-dark">{notice}</p>}
          {error && <p role="alert" className="mt-4 rounded-xl bg-[#fef2f2] px-3.5 py-2.5 text-sm text-[#dc2626]">{error}</p>}

          <label htmlFor="email" className="mt-5 block text-sm font-medium">Email</label>
          <input id="email" type="email" autoComplete="username" required autoFocus value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="nama@perusahaan.com" className={`${field} mt-1.5`} />

          <label htmlFor="password" className="mt-4 block text-sm font-medium">Password</label>
          <div className="relative mt-1.5">
            <input id="password" type={show ? "text" : "password"} autoComplete="current-password" required value={password}
              onChange={(e) => setPassword(e.target.value)} className={`${field} pr-16`} />
            <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show}
              className="absolute right-1.5 top-1.5 h-8 rounded-lg px-2.5 text-xs font-medium text-muted hover:bg-paper hover:text-ink">
              {show ? "Sembunyikan" : "Tampilkan"}
            </button>
          </div>

          <button type="submit" disabled={busy || !email || !password}
            className="mt-6 h-11 w-full rounded-xl bg-accent text-sm font-medium text-white shadow-[0_8px_18px_-8px_rgb(37_99_235/0.24)] transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? "Memeriksa..." : "Masuk"}
          </button>
        </form>
        <p className="mt-5 text-center text-xs text-muted">Lupa password? Hubungi HR Admin.</p>
      </div>
    </main>
  );
}
