import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { bearerToken, verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';

const noStore = { 'Cache-Control': 'no-store' };

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const payload = await verifySessionToken(token);
  if (!payload || payload.role !== 'REVIEWER') {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      username: payload.username,
      role: payload.role,
    },
  }, { headers: noStore });
}

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Origin tidak diizinkan.' }, { status: 403, headers: noStore });
  }

  const token = bearerToken(request.headers.get('authorization'));
  const payload = await verifySessionToken(token);
  if (!token || !payload) {
    return NextResponse.json(
      { error: 'Akun Google ini belum memiliki hak admin/reviewer.' },
      { status: 403, headers: noStore },
    );
  }

  const response = NextResponse.json(
    { success: true, role: payload.role, username: payload.username, redirect: '/reviewer' },
    { headers: noStore },
  );
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60,
  });
  return response;
}
