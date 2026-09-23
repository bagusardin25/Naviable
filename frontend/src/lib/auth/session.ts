import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { NextResponse } from 'next/server';

export const SESSION_COOKIE_NAME = 'naviable_reviewer_session';
// Supabase access tokens last about an hour. The refresh token (rotated on every use) lets an
// admin who signed in with a password keep working past that without typing it again. Only the
// password login stores one: a Google login shares its session with the browser client, which
// refreshes it itself, and two holders rotating one refresh token would revoke each other.
export const REFRESH_COOKIE_NAME = 'naviable_reviewer_refresh';
const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export type ReviewerSessionPayload = { username: string; role: 'REVIEWER' };
export type ReviewerTokens = { accessToken: string; expiresIn: number; refreshToken?: string; username: string };

function cookieOptions(maxAge: number) {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge };
}

/** Stores a reviewer session on the response; the refresh cookie is only written when one is given. */
export function setReviewerSessionCookies(response: NextResponse, tokens: Pick<ReviewerTokens, 'accessToken' | 'expiresIn' | 'refreshToken'>) {
  response.cookies.set({ name: SESSION_COOKIE_NAME, value: tokens.accessToken, ...cookieOptions(tokens.expiresIn) });
  if (tokens.refreshToken) {
    response.cookies.set({ name: REFRESH_COOKIE_NAME, value: tokens.refreshToken, ...cookieOptions(REFRESH_MAX_AGE_SECONDS) });
  }
}

export function clearReviewerSessionCookies(response: NextResponse) {
  for (const name of [SESSION_COOKIE_NAME, REFRESH_COOKIE_NAME]) response.cookies.set({ name, value: '', ...cookieOptions(0) });
}

/** Trades a refresh token for a new reviewer session; null when it was revoked, expired, or the role was removed. */
export async function refreshReviewerSession(
  refreshToken: string | undefined | null,
  auth?: Pick<SupabaseClient['auth'], 'refreshSession'>,
): Promise<ReviewerTokens | null> {
  if (!refreshToken) return null;
  try {
    const { data, error } = await (auth ?? reviewerAuthClient().auth).refreshSession({ refresh_token: refreshToken });
    if (error || !data.session || !data.user || !isReviewerUser(data.user)) return null;
    return {
      accessToken: data.session.access_token,
      expiresIn: data.session.expires_in,
      refreshToken: data.session.refresh_token,
      username: data.user.email || data.user.id,
    };
  } catch {
    return null;
  }
}

export function bearerToken(authorization: string | null): string | null {
  const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
  return match?.[1] ?? null;
}

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
