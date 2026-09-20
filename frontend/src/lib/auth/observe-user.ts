import type { SupabaseClient, User } from '@supabase/supabase-js';

/** Validate outside Supabase's event lock; ignore responses for obsolete sessions. */
export function observeUser(
  auth: Pick<SupabaseClient['auth'], 'onAuthStateChange' | 'getUser'>,
  onUser: (user: User | null, error: string) => void,
) {
  let revision = 0;
  let active = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const { data } = auth.onAuthStateChange((_event, session) => {
    const current = ++revision;
    clearTimeout(timer);
    if (!session) {
      onUser(null, '');
      return;
    }
    timer = setTimeout(() => {
      void auth.getUser(session.access_token).then(({ data, error }) => {
        if (active && current === revision) {
          onUser(error ? null : data.user, error ? 'Sesi akun tidak dapat diverifikasi. Silakan masuk kembali.' : '');
        }
      }).catch(() => {
        if (active && current === revision) onUser(null, 'Sesi akun tidak dapat diverifikasi. Periksa koneksi lalu masuk kembali.');
      });
    }, 0);
  });
  return () => {
    active = false;
    revision++;
    clearTimeout(timer);
    data.subscription.unsubscribe();
  };
}
