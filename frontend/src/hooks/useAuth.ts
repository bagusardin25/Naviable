'use client';
import { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase';
import { toAuthUserProfile, type AuthUserProfile } from '@/lib/auth/user-profile';
import { authCallbackError } from '@/lib/auth/google';
import { observeUser } from '@/lib/auth/observe-user';

export const authConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export function useAuth() {
  const callbackErrorRef = useRef<string | null>(null);
  const [state, setState] = useState<{ ready: boolean; user: User | null; profile: AuthUserProfile | null; error: string }>({
    ready: false,
    user: null,
    profile: null,
    error: '',
  });

  useEffect(() => {
    let active = true;
    callbackErrorRef.current ??= authCallbackError(window.location.search, window.location.hash);
    const callbackError = callbackErrorRef.current;
    if (callbackError) {
      const cleanUrl = new URL(window.location.href);
      for (const name of ['error', 'error_code', 'error_description']) cleanUrl.searchParams.delete(name);
      cleanUrl.hash = '';
      window.history.replaceState(window.history.state, '', cleanUrl.pathname + cleanUrl.search);
    }

    function syncState(user: User | null, error = '') {
      if (active) {
        setState({ ready: true, user, profile: toAuthUserProfile(user), error: callbackError || error });
      }
    }

    if (authConfigured) {
      const unsubscribe = observeUser(supabaseBrowser().auth, syncState);

      return () => {
        active = false;
        unsubscribe();
      };
    } else {
      syncState(null);
      return () => {
        active = false;
      };
    }
  }, []);

  return state;
}
