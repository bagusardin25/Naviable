import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

function source(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

test('1. Sidebar Theme Tokens: Light mode baseline is preserved and dark mode tokens are defined', () => {
  const css = source('src/app/globals.css');

  // Light Mode Tokens in :root
  assert.match(css, /--sidebar-bg:\s*linear-gradient\(180deg,\s*#7449d1\s*0%,\s*#6540c3\s*100%\);/);
  assert.match(css, /--sidebar-active-bg:\s*#ffffff;/);
  assert.match(css, /--sidebar-active-ink:\s*var\(--purple\);/);

  // Dark Mode Tokens in .dark / [data-theme='dark'] / [data-a11y-dark='true']
  assert.ok(css.includes("[data-a11y-dark='true']"));
  assert.match(css, /--sidebar-bg:\s*linear-gradient\(180deg,\s*#18122b\s*0%,\s*#120d22\s*100%\);/);
  assert.match(css, /--sidebar-mobile-bg:\s*linear-gradient\(90deg,\s*#18122b\s*0%,\s*#120d22\s*100%\);/);
  assert.match(css, /--sidebar-ink:\s*#f8fafc;/);
  assert.match(css, /--sidebar-ink-muted:\s*#cbd5e1;/);
  assert.match(css, /--sidebar-active-bg:\s*rgba\(154,\s*120,\s*240,\s*0\.18\);/);
  assert.match(css, /--sidebar-active-border:\s*rgba\(167,\s*139,\s*250,\s*0\.4\);/);
});

test('2. Desktop Sidebar: uses sidebar tokens without hardcoded bright purple in dark mode', () => {
  const css = source('src/app/globals.css');

  // .sidebar must use var(--sidebar-bg) and var(--sidebar-ink)
  assert.match(css, /\.sidebar\s*\{[^}]*background:\s*var\(--sidebar-bg\);/);
  assert.match(css, /\.sidebar\s*\{[^}]*color:\s*var\(--sidebar-ink\);/);
  assert.match(css, /\.sidebar\s*\{[^}]*border-right:\s*1px\s+solid\s+var\(--sidebar-border\);/);

  // .brand must use var(--sidebar-border)
  assert.match(css, /\.brand\s*\{[^}]*border-bottom:\s*1px\s+solid\s+var\(--sidebar-border\);/);

  // Navigation buttons must use tokenized colors
  assert.match(css, /\.sidebar\s+nav\s+button\s*\{[^}]*color:\s*var\(--sidebar-ink-muted\);/);
  assert.match(css, /\.sidebar\s+nav\s+button:hover\s*\{[^}]*background:\s*var\(--sidebar-hover-bg\);/);
  assert.match(css, /\.sidebar\s+nav\s+button\.active\s*\{[^}]*background:\s*var\(--sidebar-active-bg\);/);
  assert.match(css, /\.sidebar\s+nav\s+button\.active\s*\{[^}]*color:\s*var\(--sidebar-active-ink\);/);

  // Bottom area / Guest Mode uses tokenized borders and avatar
  assert.match(css, /\.sidebar-bottom\s*\{[^}]*border-top:\s*1px\s+solid\s+var\(--sidebar-bottom-border\);/);
  assert.match(css, /\.avatar\s*\{[^}]*background:\s*var\(--sidebar-avatar-bg\);/);
});

test('3. Mobile Sidebar: bottom navigation uses mobile sidebar tokens and adapts to dark mode', () => {
  const css = source('src/app/globals.css');
  const mobileSection = css.slice(css.indexOf('@media (max-width: 900px)'));

  // Mobile sidebar background must use var(--sidebar-mobile-bg)
  assert.match(mobileSection, /\.sidebar\s*\{[^}]*background:\s*var\(--sidebar-mobile-bg\);/);
  assert.match(mobileSection, /\.sidebar\s*\{[^}]*border-top:\s*1px\s+solid\s+var\(--sidebar-border\);/);

  // Mobile nav buttons must use tokenized active state
  assert.match(mobileSection, /\.sidebar\s+nav\s+button\.active\s*\{[^}]*background:\s*var\(--sidebar-active-bg\);/);
  assert.match(mobileSection, /\.sidebar\s+nav\s+button\.active\s*\{[^}]*color:\s*var\(--sidebar-active-ink\);/);
});

test('4. High Contrast Mode: sidebar has pure black background and crisp white/yellow elements', () => {
  const css = source('src/app/globals.css');

  assert.ok(css.includes("html.contrast-mode .sidebar"));
  assert.ok(css.includes("html.contrast-mode .sidebar .brand"));
  assert.ok(css.includes("html.contrast-mode .sidebar nav button.active"));
  assert.ok(css.includes("html.contrast-mode .sidebar nav button:hover"));
  assert.ok(css.includes("html.contrast-mode .sidebar-bottom"));

  // High contrast active button must be white with black text
  assert.match(css, /html\.contrast-mode\s+\.sidebar\s+nav\s+button\.active[^}]*background:\s*#ffffff\s*!important/);
  assert.match(css, /html\.contrast-mode\s+\.sidebar\s+nav\s+button\.active[^}]*color:\s*#000000\s*!important/);
});
