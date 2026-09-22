import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';

function source(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

test('1. Official brand logo assets exist in public directories', () => {
  assert.ok(
    existsSync(new URL('../public/branding/logo-dark.png', import.meta.url)),
    'logo-dark.png must exist in public/branding'
  );
  assert.ok(
    existsSync(new URL('../public/branding/logo-light.png', import.meta.url)),
    'logo-light.png must exist in public/branding'
  );
  assert.ok(
    existsSync(new URL('../public/logo-dark.png', import.meta.url)),
    'logo-dark.png must exist in public root'
  );
  assert.ok(
    existsSync(new URL('../public/logo-light.png', import.meta.url)),
    'logo-light.png must exist in public root'
  );
});

test('2. BrandLogo component renders both light and dark logo variants for zero-FOUC switching', () => {
  const brandLogo = source('src/components/ui/BrandLogo.tsx');
  assert.ok(
    brandLogo.includes('/branding/logo-light.png'),
    'BrandLogo must reference /branding/logo-light.png'
  );
  assert.ok(
    brandLogo.includes('/branding/logo-dark.png'),
    'BrandLogo must reference /branding/logo-dark.png'
  );
  assert.ok(
    brandLogo.includes('brand-logo-light'),
    'BrandLogo must use brand-logo-light class'
  );
  assert.ok(
    brandLogo.includes('brand-logo-dark'),
    'BrandLogo must use brand-logo-dark class'
  );
});

test('3. Theme-aware CSS rules handle dark, light, and high-contrast modes reliably', () => {
  const css = source('src/app/globals.css');

  assert.ok(
    css.includes('.brand-logo-wrap'),
    'globals.css must define .brand-logo-wrap'
  );
  assert.ok(
    css.includes('.brand-logo-wrap .brand-logo-dark'),
    'globals.css must hide dark logo by default'
  );
  assert.ok(
    css.includes('.brand-logo-wrap .brand-logo-light'),
    'globals.css must show light logo by default'
  );

  // Dark mode selectors
  assert.match(
    css,
    /\.dark \.brand-logo-wrap \.brand-logo-dark/,
    'globals.css must show dark logo under .dark'
  );
  assert.match(
    css,
    /\[data-a11y-dark='true'\] \.brand-logo-wrap \.brand-logo-dark/,
    'globals.css must show dark logo under [data-a11y-dark="true"]'
  );

  // High contrast mode selectors
  assert.match(
    css,
    /html\.contrast-mode \.brand-logo-wrap \.brand-logo-dark/,
    'globals.css must show dark logo under html.contrast-mode'
  );
  assert.match(
    css,
    /html\[data-a11y-contrast='true'\] \.brand-logo-wrap \.brand-logo-dark/,
    'globals.css must show dark logo under data-a11y-contrast="true"'
  );
  assert.match(
    css,
    /html\.contrast-mode \.sidebar \.brand-mark/,
    'globals.css must style brand-mark in high contrast mode'
  );
});

test('4. Landing Page brand font and layout match Dashboard baseline', () => {
  const landingCss = source('src/app/landing.module.css');
  const landingShell = source('src/components/landing/LandingShell.tsx');

  // Verify CSS typography matches Dashboard brand (22px, 700, -0.4px, gap: 12px)
  assert.match(landingCss, /\.brand\s*\{[^}]*font-size:\s*22px/);
  assert.match(landingCss, /\.brand\s*\{[^}]*font-weight:\s*700/);
  assert.match(landingCss, /\.brand\s*\{[^}]*letter-spacing:\s*-0\.4px/);
  assert.match(landingCss, /\.brand\s*\{[^}]*gap:\s*12px/);

  // Verify LandingShell renders BrandLogo and standard <span>NaviAble</span> without trailing dot
  assert.ok(
    landingShell.includes('<BrandLogo size={36} priority />'),
    'Landing header must use BrandLogo size 36'
  );
  assert.ok(
    landingShell.includes('<BrandLogo size={32} />'),
    'Landing footer must use BrandLogo size 32'
  );
  assert.equal(
    landingShell.includes('brandDot'),
    false,
    'LandingShell must not have brandDot'
  );
  assert.ok(
    landingShell.includes('<span>NaviAble</span>'),
    'LandingShell must render <span>NaviAble</span> matching Dashboard'
  );
});

test('5. Sign In page branding matches Dashboard and Landing Page standard', () => {
  const loginContent = source('src/app/login/LoginContent.tsx');
  const loginCss = source('src/app/login/login.module.css');

  // Verify LoginContent renders BrandLogo size 40 and standard <span>NaviAble</span>
  assert.match(loginContent, /<BrandLogo\s+size=\{40\}\s+priority\s*\/>/);
  assert.ok(
    loginContent.includes('<span>NaviAble</span>'),
    'LoginContent must render <span>NaviAble</span> matching Dashboard'
  );
  assert.equal(
    loginContent.includes('brandAccent'),
    false,
    'LoginContent must not have custom brandAccent split'
  );

  // Verify login.module.css typography matches Dashboard brand
  assert.match(loginCss, /\.brand\s*\{[^}]*font-size:\s*22px/);
  assert.match(loginCss, /\.brand\s*\{[^}]*font-weight:\s*700/);
  assert.match(loginCss, /\.brand\s*\{[^}]*letter-spacing:\s*-0\.4px/);
  assert.match(loginCss, /\.brand\s*\{[^}]*gap:\s*12px/);

  // Verify dark and contrast theme styles exist in login.module.css
  assert.ok(loginCss.includes(':global(html.dark) .page'));
  assert.ok(loginCss.includes(':global(html.contrast-mode) .page'));
});

test('6. All main components use BrandLogo component', () => {
  const appSidebar = source('src/components/layout/AppSidebar.tsx');
  const topNavbar = source('src/components/layout/TopNavbar.tsx');
  const loginContent = source('src/app/login/LoginContent.tsx');
  const reviewerSidebar = source('src/components/reviewer/ReviewerSidebar.tsx');

  assert.match(appSidebar, /<BrandLogo\s+size=\{40\}\s+className="brand-mark"/);
  assert.match(topNavbar, /<BrandLogo\s+size=\{30\}\s+className="topbar-mobile-logo"/);
  assert.match(loginContent, /<BrandLogo\s+size=\{40\}/);
  assert.match(reviewerSidebar, /<BrandLogo\s+size=\{32\}/);
});

test('7. Mobile stacking order safeguards bottom navigation above drawer backdrop', () => {
  const css = source('src/app/globals.css');
  const mobileSection = css.slice(css.indexOf('@media (max-width: 900px)'));

  // Mobile sidebar (bottom nav) must have z-index 1001 to sit above drawer (1000) and backdrop (999)
  assert.match(
    mobileSection,
    /\.sidebar\s*\{[^}]*z-index:\s*1001;/,
    'Mobile sidebar must have z-index 1001'
  );

  // Mobile nav buttons must have ellipsis safeguards
  assert.match(
    mobileSection,
    /\.nav-label-mobile\s*\{[^}]*text-overflow:\s*ellipsis;/
  );
});

test('8. Mobile login accessibility button is anchored cleanly without obscuring forms', () => {
  const css = source('src/app/globals.css');
  assert.match(
    css,
    /\.widget-page-login\.widget-pos-right\s*\{[^}]*position:\s*fixed;[^}]*top:\s*16px;[^}]*right:\s*16px;/
  );
});
