import type { SignInWithOAuthCredentials } from '@supabase/supabase-js';
import { safeReturnTo } from '../navigation';

export function googleSignInOptions(origin: string, destination: string): SignInWithOAuthCredentials {
  return {
    provider: 'google',
    options: {
      redirectTo: `${new URL(origin).origin}${safeReturnTo(destination)}`,
      // Let the person choose even if Google already has an active session.
      queryParams: { prompt: 'select_account' },
    },
  };
}

export function reviewerGoogleSignInOptions(origin: string): SignInWithOAuthCredentials {
  return {
    provider: 'google',
    options: {
      redirectTo: `${new URL(origin).origin}/login?mode=reviewer`,
      queryParams: { prompt: 'select_account' },
    },
  };
}

// General login returns to /login (carrying a sanitized next) so the page can
// route by role: reviewers to the dashboard, everyone else to their destination.
export function loginReturnGoogleSignInOptions(origin: string, destination: string): SignInWithOAuthCredentials {
  const next = safeReturnTo(destination);
  return {
    provider: 'google',
    options: {
      redirectTo: `${new URL(origin).origin}/login?next=${encodeURIComponent(next)}`,
      queryParams: { prompt: 'select_account' },
    },
  };
}

export function authCallbackError(search: string, hash: string): string {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ''));
  const error = fragment.get('error_code') || fragment.get('error') || query.get('error_code') || query.get('error');
  if (!error) return '';
  return error === 'access_denied'
    ? 'Login dibatalkan atau izin belum diberikan. Silakan masuk kembali.'
    : 'Login atau konfirmasi email gagal. Tautan mungkin sudah kedaluwarsa. Silakan coba masuk kembali.';
}
