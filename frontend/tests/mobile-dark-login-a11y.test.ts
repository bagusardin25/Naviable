import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function source(path: string): string {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf-8');
}

test('1. Dark Mode Styling for Accessibility Floating Button: uses dark tokens, muted border, and balanced shadow', () => {
  const css = source('src/app/globals.css');

  // Dark mode trigger button gradient and tokens
  assert.match(
    css,
    /\.dark\s+\.a11y-widget-btn[^{]*\{[^}]*background:\s*linear-gradient\(135deg,\s*#241844\s+0%,\s*#17102e\s+100%\);/
  );
  assert.match(
    css,
    /\.dark\s+\.a11y-widget-btn[^{]*\{[^}]*border:\s*1px\s+solid\s+rgba\(154,\s*120,\s*240,\s*0\.32\);/
  );
  assert.match(
    css,
    /\.dark\s+\.a11y-widget-btn[^{]*\{[^}]*box-shadow:\s*0\s+8px\s+24px\s+rgba\(0,\s*0,\s*0,\s*0\.5\)/
  );

  // Dark mode icon wrapper
  assert.match(
    css,
    /\.dark\s+\.a11y-widget-icon-wrapper[^{]*\{[^}]*background:\s*rgba\(154,\s*120,\s*240,\s*0\.18\);/
  );
});

test('2. Mobile Login Widget: active notification badge is strictly contained without overflow', () => {
  const css = source('src/app/globals.css');

  // Position relative and overflow visible on button
  assert.match(
    css,
    /\.widget-page-login\s+\.a11y-widget-btn\s*\{[^}]*position:\s*relative;[^}]*overflow:\s*visible;/
  );

  // Absolute positioning on active badge
  assert.match(
    css,
    /\.widget-page-login\s+\.a11y-active-badge\s*\{[^}]*position:\s*absolute;[^}]*top:\s*-2px;[^}]*right:\s*-2px;/
  );
});

test('3. Tablet & Mobile Responsive Anchor for Login: avoids floating 74px when no bottom nav exists', () => {
  const css = source('src/app/globals.css');

  assert.match(
    css,
    /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.widget-page-login\.widget-pos-right\s*\{[^}]*position:\s*fixed;[^}]*bottom:\s*calc\(16px\s*\+\s*env\(safe-area-inset-bottom/
  );
});

test('4. Light Mode baseline remains 100% preserved', () => {
  const css = source('src/app/globals.css');

  // Baseline trigger button gradient
  assert.match(
    css,
    /\.a11y-widget-btn\s*\{[^}]*background:\s*linear-gradient\(135deg,\s*#6d45cc\s+0%,\s*#5632b6\s+100%\);/
  );
  assert.match(
    css,
    /\.a11y-widget-btn\s*\{[^}]*box-shadow:\s*0\s+10px\s+28px\s+rgba\(109,\s*69,\s*204,\s*0\.38\)/
  );
});
