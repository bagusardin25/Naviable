import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  clearReviewerSessionCookies,
  refreshReviewerSession,
  setReviewerSessionCookies,
  verifySessionToken,
  REFRESH_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  type ReviewerSessionPayload,
  type ReviewerTokens,
} from './lib/auth/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect reviewer routes
  if (pathname === '/reviewer' || pathname.startsWith('/reviewer/')) {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

    let payload: ReviewerSessionPayload | null = await verifySessionToken(sessionToken);
    // The access token lasts about an hour; renew it from the refresh cookie (password logins)
    // instead of sending a working admin back to the login page.
    let renewed: ReviewerTokens | null = null;
    if (!payload) {
      renewed = await refreshReviewerSession(refreshToken);
      if (renewed) payload = { username: renewed.username, role: 'REVIEWER' };
    }

    if (!payload) {
      // Missing, invalid or expired session that could not be renewed
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      loginUrl.searchParams.set('mode', 'reviewer');
      const response = NextResponse.redirect(loginUrl);
      if (sessionToken || refreshToken) clearReviewerSessionCookies(response);
      return response;
    }

    if (payload.role !== 'REVIEWER') {
      // User is authenticated but does not possess the REVIEWER role
      return new NextResponse(
        JSON.stringify({ error: 'Akses ditolak. Diperlukan hak akses REVIEWER.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Authenticated REVIEWER - allow access
    const response = NextResponse.next();
    if (renewed) setReviewerSessionCookies(response, renewed);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/reviewer', '/reviewer/:path*'],
};
