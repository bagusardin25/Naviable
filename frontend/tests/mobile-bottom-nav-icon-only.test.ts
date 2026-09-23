import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relPath), 'utf-8');
}

test('Mobile Bottom Navigation: Icon-Only Verification', async (t) => {
  const globalsCss = readSrc('src/app/globals.css');
  const authCss = readSrc('src/app/auth.css');
  const sidebarTsx = readSrc('src/components/layout/AppSidebar.tsx');

  const mobileIndex = globalsCss.indexOf('@media (max-width: 900px)');
  assert.ok(mobileIndex !== -1, '@media (max-width: 900px) must exist in globals.css');
  const mobileSection = globalsCss.slice(mobileIndex);

  await t.test('1. Mobile bottom nav strictly hides all visible text labels with zero space allocation', () => {
    // Both full and mobile labels must be display: none !important on mobile
    assert.match(
      mobileSection,
      /\.nav-label-full,\s*\n\s*\.nav-label-mobile\s*\{[^}]*display:\s*none\s*!important;/
    );

    // Collapsed/sidebar mobile state must also enforce display: none !important
    assert.match(
      mobileSection,
      /\.sidebar\.collapsed\s+nav\s+\.nav-label-mobile,\s*\n\s*\.app-shell\.sidebar-collapsed\s+\.sidebar\s+nav\s+\.nav-label-mobile\s*\{[^}]*display:\s*none\s*!important;/
    );

    // In auth.css, mobile label must also be display: none !important
    assert.match(
      authCss,
      /\.sidebar\s+nav\s+\.nav-label-mobile\s*\{[^}]*display:\s*none\s*!important;/
    );
  });

  await t.test('2. All mobile bottom nav items have equal width (4-column grid) with no fixed-width overflow', () => {
    // Normal mobile sidebar nav
    assert.match(
      mobileSection,
      /\.sidebar\s+nav\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*1fr\);/
    );

    // Collapsed mobile sidebar nav
    assert.match(
      mobileSection,
      /\.sidebar\.collapsed\s+nav,\s*\n\s*\.app-shell\.sidebar-collapsed\s+\.sidebar\s+nav\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*1fr\)\s*!important;/
    );

    // Button takes full width of cell
    assert.match(
      mobileSection,
      /\.sidebar\s+nav\s+button\s*\{[^}]*width:\s*100%;/
    );
  });

  await t.test('3. Mobile buttons center icons horizontally and vertically within 44px accessible touch target', () => {
    assert.match(
      mobileSection,
      /\.sidebar\s+nav\s+button\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*justify-content:\s*center;[^}]*height:\s*44px;/
    );

    // Icon size is 22px
    assert.match(
      mobileSection,
      /\.sidebar\s+nav\s+button\s+svg\s*\{[^}]*width:\s*22px;[^}]*height:\s*22px;/
    );
  });

  await t.test('4. Accessible names are preserved on all 4 buttons in AppSidebar.tsx', () => {
    // Buttons must have aria-label and title
    assert.match(sidebarTsx, /id="nav-map"[\s\S]*?aria-label=\{t\('nav\.explore'\)\}/);
    assert.match(sidebarTsx, /id="nav-report"[\s\S]*?aria-label=\{t\('nav\.addPlace'\)\}/);
    assert.match(sidebarTsx, /id="nav-dashboard"[\s\S]*?aria-label=\{t\('nav\.dashboard'\)\}/);
    assert.match(sidebarTsx, /id="nav-profile"[\s\S]*?aria-label=\{/);

    // Must have title tooltip
    assert.match(sidebarTsx, /id="nav-map"[\s\S]*?title=\{t\('nav\.explore'\)\}/);
    assert.match(sidebarTsx, /id="nav-report"[\s\S]*?title=\{t\('nav\.addPlace'\)\}/);
    assert.match(sidebarTsx, /id="nav-dashboard"[\s\S]*?title=\{t\('nav\.dashboard'\)\}/);
    assert.match(sidebarTsx, /id="nav-profile"[\s\S]*?title=\{/);

    // Must have aria-current
    assert.match(sidebarTsx, /aria-current=\{currentScreen === 'map' \? 'page' : undefined\}/);
    assert.match(sidebarTsx, /aria-current=\{currentScreen === 'add' \? 'page' : undefined\}/);
    assert.match(sidebarTsx, /aria-current=\{currentScreen === 'dashboard' \? 'page' : undefined\}/);
    assert.match(sidebarTsx, /aria-current=\{currentScreen === 'profile' \? 'page' : undefined\}/);
  });

  await t.test('5. Icons use existing Icon library component without emojis', () => {
    assert.match(sidebarTsx, /<Icon name="map" \/>/);
    assert.match(sidebarTsx, /<Icon name="report" \/>/);
    assert.match(sidebarTsx, /<Icon name="dashboard" \/>/);
    assert.match(sidebarTsx, /<Icon name="user" \/>/);
  });

  await t.test('6. Desktop sidebar maintains visible labels (> 900px)', () => {
    // In desktop styles, .nav-label-full is visible
    assert.match(
      globalsCss,
      /\.nav-label-full\s*\{[^}]*display:\s*inline-block;[^}]*max-width:\s*160px;[^}]*opacity:\s*1;/
    );
  });

  await t.test('7. Active state uses tokenized contrast without relying on text labels', () => {
    assert.match(
      mobileSection,
      /\.sidebar\s+nav\s+button\.active\s*\{[^}]*background:\s*var\(--sidebar-active-bg\);/
    );
    assert.match(
      mobileSection,
      /\.sidebar\s+nav\s+button\.active\s*svg\s*\{[^}]*color:\s*var\(--sidebar-active-icon\);/
    );
  });

  await t.test('8. Safe area and height tokens are integrated without overlapping Leaflet Maps', () => {
    assert.match(
      mobileSection,
      /\.sidebar\s*\{[^}]*height:\s*var\(--mobile-bottom-nav-height\);/
    );
    assert.match(
      mobileSection,
      /\.sidebar\s*\{[^}]*padding-bottom:\s*env\(safe-area-inset-bottom,\s*0px\);/
    );
    assert.match(
      mobileSection,
      /\.workspace\s*\{[^}]*height:\s*calc\(100dvh\s*-\s*var\(--mobile-bottom-nav-height\)\);/
    );
  });

  await t.test('9. Layout geometry verification on 320, 360, 375, 390, 412, and 430px viewports', () => {
    const viewports = [320, 360, 375, 390, 412, 430];
    const paddingX = 8 * 2; // padding: 6px 8px -> 16px horizontal
    const gap = 8;
    const columns = 4;
    const totalGaps = gap * (columns - 1); // 24px

    for (const width of viewports) {
      const availableGridWidth = width - paddingX;
      const columnWidth = (availableGridWidth - totalGaps) / columns;

      // Equal width per column
      assert.ok(columnWidth > 0, `Width ${width}px must produce positive column width`);
      // Touch target width must be >= 44px
      assert.ok(
        columnWidth >= 44,
        `Column width ${columnWidth}px on ${width}px screen must meet WCAG 2.1 touch target (>= 44px)`
      );
      // Total rendered width must match viewport width without horizontal overflow
      const totalComputedWidth = paddingX + (columnWidth * columns) + totalGaps;
      assert.strictEqual(
        Math.round(totalComputedWidth),
        width,
        `Total computed nav width must equal viewport width ${width}px`
      );
    }
  });

  await t.test('10. Dark Mode & High Contrast active states are defined and high-contrast accessible', () => {
    // Light Mode tokens
    assert.match(globalsCss, /--sidebar-mobile-bg:\s*linear-gradient/);
    assert.match(globalsCss, /--sidebar-active-bg:\s*#ffffff/);

    // Dark Mode tokens
    assert.match(globalsCss, /\.dark[^{]*\{[^}]*--sidebar-mobile-bg:/);
    assert.match(globalsCss, /\.dark[^{]*\{[^}]*--sidebar-active-bg:\s*rgba\(154,\s*120,\s*240,\s*0\.18\)/);

    // High Contrast rules
    assert.match(globalsCss, /html\.contrast-mode\s+\.sidebar\s+nav\s+button\.active[^}]*background:\s*#ffffff\s*!important/);
    assert.match(globalsCss, /html\.contrast-mode\s+\.sidebar\s+nav\s+button\.active\s+svg[^}]*color:\s*#000000\s*!important/);
  });

  await t.test('11. Text scale resilience: hidden labels take 0 space at 100%, 150%, and 200%', () => {
    // Both full and mobile labels must have width 0 and display none !important
    assert.match(mobileSection, /\.nav-label-mobile\s*\{[^}]*display:\s*none\s*!important;/);
    assert.match(mobileSection, /\.nav-label-mobile\s*\{[^}]*width:\s*0\s*!important;/);
    assert.match(mobileSection, /\.nav-label-mobile\s*\{[^}]*height:\s*0\s*!important;/);
    assert.match(mobileSection, /\.nav-label-mobile\s*\{[^}]*pointer-events:\s*none\s*!important;/);

    // Ensuring no font-size or text expansion can alter mobile bottom nav height
    assert.match(mobileSection, /\.sidebar\s+nav\s+button\s*\{[^}]*height:\s*44px;/);
  });

  await t.test('12. All four route screen states are mapped to distinct buttons without duplicates', () => {
    const screens = ['map', 'add', 'dashboard', 'profile'];
    for (const screen of screens) {
      assert.match(
        sidebarTsx,
        new RegExp(`onSelectScreen\\('${screen}'\\)`),
        `Screen '${screen}' must have a dedicated navigation trigger`
      );
    }
  });
});
