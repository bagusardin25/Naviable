import type { User } from '@supabase/supabase-js';

export type AuthUserProfile = {
  displayName: string;
  shortName: string;
  email: string;
  initials: string;
  providerLabel: string;
};

type UserIdentitySource = Pick<User, 'email' | 'user_metadata' | 'app_metadata'>;

function text(value: unknown, maximum = 120): string {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}

function initialsFor(name: string, email: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  const selected = parts.length > 1 ? [parts[0], parts.at(-1)!] : parts;
  const initials = selected.map(part => Array.from(part)[0] ?? '').join('').toUpperCase();
  if (initials) return initials.slice(0, 2);
  return (Array.from(email)[0] ?? 'N').toUpperCase();
}

/**
 * Produces display-only identity data from the authenticated Supabase user.
 * user_metadata is intentionally never used for permissions or authorization.
 */
export function toAuthUserProfile(user: UserIdentitySource | null): AuthUserProfile | null {
  if (!user) return null;

  const email = text(user.email, 254);
  const displayName =
    text(user.user_metadata?.full_name) ||
    text(user.user_metadata?.name) ||
    text(user.user_metadata?.display_name) ||
    (email ? email.split('@')[0] : 'Kontributor Naviable');
  const shortName = displayName.split(/\s+/)[0] || displayName;
  const provider = text(user.app_metadata?.provider).toLowerCase();
  const googleLinked = provider === 'google' ||
    (Array.isArray(user.app_metadata?.providers) && user.app_metadata.providers.includes('google'));

  return {
    displayName,
    shortName,
    email: email || 'Email tidak tersedia',
    initials: initialsFor(displayName, email),
    providerLabel: googleLinked ? 'Akun Google terhubung' : 'Akun email terhubung',
  };
}
