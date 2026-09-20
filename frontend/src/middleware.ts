import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from './lib/auth/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect reviewer routes
  if (pathname === '/reviewer' || pathname.startsWith('/reviewer/')) {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      loginUrl.searchParams.set('mode', 'reviewer');
      return NextResponse.redirect(loginUrl);
    }

    const payload = await verifySessionToken(sessionToken);

    if (!payload) {
      // Invalid or expired session
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      loginUrl.searchParams.set('mode', 'reviewer');
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete(SESSION_COOKIE_NAME);
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
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/reviewer', '/reviewer/:path*'],
};
