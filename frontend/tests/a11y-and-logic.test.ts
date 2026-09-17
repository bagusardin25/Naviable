import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePlaceProfileStatus,
  getEvidenceFreshness,
  detectConditionChanges,
  STATUS_META,
  type Place,
} from '../src/types/index';
import { exportEvidenceCsvUrl } from '../src/lib/api';


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
  assert.match(mobilitasResult.label, /Kursi Roda/i);

  // For Visual: tactile paving is NOT reported -> must NOT inherit wheelchair status!
  const visualResult = calculatePlaceProfileStatus(place, 'Visual');
  assert.equal(visualResult.status, 'BELUM_DIKETAHUI');
  assert.match(visualResult.label, /Belum Ada Bukti Visual/i);

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
  assert.match(mobilitasResult.label, /Bukti kontributor: Terhalang/i);
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
  assert.equal(fresh.symbol, '🟢');

  // Aging: 120 days ago (~4 months)
  const agingDate = new Date(now - 120 * dayMs).toISOString();
  const aging = getEvidenceFreshness(agingDate);
  assert.equal(aging.level, 'aging');
  assert.equal(aging.symbol, '🟡');

  // Stale: 400 days ago (>1 year)
  const staleDate = new Date(now - 400 * dayMs).toISOString();
  const stale = getEvidenceFreshness(staleDate);
  assert.equal(stale.level, 'stale');
  assert.equal(stale.symbol, '⚪');
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
