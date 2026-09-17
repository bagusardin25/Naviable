import type { Metadata } from "next";
import { Inter, Roboto } from "next/font/google";
import Image from "next/image";
import { LoginForm } from "./login-form";
import { AccessibilityIcon } from "./login-icons";
import styles from "./login.module.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-login-heading" });
const roboto = Roboto({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Masuk · Naviable",
  description: "Masuk ke Naviable untuk menjelajahi fasilitas aksesibel di sekitar Anda.",
};

export default function LoginPage() {
  return (
    <main className={`${styles.page} ${roboto.className} ${inter.variable}`} lang="id">
      <section className={styles.brandPanel} aria-label="Tentang Naviable">
        <div className={styles.brandContent}>
          <div className={styles.wordmark} aria-label="Naviable">
            <span className={styles.logoMark}><AccessibilityIcon /></span>
            <span aria-hidden="true">Navi<span className={styles.brandAccent}>able</span></span>
          </div>

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
            <li><span aria-hidden="true">♿</span> Ramah Kursi Roda</li>
            <li><span aria-hidden="true">🔊</span> Dukungan Audio</li>
            <li><span aria-hidden="true">👁️</span> Kontras Tinggi</li>
          </ul>
        </div>
      </section>

      <section className={styles.formPanel} aria-labelledby="login-heading">
        <div className={styles.formContent}>
          <header className={styles.heading}>
            <h1 id="login-heading">Selamat Datang di Naviable</h1>
            <p>Masuk untuk menjelajahi dan memvalidasi aksesibilitas kota Surabaya.</p>
          </header>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
