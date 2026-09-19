'use client';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase';

export const authConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export function useAuth() {
  const [state, setState] = useState<{ ready: boolean; user: User | null }>({ ready: !authConfigured, user: null });
  useEffect(() => {
    if (!authConfigured) return;
    let active = true;
    const { data } = supabaseBrowser().auth.onAuthStateChange((_event, session) => {
      if (active) setState({ ready: true, user: session?.user ?? null });
    });
    supabaseBrowser().auth.getSession().then(({ data, error }) => {
      if (active) setState({ ready: true, user: error ? null : data.session?.user ?? null });
    }).catch(() => { if (active) setState({ ready: true, user: null }); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  return state;
}
