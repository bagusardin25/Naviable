import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isValidCoordinate,
  buildGoogleMapsRouteUrl,
  buildGoogleMapsPlaceUrl,
} from '../src/lib/externalMaps';

test('isValidCoordinate accurately validates geographic ranges', () => {
  assert.equal(isValidCoordinate(-7.2575, 112.7521), true);
  assert.equal(isValidCoordinate(0, 0), true);
  assert.equal(isValidCoordinate(90, 180), true);
  assert.equal(isValidCoordinate(-90, -180), true);

  // Out of bounds
  assert.equal(isValidCoordinate(91, 100), false);
  assert.equal(isValidCoordinate(-90.1, 100), false);
  assert.equal(isValidCoordinate(0, 180.1), false);
  assert.equal(isValidCoordinate(0, -180.1), false);

  // Non-finite or missing
  assert.equal(isValidCoordinate(NaN, 100), false);
  assert.equal(isValidCoordinate(10, Infinity), false);
  assert.equal(isValidCoordinate(null, 100), false);
  assert.equal(isValidCoordinate(undefined, 100), false);
});

test('buildGoogleMapsRouteUrl generates valid direction URL with default walking mode', () => {
  const origin = { lat: -7.2575, lng: 112.7521, name: 'Siola' };
  const destination = { lat: -7.2600, lng: 112.7550, name: 'Alun-alun' };

  const url = buildGoogleMapsRouteUrl({ origin, destination });
  assert.ok(url);
  const parsed = new URL(url);

  assert.equal(parsed.origin, 'https://www.google.com');
  assert.equal(parsed.pathname, '/maps/dir/');
  assert.equal(parsed.searchParams.get('api'), '1');
  assert.equal(parsed.searchParams.get('origin'), '-7.2575,112.7521');
  assert.equal(parsed.searchParams.get('destination'), '-7.26,112.755');
  assert.equal(parsed.searchParams.get('travelmode'), 'walking');
  assert.equal(parsed.searchParams.get('waypoints'), null);
});

test('buildGoogleMapsRouteUrl supports transit travel mode and waypoints', () => {
  const origin = { lat: -7.2575, lng: 112.7521 };
  const destination = { lat: -7.2600, lng: 112.7550 };
  const waypoints = [
    { lat: -7.2580, lng: 112.7530 },
    { lat: -7.2590, lng: 112.7540 },
  ];

  const url = buildGoogleMapsRouteUrl({
    origin,
    destination,
    waypoints,
    travelMode: 'transit',
  });
  assert.ok(url);
  const parsed = new URL(url);

  assert.equal(parsed.searchParams.get('travelmode'), 'transit');
  assert.equal(parsed.searchParams.get('waypoints'), '-7.258,112.753|-7.259,112.754');
});

test('buildGoogleMapsRouteUrl filters out invalid waypoints safely', () => {
  const origin = { lat: -7.2575, lng: 112.7521 };
  const destination = { lat: -7.2600, lng: 112.7550 };
  const waypoints = [
    { lat: null, lng: null },
    { lat: -7.2580, lng: 112.7530 },
    { lat: 999, lng: 112.7540 },
  ];

  const url = buildGoogleMapsRouteUrl({ origin, destination, waypoints });
  assert.ok(url);
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('waypoints'), '-7.258,112.753');
});

test('buildGoogleMapsRouteUrl returns null if origin or destination coordinates are invalid', () => {
  const valid = { lat: -7.2575, lng: 112.7521 };
  const invalid = { lat: null, lng: null };

  assert.equal(buildGoogleMapsRouteUrl({ origin: invalid, destination: valid }), null);
  assert.equal(buildGoogleMapsRouteUrl({ origin: valid, destination: invalid }), null);
});

test('buildGoogleMapsPlaceUrl creates direct navigation to destination', () => {
  const destination = { lat: -7.2600, lng: 112.7550, name: 'Alun-alun' };

  const url = buildGoogleMapsPlaceUrl({ destination });
  assert.ok(url);
  const parsed = new URL(url);

  assert.equal(parsed.searchParams.get('api'), '1');
  assert.equal(parsed.searchParams.get('destination'), '-7.26,112.755');
  assert.equal(parsed.searchParams.get('travelmode'), 'walking');
  assert.equal(parsed.searchParams.get('origin'), null);
});

test('buildGoogleMapsPlaceUrl returns null if destination has invalid coordinates', () => {
  assert.equal(buildGoogleMapsPlaceUrl({ destination: { lat: null, lng: null } }), null);
  assert.equal(buildGoogleMapsPlaceUrl({ destination: { lat: 100, lng: 200 } }), null);
});
