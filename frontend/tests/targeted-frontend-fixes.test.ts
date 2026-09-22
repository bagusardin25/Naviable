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

test('fetchPlaceReports returns correction history with author and timestamp fields', async () => {
  const { fetchPlaceReports } = await import('../src/lib/api');
  const res = await fetchPlaceReports('osm-relation-6664927');
  assert.ok(res.reports.length > 0, 'Must have at least one report');
  assert.ok(res.total > 0, 'Total must be greater than 0');
  const report = res.reports[0];
  assert.ok(report.reporterName, 'Report must have author/reporterName');
  assert.ok(report.createdAt, 'Report must have createdAt timestamp');
  assert.ok(Array.isArray(report.elements) && report.elements.length > 0, 'Report must have accessibility elements');
});

test('fetchReviews returns review history with reviewerName, createdAt, and experience', async () => {
  const { fetchReviews } = await import('../src/lib/api');
  const res = await fetchReviews('osm-relation-6664927');
  assert.ok(res.reviews.length > 0, 'Must have at least one review');
  assert.ok(res.total > 0, 'Total must be greater than 0');
  const review = res.reviews[0];
  assert.ok(review.reviewerName, 'Review must have reviewerName');
  assert.ok(review.createdAt, 'Review must have createdAt timestamp');
  assert.ok(review.experience && review.experience.length >= 10, 'Review must have experience text');
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

test('landing renders compact language switcher and login page omits it', () => {
  const landingShell = source('src/components/landing/LandingShell.tsx');
  const loginContent = source('src/app/login/LoginContent.tsx');
  const loginPage = source('src/app/login/page.tsx');

  assert.match(landingShell, /<LanguageSwitcher\b[^>]*size="sm"/);
  assert.equal(loginContent.includes('<LanguageSwitcher'), false);
  assert.equal(loginContent.includes('LanguageSwitcher'), false);
  assert.equal(loginPage.includes('LanguageSwitcher'), false);
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
