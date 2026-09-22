import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { id } from '../src/locales/id';
import { en } from '../src/locales/en';

function source(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

test('1. MapView: Skematik toggle and schematic canvas are removed', () => {
  const mapView = source('src/components/map/MapView.tsx');

  // Should not contain schematic mode or toggle
  assert.equal(mapView.includes('mapMode'), false, 'mapMode state must be removed');
  assert.equal(mapView.includes('map-mode-toggle'), false, 'map-mode-toggle must be removed');
  assert.equal(mapView.includes('map-canvas'), false, 'map-canvas must be removed');
  assert.equal(mapView.includes('schematic'), false, 'schematic references must be removed');
  assert.equal(mapView.includes('placeStatusMeta'), false, 'unused placeStatusMeta must be removed');

  // Must render DynamicLeafletMap directly
  assert.match(mapView, /<DynamicLeafletMap\b/, 'DynamicLeafletMap must be rendered directly');
});

test('2. Maps layout: Overlay is hidden on desktop to avoid empty container', () => {
  const css = source('src/app/globals.css');
  const desktopSection = css.slice(
    css.indexOf('@media (min-width: 901px)'),
    css.indexOf('/* Map View & Leaflet */')
  );

  assert.match(
    desktopSection,
    /\.map-controls-overlay\s*\{\s*display:\s*none;?\s*\}/,
    'map-controls-overlay must be hidden on desktop so no empty box appears'
  );
});

test('3. Voice Reader: Mobile bottom position accounts for --mobile-bottom-nav-height', () => {
  const css = source('src/app/globals.css');
  const manager = source('src/components/accessibility/VoiceReaderManager.tsx');

  // CSS must have base .voice-reader-bar styling
  assert.match(css, /\.voice-reader-bar\s*\{[^}]*position:\s*fixed/);
  assert.match(css, /\.voice-reader-bar\s*\{[^}]*z-index:\s*1060/);

  // Mobile media query must place voice-reader-bar above bottom nav
  const mobileVoiceMatch = css.match(
    /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.voice-reader-bar\s*\{[^}]*bottom:\s*calc\(var\(--mobile-bottom-nav-height\)\s*\+\s*12px\)/
  );
  assert.ok(mobileVoiceMatch, 'Mobile voice reader bar must be positioned above mobile bottom nav');

  // VoiceReaderManager inline styles must not override bottom positioning
  assert.equal(
    manager.includes("bottom: '16px'"),
    false,
    "Hardcoded bottom: '16px' inline style must be removed"
  );
  assert.equal(
    manager.includes("zIndex: 1060"),
    false,
    "Inline zIndex must be removed in favor of CSS"
  );
});

test('4. Add Location: Form placeholders and labels are fully localized', () => {
  const reportForm = source('src/components/reports/ReportForm.tsx');
  const aiDraft = source('src/components/reports/AIDraftPanel.tsx');

  // Placeholders in ReportForm must use translation keys
  assert.match(reportForm, /placeholder=\{t\('reports\.placeNamePlaceholder'\)\}/);
  assert.match(reportForm, /placeholder=\{t\('reports\.categoryPlaceholder'\)\}/);
  assert.match(reportForm, /placeholder=\{t\('reports\.fullAddressPlaceholder'\)\}/);
  assert.match(reportForm, /placeholder=\{t\('reports\.reporterNamePlaceholder'\)\}/);

  // No hardcoded Indonesian placeholders
  assert.equal(reportForm.includes('placeholder="Contoh: Puskesmas Gubeng"'), false);
  assert.equal(reportForm.includes('placeholder="Pilih atau ketik, mis. health, mall, transport"'), false);
  assert.equal(reportForm.includes('placeholder="Nama jalan, nomor, kelurahan"'), false);
  assert.equal(reportForm.includes('placeholder="Contoh: Budi Santoso"'), false);

  // AIDraftPanel must use localized keys
  assert.match(aiDraft, /t\('reports\.integrityAiTrusted'\)/);
  assert.match(aiDraft, /t\('reports\.integritySuspicious'\)/);
  assert.match(aiDraft, /t\('reports\.integrityUncertain'\)/);
  assert.match(aiDraft, /t\('reports\.integrityNotChecked'\)/);
  assert.match(aiDraft, /t\('reports\.integrityCheckTitle'\)/);
  assert.match(aiDraft, /t\('reports\.integrityDefaultSignals'\)/);
  assert.match(aiDraft, /t\('reports\.visualAnalysisLabel'\)/);
  assert.match(aiDraft, /t\('reports\.attemptsLabel'\)/);
});

test('5. Translation Parity for newly added report keys', () => {
  const newKeys = [
    'placeNamePlaceholder',
    'categoryPlaceholder',
    'fullAddressPlaceholder',
    'reporterNamePlaceholder',
    'integrityAiTrusted',
    'integritySuspicious',
    'integrityUncertain',
    'integrityNotChecked',
    'integrityCheckTitle',
    'integrityDefaultSignals',
    'visualAnalysisLabel',
    'attemptsLabel',
  ] as const;

  for (const key of newKeys) {
    const idVal = id.reports[key];
    const enVal = en.reports[key];
    assert.ok(idVal && typeof idVal === 'string' && idVal.length > 0, `id.reports.${key} must be defined`);
    assert.ok(enVal && typeof enVal === 'string' && enVal.length > 0, `en.reports.${key} must be defined`);
    assert.notEqual(idVal, enVal, `id and en for reports.${key} should not be identical`);
  }
});
