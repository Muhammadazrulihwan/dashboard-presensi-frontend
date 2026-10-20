"use client";
import { useDropzone, type FileRejection } from "react-dropzone";
import Icon from "@/components/ui/Icon";
import { templateUrl } from "@/lib/api";

const MAX_MB = 50; // samakan dengan MAX_UPLOAD_MB di backend
const REQUIRED = ["nik", "nama", "tanggal", "jam_masuk", "jam_keluar", "status"];
const OPTIONAL = ["departemen", "shift", "keterangan", "lokasi_kerja"];

const MAX_FILES = 20; // batas file per sekali upload

export default function Dropzone({
  onFiles,
  onReject,
}: {
  onFiles: (files: File[]) => void;
  onReject: (message: string) => void;
}) {
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    multiple: true,
    maxFiles: MAX_FILES,
    noClick: true,
    noKeyboard: true,
    maxSize: MAX_MB * 1024 * 1024,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    onDropAccepted: (files) => onFiles(files),
    onDropRejected: (r: FileRejection[]) => {
      const code = r[0]?.errors[0]?.code;
      onReject(
        code === "file-too-large"
          ? `Ukuran file melebihi ${MAX_MB} MB. Pecah file menjadi beberapa bagian.`
          : code === "too-many-files"
            ? `Maksimal ${MAX_FILES} file sekali upload.`
            : "Format file tidak didukung. Gunakan .csv atau .xlsx."
      );
    },
  });

  return (
    <div className="rounded-2xl border border-line bg-white p-3 shadow-card">
      <div
        {...getRootProps()}
        className={`rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
          isDragActive ? "border-accent bg-accent-soft" : "border-[#93c5fd] bg-paper"
        }`}
      >
        <input {...getInputProps()} />
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-accent ring-8 ring-white">
          <Icon name="cloudUpload" size={30} stroke={1.6} />
        </span>
        <p className="mt-5 text-lg font-bold tracking-tight">{isDragActive ? "Lepaskan file di sini" : "Seret satu atau beberapa file presensi ke sini"}</p>
        <p className="mt-1 text-sm text-muted">Format CSV atau XLSX, maksimal {MAX_MB} MB per file dan {MAX_FILES} file sekali upload</p>
        <button type="button" onClick={open} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-colors hover:bg-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          <Icon name="upload" size={17} />
          Pilih File (bisa lebih dari satu)
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-3 pb-2 pt-4">
        <div className="min-w-0 text-[13px] leading-6 text-muted">
          <span className="font-semibold text-ink">Kolom wajib:</span>{" "}
          {REQUIRED.map((c) => <code key={c} className="num mr-1 rounded-md bg-accent-soft px-1.5 py-0.5 text-[12px] text-accent-dark">{c}</code>)}
          <br />
          <span className="font-semibold text-ink">Opsional:</span>{" "}
          {OPTIONAL.map((c) => <code key={c} className="num mr-1 rounded-md bg-subtle px-1.5 py-0.5 text-[12px] text-muted">{c}</code>)}
        </div>
        <a href={templateUrl} className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
          <Icon name="download" size={16} />
          Unduh Template Presensi (.xlsx)
        </a>
      </div>
    </div>
  );
}
