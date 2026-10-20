export default function Panel({
  title, subtitle, action, children, className = "",
}: {
  title?: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-white shadow-card ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 px-6 pb-2 pt-5">
          <div className="min-w-0">
            <h2 className="text-[17px] font-bold leading-6 tracking-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] leading-[18px] text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
