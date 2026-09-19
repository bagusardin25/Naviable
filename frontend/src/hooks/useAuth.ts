'use client';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase';

export const authConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function getLocalDemoUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('naviable_demo_user');
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [state, setState] = useState<{ ready: boolean; user: User | null }>({
    ready: false,
    user: null,
  });

  useEffect(() => {
    let active = true;

    function syncState(user: User | null) {
      if (active) {
        setState({ ready: true, user: user ?? getLocalDemoUser() });
      }
    }

    if (authConfigured) {
      const { data } = supabaseBrowser().auth.onAuthStateChange((_event, session) => {
        syncState(session?.user ?? null);
      });

      supabaseBrowser()
        .auth.getSession()
        .then(({ data, error }) => {
          syncState(error ? null : data.session?.user ?? null);
        })
        .catch(() => {
          syncState(null);
        });

      const handleCustom = () => {
        supabaseBrowser()
          .auth.getSession()
          .then(({ data }) => syncState(data.session?.user ?? null))
          .catch(() => syncState(null));
      };
      window.addEventListener('naviable_auth_change', handleCustom);
      window.addEventListener('storage', handleCustom);

      return () => {
        active = false;
        data.subscription.unsubscribe();
        window.removeEventListener('naviable_auth_change', handleCustom);
        window.removeEventListener('storage', handleCustom);
      };
    } else {
      syncState(null);
      const handleCustom = () => syncState(null);
      window.addEventListener('naviable_auth_change', handleCustom);
      window.addEventListener('storage', handleCustom);

      return () => {
        active = false;
        window.removeEventListener('naviable_auth_change', handleCustom);
        window.removeEventListener('storage', handleCustom);
      };
    }
  }, []);

  return state;
}
