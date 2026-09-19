'use client';

import React, { useEffect, useRef, useState, type FormEvent } from 'react';
import { supabaseBrowser } from '@/lib/supabase';
import { Icon } from '@/components/ui/Icon';
import { GoogleIcon, LoginIcon, MailIcon, LockIcon, EyeIcon, EyeOffIcon } from '@/app/login/login-icons';

const authConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  actionDescription?: string;
};

type AuthMode = 'signin' | 'signup' | 'magiclink';

export function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  actionDescription = 'menambahkan lokasi baru',
}: AuthModalProps) {
  const modalRef = useRef<HTMLElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<'google' | 'email' | 'magiclink' | null>(null);
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

  async function signInWithGoogle() {
    if (busy) return;
    setMessage('');
    if (!authConfigured) {
      setMessage('Kunci Supabase belum disetel di lingkungan ini. Gunakan "⚡ Masuk Cepat Mode Uji Coba (Demo)" di bawah.');
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
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : 'Tidak dapat terhubung ke Google. Silakan coba lagi.';
      setMessage(errMessage);
      setPending(null);
    }
  }

  function signInAsDemo() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('naviable_demo_token', 'demo-relawan-surabaya');
      localStorage.setItem(
        'naviable_demo_user',
        JSON.stringify({
          id: '00000000-0000-4000-8000-000000000001',
          email: 'relawan@naviable.org',
          role: 'authenticated',
          user_metadata: { name: 'Relawan Naviable' },
        })
      );
      window.dispatchEvent(new Event('naviable_auth_change'));
      setMessage('Berhasil masuk! Menyiapkan kontribusi Anda…');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 300);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setMessage('');
    setEmailError('');
    setPasswordError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Masukkan alamat email yang valid (contoh: relawan@naviable.org).');
      emailRef.current?.focus();
      return;
    }

    if (authMode !== 'magiclink') {
      if (!password || password.length < 6) {
        setPasswordError('Kata sandi minimal terdiri dari 6 karakter.');
        passwordRef.current?.focus();
        return;
      }
    }

    if (!authConfigured) {
      setMessage('Kunci Supabase belum disetel. Anda dapat menggunakan tombol "⚡ Masuk Cepat Mode Uji Coba (Demo)" di bawah.');
      return;
    }

    if (authMode === 'magiclink') {
      setPending('magiclink');
      try {
        const returnUrl = typeof window !== 'undefined' ? window.location.href : '/jelajah';
        const { error } = await supabaseBrowser().auth.signInWithOtp({
          email: trimmedEmail,
          options: { emailRedirectTo: returnUrl },
        });
        if (error) throw error;
        setMessage(`Tautan masuk telah dikirim ke ${trimmedEmail}. Silakan periksa email Anda.`);
      } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : 'Gagal mengirim tautan masuk.';
        setMessage(errMessage);
      } finally {
        setPending(null);
      }
      return;
    }

    if (authMode === 'signup') {
      setPending('email');
      try {
        const { data, error } = await supabaseBrowser().auth.signUp({
          email: trimmedEmail,
          password,
        });
        if (error) throw error;
        if (data.session) {
          setMessage('Pendaftaran berhasil! Menyiapkan kontribusi Anda…');
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 400);
        } else {
          setMessage(`Pendaftaran berhasil! Silakan periksa email ${trimmedEmail} untuk konfirmasi.`);
        }
      } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : 'Gagal mendaftarkan akun.';
        setMessage(errMessage);
      } finally {
        setPending(null);
      }
      return;
    }

    // signin
    setPending('email');
    try {
      const { data, error } = await supabaseBrowser().auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (error) throw error;
      if (data.session) {
        setMessage('Berhasil masuk! Melanjutkan aksi Anda…');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 400);
      }
    } catch {
      setPasswordError('Email atau kata sandi salah. Silakan periksa kembali atau pilih tab "Magic Link".');
      passwordRef.current?.focus();
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
            {/* Google OAuth button */}
            <div className="auth-social-buttons">
              <button
                className="auth-btn auth-btn-google"
                type="button"
                onClick={signInWithGoogle}
                disabled={busy}
              >
                <GoogleIcon />
                <span>
                  {pending === 'google' ? 'Menghubungkan Google…' : 'Lanjut dengan Google'}
                </span>
              </button>
            </div>

            <div className="auth-divider">
              <span>atau gunakan email</span>
            </div>

            {/* Auth Mode Switcher Tabs */}
            <div className="auth-tabs" role="tablist" aria-label="Opsi Masuk atau Daftar">
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'signin'}
                className={`auth-tab-btn ${authMode === 'signin' ? 'is-active' : ''}`}
                onClick={() => {
                  setAuthMode('signin');
                  setEmailError('');
                  setPasswordError('');
                  setMessage('');
                }}
              >
                Masuk
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'signup'}
                className={`auth-tab-btn ${authMode === 'signup' ? 'is-active' : ''}`}
                onClick={() => {
                  setAuthMode('signup');
                  setEmailError('');
                  setPasswordError('');
                  setMessage('');
                }}
              >
                Daftar
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'magiclink'}
                className={`auth-tab-btn ${authMode === 'magiclink' ? 'is-active' : ''}`}
                onClick={() => {
                  setAuthMode('magiclink');
                  setEmailError('');
                  setPasswordError('');
                  setMessage('');
                }}
              >
                Magic Link
              </button>
            </div>

            {/* Email Field */}
            <div className="auth-field">
              <label htmlFor="auth-modal-email">Alamat Email</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon" aria-hidden="true">
                  <MailIcon />
                </span>
                <input
                  ref={emailRef}
                  id="auth-modal-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="nama@domain.com"
                  value={email}
                  required
                  disabled={busy}
                  aria-invalid={Boolean(emailError)}
                  aria-describedby={emailError ? 'auth-email-error' : undefined}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setEmailError('');
                    setMessage('');
                  }}
                />
              </div>
              {emailError && (
                <p id="auth-email-error" className="auth-field-error" role="alert">
                  {emailError}
                </p>
              )}
            </div>

            {/* Password Field (hidden in magic link mode) */}
            {authMode !== 'magiclink' ? (
              <div className="auth-field" style={{ marginTop: '12px' }}>
                <div className="auth-field-row">
                  <label htmlFor="auth-modal-password">Kata Sandi</label>
                  {authMode === 'signin' && (
                    <button
                      type="button"
                      className="auth-text-btn"
                      onClick={() => {
                        setAuthMode('magiclink');
                        setMessage('Masukkan email Anda di atas untuk menerima tautan masuk.');
                      }}
                    >
                      Lupa kata sandi?
                    </button>
                  )}
                </div>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon" aria-hidden="true">
                    <LockIcon />
                  </span>
                  <input
                    ref={passwordRef}
                    id="auth-modal-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                    placeholder={authMode === 'signup' ? 'Minimal 6 karakter' : 'Masukkan kata sandi'}
                    value={password}
                    required
                    disabled={busy}
                    aria-invalid={Boolean(passwordError)}
                    aria-describedby={passwordError ? 'auth-password-error' : undefined}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setPasswordError('');
                      setMessage('');
                    }}
                  />
                  <button
                    type="button"
                    className="auth-toggle-pwd"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {passwordError && (
                  <p id="auth-password-error" className="auth-field-error" role="alert">
                    {passwordError}
                  </p>
                )}
              </div>
            ) : (
              <p className="auth-helper-text">
                Kami akan mengirimkan tautan sekali klik ke email Anda untuk masuk tanpa kata sandi.
              </p>
            )}

            {message && (
              <p className="auth-status-msg" role="status">
                {message}
              </p>
            )}

            {/* Submit Button */}
            <button className="auth-btn auth-btn-primary" type="submit" disabled={busy}>
              <LoginIcon />
              <span>
                {pending === 'email'
                  ? authMode === 'signup'
                    ? 'Mendaftarkan…'
                    : 'Masuk ke Akun…'
                  : pending === 'magiclink'
                  ? 'Mengirim Magic Link…'
                  : authMode === 'signup'
                  ? 'Daftar Akun Baru'
                  : authMode === 'magiclink'
                  ? 'Kirim Tautan Masuk'
                  : 'Masuk Sekarang'}
              </span>
            </button>

            {/* Fast Demo Testing Fallback */}
            <button
              className="auth-btn-demo"
              type="button"
              onClick={signInAsDemo}
              title="Masuk langsung untuk mencoba fitur tanpa konfigurasi Supabase"
            >
              <span>⚡ Masuk Cepat Mode Uji Coba (Demo)</span>
            </button>

            <button
              className="auth-btn auth-btn-cancel"
              type="button"
              onClick={onClose}
              style={{ marginTop: '4px' }}
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

