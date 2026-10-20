"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "@/components/ui/Icon";
import { useAuth } from "@/components/auth/AuthProvider";
import { templateUrl, salesTemplateUrl, isHR, isIT, isSalesTeam, canDashboard, canPerformance } from "@/lib/api";

// Menu tampil berdasar departemen. Backend tetap menolak departemen lain dengan 403.
// show: "dashboard" 4 departemen, "hr" hanya HR, "it" hanya IT, "auditlog" HR/IT/Audit.
type Show = "dashboard" | "hr" | "it" | "auditlog" | "performance" | "sales";
const MAIN: { href: string; label: string; icon: IconName; show: Show }[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", show: "dashboard" },
  { href: "/presensi", label: "Data Presensi", icon: "calendar", show: "dashboard" },
  { href: "/upload", label: "Upload Data", icon: "upload", show: "hr" },
  { href: "/riwayat", label: "Riwayat Upload", icon: "history", show: "hr" },
  { href: "/pengaturan", label: "Pengaturan Shift & Libur", icon: "sliders", show: "hr" },
  { href: "/sales/dashboard", label: "Kinerja Penjualan", icon: "trending", show: "performance" },
  { href: "/sales/upload", label: "Upload Penjualan", icon: "upload", show: "sales" },
  { href: "/admin/users", label: "Kelola User", icon: "users", show: "it" },
  { href: "/admin/audit-log", label: "Audit Log", icon: "clipboardCheck", show: "auditlog" },
];

function visible(show: Show, user: Parameters<typeof canDashboard>[0]): boolean {
  switch (show) {
    case "dashboard":
      return canDashboard(user);
    case "hr":
      return isHR(user);
    case "it":
      return isIT(user);
    case "performance":
      return canPerformance(user);
    case "sales":
      return isSalesTeam(user);
    case "auditlog":
      return isHR(user) || isIT(user) || user?.departemen === "Audit";
  }
}

function NavItem({ href, label, icon, active }: { href: string; label: string; icon: IconName; active: boolean }) {
  return (
    <Link
      href={href}
      title={label}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-accent max-lg:justify-center ${
        active
          ? "bg-accent-soft font-semibold text-accent before:absolute before:bottom-2 before:left-0 before:top-2 before:w-[3px] before:rounded-r-full before:bg-accent"
          : "font-medium text-muted hover:bg-subtle hover:text-ink"
      }`}
    >
      <Icon name={icon} size={19} />
      <span className="hidden lg:inline">{label}</span>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-20 flex-col border-r border-line bg-white px-3 py-5 lg:w-[260px] lg:px-4">
      <div className="mb-7 flex items-center gap-3 px-1 max-lg:justify-center">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-white shadow-glow">
          <Icon name="clipboardCheck" size={21} />
        </span>
        <div className="hidden min-w-0 lg:block">
          <div className="text-[18px] font-bold leading-5 tracking-tight">PresensiHub</div>
          <div className="mt-0.5 text-[11px] font-medium text-muted">HR Attendance System</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1" aria-label="Menu utama">
        {MAIN.filter((n) => visible(n.show, user)).map((n) => (
          <NavItem key={n.href} href={n.href} label={n.label} icon={n.icon} active={pathname.startsWith(n.href)} />
        ))}
      </nav>

      {(isHR(user) || isSalesTeam(user)) && (
      <div className="mt-auto hidden rounded-2xl bg-gradient-to-br from-accent to-accent-dark p-4 text-white shadow-glow lg:block">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Icon name="file" size={17} />
          {isHR(user) ? "Template presensi" : "Template penjualan"}
        </div>
        <p className="mt-1.5 text-xs leading-[18px] text-white/80">{isHR(user) ? "Format kolom standar untuk file CSV atau XLSX yang diunggah HR." : "Format dua sheet (Penjualan dan Target) untuk file XLSX Kinerja Penjualan."}</p>
        <a href={isHR(user) ? templateUrl : salesTemplateUrl} className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white">
          <Icon name="download" size={15} />
          Unduh template
        </a>
      </div>
      )}
    </aside>
  );
}
