# Frontend PresensiHub (redesain UI mengikuti referensi Stitch)

Backend (folder `backend/`) dipakai apa adanya; hanya frontend yang berubah.

## Menjalankan
1. Pastikan backend berjalan di http://localhost:8000 (ubah lewat `NEXT_PUBLIC_API_URL` jika berbeda).
2. `npm install` (tidak ada paket baru; font Plus Jakarta Sans dan JetBrains Mono dimuat lewat `next/font/google`, butuh internet saat dev/build).
3. `npm run dev`.

Login memakai akun admin awal dari `backend/.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).

## Halaman
- /login — masuk (sesi cookie httpOnly)
- /dashboard — ringkasan, tren, komposisi status, perbandingan divisi
- /presensi — tabel data presensi (pagination, pencarian, sorting di server)
- /karyawan/[nik] — detail satu karyawan + export PDF individual
- /upload, /riwayat, /pengaturan — khusus HR Admin
- /admin/users — kelola user (khusus HR Admin)

## Struktur
- Token desain terpusat di `app/globals.css` (`@theme`), warna status di `lib/theme.ts`.
- Komponen UI dasar: `components/ui/` (Button, Icon, Panel, PageHeader, StatusBadge, Avatar, Overlay).
- Header + sidebar: `components/layout/` (Header punya pencarian, pemilih periode, export; Sidebar menyembunyikan menu HR dari peran lain).
- Filter bersama: `lib/filters.tsx` (FilterProvider); format tampilan: `lib/format.ts`.
- Akses backend: `lib/api.ts`.

## Catatan
- Peran diatur backend: HR Admin penuh, atasan dibatasi divisinya, manajemen hanya agregat. Sidebar/header mengikuti peran tersebut.
- Riwayat upload menyembunyikan tombol Hapus dari non-HR (backend tetap menolak dengan 403).

