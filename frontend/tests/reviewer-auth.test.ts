import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { bearerToken, verifySessionToken, isReviewerUser } from '../src/lib/auth/session';

test('reviewer session accepts only a single bearer token', () => {
  assert.equal(bearerToken('Bearer signed-token'), 'signed-token');
  assert.equal(bearerToken('bearer signed-token'), 'signed-token');
  assert.equal(bearerToken('Basic signed-token'), null);
  assert.equal(bearerToken('Bearer one two'), null);
  assert.equal(bearerToken(null), null);
});

test('reviewer privileges require server-managed metadata, never user-controlled claims', () => {
  assert.equal(isReviewerUser({ app_metadata: { role: 'REVIEWER' } }), true);
  assert.equal(isReviewerUser({ app_metadata: { role: 'reviewer' } }), true);
  assert.equal(isReviewerUser({ app_metadata: {} }), false);
  assert.equal(isReviewerUser(null), false);
  const forged = { app_metadata: {}, user_metadata: { role: 'REVIEWER' } };
  assert.equal(isReviewerUser(forged), false);
});

test('reviewer cookies require a live Supabase-validated token and approved role', async () => {
  const auth = { getUser: async (token: string) => ({
    data: { user: token === 'expired' ? null : { id: 'actor', email: 'reviewer@example.com', app_metadata: { role: token === 'reviewer' ? 'REVIEWER' : 'USER' } } as unknown as User },
    error: token === 'expired' ? new Error('expired') : null,
  }) } as unknown as Pick<SupabaseClient['auth'], 'getUser'>;
  assert.deepEqual(await verifySessionToken('reviewer', auth), { username: 'reviewer@example.com', role: 'REVIEWER' });
  assert.equal(await verifySessionToken('contributor', auth), null);
  assert.equal(await verifySessionToken('expired', auth), null);
  assert.equal(await verifySessionToken('', auth), null);
  assert.equal(await verifySessionToken('old-locally-signed-cookie', auth), null);
});
