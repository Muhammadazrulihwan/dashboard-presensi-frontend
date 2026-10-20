"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import { btnSecondary } from "@/components/ui/Button";
import {
  dateLabel, getCompleteness, nf, monthLabel,
  type Completeness, type CompletenessKetukan, type CompletenessSelisih, type CompletenessKoreksiTutup,
} from "@/lib/api";
import { useFilters } from "@/lib/filters";

function Stat({ label, value, hint, tone = "neutral" }: {
  label: string; value: string; hint?: string; tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const box = {
    neutral: "border-line bg-white",
    good: "border-status-hadir-border bg-status-hadir-bg",
    warn: "border-status-terlambat-border bg-status-terlambat-bg",
    bad: "border-status-alpa-border bg-status-alpa-bg",
  }[tone];
  const text = {
    neutral: "text-ink",
    good: "text-status-hadir-text",
    warn: "text-status-terlambat-text",
    bad: "text-status-alpa-text",
  }[tone];
  return (
    <div className={`rounded-2xl border p-5 shadow-card ${box}`}>
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className={`num mt-1 text-2xl font-bold tracking-tight ${text}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

function KetukanTable({ rows, empty, missing }: { rows: CompletenessKetukan[]; empty: string; missing: "masuk" | "keluar" }) {
  if (rows.length === 0) {
    return <p className="px-6 pb-6 pt-3 text-sm text-muted">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="h-11 border-y border-line bg-paper text-left text-[11px] font-bold uppercase tracking-[0.04em] text-muted">
            <th className="pl-6 pr-3.5">Tanggal</th>
            <th className="px-3.5">Karyawan / NIK</th>
            <th className="px-3.5">Divisi</th>
            <th className="px-3.5">Jam masuk</th>
            <th className="px-3.5">Jam keluar</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.nik}-${r.tanggal}-${i}`} className="h-14 border-b border-subtle last:border-b-0 hover:bg-paper">
              <td className="whitespace-nowrap pl-6 pr-3.5 text-[13px] text-muted">{dateLabel(r.tanggal)}</td>
              <td className="px-3.5">
                <div className="whitespace-nowrap text-sm font-semibold leading-5">{r.nama}</div>
                <div className="num text-[11px] leading-4 text-muted">{r.nik}</div>
              </td>
              <td className="whitespace-nowrap px-3.5 text-[13px] text-status-dinas-text">{r.departemen}</td>
              <td className={`num px-3.5 text-[13px] ${missing === "masuk" ? "font-semibold text-status-alpa-text" : "text-ink"}`}>
                {r.jam_masuk ?? "hilang"}
              </td>
              <td className={`num px-3.5 text-[13px] ${missing === "keluar" ? "font-semibold text-status-alpa-text" : "text-ink"}`}>
                {r.jam_keluar ?? "hilang"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SelisihTable({ rows, empty }: { rows: CompletenessSelisih[]; empty: string }) {
  if (rows.length === 0) return <p className="px-6 pb-6 pt-3 text-sm text-muted">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-sm">
        <thead>
          <tr className="h-11 border-y border-line bg-paper text-left text-[11px] font-bold uppercase tracking-[0.04em] text-muted">
            <th className="pl-6 pr-3.5">Tanggal</th>
            <th className="px-3.5">Karyawan / NIK</th>
            <th className="px-3.5">Divisi</th>
            <th className="px-3.5 pr-6">Selisih</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.nik}-${r.tanggal}-${i}`} className="h-14 border-b border-subtle last:border-b-0 hover:bg-paper">
              <td className="whitespace-nowrap pl-6 pr-3.5 text-[13px] text-muted">{dateLabel(r.tanggal)}</td>
              <td className="px-3.5">
                <div className="whitespace-nowrap text-sm font-semibold leading-5">{r.nama}</div>
                <div className="num text-[11px] leading-4 text-muted">{r.nik}</div>
              </td>
              <td className="whitespace-nowrap px-3.5 text-[13px] text-status-dinas-text">{r.departemen}</td>
              <td className="px-3.5 pr-6 text-[13px] text-status-terlambat-text">{r.selisih}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KoreksiTutupTable({ rows, empty }: { rows: CompletenessKoreksiTutup[]; empty: string }) {
  if (rows.length === 0) return <p className="px-6 pb-6 pt-3 text-sm text-muted">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-sm">
        <thead>
          <tr className="h-11 border-y border-line bg-paper text-left text-[11px] font-bold uppercase tracking-[0.04em] text-muted">
            <th className="pl-6 pr-3.5">Tanggal</th>
            <th className="px-3.5">Karyawan / NIK</th>
            <th className="px-3.5">Approver</th>
            <th className="px-3.5 pr-6">Alasan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.nik}-${r.tanggal}-${i}`} className="h-14 border-b border-subtle last:border-b-0 hover:bg-paper">
              <td className="whitespace-nowrap pl-6 pr-3.5 text-[13px] text-muted">{dateLabel(r.tanggal)}</td>
              <td className="px-3.5">
                <div className="whitespace-nowrap text-sm font-semibold leading-5">{r.nama}</div>
                <div className="num text-[11px] leading-4 text-muted">{r.nik}</div>
              </td>
              <td className="px-3.5 text-[13px]">{r.approver ?? "-"}</td>
              <td className="px-3.5 pr-6 text-[13px] text-muted">{r.alasan ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function KelengkapanPage() {
  const { filters, error: filterError, reload } = useFilters();
  const [data, setData] = useState<Completeness | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!filters) return;
    let off = false;
    getCompleteness(filters)
      .then((d) => { if (!off) { setData(d); setError(""); } })
      .catch((e: Error) => { if (!off) setError(e.message); });
    return () => { off = true; };
  }, [filters]);

  const periodText = filters?.from && filters?.to
    ? `${dateLabel(filters.from)} sampai ${dateLabel(filters.to)}`
    : "semua periode";

  const failure = filterError || error;
  return (
    <div>
      <PageHeader
        title="Kelengkapan Data"
        description={`Periksa kesiapan data presensi sebelum tutup bulan. Periode: ${periodText}.`}
        actions={
          <button onClick={() => reload(true)} className={btnSecondary}>
            <Icon name="history" size={17} />
            Muat ulang
          </button>
        }
      />

      {failure ? (
        <div className="rounded-2xl border border-status-alpa-border bg-status-alpa-bg p-5 text-sm text-red-900" role="alert">
          <p className="font-semibold">Data tidak dapat dimuat</p>
          <p className="mt-1">{failure}</p>
        </div>
      ) : !data ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="Memuat data">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-[118px] animate-pulse rounded-2xl border border-line bg-white" />)}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Hari kerja kalender" value={nf.format(data.hari_kerja_kalender)} hint="Senin sampai Sabtu, tanpa hari libur" />
            <Stat
              label="Karyawan lengkap"
              value={nf.format(data.ringkasan.karyawan_lengkap)}
              hint={`dari ${nf.format(data.ringkasan.karyawan)} karyawan`}
              tone={data.ringkasan.karyawan_tanpa_data === 0 ? "good" : "neutral"}
            />
            <Stat
              label="Hari tanpa data"
              value={nf.format(data.ringkasan.hari_tanpa_data)}
              hint={`${nf.format(data.ringkasan.karyawan_tanpa_data)} karyawan belum lengkap`}
              tone={data.ringkasan.hari_tanpa_data === 0 ? "good" : "warn"}
            />
            <Stat
              label="Ketukan tidak lengkap"
              value={nf.format(data.ringkasan.baris_clock_out_hilang + data.ringkasan.baris_clock_in_hilang)}
              hint={`${nf.format(data.ringkasan.baris_clock_out_hilang)} clock out, ${nf.format(data.ringkasan.baris_clock_in_hilang)} clock in`}
              tone={data.ringkasan.baris_clock_out_hilang + data.ringkasan.baris_clock_in_hilang === 0 ? "good" : "bad"}
            />
            <Stat
              label="Selisih Report"
              value={nf.format(data.ringkasan.baris_selisih_report ?? 0)}
              hint="Hasil sistem berbeda dari Report Attendance"
              tone={(data.ringkasan.baris_selisih_report ?? 0) === 0 ? "good" : "warn"}
            />
            <Stat
              label="Koreksi setelah tutup"
              value={nf.format(data.ringkasan.baris_koreksi_setelah_tutup ?? 0)}
              hint="Koreksi diajukan setelah bulan berjalan"
              tone={(data.ringkasan.baris_koreksi_setelah_tutup ?? 0) === 0 ? "good" : "bad"}
            />
          </div>

          {data.ringkasan.hari_tanpa_data === 0 && data.ringkasan.baris_clock_out_hilang === 0 && data.ringkasan.baris_clock_in_hilang === 0 ? (
            <div className="flex items-start gap-4 rounded-2xl border border-status-hadir-border bg-status-hadir-bg p-6">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-status-hadir-border bg-white text-status-hadir-text" aria-hidden="true">
                <Icon name="check" size={22} stroke={2.4} />
              </span>
              <div>
                <p className="text-base font-bold text-status-hadir-text">Data pada periode ini lengkap</p>
                <p className="mt-1 text-sm text-muted">Semua karyawan punya baris pada setiap hari kerja, dan tidak ada ketukan yang hilang.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-2xl border border-status-terlambat-border bg-status-terlambat-bg p-5" role="status">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-status-terlambat-text" aria-hidden="true"><Icon name="alert" size={19} /></span>
              <div>
                <p className="text-sm font-bold text-amber-900">Ada data yang perlu ditindaklanjuti</p>
                <p className="mt-0.5 text-[13px] text-amber-800">Perbaiki file sumber lalu unggah ulang (pilih Timpa) sebelum periode ditutup.</p>
              </div>
            </div>
          )}

          <Panel title="Karyawan dengan hari tanpa data" subtitle="Hari kerja kalender yang tidak punya baris data untuk karyawan tersebut">
            {data.karyawan_tanpa_data.length === 0 ? (
              <p className="px-6 pb-6 pt-3 text-sm text-muted">Tidak ada karyawan dengan hari tanpa data.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead>
                    <tr className="h-11 border-y border-line bg-paper text-left text-[11px] font-bold uppercase tracking-[0.04em] text-muted">
                      <th className="pl-6 pr-3.5">Karyawan / NIK</th>
                      <th className="px-3.5">Divisi</th>
                      <th className="px-3.5 text-right">Hari kerja tercatat</th>
                      <th className="px-3.5 text-right">Hari tanpa data</th>
                      <th className="px-3.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.karyawan_tanpa_data.map((r) => (
                      <tr key={r.nik} className="h-14 border-b border-subtle last:border-b-0 hover:bg-paper">
                        <td className="pl-6 pr-3.5">
                          <div className="whitespace-nowrap text-sm font-semibold leading-5">{r.nama}</div>
                          <div className="num text-[11px] leading-4 text-muted">{r.nik}</div>
                        </td>
                        <td className="whitespace-nowrap px-3.5 text-[13px] text-status-dinas-text">{r.departemen}</td>
                        <td className="num px-3.5 text-right text-[13px]">{nf.format(r.hari_kerja_tercatat)}</td>
                        <td className="num px-3.5 text-right text-[13px] font-semibold text-status-terlambat-text">{nf.format(r.hari_tanpa_data)}</td>
                        <td className="px-3.5 pr-6 text-right">
                          <Link href={`/karyawan/${encodeURIComponent(r.nik)}`} className="text-[13px] font-semibold text-accent hover:underline">
                            Lihat detail
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <div className="grid gap-5 xl:grid-cols-2">
            <Panel title="Clock out hilang" subtitle="Jam masuk ada, jam keluar kosong">
              <KetukanTable rows={data.clock_out_hilang} missing="keluar" empty="Tidak ada clock out yang hilang." />
            </Panel>
            <Panel title="Clock in hilang" subtitle="Jam keluar ada, jam masuk kosong">
              <KetukanTable rows={data.clock_in_hilang} missing="masuk" empty="Tidak ada clock in yang hilang." />
            </Panel>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Panel title="Selisih terhadap Report Attendance" subtitle="Hasil sistem berbeda dari Report; dipakai sebagai pembanding, bukan menimpa">
              <SelisihTable rows={data.selisih_report} empty="Tidak ada selisih terhadap Report Attendance." />
            </Panel>
            <Panel title="Koreksi setelah tutup bulan" subtitle="Koreksi yang diajukan setelah bulan efektifnya lewat">
              <KoreksiTutupTable rows={data.koreksi_setelah_tutup} empty="Tidak ada koreksi setelah tutup bulan." />
            </Panel>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Panel title="Cakupan per bulan" subtitle="Jumlah karyawan dan baris yang tercatat tiap bulan">
              {data.cakupan_bulan.length === 0 ? (
                <p className="px-6 pb-6 pt-3 text-sm text-muted">Belum ada data pada filter ini.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead>
                      <tr className="h-11 border-y border-line bg-paper text-left text-[11px] font-bold uppercase tracking-[0.04em] text-muted">
                        <th className="pl-6 pr-3.5">Bulan</th>
                        <th className="px-3.5 text-right">Karyawan</th>
                        <th className="px-3.5 text-right">Baris</th>
                        <th className="px-3.5 pr-6 text-right">Hari kerja</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.cakupan_bulan.map((c) => (
                        <tr key={c.periode} className="h-12 border-b border-subtle last:border-b-0 hover:bg-paper">
                          <td className="whitespace-nowrap pl-6 pr-3.5 font-medium">{monthLabel(c.periode)}</td>
                          <td className="num px-3.5 text-right">{nf.format(c.karyawan)}</td>
                          <td className="num px-3.5 text-right">{nf.format(c.baris)}</td>
                          <td className="num px-3.5 pr-6 text-right">{nf.format(c.hari_kerja)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel title="Status sumber data" subtitle="Sumber yang tersedia untuk membangun Rekap Absensi">
              <ul className="divide-y divide-line px-6 pb-6 pt-2">
                {data.sumber.map((s) => {
                  const ok = s.status === "tersedia";
                  return (
                    <li key={s.kode} className="flex items-start gap-3 py-3">
                      <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${ok ? "bg-status-hadir-bg text-status-hadir-text" : "bg-subtle text-muted"}`} aria-hidden="true">
                        <Icon name={ok ? "check" : "clock"} size={15} stroke={2.2} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{s.nama}</span>
                          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${ok ? "border-status-hadir-border bg-status-hadir-bg text-status-hadir-text" : "border-line bg-subtle text-muted"}`}>
                            {ok ? "Tersedia" : "Belum"}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted">{s.catatan}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </div>

          <p className="rounded-xl border border-line bg-white px-4 py-3 text-[13px] leading-5 text-muted">
            Indikator <span className="font-semibold text-ink">selisih terhadap Report Attendance</span> dan{" "}
            <span className="font-semibold text-ink">koreksi setelah tutup bulan</span> berasal dari Rekap Absensi
            terpadu (paket empat sumber). Pada data yang hanya diunggah lewat file template lama, keduanya kosong.
          </p>
        </div>
      )}
    </div>
  );
}
