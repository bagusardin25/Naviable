import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { NextRequest } from 'next/server';
import { formatOsmAddress } from '../src/lib/osmAddress';
import { GET as reverseGeocodeRoute } from '../src/app/api/reverse-geocode/route';

function source(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

test('formatOsmAddress builds a street address from a Nominatim reverse result', () => {
  assert.equal(
    formatOsmAddress({ road: 'Jalan Tunjungan', house_number: '1', suburb: 'Genteng', city_district: 'Genteng', city: 'Surabaya' }),
    'Jalan Tunjungan No. 1, Genteng, Surabaya'
  );
  assert.equal(
    formatOsmAddress({ road: 'Jalan Mergoyoso', suburb: 'Kedungdoro', city_district: 'Tegalsari', city: 'Surabaya' }),
    'Jalan Mergoyoso, Kedungdoro, Tegalsari, Surabaya'
  );
});

test('formatOsmAddress uses town/county for points just outside Surabaya instead of assuming Surabaya', () => {
  assert.equal(formatOsmAddress({ road: 'Jalan Raya Waru', town: 'Sidoarjo' }), 'Jalan Raya Waru, Sidoarjo');
  assert.equal(formatOsmAddress({ road: 'Jalan Raya Gresik', county: 'Gresik' }), 'Jalan Raya Gresik, Gresik');
});

test('reverse-geocode route rejects missing or out-of-range coordinates before calling any provider', async () => {
  for (const query of ['', 'lat=-7.26', 'lng=112.7', 'lat=abc&lng=112.7', 'lat=91&lng=112.7', 'lat=-7.26&lng=181', 'lat=&lng=112.7']) {
    const res = await reverseGeocodeRoute(new NextRequest(`http://localhost/api/reverse-geocode?${query}`));
    assert.equal(res.status, 400, `expected 400 for "${query}"`);
  }
});

test('Tambah Lokasi starts with "Pilih Lokasi" and keeps coordinates read-only', () => {
  const form = source('src/components/reports/ReportForm.tsx');
  const addBranch = form.slice(form.indexOf('{adding ? <>'));

  // The picker is the first thing in the add-place form.
  assert.ok(addBranch.indexOf('<LocationPicker') < addBranch.indexOf('id="new-place-name"'));
  // Latitude/longitude can only change through the picker, never by typing.
  assert.match(form, /id="new-place-lat"[^>]*readOnly/);
  assert.match(form, /id="new-place-lng"[^>]*readOnly/);
  assert.equal(/setLocation\(\{ \.\.\.location, lat: e\.target/.test(form), false);
  // The address is looked up from the chosen point.
  assert.match(form, /reverseGeocode\(point\.lat, point\.lng/);
  // Submission waits for a chosen point instead of a manual "coordinates confirmed" tick.
  assert.equal(form.includes('coordConfirmedCheck'), false);
  assert.match(form, /adding \? !pointSelected : !placeId/);
});

test('"Gunakan Lokasi Saya" falls back to picking on the map when location is denied or unavailable', () => {
  const picker = source('src/components/reports/LocationPicker.tsx');
  assert.match(picker, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(picker, /error\.code === error\.PERMISSION_DENIED \? 'denied' : 'unavailable'/);
  // Both the error path and the unsupported path open the map for a manual pick.
  const errorBranch = picker.slice(picker.indexOf('(error) =>'), picker.indexOf('enableHighAccuracy'));
  assert.match(errorBranch, /setMapOpen\(true\)/);
  assert.match(picker, /setGeo\(\{ kind: 'unsupported' \}\);\s*setMapOpen\(true\)/);
});

test('the report form renders client-only so its localStorage draft cannot cause a hydration mismatch', () => {
  const app = source('src/components/explore/ExploreApp.tsx');
  assert.match(app, /dynamic\(\(\) => import\('@\/components\/reports\/ReportForm'\)[\s\S]*?ssr: false/);
  assert.equal(/import \{ ReportForm \} from/.test(app), false);
});

test('mobile bottom navigation shows a label for "Jelajahi" like the other tabs', () => {
  const sidebar = source('src/components/layout/AppSidebar.tsx');
  const exploreButton = sidebar.slice(sidebar.indexOf('id="nav-map"'), sidebar.indexOf('id="nav-report"'));
  assert.match(exploreButton, /className="nav-label-mobile">\{t\('nav\.explore'\)\}/);
});

test('Informasi Aksesibilitas separates Kelengkapan Data from the Sorotan Akses / Wilayah Surabaya grid', () => {
  const css = source('src/app/globals.css');
  assert.match(css, /\.dashboard-page > \.dashboard-grid \{[^}]*margin-top: var\(--dashboard-section-gap\)/);
  assert.match(css, /\.dashboard-page > \.dashboard-grid \{[^}]*gap: var\(--dashboard-section-gap\)/);
  assert.match(css, /\.dashboard-page > \.metric-grid \{[^}]*margin: 0 0 var\(--dashboard-section-gap\)/);
});
