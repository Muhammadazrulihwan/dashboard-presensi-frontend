"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ApiError, canDashboard, getMe, logout as apiLogout, type Me } from "@/lib/api";

type AuthCtx = { user: Me; logout: () => Promise<void> };
const Ctx = createContext<AuthCtx | null>(null);

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return v;
}

/** Penjaga sesi: memuat user dari /auth/me, mengarahkan ke /login bila belum masuk. */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getMe()
      .then((me) => alive && setUser(me))
      .catch((e: unknown) => {
        if (!alive) return;
        if (e instanceof ApiError && e.status === 401) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        else setError(e instanceof Error ? e.message : "Gagal memuat sesi");
      });
    return () => {
      alive = false;
    };
    // Sesi diperiksa sekali per pemuatan layout; 401 di tengah pemakaian ditangani lib/api.ts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      router.replace("/login");
    }
  }, [router]);

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div role="alert" className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-card ring-1 ring-line/70">
          <p className="text-sm text-muted">{error}</p>
          <button onClick={() => location.reload()} className="mt-4 h-10 rounded-xl bg-accent px-4 text-sm font-medium text-white hover:bg-accent-dark">
            Coba lagi
          </button>
        </div>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center" role="status" aria-label="Memuat sesi">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" />
      </div>
    );
  }
  // Hanya empat departemen (IT, HR, Audit, Sales/Marketing) yang boleh membuka dashboard.
  if (!canDashboard(user)) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="max-w-md rounded-2xl bg-white p-6 text-center shadow-card ring-1 ring-line/70">
          <p className="text-sm text-muted">Akun <strong>{user.email}</strong> belum memiliki akses dashboard. Hubungi departemen IT untuk pengaturan departemen akun Anda.</p>
          <button onClick={logout} className="mt-4 h-10 rounded-xl bg-accent px-4 text-sm font-medium text-white hover:bg-accent-dark">Keluar</button>
        </div>
      </div>
    );
  }
  return <Ctx.Provider value={{ user, logout }}>{children}</Ctx.Provider>;
}
