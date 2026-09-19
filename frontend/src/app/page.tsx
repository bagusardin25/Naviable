import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, ArrowDown, DoorOpen, MoveUpRight, Bath, ArrowUpDown, Footprints, SquareParking, Signpost, PersonStanding, Check, TriangleAlert, CircleHelp, CircleX, CircleAlert, MapPin, Search, ScanEye, Camera, ClipboardCheck, Send, Globe, Users, ShieldCheck } from 'lucide-react';
import { LandingShell } from '@/components/landing/LandingShell';
import { AccessChainPreview } from '@/components/landing/AccessChainPreview';
import styles from './landing.module.css';

const title = 'NaviAble — Kenali Kondisi Akses di Surabaya';
const description = 'Jelajahi informasi akses tempat di Surabaya, pahami sumber datanya, dan lihat fasilitas yang masih perlu diperiksa sebelum berangkat.';
export const metadata: Metadata = {
  title, description, alternates: { canonical: '/' },
  openGraph: { title, description, url: '/', locale: 'id_ID', type: 'website', siteName: 'NaviAble', images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'NaviAble — Kenali kondisi akses sebelum berangkat.' }] },
  twitter: { card: 'summary_large_image', title, description, images: ['/opengraph-image'] },
};

const elements = [
  { icon: DoorOpen, name: 'Pintu masuk', detail: 'Awal akses ke dalam tempat.' },
  { icon: MoveUpRight, name: 'Ramp', detail: 'Penghubung beda ketinggian.' },
  { icon: Bath, name: 'Toilet aksesibel', detail: 'Fasilitas yang dapat digunakan.' },
  { icon: ArrowUpDown, name: 'Lift', detail: 'Akses antar-lantai.' },
  { icon: Footprints, name: 'Jalur pemandu', detail: 'Panduan orientasi perjalanan.' },
  { icon: SquareParking, name: 'Parkir disabilitas', detail: 'Ruang parkir dan aksesnya.' },
  { icon: Signpost, name: 'Rambu', detail: 'Informasi arah yang terbaca.' },
  { icon: PersonStanding, name: 'Penyeberangan', detail: 'Akses untuk melintasi jalan.' },
];
const statuses = [
  { icon: Check, label: 'Bisa digunakan', className: styles.good },
  { icon: TriangleAlert, label: 'Terhalang', className: styles.caution },
  { icon: CircleAlert, label: 'Perlu perhatian', className: styles.attention },
  { icon: CircleX, label: 'Tidak ada', className: styles.absent },
  { icon: CircleHelp, label: 'Belum diketahui', className: styles.unknown },
];
const questions = [
  ['Apakah perlu akun untuk melihat peta?', 'Tidak. Anda dapat menjelajahi peta dan daftar tempat tanpa akun. Kebutuhan akun untuk mengirim laporan mengikuti layanan yang tersedia.'],
  ['Apakah semua tempat sudah diverifikasi?', 'Belum. Data awal publik menjadi titik awal pemetaan. Baca label sumber untuk membedakannya dari laporan kontributor dan bukti verifikasi tim, jika tersedia.'],
  ['Apakah Naviable menjamin perjalanan tanpa hambatan?', 'Tidak. Naviable membantu Anda memahami informasi yang tercatat. Kondisi lapangan dapat berubah, dan bagian yang belum diketahui tetap perlu diperiksa sesuai kebutuhan Anda.'],
  ['Apa peran AI di Naviable?', 'Jika layanan tersedia, AI membantu menyusun draf checklist dari foto. Kontributor tetap perlu memeriksa dan mengonfirmasinya. AI tidak menerbitkan status otomatis atau memastikan ukuran fasilitas dari satu foto.'],
];

export default function LandingPage() {
  return (
    <LandingShell>
      <main id="konten-utama" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><MapPin size={15} aria-hidden="true" /> DARI SURABAYA, UNTUK SETIAP LANGKAH</p>
            <h1 id="hero-title">Kenali kondisi akses <span>sebelum berangkat.</span></h1>
            <p className={styles.heroDescription}>Pintu masuk, ramp, hingga toilet. Lihat informasi yang sudah tercatat dan bagian yang masih perlu dicek, sesuai kebutuhan perjalanan Anda.</p>
            <div className={styles.heroActions}><Link href="/jelajah" prefetch={false} className={styles.primary}>Jelajahi Peta <ArrowUpRight size={20} aria-hidden="true" /></Link><a href="#cara-kerja" className={styles.textLink}>Lihat cara kerja <ArrowDown size={17} aria-hidden="true" /></a></div>
            <p className={styles.heroNote}><Check size={16} aria-hidden="true" /> Bisa dijelajahi tanpa akun.</p>
            <div className={styles.heroFootnote}><span className={styles.noteLine} /><p>Data awal ditandai sebagai <strong>belum diverifikasi.</strong><br />Informasi yang jelas dimulai dari sumber yang terbuka.</p></div>
          </div>
          <div className={styles.heroVisual}><span className={styles.visualIndex} aria-hidden="true">LIHAT LEBIH DEKAT</span><AccessChainPreview /></div>
        </section>

        <section className={styles.problem} aria-labelledby="problem-title"><div className={styles.problemInner}><span className={styles.sectionNumber}>01 / TITIK AWAL</span><h2 id="problem-title">Ada fasilitasnya.<br /><span>Bagaimana kondisinya?</span></h2><p>Ramp bisa tersedia tetapi terhalang. Toilet khusus bisa ada tetapi belum diketahui kondisinya. Kenali setiap bagian akses sebelum menentukan langkah berikutnya.</p></div></section>

        <section id="rantai-akses" className={styles.section} aria-labelledby="chain-title">
          <div className={styles.sectionHeader}><div><p className={styles.eyebrow}>SATU TEMPAT, DELAPAN ELEMEN</p><h2 id="chain-title">Akses yang utuh dimulai<br className={styles.desktopBreak} /> dari detail yang jelas.</h2></div><p>Setiap kebutuhan punya pertimbangan berbeda. Periksa fasilitas yang relevan untuk Anda, dari akses masuk hingga penyeberangan.</p></div>
          <ol className={styles.elements}>{elements.map(({ icon: ElementIcon, name, detail }, index) => <li key={name}><div className={styles.elementTop}><ElementIcon size={27} strokeWidth={1.5} aria-hidden="true" /><span>E{index + 1}</span></div><h3>{name}</h3><p>{detail}</p></li>)}</ol>
          <div className={styles.statusLegend}><p><strong>Kondisi tidak selalu sama.</strong> Setiap elemen punya catatannya sendiri.</p><ul aria-label="Lima status kondisi akses">{statuses.map(({ icon: StatusIcon, label, className }) => <li className={className} key={label}><StatusIcon size={15} aria-hidden="true" />{label}</li>)}</ul><small>“Belum diketahui” berarti informasi masih perlu dilengkapi. Nomor E1–E8 menandai elemen, bukan urutan rute.</small></div>
        </section>

        <section id="cara-kerja" className={styles.howSection} aria-labelledby="how-title"><div className={styles.section}>
          <div className={styles.sectionHeader}><div><p className={styles.eyebrow}>CARA KERJA</p><h2 id="how-title">Mulai dari tujuan Anda.</h2></div><Link href="/jelajah" prefetch={false} className={styles.textLink}>Buka Peta Surabaya <ArrowUpRight size={19} aria-hidden="true" /></Link></div>
          <ol className={styles.steps}>
            <li><div className={styles.stepTop}><span>01</span><Search size={24} aria-hidden="true" /></div><h3>Cari tempat.</h3><p>Buka peta atau daftar untuk menemukan tempat yang ingin Anda kunjungi.</p><span className={styles.stepCaption}>MULAI DARI YANG DEKAT</span></li>
            <li><div className={styles.stepTop}><span>02</span><ScanEye size={24} aria-hidden="true" /></div><h3>Periksa informasinya.</h3><p>Pilih kebutuhan akses. Baca kondisi, sumber, foto jika tersedia, dan bagian yang belum diketahui.</p><span className={styles.stepCaption}>PAHAMI KONDISINYA</span></li>
            <li><div className={styles.stepTop}><span>03</span><ArrowUpRight size={24} aria-hidden="true" /></div><h3>Tentukan langkah.</h3><p>Nilai sesuai kebutuhan Anda, cek kembali kondisi, atau lihat alur koreksi jika ada perubahan.</p><span className={styles.stepCaption}>ANDA YANG MEMUTUSKAN</span></li>
          </ol>
        </div></section>

        <section id="tentang-data" className={`${styles.section} ${styles.trust}`} aria-labelledby="trust-title">
          <div className={styles.trustCopy}><p className={styles.eyebrow}>TERBUKA TENTANG DATA</p><h2 id="trust-title">Informasi yang berguna.<br /><span>Batas yang terlihat.</span></h2><p>Ketahui dari mana informasi berasal. Bagian yang belum diketahui tetap kami tandai, agar Anda dapat menilai dengan lebih terinformasi.</p><div className={styles.trustNote}><CircleHelp size={21} aria-hidden="true" /><p>Kondisi tempat dapat berubah. Baca sumber dan waktu pembaruan bila tersedia.</p></div></div>
          <div className={styles.evidenceList}>
            <article><Globe size={23} aria-hidden="true" /><div><span>SUMBER AWAL</span><h3>Data awal publik</h3><p>Informasi dari sumber publik untuk memulai pemetaan. Belum merupakan pemeriksaan lapangan oleh tim.</p></div></article>
            <article><Users size={23} aria-hidden="true" /><div><span>CATATAN LAPANGAN</span><h3>Laporan kontributor</h3><p>Bukti dan catatan yang dikonfirmasi pengirim, ketika tersedia. Tidak otomatis berarti diverifikasi tim.</p></div></article>
            <article><ShieldCheck size={23} aria-hidden="true" /><div><span>PEMERIKSAAN LANJUTAN</span><h3>Verifikasi tim</h3><p>Label ini hanya berlaku pada data dengan bukti verifikasi tim. Bukan sertifikasi teknis atau jaminan perjalanan.</p></div></article>
          </div>
        </section>

        <section className={styles.contribution} aria-labelledby="contribute-title"><div className={styles.contributeCopy}><p className={styles.eyebrow}>DARI PENGAMATAN, MENJADI INFORMASI</p><h2 id="contribute-title">Satu catatan Anda bisa<br className={styles.desktopBreak} /> melengkapi gambaran.</h2><p>Melihat kondisi yang berbeda? Kenali alur untuk menyertakan foto, mencatat fasilitas, dan mengonfirmasi pengamatan Anda.</p><Link href="/jelajah?screen=report" prefetch={false} className={styles.outlineLink}>Lihat Alur Laporan <ArrowUpRight size={19} aria-hidden="true" /></Link><small>Pengiriman laporan memerlukan layanan yang terhubung.<br />AI, jika tersedia, hanya membantu menyiapkan draf.</small></div><ol className={styles.contributionFlow}><li><Camera aria-hidden="true" /><div><strong>Foto & lokasi</strong><span>Catat yang Anda lihat.</span></div></li><li><ClipboardCheck aria-hidden="true" /><div><strong>Periksa & konfirmasi</strong><span>Manusia tetap menentukan.</span></div></li><li><Send aria-hidden="true" /><div><strong>Kirim laporan</strong><span>Setelah layanan tersedia.</span></div></li></ol></section>

        <section id="pertanyaan" className={`${styles.section} ${styles.faq}`} aria-labelledby="faq-title"><div><p className={styles.eyebrow}>SEBELUM MULAI</p><h2 id="faq-title">Mungkin Anda<br />ingin tahu.</h2></div><div className={styles.questions}>{questions.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>

        <section className={styles.finalCta} aria-labelledby="final-title"><div className={styles.ctaMotif} aria-hidden="true"><span /><span /><span /><span /></div><p className={styles.eyebrow}>PERJALANAN ANDA, PERTIMBANGAN ANDA</p><h2 id="final-title">Mulai dengan tempat<br />yang ingin Anda kunjungi.</h2><Link href="/jelajah" prefetch={false} className={styles.primary}>Jelajahi Peta <ArrowRight size={19} aria-hidden="true" /></Link><p className={styles.finalNote}>Surabaya. Tanpa akun untuk menjelajah.</p></section>
      </main>
    </LandingShell>
  );
}
