"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { parseScreen, safeReturnTo, screenHref } from "@/lib/navigation";
import { supabaseBrowser } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { loginReturnGoogleSignInOptions, reviewerGoogleSignInOptions } from "@/lib/auth/google";
import { isReviewerUser } from "@/lib/auth/session";
import { AuthModeSwitch, type AuthMode } from "@/components/auth/AuthModeSwitch";
import { GoogleIcon, LoginIcon, MailIcon, LockIcon, EyeIcon, EyeOffIcon } from "./login-icons";
import styles from "./login.module.css";

const authConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

// Marks a login started from this page, so returning with a session auto-routes
// by role — while a plain visit with an existing session does not.
const AUTH_RETURN_KEY = "naviable:auth-return";

type LoginMode = AuthMode | "reviewer";

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
  const postLoginRef = useRef<string | null>(null);

  const initialMode: LoginMode =
    searchParams.get("mode") === "reviewer" || searchParams.get("role") === "reviewer" || destination.startsWith("/reviewer")
      ? "reviewer"
      : "signin";

  const [authMode, setAuthMode] = useState<LoginMode>(initialMode);
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
  const messageIsError = Boolean(message && !message.startsWith("Jika alamat"));

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
      setMessage(t('auth.supabaseNotConfigured'));
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
      sessionStorage.setItem(AUTH_RETURN_KEY, "1");
      const { error } = await supabaseBrowser().auth.signInWithOAuth(
        reviewerGoogleSignInOptions(window.location.origin),
      );
      if (error) throw error;
    } catch (error: unknown) {
      sessionStorage.removeItem(AUTH_RETURN_KEY);
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
        try {
          await routeByRole(data.user);
        } catch (routeError: unknown) {
          setMessage(routeError instanceof Error ? routeError.message : "Gagal melanjutkan setelah masuk.");
        }
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
      <div className={styles.loginShell}>
        <header className={styles.heading}>
          <p className={styles.modeKicker}>{t('auth.reviewerKicker')}</p>
          <h1 id="login-heading">{t('auth.reviewerHeading')}</h1>
          <p>{t('auth.reviewerSub')}</p>
        </header>

        <div className={styles.form}>
          <button
            type="button"
            className={styles.modeReturn}
            onClick={() => {
              setAuthMode("signin");
              setReviewerError("");
            }}
          >
            {t('auth.reviewerBackToUser')}
          </button>

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
            <div className={styles.field}>
              <label htmlFor="reviewer-username">{t('auth.reviewerUsernameLabel')}</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon} aria-hidden="true">
                  <MailIcon />
                </span>
                <input
                  id="reviewer-username"
                  name="reviewer-username"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  placeholder="reviewer@organisasi.org"
                  value={reviewerUsername}
                  required
                  disabled={busy}
                  onChange={(event) => {
                    setReviewerUsername(event.target.value);
                    setReviewerError("");
                  }}
                />
              </div>
            </div>

            <div className={`${styles.field} ${styles.fieldSpaced}`}>
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
                  onChange={(event) => {
                    setReviewerPassword(event.target.value);
                    setReviewerError("");
                  }}
                />
                <button
                  type="button"
                  className={styles.toggleVisibility}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {reviewerError && (
              <p className={`${styles.fieldError} ${styles.formMessage}`} role="alert">
                {reviewerError}
              </p>
            )}

            <button className={`${styles.button} ${styles.loginButton}`} type="submit" disabled={busy}>
              <LoginIcon />
              <span>{reviewerPending ? t('auth.reviewerEmailChecking') : t('auth.reviewerEmailSubmit')}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.loginShell}>
      <header className={styles.heading}>
        <h1 id="login-heading">{t('auth.welcomeHeading')}</h1>
        <p>{t('auth.welcomeSub')}</p>
      </header>

      <form className={styles.form} onSubmit={submit} noValidate aria-busy={busy}>

        {auth.error && <p className={`${styles.status} ${styles.statusError}`} role="alert">{auth.error}</p>}
        {auth.profile && !auth.error && (
          <div className={styles.status}>
            <p>{t('auth.activeSession', { name: auth.profile.displayName, email: auth.profile.email })}</p>
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

        <div className={styles.divider}>
          <span>{t('auth.orWithEmail')}</span>
        </div>

        <AuthModeSwitch
          mode={authMode as AuthMode}
          className={styles.modeTabs}
          buttonClassName={styles.tabBtn}
          activeClassName={styles.tabActive}
          signinLabel={t('auth.tabSignIn')}
          signupLabel={t('auth.tabSignUp')}
          ariaLabel={t('auth.modalTitle')}
          onChange={(mode) => {
            setAuthMode(mode);
            setEmailError("");
            setPasswordError("");
            setMessage("");
          }}
        />

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

        <div className={`${styles.field} ${styles.fieldSpaced}`}>
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
              aria-pressed={showPassword}
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
          <p className={`${styles.status} ${messageIsError ? styles.statusError : ""}`} role={messageIsError ? "alert" : "status"}>
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

        <button className={styles.guestLink} type="button" onClick={() => router.push(guestDestination)}>
          {t('auth.guestContinue')} <span aria-hidden="true">→</span>
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
        <p>{t('auth.policyAlignNotice', { policy })}</p>
        <button
          className={`${styles.button} ${styles.loginButton}`}
          type="button"
          onClick={() => dialogRef.current?.close()}
        >
          {t('auth.policyCloseBtn')}
        </button>
      </dialog>
    </div>
  );
}
