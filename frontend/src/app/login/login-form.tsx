"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";
import { GoogleIcon, LoginIcon, SpeakerIcon, WaveformIcon, WhatsAppIcon } from "./login-icons";
import styles from "./login.module.css";

const authConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
const unavailableMessage = "Layanan masuk akun sedang disiapkan. Silakan jelajahi langsung atau coba lagi nanti.";

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
  const [policy, setPolicy] = useState("Ketentuan Layanan");
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
      setMessage("Tidak dapat terhubung ke Google. Silakan coba lagi.");
    } finally {
      setPending(null);
    }
  }

  async function requestCode(channel: "sms" | "whatsapp") {
    if (busy) return;
    setMessage("");
    const normalized = normalizePhone(phone);
    if (!normalized) {
      setPhoneError("Masukkan nomor ponsel yang valid, contoh: 0812-3456-7890.");
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
      setMessage(`Kode verifikasi telah dikirim melalui ${channel === "sms" ? "SMS" : "WhatsApp"}.`);
    } catch {
      setMessage(`Tidak dapat mengirim kode melalui ${channel === "sms" ? "SMS" : "WhatsApp"}. Silakan coba lagi atau gunakan akun Google.`);
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
      setCodeError("Masukkan kode verifikasi yang Anda terima.");
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
      setCodeError("Kode tidak valid atau sudah kedaluwarsa. Silakan periksa kembali atau minta kode baru.");
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
            <span>{pending === "google" ? "Menghubungkan ke Google…" : "Masuk dengan Google"}</span>
          </button>
          <button className={`${styles.button} ${styles.whatsapp}`} type="button" onClick={() => requestCode("whatsapp")} disabled={busy || Boolean(sentTo)}>
            <WhatsAppIcon />
            <span>{pending === "whatsapp" ? "Mengirim kode…" : "Masuk dengan WhatsApp"}</span>
          </button>
        </div>

        <div className={styles.divider}><span>atau gunakan nomor ponsel</span></div>

        <div className={styles.field}>
          <label htmlFor="phone-number">Nomor Ponsel</label>
          <input
            ref={phoneRef}
            id="phone-number"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0812-3456-7890"
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
            <label htmlFor="verification-code">Kode Verifikasi</label>
            <input ref={codeRef} id="verification-code" name="code" inputMode="numeric" autoComplete="one-time-code" placeholder="Masukkan kode" value={code} maxLength={8} disabled={busy} aria-invalid={Boolean(codeError)} aria-describedby={codeError ? "code-error" : undefined} onChange={(event) => { setCode(event.target.value.replace(/\D/g, "")); setCodeError(""); }} />
            {codeError && <p id="code-error" className={styles.fieldError} role="alert">{codeError}</p>}
            <button className={styles.textButton} type="button" disabled={busy} onClick={() => { setSentTo(null); setCode(""); setCodeError(""); setMessage(""); phoneRef.current?.focus(); }}>Ganti nomor atau minta kode baru</button>
          </div>
        ) : (
          <button
            className={styles.audioCaptcha}
            type="button"
            disabled={busy}
            onClick={() => setMessage("Verifikasi suara sedang dalam pengembangan. Anda dapat masuk dengan akun Google atau meminta kode ponsel.")}
          >
            <span className={styles.speaker}><SpeakerIcon /></span>
            <span className={styles.audioCopy}><strong>Verifikasi Suara</strong><span>Ketuk untuk mendengarkan kode</span></span>
            <span className={styles.waveform}><WaveformIcon /></span>
          </button>
        )}

        {message && <p className={styles.status} role="status">{message}</p>}

        <button className={`${styles.button} ${styles.loginButton}`} type="submit" disabled={busy}>
          <LoginIcon />
          <span>{pending === "sms" ? "Mengirim kode…" : pending === "verify" ? "Memverifikasi…" : sentTo ? "Verifikasi & Masuk" : "Lanjut Masuk"}</span>
        </button>

        <button
          className={`${styles.button} ${styles.google}`}
          type="button"
          onClick={() => router.push('/')}
          style={{ marginTop: '8px' }}
        >
          <span>Lanjut tanpa akun (Mode Tamu) →</span>
        </button>
      </form>

      <p className={styles.legal}>
        Dengan masuk, Anda menyetujui{" "}
        <button type="button" onClick={() => openPolicy("Ketentuan Layanan")}>Ketentuan Layanan</button>{" "}
        dan{" "}<button type="button" onClick={() => openPolicy("Kebijakan Privasi")}>Kebijakan Privasi</button> Naviable.
      </p>

      <dialog ref={dialogRef} className={styles.policyDialog} aria-labelledby="policy-title">
        <h2 id="policy-title">{policy}</h2>
        <p>Dokumen {policy.toLowerCase()} Naviable sedang diselaraskan. Anda dapat menjelajahi peta langsung tanpa mendaftar.</p>
        <button className={`${styles.button} ${styles.loginButton}`} type="button" onClick={() => dialogRef.current?.close()}>Tutup</button>
      </dialog>
    </>
  );
}
