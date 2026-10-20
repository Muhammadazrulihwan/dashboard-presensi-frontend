import Link from "next/link";
import Icon from "@/components/ui/Icon";
import Panel from "@/components/ui/Panel";
import { nf, type UploadHistory } from "@/lib/api";

export default function SourcePanel({ latest, records }: { latest: UploadHistory | null; records: number }) {
  return (
    <Panel title="Sumber Data" subtitle="File presensi yang terakhir disimpan" className="h-full">
      {latest ? (
        <dl className="space-y-4 px-6 pb-5 pt-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-accent-ring bg-accent-soft text-accent" aria-hidden="true">
              <Icon name="file" size={20} />
            </span>
            <div className="min-w-0">
              <dt className="text-xs text-muted">File terakhir</dt>
              <dd className="truncate font-semibold">{latest.filename}</dd>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><dt className="text-xs text-muted">Diunggah oleh</dt><dd className="mt-0.5 font-medium">{latest.uploader}</dd></div>
            <div><dt className="text-xs text-muted">Jumlah baris</dt><dd className="num mt-0.5 font-medium">{nf.format(latest.row_count ?? 0)}</dd></div>
          </div>
          <div>
            <dt className="text-xs text-muted">Waktu unggah</dt>
            <dd className="mt-0.5 font-medium">{new Date(latest.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</dd>
          </div>
        </dl>
      ) : (
        <p className="px-6 pb-6 pt-3 text-sm text-muted">Belum ada file yang tersimpan.</p>
      )}
      <div className="mx-4 mb-4 rounded-xl bg-paper px-4 py-3.5 text-[13px] leading-5 text-muted">
        Export memuat <span className="num font-semibold text-ink">{nf.format(records)}</span> baris sesuai filter aktif.
        <Link href="/riwayat" className="mt-1.5 block font-semibold text-accent hover:underline">Lihat riwayat upload</Link>
      </div>
    </Panel>
  );
}
