import assert from 'node:assert/strict';
import test from 'node:test';
import { EXPLORE_PATH, parseScreen, screenHref, placeHref, safeReturnTo, loginHref } from '../src/lib/navigation';

test('untrusted screen values fall back to the map', () => {
  for (const value of [null, '', 'MAP', 'https://example.com', '__proto__']) assert.equal(parseScreen(value), 'map');
  for (const value of ['map', 'report', 'add', 'review', 'dashboard', 'profile']) assert.equal(parseScreen(value), value);
});

test('contribution login preserves the exact action and stable place ID, never an external URL', () => {
  for (const screen of ['report', 'review'] as const) {
    const target = placeHref('desk-mpp-siola', screen);
    assert.equal(safeReturnTo(target), target);
    assert.equal(new URL(loginHref(target), 'https://example.test').searchParams.get('next'), target);
  }
  assert.equal(safeReturnTo('/jelajah?screen=add'), '/jelajah?screen=add');
  assert.equal(
    safeReturnTo('/jelajah?screen=add&lat=-7.265321&lng=112.752214'),
    '/jelajah?lat=-7.265321&lng=112.752214&screen=add'
  );
  assert.equal(safeReturnTo('/jelajah?screen=add&lat=invalid&lng=999'), '/jelajah?screen=add');
  for (const unsafe of ['https://evil.test', '//evil.test', '/jelajah/../evil', '/jelajah\\evil', 'javascript:alert(1)']) assert.equal(safeReturnTo(unsafe), '/jelajah');
  assert.equal(safeReturnTo('/jelajah?screen=report&place=bad%2Fid&next=https://evil.test'), '/jelajah?screen=report');
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
