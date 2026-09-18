import type { Metadata } from "next";
import { Inter, Roboto } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { Icon } from "@/components/ui/Icon";
import styles from "./login.module.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-login-heading" });
const roboto = Roboto({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Masuk · NaviAble",
  alternates: { canonical: '/login' },
  description: "Masuk ke NaviAble untuk menjelajahi fasilitas aksesibel di sekitar Anda.",
};

export default function LoginPage() {
  return (
    <main className={`${styles.page} ${roboto.className} ${inter.variable}`} lang="id">
      <section className={styles.brandPanel} aria-label="Tentang NaviAble">
        <div className={styles.brandContent}>
          <Link href="/" className={styles.wordmark} aria-label="NaviAble - Kembali ke Beranda">
            <Image
              src="/branding/naviable-logo-horizontal-light-transparent.png"
              alt="NaviAble"
              width={168}
              height={60}
              priority
              className={styles.loginLogo}
            />
          </Link>

          <p className={styles.tagline}>
            Pemetaan ruang publik aksesibel untuk<br />semua orang, di mana saja.
          </p>

          <Image
            className={styles.illustration}
            src="/images/login-community.svg"
            alt="Empat orang dengan berbagai kebutuhan aksesibilitas bersama di bawah pin lokasi."
            width={420}
            height={264}
            priority
          />

          <ul className={styles.badges} aria-label="Fitur aksesibilitas">
            <li><Icon name="access" size={16} /> <span>Ramah Kursi Roda</span></li>
            <li><Icon name="volume" size={16} /> <span>Dukungan Audio</span></li>
            <li><Icon name="eye" size={16} /> <span>Kontras Tinggi</span></li>
          </ul>
        </div>
      </section>

      <section className={styles.formPanel} aria-labelledby="login-heading">
        <div className={styles.formContent}>
          <Link href="/jelajah" className={styles.backLink}>
            ← Kembali ke Peta Akses
          </Link>
          <header className={styles.heading}>
            <h1 id="login-heading">Selamat Datang di Naviable</h1>
            <p>Masuk untuk merekam kontribusi Anda atau menjelajahi kondisi aksesibilitas di Surabaya.</p>
          </header>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
