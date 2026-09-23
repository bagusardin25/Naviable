import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  refreshReviewerSession,
  setReviewerSessionCookies,
  REFRESH_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  type ReviewerTokens,
} from '@/lib/auth/session';

// `code` lets the reviewer pages tell "sign in again" apart from any other failure.
const sessionExpired = () =>
  NextResponse.json({ error: 'Sesi admin sudah berakhir. Silakan login ulang.', code: 'session_expired' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });

async function forward(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const route = path.join('/');
  const allowed = request.method === 'GET'
    ? /^(stats|history|reports|reports\/[a-f0-9-]{36})$/.test(route)
    : /^reports\/[a-f0-9-]{36}\/review$/.test(route);
  if (!allowed) return NextResponse.json({ error: 'Endpoint tidak ditemukan.' }, { status: 404 });
  if (request.method === 'POST' && request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Origin tidak diizinkan.' }, { status: 403 });
  }
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;
  let token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  // The access cookie expires with its token (about an hour); renew it from the refresh cookie.
  let renewed: ReviewerTokens | null = null;
  if (!token) {
    renewed = await refreshReviewerSession(refreshToken);
    token = renewed?.accessToken;
  }
  if (!token) return sessionExpired();
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) return NextResponse.json({ error: 'Layanan reviewer belum dikonfigurasi.' }, { status: 503 });
  const body = request.method === 'POST' ? await request.text() : undefined;
  // Railway independently validates the token and checks server-managed reviewer rights.
  const callUpstream = (accessToken: string) =>
    fetch(`${base.replace(/\/$/, '')}/api/reviewer/${route}${new URL(request.url).search}`, {
      method: request.method,
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(35_000),
    });
  try {
    let upstream = await callUpstream(token);
    // A token can also be revoked or expire between the cookie check and the call: renew once and retry.
    if (upstream.status === 401 && !renewed && refreshToken) {
      renewed = await refreshReviewerSession(refreshToken);
      if (renewed) upstream = await callUpstream(renewed.accessToken);
    }
    if (upstream.status === 401) return sessionExpired();
    const response = NextResponse.json(await upstream.json(), { status: upstream.status, headers: { 'Cache-Control': 'no-store' } });
    if (renewed) setReviewerSessionCookies(response, renewed);
    return response;
  } catch {
    return NextResponse.json({ error: 'Layanan reviewer tidak dapat dihubungi.' }, { status: 502 });
  }
}

export const GET = forward;
export const POST = forward;
