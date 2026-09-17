# Backend API Naviable 🛠️

Layanan backend API berbasis **Express 5 + TypeScript** untuk platform Naviable. Sistem ini mengolah foto bukti dari warga menjadi **rantai akses terverifikasi** per lokasi: 8 elemen (E1–E8), 5 status, dikunci secara sadar oleh kontributor manusia.

Dokumentasi arsitektur umum dan invarian produk merujuk pada `README.md` utama di root repositori.

```bash
cd backend
npm install
cp .env.example .env      # mode lokal tidak memerlukan kredensial luar
npm run seed              # memasukkan 44 lokasi Surabaya ke basis data lokal
npm run dev               # http://127.0.0.1:4000
```

---

## 1. Mode Penyimpanan (Storage Modes)

// TRADE-OFF: Kami mengimplementasikan antarmuka `Store` terpadu dengan dua adapter penyimpanan:

| Mode | Kapan Digunakan | Perilaku Teknis |
|---|---|---|
| `local` *(default)* | Pengembangan lokal, demonstrasi, dan pengujian | File JSON (`database.json`) + penyimpanan foto pada direktori `LOCAL_DATA_DIR` (`.local/`). Mutasi data diantrekan secara serial dalam memori dan ditulis secara atomik (`flag: "wx"` + rename sementara). Server dikunci ke loopback (`127.0.0.1`). |
| `supabase` | Lingkungan deployment / cloud | PostgreSQL dengan Row Level Security (RLS) + transaksi atomik via stored procedure `publish_report` + bucket privat Supabase Storage untuk foto (signed URL 5 menit). |

// WARNING: Server backend menolak booting jika dijalankan dengan `NODE_ENV=production` bersamaan dengan `DATA_STORE=local` untuk mencegah penyimpanan lokal secara tidak sengaja di server produksi.

---

## 2. Konfigurasi Lingkungan (.env)

Setiap variabel dijelaskan pada berkas [`.env.example`](./.env.example):

- `DATA_STORE`: Mode penyimpanan (`local` atau `supabase`).
- `PORT`: Port server backend (default `4000`).
- `PUBLIC_API_URL`: URL publik backend yang dapat diakses dari luar. Nilai ini disematkan ke tautan foto pada berkas ekspor CSV (*Evidence Pack*).
- `TRUST_PROXY_HOPS`: Jumlah reverse proxy di depan aplikasi (misal Railway/Render biasanya bernilai `1`). Pengaturan ini memastikan pembatasan laju (*rate limiting*) mendeteksi IP asli klien, bukan IP reverse proxy.
- `GEMINI_API_KEY`: Kunci API opsional untuk analisis draf foto dengan Gemini 2.5 Flash. Jika kosong, sistem otomatis fallback ke checklist manual.

---

## 3. Daftar Endpoint API

| Method | Path | Catatan Teknis & Peran |
|---|---|---|
| `GET` | `/health`, `/api/health` | Status service, mode penyimpanan, dan indikator konfigurasi AI. |
| `GET` | `/api/ready` | Probe kesiapan penyimpanan data (*readiness probe*). |
| `GET` | `/api/places` | Daftar lokasi. Filter: `profile`, `q`, `category`, `district`, `geocoded`, `bbox`, `limit`, `offset`. |
| `GET` | `/api/places/:id` | Detail tempat, ringkasan rantai, skor terbobot, dan riwayat laporan. |
| `GET` | `/api/places/:id/reports` | Riwayat audit laporan dan koreksi per tempat (mendukung pagination). |
| `GET` | `/api/photos/:id` | Mengalirkan berkas foto bukti dengan header keamanan `Content-Security-Policy: default-src 'none'; sandbox`. |
| `POST` | `/api/reports` | Publikasi bukti lapangan terkonfirmasi manusia. Wajib menyertakan foto, `humanConfirmed: true`, dan header `Idempotency-Key`. |
| `POST` | `/api/analyze` | Draf analisis 8 elemen berbantuan AI Vision. Mengembalikan `503` dengan `fallback: manual_checklist` jika provider tidak aktif. |
| `GET` | `/api/me` | Mengambil data kontribusi perangkat/sesi saat ini. |
| `GET` | `/api/observatory` | Agregat data kota: statistik per kecamatan, sebaran status 8 elemen, dan titik rantai terputus. |
| `GET` | `/api/evidence.csv` | Unduhan CSV Evidence Pack berstandar aman (*anti-formula injection*). |
| `GET` | `/api/journey` | *Journey hint*: urutan titik perhentian transit antara dua lokasi, bukan navigasi GPS turn-by-turn. |

---

## 4. Invarian Bisnis yang Ditegakkan Kode (WARNING)

Aturan-aturan berikut diverifikasi secara ketat oleh automated tests:

- **AI Hanya Membuat Draf**: AI tidak pernah mempublikasikan laporan secara mandiri. Kolom `locked_by` pada database hanya menerima nilai `'kontributor'`.
- **AI Tidak Mengukur Metrologi**: Model tidak melakukan estimasi cm atau kemiringan. Jika keyakinan model bernilai rendah, status otomatis diturunkan menjadi `BELUM_DIKETAHUI`.
- **`BELUM_DIKETAHUI` Dikecualikan dari Skor**: Elemen yang belum memiliki bukti lapangan tidak dihitung ke dalam penyebut skor persentase.
- **Laporan Warga Tidak Mengubah `verifiedByTeam`**: Submisi kontributor adalah bukti lapangan komunitas, bukan audit resmi internal tim.
- **Nama Kecamatan Tidak Boleh Ditebak dari Alamat**: Jika tidak tercantum pada dataset awal, kecamatan tetap disimpan sebagai `null`.
- **Idempotensi Mutasi**: Percobaan pengiriman ulang dengan `Idempotency-Key` dan hash payload yang sama mengembalikan status `200` (replay). Penggunaan ulang kunci yang sama untuk isi laporan berbeda ditolak dengan status `409 Conflict`.

---

## 5. Model Data & Migrasi SQL

Struktur data terdiri atas:
- `places`: Data entitas fasilitas umum di Surabaya (ID slug, nama, koordinat, kategori, pre-survey baseline).
- `reports`: Riwayat audit laporan yang tidak dapat diubah (*immutable audit trail*), menyimpan snapshot payload lengkap dan jalur foto.
- `place_elements`: Status terkini dari 8 rantai aksesibilitas per lokasi, merujuk pada laporan yang terakhir kali menguncinya.

Urutan migrasi SQL (pada direktori `supabase/migrations/`):
1. `001_naviable.sql`: Skema inti tabel, aturan RLS, dan stored procedure transaksi `publish_report`. Dapat dijalankan pada cluster PostgreSQL 14+ standar.
2. `002_supabase_extras.sql`: Indeks geospasial PostGIS dan konfigurasi bucket privat Supabase Storage. Khusus untuk deployment managed Supabase.

---

## 6. Prosedur Pengujian & Verifikasi

```bash
# Typecheck TypeScript (tsc --noEmit)
npm run typecheck

# Unit & Domain Tests terhadap penyimpanan lokal sementara (node:test)
npm test

# Pengujian Transaksi SQL & RLS pada PostgreSQL 16 lokal sementara
npm run test:sql

# Pengujian Loop Publikasi HTTP End-to-End (terhadap backend yang sedang aktif)
npm run test:smoke
```

- `npm test` berjalan mandiri tanpa menyentuh basis data pengguna atau jaringan luar.
- `npm run test:sql` menginisialisasi cluster PostgreSQL temporer di `.local/pgtest` pada port bebas, menjalankan migrasi, menguji transaksi `publish_report` serta kebijakan RLS, lalu menghentikan dan menghapus cluster secara otomatis.
- `npm run test:smoke` menguji loop penuh mulai dari upload foto, verifikasi status, replay idempoten, penolakan konflik 409, riwayat koreksi, penyajian foto aman, ekspor baris CSV, hingga hitungan observatory.

---

## 7. Kontributor

Dikembangkan oleh **Tim coba-coba** (Telkom University Surabaya):
- **Bagus Ardin**
- **Ida Bagus**
- **Hartita**
- **Muthe**

