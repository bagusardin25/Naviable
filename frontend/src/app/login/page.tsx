import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, Roboto } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { LoginForm } from "./login-form";
import styles from "./login.module.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-login-heading" });
const roboto = Roboto({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Masuk · NaviAble",
  alternates: { canonical: "/login" },
  description: "Masuk untuk menambahkan lokasi, melaporkan perubahan, atau menulis review di NaviAble.",
};

export default function LoginPage() {
  return (
    <main className={`${styles.page} ${roboto.className} ${inter.variable}`} lang="id">
      <section className={styles.brandPanel} aria-label="Tentang NaviAble">
        <div className={styles.brandContent}>
          <Link href="/" className={styles.wordmark} aria-label="NaviAble - Kembali ke Beranda">
            <Image
              src="/logo-only-light-3.png"
              alt=""
              width={48}
              height={48}
              style={{ objectFit: "contain" }}
              priority
            />
            <span aria-hidden="true">Navi<span className={styles.brandAccent}>able</span></span>
          </Link>

          <div className={styles.brandStory}>
            <p className={styles.brandKicker}>Peta akses publik Surabaya</p>
            <h2>Akses yang lebih jelas dimulai dari kontribusi kita.</h2>
            <p className={styles.tagline}>
              Temukan, periksa, dan bagikan kondisi akses ruang publik bersama komunitas.
            </p>
          </div>

          <div className={styles.illustrationFrame}>
            <Image
              className={styles.illustration}
              src="/images/login-community.svg"
              alt="Empat orang dengan berbagai kebutuhan aksesibilitas bersama di bawah pin lokasi."
              width={420}
              height={264}
              priority
            />
          </div>

          <ul className={styles.badges} aria-label="Fitur aksesibilitas">
            <li><Icon name="access" size={16} /> <span>Ramah Kursi Roda</span></li>
            <li><Icon name="volume" size={16} /> <span>Dukungan Audio</span></li>
            <li><Icon name="eye" size={16} /> <span>Kontras Tinggi</span></li>
          </ul>
        </div>
      </section>

      <section className={styles.formPanel} aria-label="Masuk atau daftar ke Naviable">
        <div className={styles.formContent}>
          <Link href="/jelajah" className={styles.backLink}>
            <span aria-hidden="true">←</span> Kembali ke Peta Akses
          </Link>
          <Suspense fallback={<p className={styles.loadingState} role="status">Menyiapkan halaman masuk…</p>}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
