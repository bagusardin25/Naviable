import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanVoiceQuery, getVoiceErrorMessage } from '../src/lib/voice-search';

test('1. cleanVoiceQuery: removes trailing punctuation added by speech recognition', () => {
  assert.equal(cleanVoiceQuery('Taman Bungkul.'), 'Taman Bungkul');
  assert.equal(cleanVoiceQuery('Puskesmas Jagir...'), 'Puskesmas Jagir');
  assert.equal(cleanVoiceQuery('Halte Joyoboyo?'), 'Halte Joyoboyo');
  assert.equal(cleanVoiceQuery('Stasiun Gubeng!'), 'Stasiun Gubeng');
  assert.equal(cleanVoiceQuery('RSUD Dr Soetomo, '), 'RSUD Dr Soetomo');
  assert.equal(cleanVoiceQuery('Balai Pemuda;'), 'Balai Pemuda');
});

test('2. cleanVoiceQuery: strips Indonesian voice search command prefixes', () => {
  // "cari" prefix
  assert.equal(cleanVoiceQuery('Cari Puskesmas Jagir'), 'Puskesmas Jagir');
  assert.equal(cleanVoiceQuery('cari taman bungkul.'), 'taman bungkul');

  // "carikan" prefix
  assert.equal(cleanVoiceQuery('Carikan Halte Pemuda'), 'Halte Pemuda');
  assert.equal(cleanVoiceQuery('carikan toilet aksesibel.'), 'toilet aksesibel');

  // "pencarian" prefix
  assert.equal(cleanVoiceQuery('Pencarian Stasiun Gubeng'), 'Stasiun Gubeng');
  assert.equal(cleanVoiceQuery('pencarian jalur pemandu'), 'jalur pemandu');
});

test('3. cleanVoiceQuery: preserves natural place names and handles edge cases', () => {
  // Normal place name without prefix is unchanged
  assert.equal(cleanVoiceQuery('Alun-Alun Surabaya'), 'Alun-Alun Surabaya');
  assert.equal(cleanVoiceQuery('Grand City Mall'), 'Grand City Mall');

  // Empty or whitespace strings
  assert.equal(cleanVoiceQuery(''), '');
  assert.equal(cleanVoiceQuery('   '), '');

  // Word "Cari" alone without target
  assert.equal(cleanVoiceQuery('Cari'), 'Cari');
  assert.equal(cleanVoiceQuery('Cari.'), 'Cari');
});

test('4. getVoiceErrorMessage: returns clear, Indonesian accessibility messages for all Web Speech error codes', () => {
  // Permission denied / blocked
  const permissionMsg = getVoiceErrorMessage('not-allowed');
  assert.match(permissionMsg, /izin mikrofon/i);

  const permissionDeniedMsg = getVoiceErrorMessage('permission-denied');
  assert.match(permissionDeniedMsg, /izin mikrofon/i);

  // No speech detected
  const noSpeechMsg = getVoiceErrorMessage('no-speech');
  assert.match(noSpeechMsg, /tidak ada suara terdeteksi/i);

  // Network issue
  const networkMsg = getVoiceErrorMessage('network');
  assert.match(networkMsg, /koneksi internet/i);

  // Audio capture / hardware busy
  const captureMsg = getVoiceErrorMessage('audio-capture');
  assert.match(captureMsg, /mikrofon tidak ditemukan/i);

  // Unsupported browser
  const notSupportedMsg = getVoiceErrorMessage('not-supported');
  assert.match(notSupportedMsg, /belum mendukung/i);

  // User aborted
  const abortedMsg = getVoiceErrorMessage('aborted');
  assert.match(abortedMsg, /dibatalkan/i);

  // Fallback unknown
  const unknownMsg = getVoiceErrorMessage('some-rare-error');
  assert.match(unknownMsg, /terjadi kendala/i);
});

test('5. levenshteinDistance & stringSimilarity: correctly measures phonetic and spelling distance', async () => {
  const { levenshteinDistance, stringSimilarity } = await import('../src/lib/voice-search');
  assert.equal(levenshteinDistance('pakuwon', 'pakkuon'), 2);
  assert.equal(levenshteinDistance('mall', 'mall'), 0);
  assert.ok(stringSimilarity('pakkuon city mall', 'pakuwon city mall') > 0.85);
  assert.equal(stringSimilarity('sama', 'sama'), 1.0);
  assert.equal(stringSimilarity('', 'kata'), 0.0);
});

test('6. findBestMatchingPlace: auto-matches spoken queries including phonetic variations (e.g., Pakkuon City Mall)', async () => {
  const { findBestMatchingPlace } = await import('../src/lib/voice-search');
  const mockPlaces = [
    {
      id: 'osm-way-307282859',
      name: 'Pakuwon City Mall',
      category: 'mall',
      rawCategory: 'mall',
      district: 'Mulyorejo',
      address: 'Jl. Kejawan Putih Mutiara No. 17',
      distance: '3,2 km',
      lat: -7.2757,
      lng: 112.8050,
      x: 60,
      y: 40,
      overall: 'UTUH' as const,
      wheelchairStatus: 'yes' as const,
      verificationStatus: 'pre-survey' as const,
      features: ['wheelchair', 'toilet'],
      evidenceLevel: 'community_reported' as const,
      evidenceLevelLabel: 'Community reported',
      sourceName: 'OpenStreetMap',
      verifiedByTeam: false,
      needsGeocoding: false,
      chainSummary: 'Akses memadai',
      updated: '20 Sep 2026',
      updatedAt: null,
      photos: 0,
      elements: [],
    },
    {
      id: 'place-puskesmas-1',
      name: 'Puskesmas Jagir',
      category: 'puskesmas',
      rawCategory: 'clinic',
      district: 'Wonokromo',
      address: 'Jl. Jagir Wonokromo No. 356',
      distance: '1,5 km',
      lat: -7.3012,
      lng: 112.7381,
      x: 45,
      y: 55,
      overall: 'UTUH' as const,
      wheelchairStatus: 'yes' as const,
      verificationStatus: 'pre-survey' as const,
      features: ['wheelchair', 'ramp'],
      evidenceLevel: 'community_reported' as const,
      evidenceLevelLabel: 'Community reported',
      sourceName: 'OpenStreetMap',
      verifiedByTeam: false,
      needsGeocoding: false,
      chainSummary: 'Ramp tersedia',
      updated: '20 Sep 2026',
      updatedAt: null,
      photos: 0,
      elements: [],
    },
    {
      id: 'place-puskesmas-2',
      name: 'Puskesmas Genteng',
      category: 'puskesmas',
      rawCategory: 'clinic',
      district: 'Genteng',
      address: 'Jl. Kusuma Bangsa',
      distance: '0,8 km',
      lat: -7.2550,
      lng: 112.7500,
      x: 50,
      y: 48,
      overall: 'UTUH' as const,
      wheelchairStatus: 'yes' as const,
      verificationStatus: 'pre-survey' as const,
      features: ['wheelchair'],
      evidenceLevel: 'community_reported' as const,
      evidenceLevelLabel: 'Community reported',
      sourceName: 'OpenStreetMap',
      verifiedByTeam: false,
      needsGeocoding: false,
      chainSummary: 'Ramp tersedia',
      updated: '20 Sep 2026',
      updatedAt: null,
      photos: 0,
      elements: [],
    },
    {
      id: 'place-balai-pemuda',
      name: 'Balai Pemuda Surabaya',
      category: 'gedung',
      rawCategory: 'arts_centre',
      district: 'Genteng',
      address: 'Jl. Gubernur Suryo No. 15',
      distance: '1,2 km',
      lat: -7.2625,
      lng: 112.7485,
      x: 52,
      y: 48,
      overall: 'UTUH' as const,
      wheelchairStatus: 'yes' as const,
      verificationStatus: 'pre-survey' as const,
      features: ['wheelchair', 'lift'],
      evidenceLevel: 'community_reported' as const,
      evidenceLevelLabel: 'Community reported',
      sourceName: 'OpenStreetMap',
      verifiedByTeam: false,
      needsGeocoding: false,
      chainSummary: 'Akses ramah kursi roda',
      updated: '20 Sep 2026',
      updatedAt: null,
      photos: 0,
      elements: [],
    },
  ];

  // 1. Kasus nyata pengguna: "Pakkuon City Mall" (ejaan fonetik lisan)
  const pakuwonMatch = findBestMatchingPlace('Pakkuon City Mall', mockPlaces);
  assert.ok(pakuwonMatch !== null);
  assert.equal(pakuwonMatch?.place.id, 'osm-way-307282859');
  assert.equal(pakuwonMatch?.isSpecificMatch, true);
  assert.ok((pakuwonMatch?.score || 0) >= 0.85);

  // 2. Kasus "Puskesmas Jagir"
  const puskesmasMatch = findBestMatchingPlace('Puskesmas Jagir', mockPlaces);
  assert.ok(puskesmasMatch !== null);
  assert.equal(puskesmasMatch?.place.id, 'place-puskesmas-1');
  assert.equal(puskesmasMatch?.isSpecificMatch, true);

  // 3. Kasus dengan awalan lisan "Cari Balai Pemuda"
  const balaiMatch = findBestMatchingPlace('Cari Balai Pemuda', mockPlaces);
  assert.ok(balaiMatch !== null);
  assert.equal(balaiMatch?.place.id, 'place-balai-pemuda');
  assert.equal(balaiMatch?.isSpecificMatch, true);

  // 4. Kategori umum "puskesmas" (banyak hasil) -> isSpecificMatch harus false
  const categoryMatch = findBestMatchingPlace('puskesmas', mockPlaces);
  assert.ok(categoryMatch !== null);
  assert.equal(categoryMatch?.isSpecificMatch, false);

  // 5. Query tidak relevan sama sekali
  const noMatch = findBestMatchingPlace('Tempat Misterius Antah Berantah', mockPlaces);
  assert.equal(noMatch, null);
});

