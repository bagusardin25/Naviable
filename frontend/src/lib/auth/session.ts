import type { UserRole } from '@/types';

export type ReviewerSessionPayload = {
  username: string;
  role: UserRole;
  exp: number; // Unix timestamp in seconds
};

export const SESSION_COOKIE_NAME = 'naviable_reviewer_session';
const DEFAULT_EXPIRATION_SECONDS = 24 * 60 * 60; // 24 hours

// Use server environment secret or fallback to internal deterministic secret for evaluation
function getSecret(): string {
  return process.env.REVIEWER_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'naviable-secure-reviewer-auth-secret-key-2026';
}

function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getHmacKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Creates a cryptographically signed session token (compact HMAC-SHA256).
 */
export async function createSessionToken(
  payload: Omit<ReviewerSessionPayload, 'exp'>,
  maxAgeSeconds = DEFAULT_EXPIRATION_SECONDS
): Promise<string> {
  const enc = new TextEncoder();
  const fullPayload: ReviewerSessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  };

  const payloadJson = JSON.stringify(fullPayload);
  const encodedPayload = base64UrlEncode(enc.encode(payloadJson));

  const key = await getHmacKey();
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(encodedPayload));
  const encodedSignature = base64UrlEncode(signature);

  return `${encodedPayload}.${encodedSignature}`;
}

/**
 * Verifies and decodes a signed session token. Returns null if expired or signature invalid.
 */
export async function verifySessionToken(token: string | undefined | null): Promise<ReviewerSessionPayload | null> {
  if (!token || !token.includes('.')) return null;

  try {
    const [encodedPayload, encodedSignature] = token.split('.');
    if (!encodedPayload || !encodedSignature) return null;

    const enc = new TextEncoder();
    const key = await getHmacKey();
    const signatureBytes = base64UrlDecode(encodedSignature);

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes as unknown as BufferSource,
      enc.encode(encodedPayload)
    );

    if (!isValid) return null;

    const payloadBytes = base64UrlDecode(encodedPayload);
    const decoded = new TextDecoder().decode(payloadBytes);
    const payload = JSON.parse(decoded) as ReviewerSessionPayload;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

export function isReviewerUser(payload: { role?: string; username?: string } | null | undefined): boolean {
  return payload?.role === 'REVIEWER';
}

export async function createReviewerToken(username = 'reviewer.naviable', maxAgeSeconds = DEFAULT_EXPIRATION_SECONDS): Promise<string> {
  return createSessionToken({ username, role: 'REVIEWER' }, maxAgeSeconds);
}

export async function verifyReviewerToken(token: string | undefined | null): Promise<ReviewerSessionPayload | null> {
  return verifySessionToken(token);
}

