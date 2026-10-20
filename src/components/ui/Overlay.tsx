"use client";
import { useEffect, useRef } from "react";
import Icon from "@/components/ui/Icon";

// Layer 3 di DESIGN.md: lapisan slate transparan dengan blur. side="right" untuk drawer detail, "center" untuk dialog.
export default function Overlay({
  open, onClose, title, side = "center", children, width = 480,
}: {
  open: boolean; onClose: () => void; title: string; side?: "center" | "right"; children: React.ReactNode; width?: number;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;

  const panel =
    side === "right"
      ? "ml-auto h-full w-full rounded-l-2xl"
      : "m-auto w-full rounded-2xl";
  return (
    <div className="fixed inset-0 z-50 flex bg-slate-900/45 backdrop-blur-[4px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`flex max-h-full flex-col bg-white shadow-pop ${panel}`} style={{ maxWidth: width }}>
        <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-4">
          <h2 className="text-[17px] font-bold tracking-tight">{title}</h2>
          <button ref={closeRef} onClick={onClose} aria-label="Tutup" className="grid h-9 w-9 place-items-center rounded-xl text-muted transition-colors hover:bg-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-accent">
            <Icon name="x" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
