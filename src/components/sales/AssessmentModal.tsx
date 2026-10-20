"use client";
import { useState } from "react";
import SalesBadge from "@/components/sales/Badges";
import { btnDangerGhost, btnPrimary, fieldClass } from "@/components/ui/Button";
import Overlay from "@/components/ui/Overlay";
import { dateLabel, monthLabel, pct, rupiah, updateAssessment, type AssessmentStatus, type Salesman } from "@/lib/api";

const MAX_NOTES = 500; // samakan dengan AssessmentUpdate.notes di backend

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-paper px-4 py-3">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="mt-0.5 text-sm font-bold tracking-tight">{children}</div>
    </div>
  );
}

// Keputusan yang berlawanan dengan rekomendasi sistem wajib diberi catatan agar bisa ditelusuri Audit.
function needsNotes(rec: Salesman["status_kelayakan"], decision: AssessmentStatus) {
  return (rec === "Tidak Layak" && decision === "Disetujui") || (rec === "Layak" && decision === "Ditolak") || (rec === "Target belum ada" && decision === "Disetujui");
}

export default function AssessmentModal({ row, onClose, onSaved }: { row: Salesman; onClose: () => void; onSaved: () => void }) {
  const [notes, setNotes] = useState(row.catatan ?? "");
  const [busy, setBusy] = useState<AssessmentStatus | null>(null);
  const [error, setError] = useState("");

  async function decide(status: AssessmentStatus) {
    if (needsNotes(row.status_kelayakan, status) && !notes.trim()) {
      setError("Keputusan ini berbeda dari rekomendasi sistem. Isi catatan sebagai alasannya.");
      return;
    }
    setError("");
    setBusy(status);
    try {
      await updateAssessment(row.employee_id, row.periode, { status, notes: notes.trim() || undefined });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan keputusan");
      setBusy(null);
    }
  }

  const override = (s: AssessmentStatus) => needsNotes(row.status_kelayakan, s);
  return (
    <Overlay open onClose={() => !busy && onClose()} title="Persetujuan Penilaian" width={560}>
      <div className="space-y-5 p-6">
        <div>
          <p className="text-base font-bold tracking-tight">{row.nama}</p>
          <p className="text-[13px] text-muted"><span className="num">{row.employee_id}</span> · {row.cabang} · {monthLabel(row.periode)}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Penjualan">{rupiah(row.penjualan)}</Field>
          <Field label="Target pribadi">{rupiah(row.target)}</Field>
          <Field label="Capaian">{pct(row.capaian_pct)}</Field>
          <Field label="Rekomendasi sistem"><SalesBadge label={row.status_kelayakan} /></Field>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
          Status saat ini: <SalesBadge label={row.assessment_status} />
          {row.approved_by && row.approved_at && <span>oleh {row.approved_by}, {dateLabel(row.approved_at)}</span>}
        </div>

        <label className="block text-sm font-semibold">
          Catatan penyetuju
          <textarea
            value={notes}
            maxLength={MAX_NOTES}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Alasan keputusan (wajib bila berbeda dari rekomendasi sistem)"
            className={`${fieldClass} mt-1.5 block h-auto w-full py-2 font-normal`}
          />
          <span className="mt-1 block text-right text-xs font-normal text-muted">{notes.length}/{MAX_NOTES}</span>
        </label>

        {error && <p role="alert" className="rounded-xl border border-status-alpa-border bg-status-alpa-bg px-4 py-3 text-sm text-status-alpa-text">{error}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <button disabled={busy !== null} onClick={() => decide("Disetujui")} className={btnPrimary}>
            {busy === "Disetujui" ? "Menyimpan..." : override("Disetujui") ? "Setujui (di luar rekomendasi)" : "Setujui"}
          </button>
          <button disabled={busy !== null} onClick={() => decide("Ditolak")} className={btnDangerGhost}>
            {busy === "Ditolak" ? "Menyimpan..." : override("Ditolak") ? "Tolak (di luar rekomendasi)" : "Tolak"}
          </button>
          {row.assessment_status !== "Draf" && (
            <button disabled={busy !== null} onClick={() => decide("Draf")} className="text-sm font-semibold text-muted hover:text-ink">
              {busy === "Draf" ? "Menyimpan..." : "Kembalikan ke Draf"}
            </button>
          )}
        </div>
      </div>
    </Overlay>
  );
}
