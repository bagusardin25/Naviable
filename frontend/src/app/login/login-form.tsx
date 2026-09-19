"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { contributionLabel, loginHref, parseScreen, safeReturnTo, screenHref } from "@/lib/navigation";
import { supabaseBrowser } from "@/lib/supabase";
import { GoogleIcon, LoginIcon, MailIcon, LockIcon, EyeIcon, EyeOffIcon } from "./login-icons";
import styles from "./login.module.css";

const authConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

type AuthMode = "signin" | "signup" | "magiclink" | "reviewer";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const destination = safeReturnTo(searchParams.get("next"));
  const returnQuery = destination.split("?")[1] ?? "";
  const guestDestination = screenHref("map", returnQuery);
  const action = contributionLabel(parseScreen(new URLSearchParams(returnQuery).get("screen")));

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const reviewerPasswordRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const initialMode: AuthMode =
    searchParams.get("mode") === "reviewer" || searchParams.get("role") === "reviewer" || destination.startsWith("/reviewer")
      ? "reviewer"
      : "signin";

  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<"google" | "email" | "magiclink" | null>(null);
  const [policy, setPolicy] = useState("Ketentuan Layanan");

  // Reviewer specific states
  const [reviewerUsername, setReviewerUsername] = useState("reviewer.naviable");
  const [reviewerPassword, setReviewerPassword] = useState("");
  const [reviewerError, setReviewerError] = useState("");
  const [reviewerPending, setReviewerPending] = useState(false);

  const busy = pending !== null || reviewerPending;


  useEffect(() => {
    if (!authConfigured) return;
    const { data } = supabaseBrowser().auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        router.replace(destination);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [router, destination]);

  async function signInWithGoogle() {
    if (busy) return;
    setMessage("");
    if (!authConfigured) {
      setMessage("Kunci Supabase belum disetel di lingkungan ini. Anda dapat menggunakan 'Masuk Cepat Mode Uji Coba (Demo)' di bawah.");
      return;
    }
    setPending("google");
    try {
      const { error } = await supabaseBrowser().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}${destination}` },
      });
      if (error) throw error;
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : "Tidak dapat terhubung ke Google. Silakan coba lagi.";
      setMessage(errMessage);
      setPending(null);
    }
  }

  function signInAsDemo() {
    if (typeof window !== "undefined") {
      localStorage.setItem("naviable_demo_token", "demo-relawan-surabaya");
      localStorage.setItem(
        "naviable_demo_user",
        JSON.stringify({
          id: "00000000-0000-4000-8000-000000000001",
          email: "relawan@naviable.org",
          role: "authenticated",
          user_metadata: { name: "Relawan Naviable" },
        })
      );
      window.dispatchEvent(new Event("naviable_auth_change"));
      router.replace(destination);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setMessage("");
    setEmailError("");
    setPasswordError("");

    const trimmedEmail = email.trim();
    const isReviewerHandle =
      trimmedEmail.toLowerCase() === "reviewer.naviable" ||
      trimmedEmail.toLowerCase() === "reviewer@naviable.org";

    if (isReviewerHandle) {
      if (!password) {
        setPasswordError("Masukkan kata sandi reviewer.");
        passwordRef.current?.focus();
        return;
      }
      setPending("email");
      try {
        const res = await fetch("/api/auth/reviewer-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: trimmedEmail,
            password,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          router.replace("/reviewer");
          return;
        } else {
          setPasswordError(data.error || "Username atau password tidak sesuai.");
          passwordRef.current?.focus();
          return;
        }
      } catch {
        setPasswordError("Username atau password tidak sesuai.");
        passwordRef.current?.focus();
        return;
      } finally {
        setPending(null);
      }
    }

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError("Masukkan alamat email yang valid (contoh: relawan@naviable.org) atau 'reviewer.naviable'.");
      emailRef.current?.focus();
      return;
    }

    if (authMode !== "magiclink") {
      if (!password || password.length < 6) {
        setPasswordError("Kata sandi minimal terdiri dari 6 karakter.");
        passwordRef.current?.focus();
        return;
      }
    }

    if (!authConfigured) {
      setMessage(
        "Kunci Supabase belum disetel. Anda dapat menggunakan tombol '⚡ Masuk Cepat Mode Uji Coba (Demo)' di bawah untuk langsung mencoba."
      );
      return;
    }

    if (authMode === "magiclink") {
      setPending("magiclink");
      try {
        const { error } = await supabaseBrowser().auth.signInWithOtp({
          email: trimmedEmail,
          options: {
            emailRedirectTo: `${window.location.origin}${loginHref(destination)}`,
          },
        });
        if (error) throw error;
        setMessage(`Tautan masuk telah dikirim ke ${trimmedEmail}. Silakan periksa kotak masuk atau spam email Anda.`);
      } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : "Gagal mengirim tautan masuk.";
        setMessage(errMessage);
      } finally {
        setPending(null);
      }
      return;
    }

    if (authMode === "signup") {
      setPending("email");
      try {
        const { data, error } = await supabaseBrowser().auth.signUp({
          email: trimmedEmail,
          password,
        });
        if (error) throw error;
        if (data.session) {
          router.replace(destination);
        } else {
          setMessage(`Pendaftaran berhasil! Silakan periksa email ${trimmedEmail} untuk mengonfirmasi akun Anda.`);
        }
      } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : "Gagal mendaftarkan akun.";
        setMessage(errMessage);
      } finally {
        setPending(null);
      }
      return;
    }

    // mode === "signin"
    setPending("email");
    try {
      const { data, error } = await supabaseBrowser().auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (error) throw error;
      if (data.session) {
        router.replace(destination);
      }
    } catch {
      setPasswordError("Email atau kata sandi tidak cocok. Silakan periksa kembali atau pilih tab 'Magic Link'.");
      passwordRef.current?.focus();
    } finally {
      setPending(null);
    }
  }

  async function submitReviewerLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setReviewerError("");

    if (!reviewerUsername.trim()) {
      setReviewerError("Masukkan username reviewer.");
      return;
    }
    if (!reviewerPassword) {
      setReviewerError("Masukkan kata sandi reviewer.");
      reviewerPasswordRef.current?.focus();
      return;
    }

    setReviewerPending(true);
    try {
      const res = await fetch("/api/auth/reviewer-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: reviewerUsername.trim(),
          password: reviewerPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setReviewerError(data.error || "Username atau password tidak sesuai.");
        return;
      }

      // Successfully authenticated as REVIEWER
      router.replace("/reviewer");
    } catch {
      setReviewerError("Username atau password tidak sesuai.");
    } finally {
      setReviewerPending(false);
    }
  }

  function openPolicy(title: string) {
    setPolicy(title);
    dialogRef.current?.showModal();
  }

  if (authMode === "reviewer") {
    return (
      <div className={styles.form}>
        <button
          type="button"
          className={styles.textButton}
          onClick={() => {
            setAuthMode("signin");
            setReviewerError("");
          }}
          style={{ alignSelf: "flex-start", marginBottom: "8px", fontSize: "13px" }}
        >
          ← Kembali ke Masuk Pengguna Umum
        </button>

        <header style={{ marginBottom: "16px" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--ink)", margin: "0 0 4px" }}>
            Masuk sebagai Reviewer
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--muted)", margin: 0 }}>
            Gunakan akun reviewer Naviable.
          </p>
        </header>

        <form onSubmit={submitReviewerLogin} noValidate aria-busy={busy}>
          {/* Username Field */}
          <div className={styles.field}>
            <label htmlFor="reviewer-username">Username</label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon} aria-hidden="true">
                <MailIcon />
              </span>
              <input
                id="reviewer-username"
                name="reviewer-username"
                type="text"
                autoComplete="username"
                placeholder="reviewer.naviable"
                value={reviewerUsername}
                required
                disabled={busy}
                onChange={(e) => {
                  setReviewerUsername(e.target.value);
                  setReviewerError("");
                }}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className={styles.field} style={{ marginTop: "16px" }}>
            <label htmlFor="reviewer-password">Password</label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon} aria-hidden="true">
                <LockIcon />
              </span>
              <input
                ref={reviewerPasswordRef}
                id="reviewer-password"
                name="reviewer-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Masukkan kata sandi"
                value={reviewerPassword}
                required
                disabled={busy}
                onChange={(e) => {
                  setReviewerPassword(e.target.value);
                  setReviewerError("");
                }}
              />
              <button
                type="button"
                className={styles.toggleVisibility}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {reviewerError && (
            <p className={styles.fieldError} role="alert" style={{ marginTop: "12px" }}>
              {reviewerError}
            </p>
          )}

          <button
            className={`${styles.button} ${styles.loginButton}`}
            type="submit"
            disabled={busy}
            style={{ marginTop: "20px" }}
          >
            <LoginIcon />
            <span>{reviewerPending ? "Memeriksa…" : "Masuk"}</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      <form className={styles.form} onSubmit={submit} noValidate aria-busy={busy}>

        {searchParams.has("next") && (
          <p role="note" className={styles.status}>
            Masuk untuk {action}. Setelah masuk, Anda akan langsung kembali ke aksi ini. Peta dan informasi lokasi tetap bisa dijelajahi tanpa akun.
          </p>
        )}

        {/* Google OAuth */}
        <div className={styles.socialButtons}>
          <button
            className={`${styles.button} ${styles.google}`}
            type="button"
            onClick={signInWithGoogle}
            disabled={busy}
          >
            <GoogleIcon />
            <span>{pending === "google" ? "Menghubungkan Google…" : "Lanjut dengan Google"}</span>
          </button>
        </div>

        {message && pending === null && (
          <p className={styles.status} role="alert" style={{ margin: "12px 0", color: "#b42318", background: "#fef3f2", border: "1px solid #fee4e2" }}>
            {message}
          </p>
        )}

        <div className={styles.divider}>
          <span>atau masuk dengan email</span>
        </div>

        {/* Auth Mode Switcher Tabs */}
        <div className={styles.modeTabs} role="tablist" aria-label="Pilihan Masuk atau Daftar">
          <button
            type="button"
            role="tab"
            aria-selected={authMode === "signin"}
            className={`${styles.tabBtn} ${authMode === "signin" ? styles.tabActive : ""}`}
            onClick={() => {
              setAuthMode("signin");
              setEmailError("");
              setPasswordError("");
              setMessage("");
            }}
          >
            Masuk
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={authMode === "signup"}
            className={`${styles.tabBtn} ${authMode === "signup" ? styles.tabActive : ""}`}
            onClick={() => {
              setAuthMode("signup");
              setEmailError("");
              setPasswordError("");
              setMessage("");
            }}
          >
            Daftar Akun
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={authMode === "magiclink"}
            className={`${styles.tabBtn} ${authMode === "magiclink" ? styles.tabActive : ""}`}
            onClick={() => {
              setAuthMode("magiclink");
              setEmailError("");
              setPasswordError("");
              setMessage("");
            }}
          >
            Magic Link
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={false}
            className={styles.tabBtn}
            onClick={() => {
              setAuthMode("reviewer");
              setReviewerError("");
            }}
          >
            Reviewer
          </button>
        </div>

        {/* Email / Username Field */}
        <div className={styles.field}>
          <label htmlFor="auth-email">Alamat Email / Username Reviewer</label>
          <div className={styles.inputWrapper}>
            <span className={styles.inputIcon} aria-hidden="true">
              <MailIcon />
            </span>
            <input
              ref={emailRef}
              id="auth-email"
              name="email"
              type="text"
              autoComplete="username email"
              placeholder="nama@domain.com atau reviewer.naviable"
              value={email}
              required
              disabled={busy}
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? "email-error" : undefined}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailError("");
                setMessage("");
              }}
            />
          </div>
          {emailError && (
            <p id="email-error" className={styles.fieldError} role="alert">
              {emailError}
            </p>
          )}
        </div>

        {/* Password Field (hidden in magic link mode) */}
        {authMode !== "magiclink" ? (
          <div className={styles.field} style={{ marginTop: "16px" }}>
            <div className={styles.fieldHeader}>
              <label htmlFor="auth-password">Kata Sandi</label>
              {authMode === "signin" && (
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={() => {
                    setAuthMode("magiclink");
                    setMessage("Masukkan email Anda di atas untuk menerima tautan masuk instan.");
                  }}
                >
                  Lupa kata sandi?
                </button>
              )}
            </div>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon} aria-hidden="true">
                <LockIcon />
              </span>
              <input
                ref={passwordRef}
                id="auth-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                placeholder={authMode === "signup" ? "Minimal 6 karakter" : "Masukkan kata sandi"}
                value={password}
                required
                disabled={busy}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? "password-error" : undefined}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setPasswordError("");
                  setMessage("");
                }}
              />
              <button
                type="button"
                className={styles.toggleVisibility}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {passwordError && (
              <p id="password-error" className={styles.fieldError} role="alert">
                {passwordError}
              </p>
            )}
          </div>
        ) : (
          <p className={styles.helperText}>
            Kami akan mengirimkan email berisi tautan langsung untuk masuk tanpa memerlukan kata sandi.
          </p>
        )}

        {message && (
          <p className={styles.status} role="status">
            {message}
          </p>
        )}

        {/* Submit Button */}
        <button className={`${styles.button} ${styles.loginButton}`} type="submit" disabled={busy}>
          <LoginIcon />
          <span>
            {pending === "email"
              ? authMode === "signup"
                ? "Mendaftarkan…"
                : "Masuk ke Akun…"
              : pending === "magiclink"
              ? "Mengirim Magic Link…"
              : authMode === "signup"
              ? "Daftar Akun Baru"
              : authMode === "magiclink"
              ? "Kirim Tautan Masuk"
              : "Masuk Sekarang"}
          </span>
        </button>

        {/* Demo Fallback Button for fast local testing */}
        <button
          className={styles.demoButton}
          type="button"
          onClick={signInAsDemo}
          title="Masuk langsung untuk mencoba fitur tanpa setup Supabase cloud"
        >
          <span>⚡ Masuk Cepat Mode Uji Coba (Demo)</span>
        </button>

        {/* Guest destination */}
        <button
          className={`${styles.button} ${styles.google}`}
          type="button"
          onClick={() => router.push(guestDestination)}
          style={{ marginTop: "8px" }}
        >
          <span>Lanjut tanpa akun (Mode Tamu) →</span>
        </button>

        {/* Subtle Reviewer Login Entry Point */}
        <div style={{ marginTop: "22px", paddingTop: "14px", borderTop: "1px dashed var(--line)", textAlign: "center" }}>
          <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
            Untuk tim Naviable:{" "}
            <button
              type="button"
              style={{
                background: "none",
                border: "none",
                color: "var(--purple)",
                fontWeight: 600,
                textDecoration: "underline",
                cursor: "pointer",
                padding: 0,
                font: "inherit",
                fontSize: "12px",
              }}
              onClick={() => {
                setAuthMode("reviewer");
                setReviewerError("");
              }}
            >
              Masuk sebagai reviewer
            </button>
          </p>
        </div>
      </form>


      <p className={styles.legal}>
        Dengan masuk, Anda menyetujui{" "}
        <button type="button" onClick={() => openPolicy("Ketentuan Layanan")}>
          Ketentuan Layanan
        </button>{" "}
        dan{" "}
        <button type="button" onClick={() => openPolicy("Kebijakan Privasi")}>
          Kebijakan Privasi
        </button>{" "}
        Naviable.
      </p>

      <dialog ref={dialogRef} className={styles.policyDialog} aria-labelledby="policy-title">
        <h2 id="policy-title">{policy}</h2>
        <p>Dokumen {policy.toLowerCase()} Naviable sedang diselaraskan. Anda dapat menjelajahi peta langsung tanpa mendaftar.</p>
        <button
          className={`${styles.button} ${styles.loginButton}`}
          type="button"
          onClick={() => dialogRef.current?.close()}
        >
          Tutup
        </button>
      </dialog>
    </>
  );
}
