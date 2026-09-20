import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateDistanceMeters,
  normalizePlaceName,
  findMatchingLocalPlace,
} from '../src/lib/externalGeocoding';
import type { Place } from '../src/types';

test('calculateDistanceMeters calculates accurate surface distance in meters', () => {
  // Identical point should be 0m
  assert.equal(calculateDistanceMeters(-7.2575, 112.7521, -7.2575, 112.7521), 0);

  // Small displacement (~111m per 0.001 degree lat)
  const dist = calculateDistanceMeters(-7.2570, 112.7521, -7.2580, 112.7521);
  assert.ok(dist >= 105 && dist <= 120, `Expected ~111m, got ${dist}`);

  // Invalid coordinates return Infinity
  assert.equal(calculateDistanceMeters(NaN, 112, -7, 112), Infinity);
  assert.equal(calculateDistanceMeters(-7, 112, -7, Infinity), Infinity);
});

test('normalizePlaceName cleans common titles and punctuation for fuzzy matching', () => {
  assert.equal(normalizePlaceName('Universitas Telkom Surabaya'), 'telkomsurabaya');
  assert.equal(normalizePlaceName('RSUD Dr. Soetomo'), 'drsoetomo');
  assert.equal(normalizePlaceName('Jl. Tunjungan Plaza'), 'tunjunganplaza');
});

test('findMatchingLocalPlace detects close duplicates by distance (<50m)', () => {
  const mockPlaces: Place[] = [
    {
      id: 'balai-pemuda',
      name: 'Balai Pemuda Surabaya',
      category: 'Fasilitas Publik',
      address: 'Jl. Gubernur Suryo No. 15',
      lat: -7.26284,
      lng: 112.74852,
      district: 'Genteng',
      rating: 4.5,
      reviewCount: 10,
      reportCount: 5,
      audited: true,
      chainSummary: 'Akses memadai',
      elements: [],
      photos: 0,
      x: 50,
      y: 50,
    } as unknown as Place,
  ];

  // Point very close to Balai Pemuda (20m away)
  const closePoi = {
    lat: -7.26290,
    lng: 112.74855,
    name: 'Balai Budaya',
  };

  const match = findMatchingLocalPlace(closePoi, mockPlaces);
  assert.ok(match, 'Expected close point to match existing place');
  assert.equal(match?.id, 'balai-pemuda');

  // Point far away (e.g. Telkom University Surabaya in Ketintang ~6km away)
  const farPoi = {
    lat: -7.31105,
    lng: 112.72885,
    name: 'Telkom University Surabaya',
  };

  const noMatch = findMatchingLocalPlace(farPoi, mockPlaces);
  assert.equal(noMatch, undefined, 'Expected far point to not match');
});

test('findMatchingLocalPlace detects duplicate by name when nearby (<400m)', () => {
  const mockPlaces: Place[] = [
    {
      id: 'taman-bungkul',
      name: 'Taman Bungkul',
      category: 'Taman',
      address: 'Jl. Raya Darmo',
      lat: -7.2913,
      lng: 112.7398,
      district: 'Wonokromo',
      rating: 4.8,
      reviewCount: 30,
      reportCount: 12,
      audited: true,
      chainSummary: 'Akses memadai',
      elements: [],
      photos: 0,
      x: 50,
      y: 50,
    } as unknown as Place,
  ];

  // OSM node with slightly different coordinates (150m away) but same name
  const osmPlace = {
    lat: -7.2922,
    lng: 112.7402,
    name: 'Taman Bungkul Surabaya',
  };

  const match = findMatchingLocalPlace(osmPlace, mockPlaces);
  assert.ok(match);
  assert.equal(match?.id, 'taman-bungkul');
});
