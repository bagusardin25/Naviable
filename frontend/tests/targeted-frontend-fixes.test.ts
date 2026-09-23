import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { getSpeechLanguage, selectVoiceForLocale } from '../src/lib/voice-reader';

function source(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

test('landing renders one shared language switcher', () => {
  const landingShell = source('src/components/landing/LandingShell.tsx');
  assert.equal((landingShell.match(/<LanguageSwitcher\b/g) ?? []).length, 1);
  assert.equal(landingShell.includes('btn-lang-id'), false);
  assert.equal(landingShell.includes('btn-lang-en'), false);
});

test('root owns the only language provider and locale persistence key', () => {
  const layout = source('src/app/layout.tsx');
  const provider = source('src/providers/LanguageProvider.tsx');
  assert.equal((layout.match(/<LanguageProvider>/g) ?? []).length, 1);
  assert.match(provider, /localStorage\.setItem\(LOCALE_STORAGE_KEY, locale\)/);
  assert.match(provider, /document\.documentElement\.lang = locale/);
});

test('jelajah top navbar omits profile trigger while sidebar keeps profile state', () => {
  const topNavbar = source('src/components/layout/TopNavbar.tsx');
  const sidebar = source('src/components/layout/AppSidebar.tsx');
  assert.equal(topNavbar.includes('topbar-account-button'), false);
  assert.equal(topNavbar.includes('<Icon name="user"'), false);
  assert.match(sidebar, /userProfile/);
  assert.match(sidebar, /nav\.myContributions/);
});

test('voice locale mapping prefers matching voices and has canonical fallback languages', () => {
  const voices = [
    { lang: 'en-GB', name: 'English UK' },
    { lang: 'id-ID', name: 'Bahasa Indonesia' },
    { lang: 'en-US', name: 'English US' },
  ] as SpeechSynthesisVoice[];

  assert.equal(getSpeechLanguage('id'), 'id-ID');
  assert.equal(getSpeechLanguage('en'), 'en-US');
  assert.equal(selectVoiceForLocale(voices, 'id')?.lang, 'id-ID');
  assert.equal(selectVoiceForLocale(voices, 'en')?.lang, 'en-US');
  assert.equal(selectVoiceForLocale([], 'en'), undefined);
});

test('voice listeners are paired with cleanup and labels are translated', () => {
  const manager = source('src/components/accessibility/VoiceReaderManager.tsx');
  assert.match(manager, /addEventListener\('voiceschanged', updateVoices\)/);
  assert.match(manager, /removeEventListener\('voiceschanged', updateVoices\)/);
  assert.match(manager, /removeEventListener\('pointerover', handlePointerOver/);
  assert.match(manager, /aria-label=\{t\('voiceReader\.regionAria'\)\}/);
});

test('highlight links targets every href without treating regular buttons as links', () => {
  const css = source('src/app/globals.css');
  const highlightSection = css.slice(
    css.indexOf('/* 3. Highlight Links Mode'),
    css.indexOf('/* 4. Reading Guide Overlay')
  );

  assert.match(highlightSection, /data-a11y-highlight-links="true"\] a\[href\]/);
  assert.match(highlightSection, /text-decoration-thickness:\s*2px/);
  assert.match(highlightSection, /text-underline-offset:\s*3px/);
  assert.equal(/button:not|\[role="button"\]/.test(highlightSection), false);
});

/** Runs `body` with `fetch` answering every request with `respond()`. */
async function withFetch(respond: () => Response, body: () => Promise<void>) {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => respond()) as typeof fetch;
  try { await body(); } finally { globalThis.fetch = original; }
}
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

test('fetchPlaceReports returns the server history as-is, empty included, and never invents entries', async () => {
  const { fetchPlaceReports } = await import('../src/lib/api');
  const report = { id: 'r1', placeId: 'p', reporterName: 'Warga', createdAt: '2026-09-20T00:00:00Z', photoUrl: '/api/photos/r1', reviewStatus: 'APPROVED', elements: [{ element: 'E1_door', status: 'UTUH' }] };
  await withFetch(() => json({ reports: [report], total: 1, limit: 20, offset: 0 }), async () => {
    const res = await fetchPlaceReports('p');
    assert.deepEqual(res.reports, [report]);
    assert.equal(res.total, 1);
  });
  await withFetch(() => json({ reports: [], total: 0, limit: 20, offset: 0 }), async () => {
    const res = await fetchPlaceReports('p');
    assert.deepEqual(res.reports, []);
    assert.equal(res.total, 0);
  });
  await withFetch(() => json({ error: 'down' }, 503), async () => {
    await assert.rejects(fetchPlaceReports('p'));
  });
});

test('fetchReviews returns only real reviews: empty stays empty and errors reject', async () => {
  const { fetchReviews } = await import('../src/lib/api');
  const review = { id: 'v1', placeId: 'p', reviewerName: 'Pengunjung', experience: 'Pengalaman yang nyata.', createdAt: '2026-09-22T00:00:00Z' };
  await withFetch(() => json({ reviews: [review], total: 1 }), async () => {
    assert.deepEqual((await fetchReviews('p')).reviews, [review]);
  });
  await withFetch(() => json({ reviews: [], total: 0 }), async () => {
    const res = await fetchReviews('p');
    assert.deepEqual(res.reviews, []);
    assert.equal(res.total, 0);
  });
  await withFetch(() => json({ error: 'down' }, 503), async () => {
    await assert.rejects(fetchReviews('p'));
  });
});

test('OpenDyslexic font has explicit @font-face declarations, linked stylesheet, and font-family rules', () => {
  const css = source('src/app/globals.css');
  const layout = source('src/app/layout.tsx');

  // Must declare @font-face for OpenDyslexic in CSS
  assert.match(css, /@font-face\s*\{[^}]*font-family:\s*['"]OpenDyslexic['"]/);

  // Must apply font-family: 'OpenDyslexic' when dyslexia mode is active
  assert.match(css, /html\.dyslexia-mode[^}]*\{[^}]*font-family:\s*['"]OpenDyslexic['"]/);
  assert.match(css, /\[data-a11y-dyslexia="true"\][^}]*\{[^}]*font-family:\s*['"]OpenDyslexic['"]/);

  // Layout must link OpenDyslexic stylesheet in head
  assert.match(layout, /open-dyslexic\.css/);
});

test('landing and login pages render compact language switcher', () => {
  const landingShell = source('src/components/landing/LandingShell.tsx');
  const loginContent = source('src/app/login/LoginContent.tsx');

  assert.match(landingShell, /<LanguageSwitcher\b[^>]*size="sm"/);
  assert.match(loginContent, /<LanguageSwitcher\b[^>]*size="sm"/);
});

test('poppins font is applied globally from root layout', () => {
  const layout = source('src/app/layout.tsx');
  const globals = source('src/app/globals.css');
  const loginPage = source('src/app/login/page.tsx');

  assert.match(layout, /import\s*\{\s*Poppins\s*\}\s*from\s*['"]next\/font\/google['"]/);
  assert.match(layout, /poppins\.variable/);
  assert.match(layout, /poppins\.className/);
  assert.match(globals, /--font-sans:\s*var\(--font-poppins\)/);
  assert.equal(loginPage.includes("next/font/google"), false);
});
