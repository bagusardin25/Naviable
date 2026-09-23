import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { detectConditionChanges, type AccessibilityStatus } from '../src/types/index';
import { toUiPlace, type ApiPlace } from '../src/lib/api';

function source(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

test('no invented reviews or reports: empty stays empty and errors surface as a retry', () => {
  const api = source('src/lib/api.ts');
  for (const fake of ['getFallbackReviews', 'getFallbackReports', 'Rina Andriani', 'Fajar Nugroho', 'Nadia Puspita', 'Hendra Gunawan']) {
    assert.equal(api.includes(fake), false, `${fake} must not be in the API client`);
  }
  assert.match(api, /export async function fetchReviews\(placeId: string, offset = 0\) \{\s*return request</);
  assert.match(api, /export async function fetchPlaceReports\(id: string, limit = 20\) \{\s*return request</);
});

test('"Belum diketahui" in a newer report is not shown as a condition change', () => {
  const report = (reporterName: string, status: AccessibilityStatus, createdAt: string) =>
    ({ reporterName, createdAt, elements: [{ element: 'E1_door', status }] });
  // Newest first, as the history endpoint returns them.
  assert.deepEqual(detectConditionChanges([
    report('Terbaru', 'BELUM_DIKETAHUI', '2026-09-23T00:00:00Z'),
    report('Lama', 'UTUH', '2026-09-20T00:00:00Z'),
  ]), []);
  // An unknown in between is skipped: the change is compared with the last known status.
  const changes = detectConditionChanges([
    report('Terbaru', 'TIDAK_ADA', '2026-09-23T00:00:00Z'),
    report('Tengah', 'BELUM_DIKETAHUI', '2026-09-21T00:00:00Z'),
    report('Lama', 'UTUH', '2026-09-20T00:00:00Z'),
  ]);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].previousStatus, 'UTUH');
  assert.equal(changes[0].currentStatus, 'TIDAK_ADA');
  assert.equal(changes[0].previousReporter, 'Lama');
});

test('each E1–E8 in Kondisi akses shows the server status once a report sets it, and stays unknown otherwise', () => {
  const apiPlace: ApiPlace = {
    id: 'uji', name: 'Tempat Uji', category: 'cafe', lat: -7.25, lng: 112.75, address: 'Jl. Uji', kecamatan: null, kelurahan: null,
    preSurvey: {}, sources: [], evidenceLevel: 'contributor', verifiedByTeam: false, needsGeocoding: false,
    elements: {
      E2_ramp: { status: 'TERHALANG', lockedBy: 'kontributor', photoUrl: '/api/photos/abc', note: 'Motor parkir' },
      E4_lift: { status: 'UTUH', lockedBy: 'kontributor', photoUrl: '/api/photos/def', note: null },
    },
    score: null, summary: '', overall: 'TERHALANG', coverage: { known: 2, total: 8 }, updatedAt: null, photoCount: 2, reportCount: 2,
  };
  const elements = toUiPlace(apiPlace).elements;
  assert.deepEqual(elements.map(e => e.code), ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8']);
  const byCode = Object.fromEntries(elements.map(e => [e.code, e]));
  assert.equal(byCode.E2.status, 'TERHALANG');
  assert.equal(byCode.E2.lockedBy, 'kontributor');
  assert.equal(byCode.E2.note, 'Motor parkir');
  assert.equal(byCode.E4.status, 'UTUH');
  for (const code of ['E1', 'E3', 'E5', 'E6', 'E7', 'E8']) assert.equal(byCode[code].status, 'BELUM_DIKETAHUI');
});

test('visitor reviews are separate cards and the history says what the conditions follow', () => {
  const reviews = source('src/components/places/PlaceReviews.tsx');
  assert.match(reviews, /className="review-card"/);
  assert.match(reviews, /t\('places\.visitorReviewLabel'\)/);
  const history = source('src/components/places/CorrectionHistory.tsx');
  assert.match(history, /t\('places\.historyDrivesConditions'\)/);
  assert.match(history, /t\('places\.reportApprovedChip'\)/);
  assert.match(history, /t\('places\.reportPendingChip'\)/);
});
