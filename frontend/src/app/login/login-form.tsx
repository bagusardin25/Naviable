"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";
import { GoogleIcon, LoginIcon, SpeakerIcon, WaveformIcon, WhatsAppIcon } from "./login-icons";
import styles from "./login.module.css";

const authConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
const unavailableMessage = "Sign-in is not available yet. Please try again later.";

// Accept the local Indonesian format shown in the design, or an international number.
function normalizePhone(value: string) {
  const compact = value.replace(/[\s()-]/g, "");
  if (/^08\d{8,11}$/.test(compact)) return `+62${compact.slice(1)}`;
  if (/^8\d{8,11}$/.test(compact)) return `+62${compact}`;
  if (/^628\d{8,11}$/.test(compact)) return `+${compact}`;
  return /^\+[1-9]\d{7,14}$/.test(compact) ? compact : null;
}

export function LoginForm() {
  const router = useRouter();
  const phoneRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<"google" | "sms" | "whatsapp" | "verify" | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [policy, setPolicy] = useState("Terms of Service");
  const busy = pending !== null;

  useEffect(() => {
    if (!authConfigured) return;
    // Supabase restores the session from the OAuth return URL on this route.
    const { data } = supabaseBrowser().auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        router.replace("/");
      }
    });
    return () => data.subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (sentTo) codeRef.current?.focus();
  }, [sentTo]);

  async function signInWithGoogle() {
    if (busy) return;
    setMessage("");
    if (!authConfigured) {
      setMessage(unavailableMessage);
      return;
    }
    setPending("google");
    try {
      const { error } = await supabaseBrowser().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/login` },
      });
      if (error) throw error;
    } catch {
      setMessage("We couldn’t connect to Google. Please try again.");
    } finally {
      setPending(null);
    }
  }

  async function requestCode(channel: "sms" | "whatsapp") {
    if (busy) return;
    setMessage("");
    const normalized = normalizePhone(phone);
    if (!normalized) {
      setPhoneError("Enter a valid phone number, such as 812-3456-7890.");
      phoneRef.current?.focus();
      return;
    }
    setPhoneError("");
    if (!authConfigured) {
      setMessage(unavailableMessage);
      return;
    }
    setPending(channel);
    try {
      const { error } = await supabaseBrowser().auth.signInWithOtp({
        phone: normalized,
        options: { channel },
      });
      if (error) throw error;
      setSentTo(normalized);
      setMessage(`A verification code has been sent via ${channel === "sms" ? "SMS" : "WhatsApp"}.`);
    } catch {
      setMessage(`We couldn’t send a ${channel === "sms" ? "text message" : "WhatsApp code"}. Please try again or continue with Google.`);
    } finally {
      setPending(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!sentTo) {
      await requestCode("sms");
      return;
    }
    if (!/^\d{6,8}$/.test(code)) {
      setCodeError("Enter the verification code from your message.");
      codeRef.current?.focus();
      return;
    }
    setCodeError("");
    setMessage("");

    if (!authConfigured) {
      setMessage(unavailableMessage);
      return;
    }

    setPending("verify");
    try {
      const { error } = await supabaseBrowser().auth.verifyOtp({ phone: sentTo, token: code, type: "sms" });
      if (error) throw error;
      router.replace("/");
    } catch {
      setCodeError("That code is invalid or has expired. Try again or request a new code.");
      codeRef.current?.focus();
    } finally {
      setPending(null);
    }
  }

  function openPolicy(title: string) {
    setPolicy(title);
    dialogRef.current?.showModal();
  }

  return (
    <>
      <form className={styles.form} onSubmit={submit} noValidate aria-busy={busy}>
        <div className={styles.socialButtons}>
          <button className={`${styles.button} ${styles.google}`} type="button" onClick={signInWithGoogle} disabled={busy}>
            <GoogleIcon />
            <span>{pending === "google" ? "Connecting to Google…" : "Continue with Google"}</span>
          </button>
          <button className={`${styles.button} ${styles.whatsapp}`} type="button" onClick={() => requestCode("whatsapp")} disabled={busy || Boolean(sentTo)}>
            <WhatsAppIcon />
            <span>{pending === "whatsapp" ? "Sending your code…" : "Continue with WhatsApp"}</span>
          </button>
        </div>

        <div className={styles.divider}><span>or use phone number</span></div>

        <div className={styles.field}>
          <label htmlFor="phone-number">Phone Number</label>
          <input
            ref={phoneRef}
            id="phone-number"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="812-3456-7890"
            value={phone}
            maxLength={24}
            required
            readOnly={Boolean(sentTo)}
            disabled={busy}
            aria-invalid={Boolean(phoneError)}
            aria-describedby={phoneError ? "phone-error" : undefined}
            onChange={(event) => { setPhone(event.target.value); setPhoneError(""); setMessage(""); }}
          />
          {phoneError && <p id="phone-error" className={styles.fieldError} role="alert">{phoneError}</p>}
        </div>

        {sentTo ? (
          <div className={`${styles.field} ${styles.codeField}`}>
            <label htmlFor="verification-code">Verification code</label>
            <input ref={codeRef} id="verification-code" name="code" inputMode="numeric" autoComplete="one-time-code" placeholder="Enter your code" value={code} maxLength={8} disabled={busy} aria-invalid={Boolean(codeError)} aria-describedby={codeError ? "code-error" : undefined} onChange={(event) => { setCode(event.target.value.replace(/\D/g, "")); setCodeError(""); }} />
            {codeError && <p id="code-error" className={styles.fieldError} role="alert">{codeError}</p>}
            <button className={styles.textButton} type="button" disabled={busy} onClick={() => { setSentTo(null); setCode(""); setCodeError(""); setMessage(""); phoneRef.current?.focus(); }}>Change number or request a new code</button>
          </div>
        ) : (
          <button
            className={styles.audioCaptcha}
            type="button"
            disabled={busy}
            onClick={() => setMessage("Audio verification is not available yet. You can continue with Google or request a phone verification code.")}
          >
            <span className={styles.speaker}><SpeakerIcon /></span>
            <span className={styles.audioCopy}><strong>Audio Captcha</strong><span>Click to hear a verification challenge</span></span>
            <span className={styles.waveform}><WaveformIcon /></span>
          </button>
        )}

        {message && <p className={styles.status} role="status">{message}</p>}

        <button className={`${styles.button} ${styles.loginButton}`} type="submit" disabled={busy}>
          <LoginIcon />
          <span>{pending === "sms" ? "Sending your code…" : pending === "verify" ? "Verifying…" : sentTo ? "Verify & Log In" : "Log In"}</span>
        </button>

        <button
          className={`${styles.button} ${styles.google}`}
          type="button"
          onClick={() => router.push('/')}
          style={{ marginTop: '8px' }}
        >
          <span>Jelajahi Langsung (Mode Tamu / Demo) →</span>
        </button>
      </form>

      <p className={styles.legal}>
        By logging in, you agree to our{" "}
        <button type="button" onClick={() => openPolicy("Terms of Service")}>Terms of Service</button>{" "}
        and{" "}<button type="button" onClick={() => openPolicy("Privacy Policy")}>Privacy Policy</button>
      </p>

      <dialog ref={dialogRef} className={styles.policyDialog} aria-labelledby="policy-title">
        <h2 id="policy-title">{policy}</h2>
        <p>NaviAble’s {policy.toLowerCase()} has not been published yet. Please check back before creating an account.</p>
        <button className={`${styles.button} ${styles.loginButton}`} type="button" onClick={() => dialogRef.current?.close()}>Close</button>
      </dialog>
    </>
  );
}
