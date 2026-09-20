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
- `AI_PROVIDER_ORDER`: Urutan failover provider, default `google,openai,openrouter`.
- `GEMINI_API_KEY` / `GEMINI_MODEL`: Google Gemini Vision (default `gemini-3.6-flash`).
- `OPENAI_API_KEY` / `OPENAI_MODEL`: OpenAI vision dan pemeriksaan Content Provenance. Kunci hanya digunakan di backend.
- `OPENROUTER_API_KEY` / `OPENROUTER_MODEL`: OpenRouter vision. Model tanpa structured output tetap divalidasi oleh schema Zod yang sama.
- `AI_PROVIDER_TIMEOUT_MS`: Batas waktu per provider. Jika semuanya gagal atau tidak dikonfigurasi, UI tetap menyediakan checklist manual.

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
| `POST` | `/api/reports` | Publikasi bukti lapangan terkonfirmasi manusia. Wajib menyertakan foto, `humanConfirmed: true`, dan header `Idempotency-Key`. Foto dengan provenance AI tepercaya ditolak; hasil yang hanya mencurigakan meminta bukti tambahan dan tetap memerlukan keputusan manusia. |
| `POST` | `/api/analyze` | Draf analisis 8 elemen melalui failover Google, OpenAI, dan OpenRouter, sekaligus hasil integritas foto yang terpisah. Mengembalikan `503` dengan `fallback: manual_checklist` jika seluruh provider tidak aktif. |
| `GET` | `/api/me` | Mengambil data kontribusi perangkat/sesi saat ini. |
| `GET` | `/api/observatory` | Agregat data kota: statistik per kecamatan, sebaran status 8 elemen, dan titik rantai terputus. |
| `GET` | `/api/evidence.csv` | Unduhan CSV Evidence Pack berstandar aman (*anti-formula injection*). |
| `GET` | `/api/journey` | *Journey hint*: urutan titik perhentian transit antara dua lokasi, bukan navigasi GPS turn-by-turn. |
| `POST` | `/api/places` | Menambah lokasi baru sekaligus laporan bukti pertamanya dalam satu transaksi idempoten (`create_place_report`). Wajib login, foto, `humanConfirmed: true`, dan `Idempotency-Key`. |
| `GET` | `/api/places/:id/reviews` | Daftar ulasan pengalaman naratif warga untuk sebuah lokasi (mendukung pagination). |
| `POST` | `/api/reviews` | Kirim ulasan pengalaman (teks kualitatif, bukan status elemen). Wajib login dan `Idempotency-Key`; tidak memengaruhi skor rantai. |
| `GET` | `/api/reviewer/stats` | Ringkasan antrean review (`submitted`, `approvedToday`, `needsRevision`, `rejected`, `total`). |
| `GET` | `/api/reviewer/reports` | Daftar seluruh laporan untuk ditinjau; filter `status` dan `search`, mendukung pagination. |
| `GET` | `/api/reviewer/reports/:id` | Detail laporan lengkap beserta snapshot lokasi untuk halaman review. |
| `POST` | `/api/reviewer/reports/:id/review` | Merekam keputusan reviewer (`APPROVED`/`NEEDS_REVISION`/`REJECTED`/`UNDER_REVIEW`). `NEEDS_REVISION` dan `REJECTED` wajib menyertakan catatan; `APPROVED` menyalakan `verifiedByTeam` lokasi. |
| `GET` | `/api/reviewer/history` | Riwayat laporan yang sudah diputuskan, terurut dari keputusan terbaru. |

**Autentikasi.** Seluruh endpoint `POST` (`/api/reports`, `/api/places`, `/api/reviews`, `/api/analyze`) berada di balik header `Authorization: Bearer <token>` — kami memverifikasi token melalui Supabase (Google OAuth). Endpoint `/api/reviewer/*` menambah lapisan kedua: token harus membawa klaim `app_metadata.role === 'REVIEWER'`, jika tidak dikembalikan `403`. Membaca (`GET` lokasi/observatory/CSV) tetap terbuka tanpa login.

---

## 4. Invarian Bisnis yang Ditegakkan Kode (WARNING)

Aturan-aturan berikut diverifikasi secara ketat oleh automated tests:

- **AI Hanya Membuat Draf**: AI tidak pernah mempublikasikan laporan secara mandiri. Kolom `locked_by` pada database hanya menerima nilai `'kontributor'`.
- **AI Tidak Mengukur Metrologi**: Model tidak melakukan estimasi cm atau kemiringan. Jika keyakinan model bernilai rendah, status otomatis diturunkan menjadi `BELUM_DIKETAHUI`.
- **Deteksi Gambar AI Bersifat Berlapis**: Content Provenance tepercaya dapat memblokir foto sintetis. Ketiadaan penanda dan penilaian artefak visual selalu dianggap tidak konklusif, bukan bukti bahwa foto asli.
- **`BELUM_DIKETAHUI` Dikecualikan dari Skor**: Elemen yang belum memiliki bukti lapangan tidak dihitung ke dalam penyebut skor persentase.
- **Laporan Warga Tidak Menyalakan `verifiedByTeam` Sendiri**: Publikasi kontributor mengunci status elemen (`lockedBy: 'kontributor'`) tetapi tetap `verifiedByTeam: false`. Flag itu baru bernilai `true` ketika seorang reviewer meng-*approve* laporan lewat `POST /api/reviewer/reports/:id/review`.
- **Aksi Reviewer Dijaga Klaim Role OAuth**: Setiap rute `/api/reviewer/*` melewati guard login biasa plus verifikasi ulang token; token wajib membawa `app_metadata.role === 'REVIEWER'`, jika tidak dikembalikan `403`.
- **Nama Kecamatan Tidak Boleh Ditebak dari Alamat**: Jika tidak tercantum pada dataset awal, kecamatan tetap disimpan sebagai `null`.
- **Idempotensi Mutasi**: Percobaan pengiriman ulang dengan `Idempotency-Key` dan hash payload yang sama mengembalikan status `200` (replay). Penggunaan ulang kunci yang sama untuk isi laporan berbeda ditolak dengan status `409 Conflict`.

---

## 5. Model Data & Migrasi SQL

Struktur data terdiri atas:
- `places`: Data entitas fasilitas umum di Surabaya (ID slug, nama, koordinat, kategori, pre-survey baseline).
- `reports`: Riwayat audit laporan yang tidak dapat diubah (*immutable audit trail*), menyimpan snapshot payload lengkap, jalur foto, dan kolom siklus review (`review_status`, `reviewed_by`, `reviewed_at`, `review_note`, `review_checklist`).
- `place_elements`: Status terkini dari 8 rantai aksesibilitas per lokasi, merujuk pada laporan yang terakhir kali menguncinya.
- `reviews`: Ulasan pengalaman naratif warga per lokasi (terpisah dari status elemen).

Urutan migrasi SQL (pada direktori `supabase/migrations/`):
1. `001_naviable.sql`: Skema inti tabel, aturan RLS, dan stored procedure transaksi `publish_report`. Dapat dijalankan pada cluster PostgreSQL 14+ standar.
2. `002_supabase_extras.sql`: Indeks geospasial PostGIS dan konfigurasi bucket privat Supabase Storage. Khusus untuk deployment managed Supabase.
3. `003_contribution_flows.sql`: Transaksi `create_place_report` (tambah lokasi + laporan pertama secara atomik) serta tabel `reviews` dan RPC `publish_review`.
4. `004_reviewer_audit.sql`: Kolom siklus review pada `reports`, indeks `review_status`, dan transaksi `review_report` yang merekam keputusan reviewer serta menyalakan `verifiedByTeam` saat `APPROVED`.
5. `005_reviewer_element_override.sql`: Menambah parameter `p_elements` pada `review_report` sehingga status elemen hasil koreksi reviewer diterapkan saat `APPROVED` (elemen `BELUM_DIKETAHUI` dilewati agar tidak menimpa bukti yang sudah ada).

---

## 6. Prosedur Pengujian & Verifikasi

```bash
# Typecheck TypeScript (tsc --noEmit)
npm run typecheck

# Unit & Domain Tests terhadap penyimpanan lokal sementara (node:test)
npm test

# Smoke test live untuk provider yang dikonfigurasi dan Content Provenance
npm run test:providers

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

