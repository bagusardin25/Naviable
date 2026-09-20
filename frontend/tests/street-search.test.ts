import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeStreetText,
  extractStreetName,
  matchesPlaceQuery,
  getPopularStreetCorridors,
} from '../src/lib/streetSearch';
import type { Place } from '../src/types';

test('normalizeStreetText standardizes Indonesian road prefixes, abbreviations, and titles', () => {
  // Jalan abbreviations
  assert.equal(normalizeStreetText('Jalan Tunjungan'), 'jl tunjungan');
  assert.equal(normalizeStreetText('Jl. Tunjungan'), 'jl tunjungan');
  assert.equal(normalizeStreetText('Jln. Tunjungan'), 'jl tunjungan');
  assert.equal(normalizeStreetText('jl tunjungan'), 'jl tunjungan');

  // Gang & Raya
  assert.equal(normalizeStreetText('Gang Dolly No. 5'), 'gg dolly no 5');
  assert.equal(normalizeStreetText('Jl. Raya Darmo'), 'jl raya darmo');
  assert.equal(normalizeStreetText('Jalan Ry. Darmo'), 'jl raya darmo');

  // Titles (Mayjen, Dokter, etc.)
  assert.equal(normalizeStreetText('Jl. Mayjend. Jonosewojo No. 2'), 'jl mayjen jonosewojo no 2');
  assert.equal(normalizeStreetText('Jalan Mayor Jenderal Sungkono'), 'jl mayjen sungkono');
  assert.equal(normalizeStreetText('Jl. Dr. Soetomo No. 85'), 'jl dr soetomo no 85');
  assert.equal(normalizeStreetText('Jalan Dokter Soetomo'), 'jl dr soetomo');
});

test('extractStreetName correctly extracts street names from various address formats', () => {
  assert.equal(
    extractStreetName('Jl. Tunjungan No. 1-3, Surabaya'),
    'Jl. Tunjungan'
  );
  assert.equal(
    extractStreetName('Pakuwon Trade Centre, Jl. Mayjend. Jonosewojo No. 2, Surabaya'),
    'Jl. Mayjend. Jonosewojo'
  );
  assert.equal(
    extractStreetName('Jl. Pahlawan 112, Surabaya'),
    'Jl. Pahlawan'
  );
  assert.equal(
    extractStreetName('Jl. Karang Menjangan No. 20, Surabaya'),
    'Jl. Karang Menjangan'
  );
  assert.equal(
    extractStreetName('Jl. Genteng Kali No. 10, Surabaya'),
    'Jl. Genteng Kali'
  );
  assert.equal(extractStreetName(null), null);
  assert.equal(extractStreetName(''), null);
});

test('matchesPlaceQuery matches by street name despite abbreviation differences', () => {
  const dummyPlace = {
    id: 'test-1',
    name: 'Mal Pelayanan Publik Siola',
    category: 'Pelayanan Publik',
    district: 'Genteng',
    address: 'Jl. Tunjungan No. 1-3, Surabaya',
    elements: [],
  } as unknown as Place;

  // Search by exact full phrase "jalan tunjungan"
  const match1 = matchesPlaceQuery(dummyPlace, 'jalan tunjungan');
  assert.equal(match1.matched, true);
  assert.equal(match1.matchedOnStreet, true);

  // Search by "jl tunjungan" (without dot)
  const match2 = matchesPlaceQuery(dummyPlace, 'jl tunjungan');
  assert.equal(match2.matched, true);
  assert.equal(match2.matchedOnStreet, true);

  // Search by "tunjungan"
  const match3 = matchesPlaceQuery(dummyPlace, 'tunjungan');
  assert.equal(match3.matched, true);

  // Search by place name "siola"
  const match4 = matchesPlaceQuery(dummyPlace, 'siola');
  assert.equal(match4.matched, true);
  assert.equal(match4.matchedOnStreet, false);

  // Unrelated street
  const match5 = matchesPlaceQuery(dummyPlace, 'jalan basuki rahmat');
  assert.equal(match5.matched, false);
});

test('matchesPlaceQuery matches places with titles like Dr. or Mayjen', () => {
  const doctorPlace = {
    id: 'test-dr',
    name: 'Museum Kesehatan',
    category: 'Museum',
    district: 'Tegalsari',
    address: 'Jl. Dr. Soetomo No. 85, Surabaya',
    elements: [],
  } as unknown as Place;

  // User queries "dokter soetomo"
  const match1 = matchesPlaceQuery(doctorPlace, 'jalan dokter soetomo');
  assert.equal(match1.matched, true);
  assert.equal(match1.matchedOnStreet, true);

  // User queries "dr soetomo"
  const match2 = matchesPlaceQuery(doctorPlace, 'dr soetomo');
  assert.equal(match2.matched, true);
  assert.equal(match2.matchedOnStreet, true);
});

test('getPopularStreetCorridors groups corridors and sorts by frequency', () => {
  const dummyPlaces = [
    { id: '1', address: 'Jl. Tunjungan No. 1' },
    { id: '2', address: 'Jl. Tunjungan No. 50' },
    { id: '3', address: 'Jl. Raya Darmo No. 10' },
    { id: '4', address: 'Jl. Pahlawan 112' },
  ] as unknown as Place[];

  const corridors = getPopularStreetCorridors(dummyPlaces, 1);
  assert.ok(corridors.length >= 3);
  assert.equal(corridors[0].name, 'Jl. Tunjungan');
  assert.equal(corridors[0].count, 2);
});
