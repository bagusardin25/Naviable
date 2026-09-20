import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuthChangeEvent, Session, SupabaseClient, User, UserResponse } from '@supabase/supabase-js';
import { googleSignInOptions, reviewerGoogleSignInOptions, authCallbackError } from '../src/lib/auth/google';
import { observeUser } from '../src/lib/auth/observe-user';

test('Google always requests account selection and preserves only safe contribution destinations', () => {
  const result = googleSignInOptions('https://naviable.vercel.app', '/jelajah?screen=profile');
  assert.equal(result.options?.queryParams?.prompt, 'select_account');
  assert.equal(result.options?.redirectTo, 'https://naviable.vercel.app/jelajah?screen=profile');
  for (const unsafe of ['https://evil.example', '//evil.example', '/\\evil.example', '/jelajah?next=https://evil.example']) {
    assert.equal(googleSignInOptions('https://naviable.vercel.app', unsafe).options?.redirectTo, 'https://naviable.vercel.app/jelajah');
  }
});

test('reviewer Google login returns only to the reviewer session exchange page', () => {
  const result = reviewerGoogleSignInOptions('https://naviable.vercel.app/ignored');
  assert.equal(result.options?.queryParams?.prompt, 'select_account');
  assert.equal(result.options?.redirectTo, 'https://naviable.vercel.app/login?mode=reviewer');
});

test('cancelled OAuth and expired email links produce safe errors without reflecting provider text', () => {
  assert.match(authCallbackError('', '#error=access_denied'), /dibatalkan/);
  assert.match(authCallbackError('?error_code=otp_expired&error_description=private-text', ''), /kedaluwarsa/);
  assert.equal(authCallbackError('', '#access_token=test'), '');
});

function harness() {
  let notify!: (event: AuthChangeEvent, session: Session | null) => void;
  const pending: Array<(value: UserResponse) => void> = [];
  const states: Array<{ id: string | null; error: string }> = [];
  const tokens: Array<string | undefined> = [];
  const auth = {
    onAuthStateChange: (listener: typeof notify) => {
      notify = listener;
      return { data: { subscription: { unsubscribe() {} } } };
    },
    getUser: (token?: string) => {
      tokens.push(token);
      return new Promise<UserResponse>(resolve => pending.push(resolve));
    },
  } as unknown as Pick<SupabaseClient['auth'], 'onAuthStateChange' | 'getUser'>;
  const stop = observeUser(auth, (user, error) => states.push({ id: user?.id ?? null, error }));
  const event = (id: string | null) => notify(id ? 'SIGNED_IN' : 'SIGNED_OUT', id ? { access_token: `token-${id}`, user: { id } } as Session : null);
  const resolve = (index: number, id: string) => pending[index]({ data: { user: { id } as User }, error: null });
  return { states, tokens, event, resolve, stop };
}
const tick = () => new Promise(resolve => setTimeout(resolve, 5));

test('a late user lookup cannot restore the previous account after sign-out', async () => {
  const h = harness();
  h.event('A');
  assert.equal(h.tokens.length, 0, 'lookup must run outside the auth callback lock');
  await tick();
  h.event(null);
  h.resolve(0, 'A');
  await tick();
  assert.deepEqual(h.states, [{ id: null, error: '' }]);
  h.stop();
});

test('switching accounts ignores out-of-order identity responses', async () => {
  const h = harness();
  h.event('A');
  await tick();
  h.event('B');
  await tick();
  h.resolve(1, 'B');
  await tick();
  h.resolve(0, 'A');
  await tick();
  assert.deepEqual(h.tokens, ['token-A', 'token-B']);
  assert.deepEqual(h.states, [{ id: 'B', error: '' }]);
  h.stop();
});

test('unmounted auth observer ignores pending identity lookups', async () => {
  const h = harness();
  h.event('A');
  await tick();
  h.stop();
  h.resolve(0, 'A');
  await tick();
  assert.deepEqual(h.states, []);
});
