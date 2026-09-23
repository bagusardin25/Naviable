import { NextResponse } from 'next/server';
import { isReviewerUser, reviewerAuthClient, setReviewerSessionCookies } from '@/lib/auth/session';

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Origin tidak diizinkan.' }, { status: 403 });
  }
  try {
    const body = await request.json();
    if (typeof body?.username !== 'string' || typeof body?.password !== 'string' || !body.password || body.password.length > 1024) {
      return NextResponse.json({ error: 'Email dan kata sandi diperlukan.' }, { status: 400 });
    }
    const username = body.username.trim().toLowerCase();
    const email = username.includes('@') ? username :
      username === (process.env.REVIEWER_USERNAME || 'reviewer.naviable').toLowerCase() ? process.env.REVIEWER_EMAIL : undefined;
    if (!email) {
      return NextResponse.json({ error: 'Gunakan email akun Supabase yang telah diberi hak reviewer oleh pengelola.' }, { status: 400 });
    }
    const client = reviewerAuthClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password: body.password });
    if (error || !data.session || !isReviewerUser(data.user)) {
      if (data.session) await client.auth.signOut({ scope: 'local' });
      return NextResponse.json({ error: 'Kredensial tidak cocok atau akun tidak memiliki hak reviewer.' }, { status: 401 });
    }
    const response = NextResponse.json({ success: true, role: 'REVIEWER', username: data.user.email, redirect: '/reviewer' }, { headers: { 'Cache-Control': 'no-store' } });
    setReviewerSessionCookies(response, {
      accessToken: data.session.access_token,
      expiresIn: data.session.expires_in,
      refreshToken: data.session.refresh_token,
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Layanan login reviewer tidak tersedia. Silakan coba lagi.' }, { status: 503 });
  }
}
