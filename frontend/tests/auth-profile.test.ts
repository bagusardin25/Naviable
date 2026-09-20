import assert from 'node:assert/strict';
import test from 'node:test';
import { toAuthUserProfile } from '../src/lib/auth/user-profile';

test('Google identity becomes a clear display profile after login', () => {
  const profile = toAuthUserProfile({
    email: 'bagus@example.com',
    user_metadata: { full_name: 'Bagus Ardin Prayoga' },
    app_metadata: { provider: 'google' },
  });

  assert.deepEqual(profile, {
    displayName: 'Bagus Ardin Prayoga',
    shortName: 'Bagus',
    email: 'bagus@example.com',
    initials: 'BP',
    providerLabel: 'Akun Google terhubung',
  });
});

test('email accounts receive a resilient display fallback without inventing identity', () => {
  assert.deepEqual(
    toAuthUserProfile({
      email: 'relawan.naviable@example.com',
      user_metadata: {},
      app_metadata: { provider: 'email' },
    }),
    {
      displayName: 'relawan.naviable',
      shortName: 'relawan.naviable',
      email: 'relawan.naviable@example.com',
      initials: 'R',
      providerLabel: 'Akun email terhubung',
    },
  );
});

test('signed-out state has no display profile', () => {
  assert.equal(toAuthUserProfile(null), null);
});
