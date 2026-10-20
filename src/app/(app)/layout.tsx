import { Suspense } from "react";
import AuthProvider from "@/components/auth/AuthProvider";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { FilterProvider } from "@/lib/filters";

// Semua halaman di grup (app) dijaga AuthProvider (redirect ke /login bila belum masuk) dan berbagi filter lewat FilterProvider.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AuthProvider>
        <FilterProvider>
          <div className="min-h-screen">
            <Sidebar />
            <div className="pl-20 lg:pl-[260px]">
              <Header />
              <main className="px-6 pb-12 pt-7 lg:px-8">
                <div className="mx-auto max-w-[1440px]">{children}</div>
              </main>
            </div>
          </div>
        </FilterProvider>
      </AuthProvider>
    </Suspense>
  );
}
