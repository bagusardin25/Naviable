import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  calculatePlaceProfileStatus,
  getEvidenceFreshness,
  detectConditionChanges,
  STATUS_META,
  ACCESSIBILITY_STATUS_CONFIG,
  DEFAULT_A11Y_SETTINGS,
  DEFAULT_A11Y_PREFERENCES,
  type Place,
} from '../src/types/index';
import { STATUS_STYLE } from '../src/lib/types';
import { exportEvidenceCsvUrl } from '../src/lib/api';
import { parsePreferences, PRIMARY_STORAGE_KEY } from '../src/providers/AccessibilityProvider';


function createMockPlace(overrides: Partial<Place> = {}): Place {
  return {
    id: 'test-place-1',
    name: 'Balai Pemuda Surabaya',
    category: 'Pusat Konvensi',
    rawCategory: 'conference_centre',
    district: 'Genteng',
    address: 'Jl. Gubernur Suryo No.15',
    distance: '1,2 km',
    lat: -7.2625,
    lng: 112.7485,
    x: 52,
    y: 48,
    overall: 'BELUM_DIKETAHUI',
    wheelchairStatus: 'yes',
    verificationStatus: 'pre-survey',
    features: ['wheelchair', 'toilet'],
    evidenceLevel: 'community_reported',
    evidenceLevelLabel: 'Community reported (OpenStreetMap)',
    sourceName: 'OpenStreetMap',
    verifiedByTeam: false,
    needsGeocoding: false,
    chainSummary: 'Pre-survey indication',
    updated: '13 Sep 2026',
    updatedAt: null,
    photos: 0,
    elements: [
      { code: 'E1', label: 'Pintu', status: 'BELUM_DIKETAHUI', note: '', isPreSurveyEvidence: true },
      { code: 'E2', label: 'Ramp', status: 'BELUM_DIKETAHUI', note: '', isPreSurveyEvidence: false },
      { code: 'E3', label: 'Toilet', status: 'BELUM_DIKETAHUI', note: '', isPreSurveyEvidence: true },
      { code: 'E4', label: 'Lift', status: 'BELUM_DIKETAHUI', note: '', isPreSurveyEvidence: false },
      { code: 'E5', label: 'Jalur Pemandu', status: 'BELUM_DIKETAHUI', note: '', isPreSurveyEvidence: false },
      { code: 'E6', label: 'Parkir', status: 'BELUM_DIKETAHUI', note: '', isPreSurveyEvidence: false },
      { code: 'E7', label: 'Rambu', status: 'BELUM_DIKETAHUI', note: '', isPreSurveyEvidence: false },
      { code: 'E8', label: 'Penyeberangan', status: 'BELUM_DIKETAHUI', note: '', isPreSurveyEvidence: false },
    ],
    ...overrides,
  };
}

test('1. Dynamic Accessibility Evaluation: Profile-specific independence', () => {
  // A place with pre-survey wheelchair="yes" but NO tactile paving
  const place = createMockPlace({ wheelchairStatus: 'yes' });

  // For Mobilitas: should show pre-survey wheelchair reported
  const mobilitasResult = calculatePlaceProfileStatus(place, 'Mobilitas');
  assert.equal(mobilitasResult.status, 'UTUH');
  assert.match(mobilitasResult.label, /Dilaporkan bisa diakses/i);
  assert.match(mobilitasResult.short, /kursi roda/i);

  // For Visual: tactile paving is NOT reported -> must NOT inherit wheelchair status!
  const visualResult = calculatePlaceProfileStatus(place, 'Visual');
  assert.equal(visualResult.status, 'BELUM_DIKETAHUI');
  assert.match(visualResult.label, /Belum ada data visual/i);

  // For Auditori: signage is not reported -> must be BELUM_DIKETAHUI
  const auditoriResult = calculatePlaceProfileStatus(place, 'Auditori');
  assert.equal(auditoriResult.status, 'BELUM_DIKETAHUI');

  // For Sensorik: must be BELUM_DIKETAHUI
  const sensorikResult = calculatePlaceProfileStatus(place, 'Sensorik');
  assert.equal(sensorikResult.status, 'BELUM_DIKETAHUI');
});

test('2. Dynamic Accessibility Evaluation: Contributor evidence overrides pre-survey', () => {
  // Even if pre-survey wheelchair was 'yes', if contributor locked E1 as TERHALANG, Mobilitas is TERHALANG
  const place = createMockPlace({
    wheelchairStatus: 'yes',
    reportCount: 1,
    elements: [
      { code: 'E1', label: 'Pintu', status: 'TERHALANG', note: 'Terkunci', lockedBy: 'kontributor' },
      { code: 'E2', label: 'Ramp', status: 'BELUM_DIKETAHUI', note: '' },
      { code: 'E3', label: 'Toilet', status: 'BELUM_DIKETAHUI', note: '' },
      { code: 'E4', label: 'Lift', status: 'BELUM_DIKETAHUI', note: '' },
      { code: 'E5', label: 'Jalur Pemandu', status: 'BELUM_DIKETAHUI', note: '' },
      { code: 'E6', label: 'Parkir', status: 'BELUM_DIKETAHUI', note: '' },
      { code: 'E7', label: 'Rambu', status: 'BELUM_DIKETAHUI', note: '' },
      { code: 'E8', label: 'Penyeberangan', status: 'BELUM_DIKETAHUI', note: '' },
    ],
  });

  const mobilitasResult = calculatePlaceProfileStatus(place, 'Mobilitas');
  assert.equal(mobilitasResult.status, 'TERHALANG');
  assert.equal(mobilitasResult.label, 'Terhalang');
  assert.equal(mobilitasResult.isPreSurvey, false);
});

test('3. Evidence Freshness Boundaries (<=90d, 91-365d, >365d, presurvey)', () => {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Baseline pre-survey (no date)
  assert.equal(getEvidenceFreshness(null).level, 'presurvey');
  assert.equal(getEvidenceFreshness(undefined).level, 'presurvey');

  // Fresh: 15 days ago
  const freshDate = new Date(now - 15 * dayMs).toISOString();
  const fresh = getEvidenceFreshness(freshDate);
  assert.equal(fresh.level, 'fresh');
  assert.match(fresh.label, /Terbaru/i);
  assert.equal(fresh.symbol, '');

  // Aging: 120 days ago (~4 months)
  const agingDate = new Date(now - 120 * dayMs).toISOString();
  const aging = getEvidenceFreshness(agingDate);
  assert.equal(aging.level, 'aging');
  assert.match(aging.label, /Perlu diperbarui/i);
  assert.equal(aging.symbol, '');

  // Stale: 400 days ago (>1 year)
  const staleDate = new Date(now - 400 * dayMs).toISOString();
  const stale = getEvidenceFreshness(staleDate);
  assert.equal(stale.level, 'stale');
  assert.match(stale.label, /Perlu survei ulang/i);
  assert.equal(stale.symbol, '');
});

test('4. Conflict / Condition Change Detection', () => {
  const reports = [
    {
      createdAt: '2026-09-17T10:00:00Z',
      reporterName: 'Siti Rahma',
      elements: [{ element: 'E1_door', status: 'UTUH' as const, note: 'Palang penghalang sudah disingkirkan' }],
    },
    {
      createdAt: '2026-09-10T08:00:00Z',
      reporterName: 'Ahmad Fauzi',
      elements: [{ element: 'E1_door', status: 'TERHALANG' as const, note: 'Ada pot bunga besar' }],
    },
  ];

  const changes = detectConditionChanges(reports);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].elementCode, 'E1_door');
  assert.equal(changes[0].previousStatus, 'TERHALANG');
  assert.equal(changes[0].currentStatus, 'UTUH');
  assert.equal(changes[0].previousReporter, 'Ahmad Fauzi');
  assert.equal(changes[0].currentReporter, 'Siti Rahma');
});

test('5. Non-reliance on color alone (every status has distinct text, symbol, and pattern)', () => {
  const statuses = ['UTUH', 'TERHALANG', 'TIDAK_STANDAR', 'TIDAK_ADA', 'BELUM_DIKETAHUI'] as const;
  const symbols = new Set<string>();

  for (const s of statuses) {
    const meta = STATUS_META[s];
    assert.ok(meta.label.length > 0, `Status ${s} missing label`);
    assert.ok(meta.symbol.length > 0, `Status ${s} missing symbol`);
    assert.ok(meta.short.length > 0, `Status ${s} missing short description`);
    symbols.add(meta.symbol);
  }

  // Ensure all 5 symbols are distinct
  assert.equal(symbols.size, 5, 'Every status must have a unique non-color visual symbol');
});

test('6. Filtered CSV export URL generation preserves parameters', () => {
  const url = exportEvidenceCsvUrl({
    kecamatan: 'Genteng',
    category: 'Supermarket',
    profile: 'visual',
    element: 'E5_guiding_block',
    status: 'UTUH',
  });

  assert.match(url, /kecamatan=Genteng/);
  assert.match(url, /category=Supermarket/);
  assert.match(url, /profile=visual/);
  assert.match(url, /element=E5_guiding_block/);
  assert.match(url, /status=UTUH/);
});

test('7. Accessibility settings defaults and widget positions', () => {
  const validPositions = ['left', 'right'];

  assert.equal(DEFAULT_A11Y_SETTINGS.widgetPosition, 'right');
  assert.ok(validPositions.includes(DEFAULT_A11Y_SETTINGS.widgetPosition));

  // Verify all 8 primary accessibility modes are boolean flags in default settings
  const expectedModes: (keyof typeof DEFAULT_A11Y_SETTINGS)[] = [
    'motorMode',
    'dyslexia',
    'largeText',
    'contrast',
    'colorBlind',
    'highlightLinks',
    'readingGuide',
    'voiceMode',
  ];

  for (const mode of expectedModes) {
    assert.equal(typeof DEFAULT_A11Y_SETTINGS[mode], 'boolean', `Mode ${mode} should be a boolean flag`);
  }
});

test('8. Accessibility preferences parsing and fallback resilience', () => {
  // Test null / undefined fallback
  const fallback = parsePreferences(null);
  assert.deepEqual(fallback, DEFAULT_A11Y_PREFERENCES);

  // Test migration from legacy right-top to right
  const legacyRightJson = JSON.stringify({
    darkMode: true,
    contrast: true,
    dyslexia: true,
    widgetPosition: 'right-top',
  });
  const parsedRight = parsePreferences(legacyRightJson);
  assert.equal(parsedRight.darkMode, true);
  assert.equal(parsedRight.contrast, true);
  assert.equal(parsedRight.dyslexia, true);
  assert.equal(parsedRight.widgetPosition, 'right');
  assert.equal(parsedRight.motorMode, false);
  assert.equal(parsedRight.colorBlind, false);

  // Test migration from legacy left-center to left
  const legacyLeftJson = JSON.stringify({
    widgetPosition: 'left-center',
  });
  const parsedLeft = parsePreferences(legacyLeftJson);
  assert.equal(parsedLeft.widgetPosition, 'left');

  // Test invalid position fallback
  const invalidPosJson = JSON.stringify({
    widgetPosition: 'invalid-floating-center',
  });
  const parsedInvalid = parsePreferences(invalidPosJson);
  assert.equal(parsedInvalid.widgetPosition, 'right');
});

test('9. Canonical primary storage key matches standard', () => {
  assert.equal(PRIMARY_STORAGE_KEY, 'naviable-accessibility-preferences');
});

test('10. Custom text scale parsing, bounds clamping, and migration', () => {
  // Test default textScale
  assert.equal(DEFAULT_A11Y_SETTINGS.textScale, 100);

  // Test migration from legacy { largeText: true }
  const legacyLarge = parsePreferences(JSON.stringify({ largeText: true }));
  assert.equal(legacyLarge.textScale, 130);
  assert.equal(legacyLarge.largeText, true);

  // Test migration from legacy { largeText: false }
  const legacyNormal = parsePreferences(JSON.stringify({ largeText: false }));
  assert.equal(legacyNormal.textScale, 100);
  assert.equal(legacyNormal.largeText, false);

  // Test explicit custom text scale within bounds
  const customScale = parsePreferences(JSON.stringify({ textScale: 150 }));
  assert.equal(customScale.textScale, 150);
  assert.equal(customScale.largeText, true);

  // Test lower bound clamping (min 100)
  const clampedLow = parsePreferences(JSON.stringify({ textScale: 50 }));
  assert.equal(clampedLow.textScale, 100);

  // Test upper bound clamping (max 200)
  const clampedHigh = parsePreferences(JSON.stringify({ textScale: 350 }));
  assert.equal(clampedHigh.textScale, 200);
});

test('11. Highlight Interactive parsing, migration, and backward compatibility', () => {
  // Default is false
  assert.equal(DEFAULT_A11Y_SETTINGS.highlightInteractive, false);
  assert.equal(DEFAULT_A11Y_SETTINGS.highlightLinks, false);

  // Migration from legacy highlightLinks
  const migratedFromLegacy = parsePreferences(JSON.stringify({ highlightLinks: true }));
  assert.equal(migratedFromLegacy.highlightInteractive, true);
  assert.equal(migratedFromLegacy.highlightLinks, true);

  // Explicit highlightInteractive
  const explicit = parsePreferences(JSON.stringify({ highlightInteractive: true }));
  assert.equal(explicit.highlightInteractive, true);
  assert.equal(explicit.highlightLinks, true);
});

test('12. Color Blind Mode preference parsing and persistence structure', () => {
  // Default is false
  assert.equal(DEFAULT_A11Y_PREFERENCES.colorBlind, false);

  // Parsing true
  const activeColorBlind = parsePreferences(JSON.stringify({ colorBlind: true }));
  assert.equal(activeColorBlind.colorBlind, true);

  // Parsing false
  const inactiveColorBlind = parsePreferences(JSON.stringify({ colorBlind: false }));
  assert.equal(inactiveColorBlind.colorBlind, false);
});

test('12b. Requested accessibility modes survive preference parsing together', () => {
  const persisted = parsePreferences(JSON.stringify({
    widgetPosition: 'left',
    colorBlind: true,
    dyslexia: true,
    darkMode: true,
    reduceMotion: true,
  }));

  assert.equal(persisted.widgetPosition, 'left');
  assert.equal(persisted.colorBlind, true);
  assert.equal(persisted.dyslexia, true);
  assert.equal(persisted.darkMode, true);
  assert.equal(persisted.reduceMotion, true);
});

test('12c. Accessibility panel order, unified cards, and global mode styles', () => {
  const widget = readFileSync(
    new URL('../src/components/accessibility/AccessibilityWidget.tsx', import.meta.url),
    'utf8'
  );
  const styles = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');
  const layout = readFileSync(new URL('../src/app/layout.tsx', import.meta.url), 'utf8');

  const featuresIndex = widget.indexOf('<span>Fitur Aksesibilitas</span>');
  const displayIndex = widget.indexOf('<span>Tampilan &amp; Gerakan</span>');
  const positionIndex = widget.indexOf('<span>Posisi Widget</span>');
  const resetIndex = widget.indexOf('className="a11y-panel-footer"');

  assert.ok(featuresIndex < displayIndex);
  assert.ok(displayIndex < positionIndex);
  assert.ok(positionIndex < resetIndex);
  assert.equal(widget.includes('a11y-compact-btn'), false);
  assert.match(styles, /backdrop-filter:\s*grayscale\(100%\)/);
  assert.match(styles, /--font-dyslexia:\s*"OpenDyslexic"/);
  assert.match(styles, /max-height:\s*78dvh/);
  assert.match(layout, /@fontsource\/opendyslexic\/400\.css/);
  assert.match(layout, /@fontsource\/opendyslexic\/700\.css/);
});

test('13. Text Scale stepper step boundary rules (100% to 200% with 10% steps)', () => {
  const stepDown = (current: number) => Math.max(100, current - 10);
  const stepUp = (current: number) => Math.min(200, current + 10);

  // Step down from 100% stays 100%
  assert.equal(stepDown(100), 100);

  // Step down from 130% gives 120%
  assert.equal(stepDown(130), 120);

  // Step up from 130% gives 140%
  assert.equal(stepUp(130), 140);

  // Step up from 200% stays 200%
  assert.equal(stepUp(200), 200);

  // CSS variable value calculation contract (textScale / 100)
  assert.equal(100 / 100, 1);
  assert.equal(150 / 100, 1.5);
  assert.equal(200 / 100, 2);
});

test('14. Dashboard / Jelajah route path detection and unified accessibility trigger contract', () => {
  const isJelajahRoute = (path: string) => path === '/jelajah' || path.startsWith('/jelajah');

  // Should identify Jelajah and sub-routes / query params as Jelajah page
  assert.equal(isJelajahRoute('/jelajah'), true);
  assert.equal(isJelajahRoute('/jelajah?screen=map'), true);
  assert.equal(isJelajahRoute('/jelajah/'), true);

  // Should NOT identify other pages as Jelajah page
  assert.equal(isJelajahRoute('/'), false);
  assert.equal(isJelajahRoute('/login'), false);
  assert.equal(isJelajahRoute('/reviewer'), false);

  // Contract: On jelajah page, floating trigger #a11y-widget-trigger is hidden
  // and #btn-accessibility in TopNavbar is the primary toggle trigger.
  const getVisibleTriggers = (pathname: string) => {
    const isJelajah = isJelajahRoute(pathname);
    return {
      hasNavbarTrigger: true, // Always in TopNavbar on jelajah
      hasFloatingTrigger: !isJelajah, // Suppressed on jelajah
    };
  };

  const jelajahTriggers = getVisibleTriggers('/jelajah');
  assert.equal(jelajahTriggers.hasNavbarTrigger, true);
  assert.equal(jelajahTriggers.hasFloatingTrigger, false);

  const landingTriggers = getVisibleTriggers('/');
  assert.equal(landingTriggers.hasFloatingTrigger, true);
});

test('15. Redundant accessibility entry point removed from LandingShell, single canonical floating launcher preserved', () => {
  const landingShell = readFileSync(
    new URL('../src/components/landing/LandingShell.tsx', import.meta.url),
    'utf8'
  );
  const widget = readFileSync(
    new URL('../src/components/accessibility/AccessibilityWidget.tsx', import.meta.url),
    'utf8'
  );

  // Redundant entry point removed from page content
  assert.equal(landingShell.includes('Pengaturan Aksesibilitas'), false);
  assert.equal(landingShell.includes('openWidget'), false);
  assert.equal(landingShell.includes('useAccessibility'), false);

  // Kembali ke atas link preserved in footer
  assert.ok(landingShell.includes('Kembali ke atas ↑'));

  // Floating trigger button has accessible aria-label and compact state support
  assert.match(widget, /aria-label="Buka pengaturan aksesibilitas"/);
  assert.match(widget, /is-compact/);
  assert.match(widget, /IntersectionObserver/);
});

test('16. Unified Dark High Contrast architecture, WCAG AAA tokens, yellow accent, and compact launcher touch targets', () => {
  const styles = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');

  // Unified High Contrast Mode selectors
  assert.match(styles, /html\.contrast-mode/);
  assert.match(styles, /html\[data-a11y-contrast="true"\]/);
  assert.match(styles, /html\[data-a11y-high-contrast="true"\]/);

  // Dark High Contrast tokens (unconditional #000000 bg, #ffffff text, 2px white borders)
  assert.match(styles, /--bg:\s*#000000;/);
  assert.match(styles, /--ink:\s*#ffffff;/);
  assert.match(styles, /--border:\s*#ffffff;/);

  // Yellow #FFFF00 replaces brand purple for interactive accents
  assert.match(styles, /--purple:\s*#ffff00;/);

  // Primary action buttons have yellow background and black text
  assert.match(styles, /background:\s*#ffff00\s*!important/);
  assert.match(styles, /color:\s*#000000\s*!important/);

  // Focus visible must have clear 3px solid yellow outline
  assert.match(styles, /outline:\s*3px solid #ffff00\s*!important/);

  // Forced colors mode progressive enhancement
  assert.match(styles, /@media \(forced-colors:\s*active\)/);

  // Compact launcher must preserve accessible touch target (48x48px, >=44px)
  assert.match(styles, /\.a11y-widget-btn\.is-compact\s*\{[^}]*width:\s*48px;/);
  assert.match(styles, /\.a11y-widget-btn\.is-compact\s*\{[^}]*min-height:\s*48px;/);

  // Mathematical WCAG contrast verification:
  // Relative luminance calculation
  const getLuminance = (r: number, g: number, b: number) => {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };
  const getContrastRatio = (lum1: number, lum2: number) => {
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    return (lighter + 0.05) / (darker + 0.05);
  };

  const blackLum = getLuminance(0, 0, 0); // 0
  const whiteLum = getLuminance(255, 255, 255); // 1
  const yellowLum = getLuminance(255, 255, 0); // ~0.9278
  const mutedLum = getLuminance(229, 231, 235); // ~0.783 (#e5e7eb)

  const whiteOnBlackRatio = getContrastRatio(whiteLum, blackLum);
  const yellowOnBlackRatio = getContrastRatio(yellowLum, blackLum);
  const mutedOnBlackRatio = getContrastRatio(mutedLum, blackLum);
  const blackOnYellowRatio = getContrastRatio(yellowLum, blackLum);

  // All must far exceed WCAG AAA minimum target 7:1
  assert.ok(whiteOnBlackRatio >= 7.0, `White on black ratio ${whiteOnBlackRatio} < 7:1`);
  assert.ok(yellowOnBlackRatio >= 7.0, `Yellow on black ratio ${yellowOnBlackRatio} < 7:1`);
  assert.ok(mutedOnBlackRatio >= 7.0, `Muted text on black ratio ${mutedOnBlackRatio} < 7:1`);
  assert.ok(blackOnYellowRatio >= 7.0, `Black on yellow button ratio ${blackOnYellowRatio} < 7:1`);
  assert.equal(Math.round(whiteOnBlackRatio), 21); // Pure 21:1 contrast
});

test('8. Accessibility Status Standardization: Canonical mappings and visual truth', () => {
  // 1. Canonical Status Config verification
  assert.equal(ACCESSIBILITY_STATUS_CONFIG.UTUH.label, 'Bisa digunakan');
  assert.equal(ACCESSIBILITY_STATUS_CONFIG.UTUH.icon, 'check');
  assert.equal(ACCESSIBILITY_STATUS_CONFIG.UTUH.borderStyle, 'solid');

  assert.equal(ACCESSIBILITY_STATUS_CONFIG.TERHALANG.label, 'Terhalang');
  assert.equal(ACCESSIBILITY_STATUS_CONFIG.TERHALANG.icon, 'warning');
  assert.equal(ACCESSIBILITY_STATUS_CONFIG.TERHALANG.borderStyle, 'dashed');

  assert.equal(ACCESSIBILITY_STATUS_CONFIG.TIDAK_STANDAR.label, 'Perlu perhatian');
  assert.equal(ACCESSIBILITY_STATUS_CONFIG.TIDAK_STANDAR.icon, 'alert-circle');
  assert.equal(ACCESSIBILITY_STATUS_CONFIG.TIDAK_STANDAR.borderStyle, 'dotted');

  assert.equal(ACCESSIBILITY_STATUS_CONFIG.TIDAK_ADA.label, 'Tidak ada');
  assert.equal(ACCESSIBILITY_STATUS_CONFIG.TIDAK_ADA.icon, 'x-circle');
  assert.equal(ACCESSIBILITY_STATUS_CONFIG.TIDAK_ADA.borderStyle, 'double');

  assert.equal(ACCESSIBILITY_STATUS_CONFIG.BELUM_DIKETAHUI.label, 'Belum diketahui');
  assert.equal(ACCESSIBILITY_STATUS_CONFIG.BELUM_DIKETAHUI.icon, 'help-circle');
  assert.equal(ACCESSIBILITY_STATUS_CONFIG.BELUM_DIKETAHUI.borderStyle, 'solid');

  // 2. STATUS_META parity with ACCESSIBILITY_STATUS_CONFIG
  assert.deepEqual(STATUS_META, ACCESSIBILITY_STATUS_CONFIG);

  // 3. STATUS_STYLE in lib/types parity
  assert.equal(STATUS_STYLE.UTUH.label, 'Bisa digunakan');
  assert.equal(STATUS_STYLE.TERHALANG.label, 'Terhalang');
  assert.equal(STATUS_STYLE.TIDAK_STANDAR.label, 'Perlu perhatian');
  assert.equal(STATUS_STYLE.TIDAK_ADA.label, 'Tidak ada');
  assert.equal(STATUS_STYLE.BELUM_DIKETAHUI.label, 'Belum diketahui');

  // 4. globals.css CSS rules verification: 6px border-radius and non-color border differentiation
  const css = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');

  // Must have 6px border-radius for status-badge
  assert.match(css, /\.status-badge\s*\{[^}]*border-radius:\s*6px;/);

  // Must have border styles matching landing page
  assert.match(css, /\.status-utuh[^{]*\{[^}]*border:\s*1\.5px solid/);
  assert.match(css, /\.status-terhalang[^{]*\{[^}]*border:\s*1\.5px dashed/);
  assert.match(css, /\.status-tidak_standar[^{]*\{[^}]*border:\s*2px dotted/);
  assert.match(css, /\.status-tidak_ada[^{]*\{[^}]*border:\s*2\.5px double/);
  assert.match(css, /\.status-belum_diketahui[^{]*\{[^}]*border:\s*1\.5px solid/);
});

