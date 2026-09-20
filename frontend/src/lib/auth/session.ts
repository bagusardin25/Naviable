import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const SESSION_COOKIE_NAME = 'naviable_reviewer_session';
export type ReviewerSessionPayload = { username: string; role: 'REVIEWER' };

export function reviewerAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Autentikasi reviewer belum dikonfigurasi.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

export function isReviewerUser(user: { app_metadata?: Record<string, unknown> } | null | undefined): boolean {
  return typeof user?.app_metadata?.role === 'string' && user.app_metadata.role.toUpperCase() === 'REVIEWER';
}

// Supabase validates expiry; authorization only uses server-managed app_metadata.
export async function verifySessionToken(
  token: string | undefined | null,
  auth?: Pick<SupabaseClient['auth'], 'getUser'>,
): Promise<ReviewerSessionPayload | null> {
  if (!token) return null;
  try {
    const { data, error } = await (auth ?? reviewerAuthClient().auth).getUser(token);
    if (error || !data.user || !isReviewerUser(data.user)) return null;
    return { username: data.user.email || data.user.id, role: 'REVIEWER' };
  } catch {
    return null;
  }
}
