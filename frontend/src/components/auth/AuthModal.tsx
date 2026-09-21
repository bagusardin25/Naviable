'use client';

import React, { useEffect, useRef, useState, type FormEvent } from 'react';
import { supabaseBrowser } from '@/lib/supabase';
import { googleSignInOptions } from '@/lib/auth/google';
import { loginHref } from '@/lib/navigation';
import { Icon } from '@/components/ui/Icon';
import { AuthModeSwitch, type AuthMode } from '@/components/auth/AuthModeSwitch';
import { GoogleIcon, LoginIcon, MailIcon, LockIcon, EyeIcon, EyeOffIcon } from '@/app/login/login-icons';
import { useTranslation } from '@/hooks/useTranslation';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

const authConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

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
  actionDescription,
}: AuthModalProps) {
  const { t } = useTranslation();
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
  const [pending, setPending] = useState<'google' | 'email' | null>(null);
  const busy = pending !== null;

  const resolvedActionDescription = actionDescription || t('auth.actionContribute');

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

  async function signInWithGoogle() {
    if (busy) return;
    setMessage('');
    if (!authConfigured) {
      setMessage(t('auth.supabaseNotConfigured'));
      return;
    }
    setPending('google');
    try {
      const { error } = await supabaseBrowser().auth.signInWithOAuth(
        googleSignInOptions(window.location.origin, window.location.pathname + window.location.search),
      );
      if (error) throw error;
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : t('auth.googleConnectFailed');
      setMessage(errMessage);
      setPending(null);
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
      setEmailError(t('auth.emailInvalidError'));
      emailRef.current?.focus();
      return;
    }

    if (!password || password.length < 6) {
      setPasswordError(t('auth.passwordLengthError'));
      passwordRef.current?.focus();
      return;
    }

    if (!authConfigured) {
      setMessage(t('auth.supabaseNotConfigured'));
      return;
    }

    if (authMode === 'signup') {
      setPending('email');
      try {
        const { data, error } = await supabaseBrowser().auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${loginHref(window.location.pathname + window.location.search)}`,
          },
        });
        if (error) throw error;
        if (data.session) {
          setMessage(t('auth.signUpSuccess'));
          onSuccess?.();
          onClose();
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

    // signin
    setPending('email');
    try {
      const { data, error } = await supabaseBrowser().auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (error) throw error;
      if (data.session) {
        setMessage(t('auth.signInSuccess'));
        onSuccess?.();
        onClose();
      }
    } catch {
      setPasswordError(t('auth.credentialsInvalidError'));
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
            <span className="eyebrow">{t('reports.citizenContribution')}</span>
            <h2 id="auth-modal-title">{t('auth.modalTitle')}</h2>
            <p>
              {t('auth.modalActionDesc', { action: resolvedActionDescription })}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LanguageSwitcher size="sm" />
            <button
              id="auth-modal-close-btn"
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
            >
              <Icon name="close" />
            </button>
          </div>
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
                  {pending === 'google' ? t('auth.googleConnecting') : t('auth.googleContinue')}
                </span>
              </button>
            </div>

            <div className="auth-divider">
              <span>{t('auth.orWithEmail')}</span>
            </div>

            {/* Auth Mode Switcher Tabs */}
            <AuthModeSwitch
              mode={authMode}
              className="auth-tabs"
              buttonClassName="auth-tab-btn"
              activeClassName="is-active"
              signinLabel={t('auth.tabSignIn')}
              signupLabel={t('auth.tabSignUp')}
              ariaLabel={t('auth.modalTitle')}
              onChange={(mode) => {
                setAuthMode(mode);
                setEmailError('');
                setPasswordError('');
                setMessage('');
              }}
            />

            {/* Email Field */}
            <div className="auth-field">
              <label htmlFor="auth-modal-email">{t('auth.emailLabel')}</label>
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
                  placeholder={t('auth.emailPlaceholder')}
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

            <div className="auth-field" style={{ marginTop: '12px' }}>
              <label htmlFor="auth-modal-password">{t('auth.passwordLabel')}</label>
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
                  placeholder={authMode === 'signup' ? t('auth.passwordPlaceholderSignUp') : t('auth.passwordPlaceholderSignIn')}
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
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  aria-pressed={showPassword}
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
                    ? t('auth.submittingSignUp')
                    : t('auth.submittingSignIn')
                  : authMode === 'signup'
                  ? t('auth.submitSignUp')
                  : t('auth.submitSignIn')}
              </span>
            </button>

            <button
              className="auth-btn auth-btn-cancel"
              type="button"
              onClick={onClose}
              style={{ marginTop: '4px' }}
            >
              <span>{t('auth.continueDraftLater')}</span>
            </button>
          </form>

          <p className="auth-legal-note">
            {t('auth.legalNote')}
          </p>
        </div>
      </section>
    </div>
  );
}

