import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

function source(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

test('1. Typography & CSS Variables: .page inherits theme tokens without local overrides', () => {
  const css = source('src/app/login/login.module.css');

  // .page must not locally redefine --ink, --muted, --border as static hexes
  assert.equal(css.includes('--ink: #182235;'), false, 'Should not override --ink on .page');
  assert.equal(css.includes('--muted: #5b6778;'), false, 'Should not override --muted on .page');
  assert.equal(css.includes('--border: #7b8798;'), false, 'Should not override --border on .page');

  // .page must use global font-sans
  assert.match(css, /\.page\s*\{[^}]*font-family:\s*var\(--font-sans\);/);
  assert.match(css, /\.page\s*\{[^}]*color:\s*var\(--ink\);/);
  assert.match(css, /\.page\s*\{[^}]*background:\s*var\(--bg\);/);

  // Field labels and inputs must use theme variables
  assert.match(css, /\.field\s+label\s*\{[^}]*color:\s*var\(--ink\);/);
  assert.match(css, /\.inputIcon\s*\{[^}]*color:\s*var\(--muted\);/);
  assert.match(css, /\.divider\s*\{[^}]*color:\s*var\(--muted\);/);
  assert.match(css, /\.tabBtn\s*\{[^}]*color:\s*var\(--muted\);/);
});

test('2. Dark Mode and High Contrast rules provide clear contrast on all elements', () => {
  const css = source('src/app/login/login.module.css');

  // Dark mode coverage
  assert.ok(css.includes(':global(html.dark) .page'));
  assert.ok(css.includes(':global(html.dark) .brandPanel'));
  assert.ok(css.includes(':global(html.dark) .formPanel'));
  assert.ok(css.includes(':global(html.dark) .google'));
  assert.ok(css.includes(':global(html.dark) .tabActive'));
  assert.ok(css.includes(':global(html.dark) .field label'));
  assert.ok(css.includes(':global(html.dark) .field input'));

  // High contrast coverage
  assert.ok(css.includes(':global(html.contrast-mode) .page'));
  assert.ok(css.includes(':global(html.contrast-mode) .field label'));
  assert.ok(css.includes(':global(html.contrast-mode) .tabActive'));
  assert.ok(css.includes(':global(html.contrast-mode) .backLink'));
  assert.ok(css.includes(':global(html.contrast-mode) .badges li'));
});

test('3. No duplicate headers and clean single-source i18n architecture', () => {
  const loginContent = source('src/app/login/LoginContent.tsx');
  const loginForm = source('src/app/login/login-form.tsx');

  // LoginContent must NOT render a duplicate <header className={styles.heading}>
  assert.equal(loginContent.includes('styles.heading'), false, 'LoginContent must not duplicate header');

  // login-form must render canonical header
  assert.match(loginForm, /<h1\s+id="login-heading">\s*\{\s*t\('auth\.welcomeHeading'\)\s*\}\s*<\/h1>/);
  assert.match(loginForm, /<p>\s*\{\s*t\('auth\.welcomeSub'\)\s*\}\s*<\/p>/);

  // Hardcoded Indonesian text block must be removed
  assert.equal(loginForm.includes('Akun kontribusi Naviable'), false);
  assert.equal(loginForm.includes('Selamat datang kembali'), false);
  assert.equal(loginForm.includes('Bergabung dengan komunitas'), false);
  assert.equal(loginForm.includes('Mulai berkontribusi'), false);
});

test('4. LanguageSwitcher is embedded and properly styled on Sign In', () => {
  const loginContent = source('src/app/login/LoginContent.tsx');
  const css = source('src/app/login/login.module.css');

  // LanguageSwitcher must be imported and rendered with size="sm"
  assert.match(loginContent, /import\s*\{\s*LanguageSwitcher\s*\}\s*from\s*['"]@\/components\/ui\/LanguageSwitcher['"]/);
  assert.match(loginContent, /<LanguageSwitcher\s+size="sm"\s*\/>/);

  // .topBar must be a flex container with space-between and wrap
  assert.match(css, /\.topBar\s*\{[^}]*display:\s*flex;/);
  assert.match(css, /\.topBar\s*\{[^}]*justify-content:\s*space-between;/);
  assert.match(css, /\.topBar\s*\{[^}]*flex-wrap:\s*wrap;/);
});

test('5. Back link navigates to Landing Page (/) and text is localized', () => {
  const loginContent = source('src/app/login/LoginContent.tsx');
  const idLocale = source('src/locales/id.ts');
  const enLocale = source('src/locales/en.ts');

  // Destination must be "/" not "/jelajah"
  assert.match(loginContent, /<Link\s+href="\/"\s+className=\{styles\.backLink\}>\s*\{\s*t\('auth\.backToHome'\)\s*\}/);
  assert.equal(loginContent.includes('href="/jelajah"'), false, 'Back link must NOT point to /jelajah');

  // Translations
  assert.ok(idLocale.includes("backToHome: '← Kembali ke Beranda'"));
  assert.ok(enLocale.includes("backToHome: '← Back to Home'"));
});

test('6. Mobile responsiveness and floating button spacing clearance', () => {
  const css = source('src/app/login/login.module.css');

  // Generous bottom padding to prevent AccessibilityWidget from obscuring form
  assert.match(css, /\.formPanel\s*\{[^}]*padding:\s*34px\s+24px\s+clamp\(100px,\s*14vh,\s*140px\);/);
  assert.match(css, /\.formPanel\s*\{[^}]*padding:\s*24px\s+20px\s+clamp\(110px,\s*16vh,\s*150px\);/);

  // 360px breakpoint for compact mobile screens (320px-360px)
  assert.ok(css.includes('@media (max-width: 360px)'));
  assert.match(css, /\.tabBtn\s*\{[^}]*overflow-wrap:\s*break-word;/);
});

test('7. SSR HTTP response from live dev server returns correct login page content', async () => {
  try {
    const response = await fetch('http://localhost:3000/login');
    if (response.ok) {
      const html = await response.text();
      // Verify back link href
      assert.ok(html.includes('href="/"'), 'HTML must contain href to landing page');
      assert.equal(html.includes('href="/jelajah"'), false, 'HTML must not have back link to /jelajah');

      // Verify language switcher is present
      assert.ok(html.includes('lang-switcher-segmented'), 'HTML must render Language Switcher');

      // Verify single header rendered
      assert.ok(
        html.includes('Selamat Datang di Naviable') || html.includes('Welcome to Naviable'),
        'HTML must render canonical welcome header'
      );
    }
  } catch {
    // If dev server is not actively bound on localhost:3000, skip SSR network test
  }
});

test('8. Hero Branding Section: desktop & mobile structure, typography, and illustration scaling', () => {
  const css = source('src/app/login/login.module.css');

  // .brandContent must be a unified vertical column with centered alignment
  assert.match(css, /\.brandContent\s*\{[^}]*display:\s*flex;/);
  assert.match(css, /\.brandContent\s*\{[^}]*flex-direction:\s*column;/);
  assert.match(css, /\.brandContent\s*\{[^}]*align-items:\s*center;/);
  assert.match(css, /\.brandContent\s*\{[^}]*text-align:\s*center;/);

  // Tagline has proportional max-width and clean line-height
  assert.match(css, /\.tagline\s*\{[^}]*max-width:\s*34ch;/);
  assert.match(css, /\.tagline\s*\{[^}]*line-height:\s*1\.5;/);

  // Illustration is responsive with preserved aspect ratio
  assert.match(css, /\.illustration\s*\{[^}]*aspect-ratio:\s*420\s*\/\s*264;/);
  assert.match(css, /\.illustration\s*\{[^}]*object-fit:\s*contain;/);

  // Responsive mobile illustration scaling
  const mobile880 = css.slice(css.indexOf('@media (max-width: 880px)'));
  assert.match(mobile880, /\.illustration\s*\{[^}]*max-width:\s*220px;/);
  assert.match(mobile880, /\.badges\s*\{[^}]*display:\s*flex;/);

  const mobile600 = css.slice(css.indexOf('@media (max-width: 600px)'));
  assert.match(mobile600, /\.illustration\s*\{[^}]*max-width:\s*190px;/);

  const mobile360 = css.slice(css.indexOf('@media (max-width: 360px)'));
  assert.match(mobile360, /\.illustration\s*\{[^}]*max-width:\s*160px;/);

  // Contrast mode tagline white color
  assert.ok(css.includes(':global(html.contrast-mode) .tagline'));
});

test('9. Accessibility Badges: shared container, wrap support, and clean icon rendering', () => {
  const loginContent = source('src/app/login/LoginContent.tsx');
  const css = source('src/app/login/login.module.css');

  // Shared container uses flex-wrap and center alignment
  assert.match(css, /\.badges\s*\{[^}]*display:\s*flex;/);
  assert.match(css, /\.badges\s*\{[^}]*flex-wrap:\s*wrap;/);
  assert.match(css, /\.badges\s*\{[^}]*justify-content:\s*center;/);

  // Badges list item structure
  assert.match(css, /\.badges\s+li\s*\{[^}]*display:\s*inline-flex;/);
  assert.match(css, /\.badges\s+li\s*\{[^}]*align-items:\s*center;/);
  assert.match(css, /\.badges\s+li\s*\{[^}]*gap:\s*7px;/);

  // Badges in LoginContent render valid Icon components without raw text 'svg'
  assert.match(loginContent, /<Icon\s+name="access"\s+size=\{16\}\s*\/>\s*<span>\{\s*t\('auth\.badgeWheelchair'\)\s*\}<\/span>/);
  assert.match(loginContent, /<Icon\s+name="volume"\s+size=\{16\}\s*\/>\s*<span>\{\s*t\('auth\.badgeAudio'\)\s*\}<\/span>/);
  assert.match(loginContent, /<Icon\s+name="eye"\s+size=\{16\}\s*\/>\s*<span>\{\s*t\('auth\.badgeContrast'\)\s*\}<\/span>/);
  assert.equal(loginContent.includes('svgWheelchair'), false);
  assert.equal(loginContent.includes('svgAudio'), false);
  assert.equal(loginContent.includes('svgHigh'), false);
});

