import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NextResponse } from 'next/server';
import {
  clearReviewerSessionCookies,
  refreshReviewerSession,
  setReviewerSessionCookies,
  REFRESH_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from '../src/lib/auth/session';
import { safeReviewerReturnTo } from '../src/lib/navigation';

function source(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

/** Runs `body` with `fetch` answering every request with `respond()`. */
async function withFetch(respond: () => Response, body: () => Promise<void>) {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => respond()) as typeof fetch;
  try { await body(); } finally { globalThis.fetch = original; }
}
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

test('a refresh token renews only a live reviewer session', async () => {
  const auth = (role: string | null) => ({
    refreshSession: async () => role === null
      ? { data: { session: null, user: null }, error: new Error('revoked') }
      : { data: { session: { access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 3600 }, user: { id: 'u', email: 'admin@naviable.test', app_metadata: { role } } }, error: null },
  }) as unknown as Pick<SupabaseClient['auth'], 'refreshSession'>;
  assert.deepEqual(await refreshReviewerSession('old-refresh', auth('REVIEWER')), {
    accessToken: 'new-access', expiresIn: 3600, refreshToken: 'new-refresh', username: 'admin@naviable.test',
  });
  assert.equal(await refreshReviewerSession('old-refresh', auth('USER')), null, 'a removed reviewer role ends the session');
  assert.equal(await refreshReviewerSession('old-refresh', auth(null)), null);
  assert.equal(await refreshReviewerSession(undefined, auth('REVIEWER')), null);
});

test('session cookies are HttpOnly, and the refresh cookie is only written when there is one', () => {
  const written: { name: string; value: string; httpOnly: boolean; maxAge: number }[] = [];
  const response = { cookies: { set: (cookie: (typeof written)[number]) => written.push(cookie) } } as unknown as NextResponse;
  setReviewerSessionCookies(response, { accessToken: 'a', expiresIn: 3600 });
  assert.deepEqual(written.map(c => c.name), [SESSION_COOKIE_NAME]);
  setReviewerSessionCookies(response, { accessToken: 'a', expiresIn: 3600, refreshToken: 'r' });
  assert.deepEqual(written.slice(1).map(c => c.name), [SESSION_COOKIE_NAME, REFRESH_COOKIE_NAME]);
  assert.ok(written.every(c => c.httpOnly));
  written.length = 0;
  clearReviewerSessionCookies(response);
  assert.deepEqual(written.map(c => [c.name, c.maxAge]), [[SESSION_COOKIE_NAME, 0], [REFRESH_COOKIE_NAME, 0]]);
});

test('middleware and the reviewer proxy renew an expired session instead of dropping the admin', () => {
  const middleware = source('src/middleware.ts');
  assert.match(middleware, /refreshReviewerSession\(refreshToken\)/);
  assert.match(middleware, /if \(renewed\) setReviewerSessionCookies\(response, renewed\)/);
  const proxy = source('src/app/api/reviewer/[...path]/route.ts');
  assert.match(proxy, /upstream\.status === 401 && !renewed && refreshToken/);
  assert.match(proxy, /code: 'session_expired'/);
  const login = source('src/app/api/auth/reviewer-login/route.ts');
  assert.match(login, /refreshToken: data\.session\.refresh_token/);
  const logout = source('src/app/api/auth/reviewer-logout/route.ts');
  assert.match(logout, /signOut\(\{ scope: 'local' \}\)/);
  assert.match(logout, /clearReviewerSessionCookies\(response\)/);
});

test('after signing in again a reviewer returns to the page they were on', () => {
  assert.equal(safeReviewerReturnTo('/reviewer/reports/8ae82e75-0000-4000-8000-000000000001'), '/reviewer/reports/8ae82e75-0000-4000-8000-000000000001');
  assert.equal(safeReviewerReturnTo('/reviewer/history'), '/reviewer/history');
  for (const unsafe of [null, '', '/jelajah', 'https://evil.example/reviewer', '//evil.example', '/reviewer/../jelajah', '/reviewer?x=1']) {
    assert.equal(safeReviewerReturnTo(unsafe), '/reviewer');
  }
  assert.match(source('src/app/login/login-form.tsx'), /router\.replace\(reviewerDestination\)/);
});

test('an ended session is a distinct error, never an empty queue', async () => {
  const { fetchReviewerStats, ReviewerSessionError } = await import('../src/lib/api');
  await withFetch(() => json({ error: 'Sesi admin sudah berakhir.', code: 'session_expired' }, 401), async () => {
    await assert.rejects(fetchReviewerStats(), (error: unknown) => error instanceof ReviewerSessionError);
  });
  await withFetch(() => json({ error: 'Terlalu banyak permintaan. Coba lagi nanti.' }, 429), async () => {
    await assert.rejects(fetchReviewerStats(), (error: unknown) => !(error instanceof ReviewerSessionError) && /Terlalu banyak/.test((error as Error).message));
  });
  for (const page of ['src/app/reviewer/page.tsx', 'src/app/reviewer/reports/page.tsx', 'src/app/reviewer/history/page.tsx', 'src/app/reviewer/reports/[id]/page.tsx']) {
    assert.match(source(page), /<ReviewerLoadError error=\{/, `${page} must show load errors`);
  }
});

test('the evidence photo survives a decision', async () => {
  const { submitReportReview } = await import('../src/lib/api');
  const report = { id: 'r1', placeId: 'p', placeName: 'Zewu Cafe', reporterName: 'Warga', createdAt: '2026-09-22T00:00:00Z', photoUrl: '/api/photos/r1', elements: [], reviewStatus: 'APPROVED' };
  await withFetch(() => json({ ok: true, report }), async () => {
    const result = await submitReportReview('r1', { decision: 'APPROVED', reviewer: 'x', note: '' });
    assert.match(result.report.photoUrl, /^https?:\/\/[^/]+\/api\/photos\/r1$/);
  });
});

test('reopening an approved report starts from the admin correction, and search waits for typing to pause', () => {
  const detail = source('src/app/reviewer/reports/[id]/page.tsx');
  assert.match(detail, /const applied = data\.report\.reviewedElements\?\.length \? data\.report\.reviewedElements : data\.report\.elements;/);
  const list = source('src/app/reviewer/reports/page.tsx');
  assert.match(list, /search: appliedSearch/);
  assert.match(list, /setTimeout\(\(\) => \{ setLoading\(true\); setAppliedSearch\(next\); \}, 400\)/);
});
