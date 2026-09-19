'use client';

import React, { useEffect, useRef, useState, type FormEvent } from 'react';
import { supabaseBrowser } from '@/lib/supabase';
import { Icon } from '@/components/ui/Icon';
import { GoogleIcon, WhatsAppIcon, LoginIcon, SpeakerIcon, WaveformIcon } from '@/app/login/login-icons';

const authConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
const unavailableMessage =
  'Layanan masuk akun sedang disiapkan. Anda tetap dapat menjelajahi dan mengisi draf data secara lokal.';

function normalizePhone(value: string) {
  const compact = value.replace(/[\s()-]/g, '');
  if (/^08\d{8,11}$/.test(compact)) return `+62${compact.slice(1)}`;
  if (/^8\d{8,11}$/.test(compact)) return `+62${compact}`;
  if (/^628\d{8,11}$/.test(compact)) return `+${compact}`;
  return /^\+[1-9]\d{7,14}$/.test(compact) ? compact : null;
}

export type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  actionDescription?: string;
};

export function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  actionDescription = 'menambahkan lokasi baru',
}: AuthModalProps) {
  const modalRef = useRef<HTMLElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<'google' | 'sms' | 'whatsapp' | 'verify' | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const busy = pending !== null;

  // Accessibility focus management
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
      setTimeout(() => {
        const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }, 50);
    } else if (previouslyFocusedRef.current) {
      previouslyFocusedRef.current.focus();
    }
  }, [isOpen]);

  // Focus trap & Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Listen to Supabase session change while modal is open
  useEffect(() => {
    if (!isOpen || !authConfigured) return;
    const { data } = supabaseBrowser().auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        onSuccess?.();
        onClose();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [isOpen, onSuccess, onClose]);

  useEffect(() => {
    if (sentTo) codeRef.current?.focus();
  }, [sentTo]);

  async function signInWithGoogle() {
    if (busy) return;
    setMessage('');
    if (!authConfigured) {
      setMessage(unavailableMessage);
      return;
    }
    setPending('google');
    try {
      const returnUrl = typeof window !== 'undefined' ? window.location.href : '/jelajah';
      const { error } = await supabaseBrowser().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: returnUrl },
      });
      if (error) throw error;
    } catch {
      setMessage('Tidak dapat terhubung ke Google. Silakan coba lagi.');
      setPending(null);
    }
  }

  async function requestCode(channel: 'sms' | 'whatsapp') {
    if (busy) return;
    setMessage('');
    const normalized = normalizePhone(phone);
    if (!normalized) {
      setPhoneError('Masukkan nomor ponsel yang valid, contoh: 0812-3456-7890.');
      phoneRef.current?.focus();
      return;
    }
    setPhoneError('');
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
      setMessage(`Kode verifikasi telah dikirim melalui ${channel === 'sms' ? 'SMS' : 'WhatsApp'}.`);
    } catch {
      setMessage(
        `Tidak dapat mengirim kode melalui ${
          channel === 'sms' ? 'SMS' : 'WhatsApp'
        }. Silakan coba lagi atau gunakan akun Google.`
      );
    } finally {
      setPending(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!sentTo) {
      await requestCode('sms');
      return;
    }
    if (!/^\d{6,8}$/.test(code)) {
      setCodeError('Masukkan kode verifikasi yang Anda terima.');
      codeRef.current?.focus();
      return;
    }
    setCodeError('');
    setMessage('');

    if (!authConfigured) {
      setMessage(unavailableMessage);
      return;
    }

    setPending('verify');
    try {
      const { error } = await supabaseBrowser().auth.verifyOtp({
        phone: sentTo,
        token: code,
        type: 'sms',
      });
      if (error) throw error;
      setMessage('Berhasil masuk! Menyiapkan kontribusi Anda…');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 400);
    } catch {
      setCodeError('Kode tidak valid atau sudah kedaluwarsa. Silakan periksa kembali.');
      codeRef.current?.focus();
    } finally {
      setPending(null);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        ref={modalRef}
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">Kontribusi Naviable</span>
            <h2 id="auth-modal-title">Masuk atau Daftar</h2>
            <p>
              Masuk untuk {actionDescription}. Data tersimpan aman dan Anda tidak perlu keluar dari
              peta.
            </p>
          </div>
          <button
            id="auth-modal-close-btn"
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela masuk"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="auth-modal-content">
          <form className="auth-modal-form" onSubmit={submit} noValidate aria-busy={busy}>
            <div className="auth-social-buttons">
              <button
                className="auth-btn auth-btn-google"
                type="button"
                onClick={signInWithGoogle}
                disabled={busy}
              >
                <GoogleIcon />
                <span>
                  {pending === 'google' ? 'Menghubungkan Google…' : 'Masuk dengan Google'}
                </span>
              </button>
              <button
                className="auth-btn auth-btn-whatsapp"
                type="button"
                onClick={() => requestCode('whatsapp')}
                disabled={busy || Boolean(sentTo)}
              >
                <WhatsAppIcon />
                <span>
                  {pending === 'whatsapp' ? 'Mengirim kode…' : 'Masuk dengan WhatsApp'}
                </span>
              </button>
            </div>

            <div className="auth-divider">
              <span>atau gunakan nomor ponsel</span>
            </div>

            <div className="auth-field">
              <label htmlFor="auth-modal-phone">Nomor Ponsel</label>
              <input
                ref={phoneRef}
                id="auth-modal-phone"
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
                aria-describedby={phoneError ? 'auth-phone-error' : undefined}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setPhoneError('');
                  setMessage('');
                }}
              />
              {phoneError && (
                <p id="auth-phone-error" className="auth-field-error" role="alert">
                  {phoneError}
                </p>
              )}
            </div>

            {sentTo ? (
              <div className="auth-field" style={{ marginTop: '12px' }}>
                <label htmlFor="auth-modal-code">Kode Verifikasi</label>
                <input
                  ref={codeRef}
                  id="auth-modal-code"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Masukkan kode 6 digit"
                  value={code}
                  maxLength={8}
                  disabled={busy}
                  aria-invalid={Boolean(codeError)}
                  aria-describedby={codeError ? 'auth-code-error' : undefined}
                  onChange={(event) => {
                    setCode(event.target.value.replace(/\D/g, ''));
                    setCodeError('');
                  }}
                />
                {codeError && (
                  <p id="auth-code-error" className="auth-field-error" role="alert">
                    {codeError}
                  </p>
                )}
                <button
                  className="auth-text-btn"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setSentTo(null);
                    setCode('');
                    setCodeError('');
                    setMessage('');
                    phoneRef.current?.focus();
                  }}
                >
                  Ganti nomor atau minta kode baru
                </button>
              </div>
            ) : (
              <button
                className="auth-audio-captcha"
                type="button"
                disabled={busy}
                onClick={() =>
                  setMessage(
                    'Verifikasi suara sedang dalam pengembangan. Anda dapat masuk dengan akun Google atau meminta kode OTP.'
                  )
                }
              >
                <span className="auth-speaker">
                  <SpeakerIcon />
                </span>
                <span className="auth-audio-copy">
                  <strong>Bantuan Audio Aksesibilitas</strong>
                  <span>Ketuk untuk opsi bantuan audio</span>
                </span>
                <span className="auth-waveform">
                  <WaveformIcon />
                </span>
              </button>
            )}

            {message && (
              <p className="auth-status-msg" role="status">
                {message}
              </p>
            )}

            <button className="auth-btn auth-btn-primary" type="submit" disabled={busy}>
              <LoginIcon />
              <span>
                {pending === 'sms'
                  ? 'Mengirim kode…'
                  : pending === 'verify'
                  ? 'Memverifikasi…'
                  : sentTo
                  ? 'Verifikasi & Lanjut'
                  : 'Kirim Kode Masuk'}
              </span>
            </button>

            <button
              className="auth-btn auth-btn-cancel"
              type="button"
              onClick={onClose}
              style={{ marginTop: '8px' }}
            >
              <span>Lanjut Mengisi Formulir (Nanti Saja)</span>
            </button>
          </form>

          <p className="auth-legal-note">
            Dengan masuk, Anda menyetujui Ketentuan Layanan dan Kebijakan Privasi Naviable untuk data ruang publik inklusif.
          </p>
        </div>
      </section>
    </div>
  );
}
