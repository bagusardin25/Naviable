import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

function source(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

test('1. Architecture: --mobile-bottom-nav-height token is defined with safe-area support', () => {
  const css = source('src/app/globals.css');
  assert.match(
    css,
    /--mobile-bottom-nav-height:\s*calc\(62px\s*\+\s*env\(safe-area-inset-bottom,\s*0px\)\);/,
    'Layout tokens must define --mobile-bottom-nav-height with safe-area fallback'
  );
});

test('2. Root Mobile Height: app-shell and workspace use 100dvh and flex chain', () => {
  const css = source('src/app/globals.css');
  const mobileSection = css.slice(css.indexOf('@media (max-width: 900px)'));

  // html/body bounded to 100dvh when app-shell is active
  assert.match(mobileSection, /html:has\(\.app-shell\)/);
  assert.match(mobileSection, /height:\s*100dvh/);

  // app-shell fills 100dvh with column flex
  assert.match(mobileSection, /\.app-shell\s*\{[^}]*display:\s*flex/);
  assert.match(mobileSection, /\.app-shell\s*\{[^}]*flex-direction:\s*column/);
  assert.match(mobileSection, /\.app-shell\s*\{[^}]*height:\s*100dvh/);

  // workspace fills remaining viewport up to bottom nav without padding hack
  assert.match(
    mobileSection,
    /\.workspace\s*\{[^}]*height:\s*calc\(100dvh\s*-\s*var\(--mobile-bottom-nav-height\)\)/
  );
  assert.match(mobileSection, /\.workspace\s*\{[^}]*padding-bottom:\s*0/);
});

test('3. Mobile Map Hierarchy: map-layout, map-panel, and map-view-wrapper use flex: 1 and min-height: 0', () => {
  const css = source('src/app/globals.css');
  const mobileSection = css.slice(css.indexOf('@media (max-width: 900px)'));

  // map-layout is flex column
  assert.match(mobileSection, /\.map-layout\s*\{[^}]*display:\s*flex/);
  assert.match(mobileSection, /\.map-layout\s*\{[^}]*flex:\s*1/);
  assert.match(mobileSection, /\.map-layout\s*\{[^}]*min-height:\s*0/);

  // map-panel is flex column
  assert.match(mobileSection, /\.map-panel\s*\{[^}]*display:\s*flex/);
  assert.match(mobileSection, /\.map-panel\s*\{[^}]*flex:\s*1/);
  assert.match(mobileSection, /\.map-panel\s*\{[^}]*min-height:\s*0/);

  // map-view-wrapper is flex column filling full height
  assert.match(mobileSection, /\.map-view-wrapper\s*\{[^}]*display:\s*flex/);
  assert.match(mobileSection, /\.map-view-wrapper\s*\{[^}]*flex:\s*1/);
  assert.match(mobileSection, /\.map-view-wrapper\s*\{[^}]*min-height:\s*0/);
  assert.match(mobileSection, /\.map-view-wrapper\s*\{[^}]*height:\s*100%/);
});

test('4. Leaflet Containers: 100% width and height ensured', () => {
  const css = source('src/app/globals.css');
  assert.match(css, /\.leaflet-container/);
  assert.match(css, /\.leaflet-map-container/);
  assert.match(
    css,
    /\.leaflet-container,\s*\n\s*\.leaflet-map-container\s*\{\s*width:\s*100%;\s*height:\s*100%;\s*\}/
  );
});

test('5. Bug Elimination: hardcoded 55vh and calc(100svh - 360px) are removed', () => {
  const css = source('src/app/globals.css');
  assert.equal(css.includes('55vh'), false, '55vh must not be present');
  assert.equal(css.includes('100svh - 360px'), false, '100svh - 360px must not be present');
  assert.equal(
    /padding-bottom:\s*calc\(66px/.test(css),
    false,
    'Arbitrary 66px padding-bottom on workspace must not be present'
  );
});

test('6. Bottom Navigation & Detail Drawer use --mobile-bottom-nav-height', () => {
  const css = source('src/app/globals.css');
  const mobileSection = css.slice(css.indexOf('@media (max-width: 900px)'));

  assert.match(mobileSection, /\.sidebar\s*\{[^}]*height:\s*var\(--mobile-bottom-nav-height\)/);
  assert.match(mobileSection, /\.detail-drawer\s*\{[^}]*bottom:\s*var\(--mobile-bottom-nav-height\)/);
});

test('7. LeafletMap: MapResizeController includes resize, orientation, visibility with cleanup', () => {
  const leafletMapSource = source('src/components/map/LeafletMap.tsx');

  assert.match(leafletMapSource, /window\.addEventListener\('resize', handleResize/);
  assert.match(leafletMapSource, /window\.addEventListener\('orientationchange', handleResize/);
  assert.match(leafletMapSource, /document\.addEventListener\('visibilitychange', handleResize/);

  assert.match(leafletMapSource, /window\.removeEventListener\('resize', handleResize\)/);
  assert.match(leafletMapSource, /window\.removeEventListener\('orientationchange', handleResize\)/);
  assert.match(leafletMapSource, /document\.removeEventListener\('visibilitychange', handleResize\)/);
});
