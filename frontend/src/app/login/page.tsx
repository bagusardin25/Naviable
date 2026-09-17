import type { Metadata } from "next";
import { Inter, Roboto } from "next/font/google";
import Image from "next/image";
import { LoginForm } from "./login-form";
import { AccessibilityIcon } from "./login-icons";
import styles from "./login.module.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-login-heading" });
const roboto = Roboto({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Log in · NaviAble",
  description: "Sign in to NaviAble to explore accessible places near you.",
};

export default function LoginPage() {
  return (
    <main className={`${styles.page} ${roboto.className} ${inter.variable}`} lang="en">
      <section className={styles.brandPanel} aria-label="About NaviAble">
        <div className={styles.brandContent}>
          <div className={styles.wordmark} aria-label="NaviAble">
            <span className={styles.logoMark}><AccessibilityIcon /></span>
            <span aria-hidden="true">Navi<span className={styles.brandAccent}>Able</span></span>
          </div>

          <p className={styles.tagline}>
            Mapping accessible places for<br />everyone, everywhere.
          </p>

          <Image
            className={styles.illustration}
            src="/images/login-community.svg"
            alt="Four people with different accessibility needs, together beneath a location pin."
            width={420}
            height={264}
            priority
          />

          <ul className={styles.badges} aria-label="Accessibility features">
            <li><span aria-hidden="true">♿</span> Wheelchair Accessible</li>
            <li><span aria-hidden="true">🔊</span> Audio Support</li>
            <li><span aria-hidden="true">👁️</span> High Contrast</li>
          </ul>
        </div>
      </section>

      <section className={styles.formPanel} aria-labelledby="login-heading">
        <div className={styles.formContent}>
          <header className={styles.heading}>
            <h1 id="login-heading">Welcome to NaviAble</h1>
            <p>Sign in to explore accessible places near you.</p>
          </header>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
