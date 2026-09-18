import assert from 'node:assert/strict';
import test from 'node:test';
import { EXPLORE_PATH, parseScreen, screenHref } from '../src/lib/navigation';

test('untrusted screen values fall back to the map', () => {
  for (const value of [null, '', 'MAP', 'https://example.com', '__proto__']) assert.equal(parseScreen(value), 'map');
  for (const value of ['map', 'report', 'dashboard', 'profile']) assert.equal(parseScreen(value), value);
});

test('screen navigation preserves other query state and removes duplicate screen values', () => {
  assert.equal(screenHref('report'), '/jelajah?screen=report');
  assert.equal(screenHref('map', 'screen=report&q=halte'), '/jelajah?q=halte');
  assert.equal(screenHref('profile', 'screen=report&screen=dashboard'), '/jelajah?screen=profile');
  assert.equal(screenHref('map'), EXPLORE_PATH);
});

test('EXPLORE_PATH contract points to /jelajah for guest exploration and post-login destination', () => {
  assert.equal(EXPLORE_PATH, '/jelajah');
});
