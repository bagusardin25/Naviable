"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { contributionLabel, loginHref, parseScreen, safeReturnTo, screenHref } from "@/lib/navigation";
import { supabaseBrowser } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { loginReturnGoogleSignInOptions, reviewerGoogleSignInOptions } from "@/lib/auth/google";
import { isReviewerUser } from "@/lib/auth/session";
import { GoogleIcon, LoginIcon, MailIcon, LockIcon, EyeIcon, EyeOffIcon } from "./login-icons";
import styles from "./login.module.css";

const authConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

// Marks a login started from this page, so returning with a session auto-routes
// by role — while a plain visit with an existing session does not.
const AUTH_RETURN_KEY = "naviable:auth-return";

type AuthMode = "signin" | "signup" | "reviewer";

export function LoginForm() {
  const auth = useAuth();
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
  const postLoginRef = useRef<string | null>(null);

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
  const [pending, setPending] = useState<"google" | "email" | null>(null);
  const [policy, setPolicy] = useState("Ketentuan Layanan");

  // Reviewer specific states
  const [reviewerUsername, setReviewerUsername] = useState("");
  const [reviewerPassword, setReviewerPassword] = useState("");
  const [reviewerError, setReviewerError] = useState("");
  const [reviewerPending, setReviewerPending] = useState(false);

  const busy = pending !== null || reviewerPending;

  // Exchange the live Supabase token for the reviewer session cookie, then enter
  // the dashboard. Throws if the account lacks the server-managed REVIEWER role.
  const establishReviewerSession = useCallback(async () => {
    const { data, error } = await supabaseBrowser().auth.getSession();
    const token = data.session?.access_token;
    if (error || !token) throw new Error("Sesi Google tidak tersedia. Silakan masuk kembali.");
    const response = await fetch("/api/auth/reviewer-session", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      throw new Error(result.error || "Akun ini belum memiliki hak admin/reviewer.");
    }
    router.replace("/reviewer");
  }, [router]);

  // Route a freshly signed-in user by role: reviewers to the dashboard, everyone
  // else back to their intended destination.
  const routeByRole = useCallback(
    async (user: { app_metadata?: Record<string, unknown> } | null) => {
      if (isReviewerUser(user)) {
        await establishReviewerSession();
      } else {
        router.replace(destination);
      }
    },
    [establishReviewerSession, router, destination],
  );

  // After returning from an OAuth login started here (or a middleware bounce into
  // reviewer mode), send the account to the right place based on its role.
  useEffect(() => {
    if (!auth.ready || !auth.user || typeof window === "undefined") return;
    const fromLogin = sessionStorage.getItem(AUTH_RETURN_KEY) === "1";
    if (!fromLogin && authMode !== "reviewer") return;
    if (postLoginRef.current === auth.user.id) return;
    postLoginRef.current = auth.user.id;
    sessionStorage.removeItem(AUTH_RETURN_KEY);

    const user = auth.user;
    let active = true;
    void (async () => {
      if (isReviewerUser(user)) {
        setReviewerError("");
        setReviewerPending(true);
        try {
          await establishReviewerSession();
        } catch (error: unknown) {
          if (active) setReviewerError(error instanceof Error ? error.message : "Login admin gagal.");
        } finally {
          if (active) setReviewerPending(false);
        }
      } else if (authMode === "reviewer") {
        if (active) setReviewerError("Akun Google ini belum memiliki hak admin/reviewer.");
      } else {
        router.replace(destination);
      }
    })();
    return () => {
      active = false;
    };
  }, [auth.ready, auth.user, authMode, destination, router, establishReviewerSession]);


  async function signInWithGoogle() {
    if (busy) return;
    setMessage("");
    if (!authConfigured) {
      setMessage("Supabase Auth belum dikonfigurasi untuk lingkungan ini. Hubungi pengelola Naviable.");
      return;
    }
    setPending("google");
    try {
      sessionStorage.setItem(AUTH_RETURN_KEY, "1");
      const { error } = await supabaseBrowser().auth.signInWithOAuth(
        loginReturnGoogleSignInOptions(window.location.origin, destination),
      );
      if (error) throw error;
    } catch (err: unknown) {
      sessionStorage.removeItem(AUTH_RETURN_KEY);
      const errMessage = err instanceof Error ? err.message : "Tidak dapat terhubung ke Google. Silakan coba lagi.";
      setMessage(errMessage);
      setPending(null);
    }
  }

  async function signInReviewerWithGoogle() {
    if (busy) return;
    setReviewerError("");
    if (!authConfigured) {
      setReviewerError("Supabase Auth belum dikonfigurasi untuk lingkungan ini. Hubungi pengelola Naviable.");
      return;
    }
    setReviewerPending(true);
    try {
      sessionStorage.setItem(AUTH_RETURN_KEY, "1");
      const { error } = await supabaseBrowser().auth.signInWithOAuth(
        reviewerGoogleSignInOptions(window.location.origin),
      );
      if (error) throw error;
    } catch (error: unknown) {
      sessionStorage.removeItem(AUTH_RETURN_KEY);
      setReviewerError(error instanceof Error ? error.message : "Tidak dapat terhubung ke Google. Silakan coba lagi.");
      setReviewerPending(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setMessage("");
    setEmailError("");
    setPasswordError("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError("Masukkan alamat email yang valid (contoh: relawan@naviable.org).");
      emailRef.current?.focus();
      return;
    }

    if (!password || password.length < 6) {
      setPasswordError("Kata sandi minimal terdiri dari 6 karakter.");
      passwordRef.current?.focus();
      return;
    }

    if (!authConfigured) {
      setMessage("Supabase Auth belum dikonfigurasi untuk lingkungan ini. Hubungi pengelola Naviable.");
      return;
    }

    if (authMode === "signup") {
      setPending("email");
      try {
        const { data, error } = await supabaseBrowser().auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${loginHref(destination)}`,
          },
        });
        if (error) throw error;
        if (data.session) {
          router.replace(destination);
        } else {
          setMessage(`Jika alamat ini dapat didaftarkan, tautan konfirmasi dikirim ke ${trimmedEmail}. Periksa kotak masuk dan spam; jika sudah memiliki akun, pilih Masuk.`);
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
        try {
          await routeByRole(data.user);
        } catch (routeError: unknown) {
          setMessage(routeError instanceof Error ? routeError.message : "Gagal melanjutkan setelah masuk.");
        }
      }
    } catch {
      setPasswordError("Email atau kata sandi tidak cocok. Silakan periksa kembali.");
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
            Masuk ke Dashboard Admin
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--muted)", margin: 0 }}>
            Gunakan akun Google yang telah diberi hak admin/reviewer Naviable.
          </p>
        </header>

        <div className={styles.socialButtons}>
          <button
            className={`${styles.button} ${styles.google}`}
            type="button"
            onClick={signInReviewerWithGoogle}
            disabled={busy}
          >
            <GoogleIcon />
            <span>{reviewerPending ? "Memeriksa akun…" : "Masuk admin dengan Google"}</span>
          </button>
        </div>

        <div className={styles.divider}>
          <span>atau masuk dengan email</span>
        </div>

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
                placeholder="reviewer@organisasi.org"
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
            <span>{reviewerPending ? "Memeriksa…" : "Masuk dengan email"}</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      <form className={styles.form} onSubmit={submit} noValidate aria-busy={busy}>

        {auth.error && <p className={styles.status} role="alert">{auth.error}</p>}
        {auth.profile && !auth.error && (
          <div className={styles.status}>
            <p>Sesi aktif: {auth.profile.displayName} ({auth.profile.email}).</p>
            <button
              type="button"
              className={`${styles.button} ${styles.google}`}
              disabled={busy}
              onClick={() => {
                void (async () => {
                  setMessage("");
                  setPending("google");
                  try {
                    await routeByRole(auth.user);
                  } catch (error: unknown) {
                    setMessage(error instanceof Error ? error.message : "Gagal melanjutkan sesi.");
                  } finally {
                    setPending(null);
                  }
                })();
              }}
            >
              Lanjut sebagai {auth.profile.shortName}
            </button>
            <p>Untuk memilih akun lain, gunakan tombol Google atau masuk dengan email.</p>
          </div>
        )}

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

        {/* Email/password mode switcher */}
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
        </div>

        {/* Email Field */}
        <div className={styles.field}>
          <label htmlFor="auth-email">Alamat Email</label>
          <div className={styles.inputWrapper}>
            <span className={styles.inputIcon} aria-hidden="true">
              <MailIcon />
            </span>
            <input
              ref={emailRef}
              id="auth-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="nama@domain.com"
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

        <div className={styles.field} style={{ marginTop: "16px" }}>
          <label htmlFor="auth-password">Kata Sandi</label>
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
              : authMode === "signup"
              ? "Daftar Akun Baru"
              : "Masuk Sekarang"}
          </span>
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
