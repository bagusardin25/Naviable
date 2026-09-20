import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session';

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
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Masuk sebagai reviewer terlebih dahulu.' }, { status: 401 });
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) return NextResponse.json({ error: 'Layanan reviewer belum dikonfigurasi.' }, { status: 503 });
  try {
    // Railway independently validates the token and checks server-managed reviewer rights.
    const upstream = await fetch(`${base.replace(/\/$/, '')}/api/reviewer/${route}${new URL(request.url).search}`, {
      method: request.method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: request.method === 'POST' ? await request.text() : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(35_000),
    });
    return NextResponse.json(await upstream.json(), { status: upstream.status, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Layanan reviewer tidak dapat dihubungi.' }, { status: 502 });
  }
}

export const GET = forward;
export const POST = forward;
