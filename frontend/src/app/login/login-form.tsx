"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { parseScreen, safeReturnTo, screenHref } from "@/lib/navigation";
import { supabaseBrowser } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { googleSignInOptions, reviewerGoogleSignInOptions } from "@/lib/auth/google";
import { GoogleIcon, LoginIcon, MailIcon, LockIcon, EyeIcon, EyeOffIcon } from "./login-icons";
import styles from "./login.module.css";

const authConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

type AuthMode = "signin" | "signup" | "reviewer";

export function LoginForm() {
  const { t } = useTranslation();
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const destination = safeReturnTo(searchParams.get("next"));
  const returnQuery = destination.split("?")[1] ?? "";
  const guestDestination = screenHref("map", returnQuery);
  const screen = parseScreen(new URLSearchParams(returnQuery).get("screen"));
  const actionText =
    screen === 'add'
      ? t('auth.actionAddPlace')
      : screen === 'report'
      ? t('auth.actionReport')
      : screen === 'review'
      ? t('auth.actionReview')
      : t('auth.actionContribute');

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const reviewerPasswordRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reviewerSessionAttemptRef = useRef<string | null>(null);

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
  const [policy, setPolicy] = useState(t('auth.termsBtn'));

  // Reviewer specific states
  const [reviewerUsername, setReviewerUsername] = useState("");
  const [reviewerPassword, setReviewerPassword] = useState("");
  const [reviewerError, setReviewerError] = useState("");
  const [reviewerPending, setReviewerPending] = useState(false);

  const busy = pending !== null || reviewerPending;

  useEffect(() => {
    if (authMode !== "reviewer" || !auth.ready || !auth.user) return;
    if (reviewerSessionAttemptRef.current === auth.user.id) return;
    reviewerSessionAttemptRef.current = auth.user.id;

    let active = true;
    async function openReviewerSession() {
      setReviewerError("");
      setReviewerPending(true);
      try {
        const { data, error } = await supabaseBrowser().auth.getSession();
        const token = data.session?.access_token;
        if (error || !token) throw new Error("Sesi Google tidak tersedia. Silakan masuk kembali.");

        const response = await fetch("/api/auth/reviewer-session", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || "Akun Google ini belum memiliki hak admin/reviewer.");
        }
        if (active) router.replace("/reviewer");
      } catch (error: unknown) {
        if (active) {
          setReviewerError(error instanceof Error ? error.message : "Login admin dengan Google gagal.");
        }
      } finally {
        if (active) setReviewerPending(false);
      }
    }

    void openReviewerSession();
    return () => {
      active = false;
    };
  }, [auth.ready, auth.user, authMode, router]);


  async function signInWithGoogle() {
    if (busy) return;
    setMessage("");
    if (!authConfigured) {
      setMessage(t('auth.supabaseNotConfigured'));
      return;
    }
    setPending("google");
    try {
      const { error } = await supabaseBrowser().auth.signInWithOAuth(
        googleSignInOptions(window.location.origin, destination),
      );
      if (error) throw error;
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : t('auth.googleConnectFailed');
      setMessage(errMessage);
      setPending(null);
    }
  }

  async function signInReviewerWithGoogle() {
    if (busy) return;
    setReviewerError("");
    if (!authConfigured) {
      setReviewerError(t('auth.supabaseNotConfigured'));
      return;
    }
    setReviewerPending(true);
    try {
      const { error } = await supabaseBrowser().auth.signInWithOAuth(
        reviewerGoogleSignInOptions(window.location.origin),
      );
      if (error) throw error;
    } catch (error: unknown) {
      setReviewerError(error instanceof Error ? error.message : t('auth.googleConnectFailed'));
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
      setEmailError(t('validation.emailInvalid'));
      emailRef.current?.focus();
      return;
    }

    if (!password || password.length < 6) {
      setPasswordError(t('validation.passwordMinLength'));
      passwordRef.current?.focus();
      return;
    }

    if (!authConfigured) {
      setMessage(t('auth.supabaseNotConfigured'));
      return;
    }

    if (authMode === "signup") {
      setPending("email");
      try {
        const { data, error } = await supabaseBrowser().auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${destination ? `/login?next=${encodeURIComponent(destination)}` : '/login'}`,
          },
        });
        if (error) throw error;
        if (data.session) {
          router.replace(destination);
        } else {
          setMessage(t('auth.signUpVerificationSent', { email: trimmedEmail }));
        }
      } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : t('auth.signUpFailed');
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
      setPasswordError(t('auth.credentialsInvalidError'));
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
          {t('auth.reviewerBackToUser')}
        </button>

        <header style={{ marginBottom: "16px" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--ink)", margin: "0 0 4px" }}>
            {t('auth.reviewerHeading')}
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--muted)", margin: 0 }}>
            {t('auth.reviewerSub')}
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
            <span>{reviewerPending ? t('auth.reviewerGoogleChecking') : t('auth.reviewerGoogleBtn')}</span>
          </button>
        </div>

        <div className={styles.divider}>
          <span>{t('auth.orWithEmail')}</span>
        </div>

        <form onSubmit={submitReviewerLogin} noValidate aria-busy={busy}>
          {/* Username Field */}
          <div className={styles.field}>
            <label htmlFor="reviewer-username">{t('auth.reviewerUsernameLabel')}</label>
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
            <label htmlFor="reviewer-password">{t('auth.reviewerPasswordLabel')}</label>
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
                placeholder={t('auth.passwordPlaceholderSignIn')}
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
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
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
            <span>{reviewerPending ? t('auth.reviewerEmailChecking') : t('auth.reviewerEmailSubmit')}</span>
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
            <p>{t('auth.activeSession', { name: auth.profile.displayName, email: auth.profile.email })}</p>
            <button type="button" className={`${styles.button} ${styles.google}`} disabled={busy} onClick={() => router.replace(destination)}>
              {t('auth.continueAs', { name: auth.profile.shortName })}
            </button>
            <p>{t('auth.chooseAnotherGoogle')}</p>
          </div>
        )}

        {searchParams.has("next") && (
          <p role="note" className={styles.status}>
            {t('auth.actionPromptPrefix')} {actionText}. {t('auth.actionPromptSuffix')}
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
            <span>{pending === "google" ? t('auth.googleConnecting') : t('auth.googleContinue')}</span>
          </button>
        </div>

        {message && pending === null && (
          <p className={styles.status} role="alert" style={{ margin: "12px 0", color: "#b42318", background: "#fef3f2", border: "1px solid #fee4e2" }}>
            {message}
          </p>
        )}

        <div className={styles.divider}>
          <span>{t('auth.orWithEmail')}</span>
        </div>

        {/* Email/password mode switcher */}
        <div className={styles.modeTabs} role="tablist" aria-label={t('auth.modalTitle')}>
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
            {t('auth.tabSignIn')}
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
            {t('auth.tabSignUp')}
          </button>
        </div>

        {/* Email Field */}
        <div className={styles.field}>
          <label htmlFor="auth-email">{t('auth.emailLabel')}</label>
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
              placeholder={t('auth.emailPlaceholder')}
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
          <label htmlFor="auth-password">{t('auth.passwordLabel')}</label>
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
              placeholder={authMode === "signup" ? t('auth.passwordPlaceholderSignUp') : t('auth.passwordPlaceholderSignIn')}
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
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
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
                ? t('auth.submittingSignUp')
                : t('auth.submittingSignIn')
              : authMode === "signup"
              ? t('auth.submitSignUp')
              : t('auth.submitSignIn')}
          </span>
        </button>

        {/* Guest destination */}
        <button
          className={`${styles.button} ${styles.google}`}
          type="button"
          onClick={() => router.push(guestDestination)}
          style={{ marginTop: "8px" }}
        >
          <span>{t('auth.guestContinue')}</span>
        </button>

      </form>


      <p className={styles.legal}>
        {t('auth.legalPrefix')}{" "}
        <button type="button" onClick={() => openPolicy(t('auth.termsBtn'))}>
          {t('auth.termsBtn')}
        </button>{" "}
        {t('auth.andText')}{" "}
        <button type="button" onClick={() => openPolicy(t('auth.privacyBtn'))}>
          {t('auth.privacyBtn')}
        </button>{" "}
        {t('auth.legalSuffix')}
      </p>

      <dialog ref={dialogRef} className={styles.policyDialog} aria-labelledby="policy-title">
        <h2 id="policy-title">{policy}</h2>
        <p>{t('auth.policyAlignNotice')}</p>
        <button
          className={`${styles.button} ${styles.loginButton}`}
          type="button"
          onClick={() => dialogRef.current?.close()}
        >
          {t('auth.policyCloseBtn')}
        </button>
      </dialog>
    </>
  );
}
