# Frontend Web Naviable 🗺️♿

Antarmuka web platform **Naviable** berbasis **Next.js 16 (App Router) + React 19 + TypeScript + Leaflet**. Antarmuka ini dirancang khusus bagi warga, penyandang disabilitas, dan kontributor lapangan untuk menavigasi kondisi aksesibilitas aktual serta mengumpulkan bukti lapangan rantai perjalanan di Kota Surabaya.

Dokumentasi arsitektur sistem menyeluruh dan invarian produk merujuk pada `README.md` utama di root repositori.

```bash
cd frontend
npm install
cp .env.example .env.local   # arahkan NEXT_PUBLIC_API_URL ke backend Express
npm run dev                  # http://localhost:3000
```

---

## 1. Arsitektur Antarmuka & Keputusan Desain

### Next.js 16 App Router & Interactive Client Shell
// WHY: Berbeda dengan situs konten statis, Naviable berfungsi sebagai aplikasi peta interaktif real-time. Pengguna beralih antar profil disabilitas (Mobilitas, Penglihatan, Pendengaran, Sensorik), memfilter status rantai, membuka drawer detail, hingga melakukan peninjauan draf AI foto lapangan secara instan tanpa memicu page reload.
Halaman utama (`src/app/page.tsx`) bertindak sebagai state controller terpadu yang menyinkronkan data API dari backend Express dengan komponen tampilan.

### Sinkronisasi Tampilan Ganda: Map View & List View
// TRADE-OFF: Berdasarkan penelitian aksesibilitas web geospasial (Höckner et al., 2012), visualisasi peta interaktif tidak boleh berdiri sendiri karena memiliki keterbatasan akses bagi pengguna pembaca layar (*screen reader*) maupun navigasi papan ketik (*keyboard-only*).
Kami mengimplementasikan pendekatan **Synchronized Dual-View**:
1. **Peta Spasial (Leaflet + OpenStreetMap)**: Untuk pemahaman geografis makro dan eksplorasi spasial kota.
2. **Daftar Aksesibel (PlaceList & PlaceCard)**: Komponen setara yang 100% dapat dinavigasi menggunakan tombol `Tab` / `Enter` dengan label ARIA yang komprehensif.

### Render Peta SSR-Safe
// WORKAROUND: Library Leaflet mengakses objek global `window` dan `document` secara langsung pada fase evaluasi modul, yang akan memicu galat `ReferenceError: window is not defined` pada Server-Side Rendering (SSR) Next.js.
Kami menggunakan `next/dynamic` dengan opsi `ssr: false` pada `src/components/map/MapView.tsx` dan menampilkan placeholder skeleton informatif selama modul peta dimuat di peramban klien.

### Indikator Non-Warna Tunggal (Kepatuhan WCAG 1.4.1)
// WHY: Mengandalkan warna semata (misal merah vs hijau) menyulitkan pengguna dengan gangguan penglihatan warna (daltonisme/buta warna).
Setiap marker pin pada peta dan badge status pada kartu selalu memadukan:
- Warna latar kontras.
- Simbol bentuk eksplisit: `✓` (Utuh / Akses Penuh), `▲` (Terhalang / Terbatas), `✕` (Tidak Ada / Rusak), `?` (Belum Diketahui / Butuh Bukti).
- Teks label deskriptif.

---

## 2. Alur Pelaporan & Draf AI Vision (Human-in-the-Loop)

Komponen: `src/components/reports/ReportForm.tsx`, `AIDraftPanel.tsx`, `HumanLockSelector.tsx`.

1. **Pemilihan Fasilitas & Unggah Foto**: Kontributor memilih lokasi dan mengambil foto bukti lapangan asli (JPG/PNG/WebP, maksimal 5 MB).
2. **Draf Berbantuan AI (Opsional)**:
   - Kontributor dapat menekan tombol bantuan AI.
   - Frontend mengirimkan gambar base64 ke endpoint `POST /api/analyze` (Gemini 2.5 Flash Vision).
   - Panel draf menampilkan indikasi status beserta tingkat keyakinan (*confidence*) dan alasan teknis.
3. **Pemeriksaan & Penguncian Status oleh Manusia**:
   - Kontributor manusia memeriksa kesesuaian draf AI dengan kenyataan lapangan.
   - Kontributor secara eksplisit memilih status akhir melalui komponen pemilih manual.
4. **Pencegahan Duplikasi & Idempotensi**:
   - Frontend membuat UUID `Idempotency-Key` unik saat formulir disiapkan.
   - Header ini dikirim bersama muatan data ke `POST /api/reports`. Jika jaringan terputus dan pengguna menekan tombol berulang kali, backend mengenali hash payload yang sama dan tidak menduplikasi data audit.

// WARNING: AI Vision tidak pernah memiliki izin untuk mempublikasikan laporan secara mandiri. Formulir laporan di frontend memvalidasi secara ketat bahwa tombol submit hanya aktif jika `photo` terunggah dan kotak centang konfirmasi manusia (`humanConfirmed: true`) telah dicentang secara sadar.

---

## 3. Fitur Aksesibilitas Terpadu (Accessibility Modal)

Dikelola oleh hook `src/hooks/useAccessibility.ts` dan dialog `src/components/accessibility/AccessibilityModal.tsx`. Preferensi disimpan di `localStorage` klien:

- **Mode Kontras Tinggi (`contrast-mode`)**: Menerapkan tema gelap dengan rasio kontras WCAG AAA (teks kuning terang dan putih di atas latar hitam pekat `#000000`) untuk pengguna dengan sensitivitas kontras rendah.
- **Teks Skala Besar (`large-text`)**: Memperbesar ukuran font dasar antarmuka untuk memudahkan pembacaan tanpa merusak tata letak grid responsif.
- **Pengurangan Gerakan (`reduce-motion`)**: Mematikan transisi CSS halus, animasi `flyTo` pada peta Leaflet, serta animasi rotasi spinner bagi pengguna dengan gangguan vestibular.
- **Font Ramah Disleksia (`dyslexia-mode`)**: Mengaktifkan tipografi khusus dengan penekanan bobot garis dasar untuk mengurangi kebingungan pembalikan huruf bagi pembaca disleksia.

---

## 4. Konfigurasi Lingkungan (.env.local)

Contoh berkas konfigurasi dapat dilihat pada [`.env.example`](./.env.example):

- `NEXT_PUBLIC_API_URL`: URL backend API Express (default lokal: `http://localhost:4000`).
- `NEXT_PUBLIC_SUPABASE_URL`: (Opsional) URL proyek Supabase jika fitur login kontributor cloud aktif.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (Opsional) Kunci anonim publik Supabase untuk otentikasi peramban.

// WARNING: Jangan pernah meletakkan `SUPABASE_SERVICE_ROLE_KEY` atau `GEMINI_API_KEY` pada frontend. Kunci-kunci tersebut sepenuhnya berada di backend demi keamanan data dan kuota API.

---

## 5. Struktur Direktori Proyek

```
frontend/src/
├── app/
│   ├── layout.tsx                # Shell HTML root & metadata
│   ├── page.tsx                  # Halaman utama (Peta, Daftar, Laporan, Observatory)
│   ├── globals.css               # Desain token, tema kontras tinggi, dan tata letak
│   └── login/                    # Halaman masuk & autentikasi kontributor
├── components/
│   ├── accessibility/            # Modal preferensi aksesibilitas
│   ├── layout/                   # TopNavbar & AppSidebar responsif
│   ├── map/                      # LeafletMap, MapView, kontrol geolokasi, dan legenda
│   ├── navigation/               # Tab filter profil disabilitas (NeedFilterTabs)
│   ├── observatory/              # Dashboard civic, distribusi status, dan ekspor CSV
│   ├── places/                   # Visualisasi Rantai 8 Elemen, drawer, dan riwayat audit
│   ├── profile/                  # Halaman ringkasan kontribusi pengguna
│   ├── reports/                  # Formulir pelaporan bukti foto, draf AI, dan pengunci status
│   └── ui/                       # Komponen atomik (Badge, Toggle, Icon)
├── hooks/
│   └── useAccessibility.ts       # Manajemen state preferensi aksesibilitas lokal
├── lib/
│   ├── api.ts                    # Klien fetch terpusat, transformasi data, dan media URL
│   ├── places/seedAdapter.ts     # Adapter data baseline pra-survei Surabaya
│   └── supabase.ts               # Inisialisasi klien browser Supabase
└── types/
    └── index.ts                  # Kontrak tipe data TypeScript (Place, Element, Status)
```

---

## 6. Prosedur Pengujian & Kompilasi

```bash
# Pemeriksaan tipe TypeScript tanpa emit (tsc --noEmit)
npm run typecheck

# Analisis linting kode (ESLint + aturan Next.js)
npm run lint

# Kompilasi berkas produksi menggunakan Turbopack
npm run build

# Menjalankan server produksi lokal untuk verifikasi hasil build
npm run start
```

---

## 7. Catatan Teknis & Rencana Pengembangan

- // WORKAROUND: Resolusi Media URL: Komponen `mediaUrl()` pada `src/lib/api.ts` menyusun URL absolut secara dinamis berdasarkan `NEXT_PUBLIC_API_URL` agar pemuatan berkas foto bukti lapangan berfungsi konsisten baik pada environment pengembangan lokal (`http://127.0.0.1:4000`) maupun produksi tanpa ketergantungan nama host statis.
- // TODO: Antrean Laporan Luar-Jaringan (Offline Sync): Mengintegrasikan IndexedDB dan Background Sync Service Worker untuk menyimpan foto bukti saat kontributor berada di area blank spot fasilitas bawah tanah atau minim sinyal, lalu otomatis mengirimkan laporan saat koneksi internet pulih.
- // TODO: Live Region Announcement Tingkat Lanjut: Meningkatkan pengumuman suara `aria-live="polite"` saat pengguna mengubah fokus filter kecamatan pada peta agar konteks spasial langsung terdengar jelas bagi pengguna tunanetra total.

---

## 8. Tim Pengembang

Dikembangkan oleh **Tim coba-coba** (Telkom University Surabaya):
- **Bagus Ardin**
- **Ida Bagus**
- **Hartita**
- **Muthe**
