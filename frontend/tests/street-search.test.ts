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

import { analyzeSearchQuery } from '../src/lib/searchNormalizer';

test('analyzeSearchQuery correctly handles conversational phrases and typos like coffe', () => {
  // Typo "coffe" -> normalized to "coffee" with cafe intent
  const coffeIntent = analyzeSearchQuery('coffe');
  assert.equal(coffeIntent.category, 'cafe');
  assert.equal(coffeIntent.clean, 'coffee');
  assert.ok(coffeIntent.expandedTerms.includes('cafe'));

  // Conversational prefix "tempat wisata" -> stripped to "wisata" with tourism intent
  const wisataIntent = analyzeSearchQuery('tempat wisata');
  assert.equal(wisataIntent.category, 'tourism');
  assert.equal(wisataIntent.clean, 'wisata');
  assert.ok(wisataIntent.expandedTerms.includes('museum'));
  assert.ok(wisataIntent.expandedTerms.includes('taman'));

  // "cari lokasi kafe nongkrong" -> "kafe nongkrong"
  const nongkrongIntent = analyzeSearchQuery('cari lokasi kafe nongkrong');
  assert.equal(nongkrongIntent.category, 'cafe');

  // "tempat ibadah masjid" -> worship
  const ibadahIntent = analyzeSearchQuery('tempat ibadah');
  assert.equal(ibadahIntent.category, 'worship');
});

test('matchesPlaceQuery matches typo coffe to local cafe places', () => {
  const cafePlace = {
    id: 'cafe-1',
    name: 'Calibre Coffee Roasters',
    category: 'Cafe',
    district: 'Genteng',
    address: 'Jl. Walikota Mustajab No. 67, Surabaya',
    elements: [],
  } as unknown as Place;

  // Typo search "coffe"
  const match = matchesPlaceQuery(cafePlace, 'coffe');
  assert.equal(match.matched, true);

  // Intent match for "tempat ngopi"
  const match2 = matchesPlaceQuery(cafePlace, 'tempat ngopi');
  assert.equal(match2.matched, true);
});

test('matchesPlaceQuery matches conversational tempat wisata to museum and park places', () => {
  const museumPlace = {
    id: 'museum-1',
    name: 'Museum Olahraga Surabaya',
    category: 'Museum',
    district: 'Wonokromo',
    address: 'Jl. Indragiri No. 6, Surabaya',
    elements: [],
  } as unknown as Place;

  const parkPlace = {
    id: 'park-1',
    name: 'Taman Bungkul',
    category: 'Taman Kota',
    district: 'Wonokromo',
    address: 'Jl. Raya Darmo, Surabaya',
    elements: [],
  } as unknown as Place;

  const matchMuseum = matchesPlaceQuery(museumPlace, 'tempat wisata');
  assert.equal(matchMuseum.matched, true);

  const matchPark = matchesPlaceQuery(parkPlace, 'tempat wisata');
  assert.equal(matchPark.matched, true);
});

test('matchesPlaceQuery correctly discriminates specific place names like Tunjungan and excludes unrelated places', () => {
  const tunjunganPlaza = {
    id: 'osm-relation-6664927',
    name: 'Tunjungan Plaza',
    category: 'Pusat Perbelanjaan',
    rawCategory: 'mall',
    district: 'Tegalsari',
    address: 'Jl. Jenderal Basuki Rachmat No. 8-12',
    elements: [],
  } as unknown as Place;

  const carrefour = {
    id: 'osm-node-659961942',
    name: 'Carrefour',
    category: 'Supermarket',
    rawCategory: 'supermarket',
    district: 'Bubutan',
    address: 'Jl. Bubutan',
    elements: [],
  } as unknown as Place;

  const pakuwonCityMall = {
    id: 'osm-way-307282859',
    name: 'Pakuwon City Mall',
    category: 'Pusat Perbelanjaan',
    rawCategory: 'mall',
    district: 'Mulyorejo',
    address: 'Jl. Kejawan Putih Tambak',
    elements: [],
  } as unknown as Place;

  const pasarWonokitri = {
    id: 'osm-way-451857622',
    name: 'Pasar Wonokitri',
    category: 'Pasar',
    rawCategory: 'marketplace',
    district: 'Sawahan',
    address: 'Jalan Brawijaya, Surabaya',
    elements: [],
  } as unknown as Place;

  for (const query of ['Tunjungan', 'tunjungan', 'Tunjungan Plaza']) {
    // Matching place must match
    assert.equal(matchesPlaceQuery(tunjunganPlaza, query).matched, true, `Tunjungan Plaza should match "${query}"`);

    // Non-matching places must NOT match
    assert.equal(matchesPlaceQuery(carrefour, query).matched, false, `Carrefour must NOT match "${query}"`);
    assert.equal(matchesPlaceQuery(pakuwonCityMall, query).matched, false, `Pakuwon City Mall must NOT match "${query}"`);
    assert.equal(matchesPlaceQuery(pasarWonokitri, query).matched, false, `Pasar Wonokitri must NOT match "${query}"`);
  }
});

