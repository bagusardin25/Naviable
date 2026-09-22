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

test('3. Theme-aware CSS rules handle dark and light modes reliably', () => {
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
  assert.match(
    css,
    /\.dark \.brand-logo-wrap \.brand-logo-light/,
    'globals.css must hide light logo under .dark'
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

test('5. All main components use BrandLogo component', () => {
  const appSidebar = source('src/components/layout/AppSidebar.tsx');
  const topNavbar = source('src/components/layout/TopNavbar.tsx');
  const loginContent = source('src/app/login/LoginContent.tsx');
  const reviewerSidebar = source('src/components/reviewer/ReviewerSidebar.tsx');

  assert.match(appSidebar, /<BrandLogo\s+size=\{40\}\s+className="brand-mark"/);
  assert.match(topNavbar, /<BrandLogo\s+size=\{30\}\s+className="topbar-mobile-logo"/);
  assert.match(loginContent, /<BrandLogo\s+size=\{48\}/);
  assert.match(reviewerSidebar, /<BrandLogo\s+size=\{32\}/);
});
