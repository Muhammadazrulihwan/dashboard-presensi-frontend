// Gaya tombol dari DESIGN.md. Dipakai sebagai string kelas agar bisa dipasang di <button>, <a>, dan <Link>.
const BASE = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-[18px] py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-45";

export const btnPrimary = `${BASE} bg-accent text-white shadow-glow hover:bg-accent-dark active:bg-accent-deep disabled:shadow-none`;
export const btnSecondary = `${BASE} border border-line bg-white text-ink hover:border-line-strong hover:bg-paper`;
export const btnDanger = `${BASE} bg-status-alpa-text text-white hover:bg-red-700`;
export const btnDangerGhost = `${BASE} border border-status-alpa-border bg-status-alpa-bg text-status-alpa-text hover:bg-red-100`;
export const fieldClass =
  "h-10 rounded-xl border border-line bg-white px-3 text-sm text-ink placeholder:text-faint transition-colors hover:border-line-strong focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent/30";
