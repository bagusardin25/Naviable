import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { buildGoogleMapsPlaceUrl, buildPlaceDirectionsUrl } from '../src/lib/externalMaps';
import { reviewedReports } from '../src/lib/contributionUpdates';
import type { ContributionReport } from '../src/lib/api';
import { id } from '../src/locales/id';
import { en } from '../src/locales/en';

function source(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

test('directions use the exact map point when a place has one', () => {
  const url = new URL(buildPlaceDirectionsUrl({ name: 'Tunjungan Plaza', address: null, lat: -7.2624, lng: 112.7393 })!);
  assert.equal(url.searchParams.get('destination'), '-7.2624,112.7393');
  assert.equal(url.searchParams.get('travelmode'), 'walking');
});

test('places without a precise map point still get directions via a name + address search', () => {
  const pending = new URL(buildPlaceDirectionsUrl({ name: 'Puskesmas Gubeng', address: 'Jl. Gubeng Masjid', lat: null, lng: null, needsGeocoding: true })!);
  assert.equal(pending.searchParams.get('destination'), 'Puskesmas Gubeng, Jl. Gubeng Masjid, Surabaya');

  // An imprecise point on a place flagged for geocoding is not trusted for navigation.
  const flagged = new URL(buildPlaceDirectionsUrl({ name: 'Balai Pemuda', address: 'Jl. Gubernur Suryo, Surabaya', lat: -7.26, lng: 112.74, needsGeocoding: true })!);
  assert.equal(flagged.searchParams.get('destination'), 'Balai Pemuda, Jl. Gubernur Suryo, Surabaya');
});

test('buildGoogleMapsPlaceUrl keeps returning null for invalid coordinates unless a fallback is given', () => {
  assert.equal(buildGoogleMapsPlaceUrl({ destination: { lat: null, lng: null } }), null);
  assert.ok(buildGoogleMapsPlaceUrl({ destination: { lat: null, lng: null }, fallbackQuery: 'Taman Bungkul, Surabaya' }));
});

test('every place card, map popup and detail drawer offers Google Maps directions', () => {
  const card = source('src/components/places/PlaceCard.tsx');
  // The link is a sibling after the select button: a link nested in a <button> is invalid HTML.
  assert.ok(card.indexOf('</button>') < card.indexOf('place-card-directions'));
  assert.match(card, /buildPlaceDirectionsUrl\(place\)/);

  const popup = source('src/components/map/LeafletMap.tsx');
  assert.match(popup, /popup-directions-btn/);

  const drawer = source('src/components/places/PlaceDetailDrawer.tsx');
  assert.match(drawer, /const googleMapsPlaceUrl = buildPlaceDirectionsUrl\(place\);/);
});

test('reviewedReports lists approved, rejected and revision decisions newest first, excluding pending ones', () => {
  const base = { placeId: 'p', reporterName: 'Warga', photoUrl: '', elements: [] };
  const reports = [
    { ...base, id: 'a', createdAt: '2026-09-01T00:00:00Z', reviewStatus: 'APPROVED', reviewedAt: '2026-09-02T00:00:00Z' },
    { ...base, id: 'b', createdAt: '2026-09-01T00:00:00Z', reviewStatus: 'SUBMITTED' },
    { ...base, id: 'c', createdAt: '2026-09-01T00:00:00Z', reviewStatus: 'REJECTED', reviewedAt: '2026-09-04T00:00:00Z' },
    { ...base, id: 'd', createdAt: '2026-09-01T00:00:00Z', reviewStatus: 'NEEDS_REVISION', reviewedAt: '2026-09-03T00:00:00Z' },
  ] as ContributionReport[];
  assert.deepEqual(reviewedReports(reports).map((r) => r.id), ['c', 'd', 'a']);
});

test('contributors are notified of approvals, rejections and revision requests without navigating', () => {
  const center = source('src/components/layout/ContributionNotifications.tsx');
  assert.match(center, /APPROVED: 'approved'/);
  assert.match(center, /REJECTED: 'rejected'/);
  assert.match(center, /NEEDS_REVISION: 'needsRevision'/);
  assert.match(center, /role="status"/); // the arrival toast is announced to screen readers

  const hook = source('src/hooks/useContributionUpdates.ts');
  assert.match(hook, /setInterval/);
  assert.match(hook, /visibilitychange/);

  assert.match(source('src/components/layout/TopNavbar.tsx'), /<ContributionNotifications \{\.\.\.notifications\} \/>/);
  for (const dict of [id, en]) {
    assert.match(dict.notifications.approved, /\{place\}/);
    assert.match(dict.notifications.rejected, /\{place\}/);
  }
});

test('no translation with {placeholders} is called without arguments (the "{count}" bug)', () => {
  const placeholders = new Map<string, Set<string>>();
  const collect = (obj: object, prefix: string) => {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'string') {
        for (const match of value.matchAll(/[{](\w+)[}]/g)) {
          placeholders.set(path, (placeholders.get(path) ?? new Set()).add(match[1]));
        }
      } else if (value && typeof value === 'object') {
        collect(value, path);
      }
    }
  };
  collect(id, '');
  collect(en, '');

  const files = execSync('git ls-files --cached --others --exclude-standard src', { encoding: 'utf8' })
    .split('\n')
    .filter((file) => /[.]tsx?$/.test(file) && !file.includes('/locales/'));
  const offenders: string[] = [];
  for (const file of files) {
    const text = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    // t('key') with nothing after the key: the placeholders would render literally.
    for (const match of text.matchAll(/[^A-Za-z0-9_.]t[(]\s*['"`]([\w.]+)['"`]\s*[)]/g)) {
      if (placeholders.has(match[1])) {
        const line = text.slice(0, match.index).split('\n').length;
        offenders.push(`${file}:${line} t('${match[1]}') needs {${[...placeholders.get(match[1])!].join(', ')}}`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});
