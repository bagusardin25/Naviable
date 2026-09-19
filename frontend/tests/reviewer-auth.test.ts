import assert from 'node:assert/strict';
import test from 'node:test';
import { createReviewerToken, verifyReviewerToken, isReviewerUser } from '../src/lib/auth/session';

test('reviewer session: token creation, verification, and role validation', async () => {
  const token = await createReviewerToken('reviewer.naviable', 3600);
  assert.ok(typeof token === 'string');
  assert.ok(token.includes('.'));

  const payload = await verifyReviewerToken(token);
  assert.ok(payload !== null);
  assert.equal(payload.username, 'reviewer.naviable');
  assert.equal(payload.role, 'REVIEWER');
  assert.ok(payload.exp > Math.floor(Date.now() / 1000));

  // Validates role check
  assert.equal(isReviewerUser(payload), true);
  assert.equal(isReviewerUser({ username: 'contributor', role: 'USER' }), false);
  assert.equal(isReviewerUser(null), false);
});

test('reviewer session: rejects tampered and invalid tokens', async () => {
  const token = await createReviewerToken('reviewer.naviable', 3600);
  const [data, sig] = token.split('.');

  // Tampered payload
  const tamperedData = Buffer.from(JSON.stringify({ username: 'hacker', role: 'REVIEWER', exp: Date.now() + 10000 })).toString('base64url');
  assert.equal(await verifyReviewerToken(`${tamperedData}.${sig}`), null);

  // Tampered signature
  assert.equal(await verifyReviewerToken(`${data}.badsignature`), null);

  // Empty / garbage
  assert.equal(await verifyReviewerToken(''), null);
  assert.equal(await verifyReviewerToken('random-garbage-string'), null);

  // Expired token
  const expiredToken = await createReviewerToken('reviewer.naviable', -10);
  assert.equal(await verifyReviewerToken(expiredToken), null);
});
