import type { AccessibilityStatus, Place, PhotoIntegrityResult } from '@/types';
import { CHAIN_ELEMENT_MAP } from '@/types';
import { adaptSeedRecords, loadSeedPlaces } from './places/seedAdapter';
import { supabaseBrowser } from './supabase';

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
export type ApiPlace = {
  id: string; name: string; category: string; lat: number | null; lng: number | null;
  address: string | null; kecamatan: string | null; kelurahan: string | null;
  preSurvey: Record<string, unknown>; sources: { name?: string; url?: string; license?: string; retrieved_at?: string }[];
  evidenceLevel: string; verifiedByTeam: boolean; needsGeocoding: boolean;
  elements: Record<string, { status: AccessibilityStatus; lockedBy: 'kontributor'; photoUrl?: string | null; note?: string | null }>;
  score: number | null; summary: string; overall: AccessibilityStatus; coverage: { known: number; total: number };
  updatedAt: string | null; photoCount: number; reportCount: number; bottlenecks?: string[];
};
export type ApiAnalysis = {
  drafts: { element: string; status: AccessibilityStatus; confidence: string; reason: string }[];
  needsMorePhotos: string[];
  visualIntegrity: { outcome: 'no_obvious_signs' | 'suspicious' | 'inconclusive'; confidence: 'tinggi' | 'sedang' | 'rendah'; reasons: string[] };
  provider: 'google' | 'openai' | 'openrouter';
  attemptedProviders: Array<'google' | 'openai' | 'openrouter'>;
  photoIntegrity?: PhotoIntegrityResult;
  disclaimer: string; fallback?: 'manual_checklist'; error?: string;
};
export type { PhotoIntegrityResult } from '@/types';
export type ApiReport = { id: string; placeId: string; reporterName: string; createdAt: string; photoUrl: string; elements: { element: string; status: AccessibilityStatus; note?: string }[]; photoIntegrity?: PhotoIntegrityResult };
export type ReviewStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'NEEDS_REVISION' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';
// A contributor's own report, including the review outcome shown back to them in their profile.
export type ContributionReport = ApiReport & {
  reviewStatus?: ReviewStatus;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  reviewChecklist?: Record<string, boolean> | null;
};

// WORKAROUND: Construct absolute media URL dynamically using backend API_URL
// so Next.js Image component works across both local dev (http://127.0.0.1:4000)
// and production deployments without hardcoded hostnames.
export const mediaUrl = (path: string) => new URL(path, API_URL).toString();

// WHY: Transform raw backend ApiPlace into UI Place model.
// When contributor evidence exists, it overrides baseline pre-survey claims for that element,
// while untouched elements retain their baseline pre-survey state.
// WARNING: A citizen report must NEVER automatically flip verifiedByTeam to true.
export function toUiPlace(p: ApiPlace): Place {
  const base = adaptSeedRecords([{ id: p.id, name: p.name, category: p.category, address: p.address,
    lat: p.lat, lng: p.lng, needs_geocoding: p.needsGeocoding, verified_by_team: p.verifiedByTeam,
    pre_survey: p.preSurvey, sources: p.sources, evidence_level: p.evidenceLevel }])[0];
  return { ...base, district: p.kecamatan ?? 'Belum diketahui', overall: p.overall,
    chainSummary: p.summary, photos: p.photoCount, reportCount: p.reportCount, score: p.score, coverage: p.coverage,
    updated: p.updatedAt ? new Date(p.updatedAt).toLocaleString('id-ID') : 'Belum ada laporan lapangan',
    updatedAt: p.updatedAt,
    bottlenecks: p.bottlenecks ?? [],
    elements: base.elements.map(el => {
      const evidence = p.elements[CHAIN_ELEMENT_MAP[el.code].codeName];
      return evidence ? { ...el, ...evidence, note: evidence.note ?? '', photoUrl: evidence.photoUrl ? mediaUrl(evidence.photoUrl) : null, isPreSurveyEvidence: false } : el;
    }),
  };
}
async function headers() {
  const result: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const { data } = await supabaseBrowser().auth.getSession();
    if (data.session) result.Authorization = `Bearer ${data.session.access_token}`;
  }
  if (!result.Authorization) throw new Error('Masuk terlebih dahulu untuk berkontribusi.');
  return result;
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { cache: 'no-store', signal: AbortSignal.timeout(35_000), ...init });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `Permintaan gagal (${res.status})`);
  return body as T;
}
export async function fetchPlaces(profile?: string): Promise<Place[]> {
  try {
    const result: Place[] = [];
    for (let offset = 0; ; offset += 100) {
      const query = new URLSearchParams({ limit: '100', offset: String(offset) });
      if (profile) query.set('profile', profile);
      const page = await request<{ places: ApiPlace[]; total: number }>(`/api/places?${query}`);
      result.push(...page.places.map(toUiPlace));
      if (result.length >= page.total || page.places.length === 0) return result;
    }
  } catch (error) {
    console.warn('Backend API belum terhubung, menggunakan data lokal pratinjau:', error);
    return loadSeedPlaces();
  }
}
export async function fetchPlace(id: string, profile?: string) {
  try {
    const data = await request<{ place: ApiPlace; reports: ApiReport[] }>(`/api/places/${encodeURIComponent(id)}${profile ? `?profile=${profile}` : ''}`);
    return { place: toUiPlace(data.place), reports: data.reports };
  } catch {
    const seed = loadSeedPlaces();
    const found = seed.find(p => String(p.id) === String(id)) ?? seed[0];
    return { place: found, reports: [] };
  }
}
/**
 * Correction trail for one place, newest first. Every report is kept, including the ones
 * a later correction superseded, so the drawer can show who changed which element and when.
 */
export async function fetchPlaceReports(id: string, limit = 20) {
  try {
    return await request<{ reports: ApiReport[]; total: number; limit: number; offset: number }>(
      `/api/places/${encodeURIComponent(id)}/reports?limit=${limit}`
    );
  } catch {
    return { reports: [], total: 0, limit, offset: 0 };
  }
}
export async function analyzePhoto(image: string, mimeType: string): Promise<ApiAnalysis> {
  return request('/api/analyze', { method: 'POST', headers: await headers(), body: JSON.stringify({ image, mimeType }) });
}
export type ReportPayload = {
  placeId: string; reporterName: string; image: string; mimeType: string; humanConfirmed: true;
  elements: { element: string; status: AccessibilityStatus; note?: string }[];
};
export async function submitReport(payload: ReportPayload, requestKey: string) {
  const result = await request<{ reportId: string; place: ApiPlace }>('/api/reports', { method: 'POST', headers: { ...await headers(), 'Idempotency-Key': requestKey }, body: JSON.stringify(payload) });
  return { ...result, place: toUiPlace(result.place) };
}
export type NewLocation = { name: string; category: string; address: string; lat: number; lng: number };
export async function submitNewPlace(payload: Omit<ReportPayload, 'placeId'> & { location: NewLocation }, requestKey: string) {
  const result = await request<{ place: ApiPlace }>('/api/places', { method: 'POST', headers: { ...await headers(), 'Idempotency-Key': requestKey }, body: JSON.stringify(payload) });
  return { place: toUiPlace(result.place) };
}
export type ApiReview = { id: string; placeId: string; reviewerName: string; experience: string; createdAt: string };
export function fetchReviews(placeId: string, offset = 0) {
  return request<{ reviews: ApiReview[]; total: number }>(`/api/places/${encodeURIComponent(placeId)}/reviews?limit=20&offset=${offset}`);
}
export async function submitReview(payload: { placeId: string; reviewerName: string; experience: string }, requestKey: string) {
  return request<{ review: ApiReview }>('/api/reviews', { method: 'POST', headers: { ...await headers(), 'Idempotency-Key': requestKey }, body: JSON.stringify(payload) });
}
export async function fetchHealth() {
  try {
    return await request<{ storage: 'local' | 'supabase'; authRequired: boolean; aiConfigured: boolean; aiProviders: string[]; photoIntegrityConfigured: boolean }>('/api/health');
  } catch {
    return { storage: 'local' as const, authRequired: false, aiConfigured: false, aiProviders: [], photoIntegrityConfigured: false };
  }
}
export async function fetchContributions() {
  return request<{ mode: string; total: number; reports: ContributionReport[] }>('/api/me', { headers: await headers() });
}

export function exportEvidenceCsvUrl(filters?: {
  profile?: string;
  element?: string;
  status?: string;
  kecamatan?: string;
  category?: string;
  search?: string;
}) {
  const query = new URLSearchParams();
  if (filters?.profile && filters.profile !== 'all') query.set('profile', filters.profile);
  if (filters?.element && filters.element !== 'all') query.set('element', filters.element);
  if (filters?.status && filters.status !== 'all') query.set('status', filters.status);
  if (filters?.kecamatan && filters.kecamatan !== 'all') query.set('kecamatan', filters.kecamatan);
  if (filters?.category && filters.category !== 'all') query.set('category', filters.category);
  if (filters?.search && filters.search.trim()) query.set('search', filters.search.trim());
  const queryString = query.toString();
  return `${API_URL}/api/evidence.csv${queryString ? `?${queryString}` : ''}`;
}

// Reviewer calls use an HttpOnly Supabase session through the same-origin server proxy.
import type { ReviewerAuditItem, ReviewerStats, ReviewDecision } from '@/types';

async function reviewerRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/reviewer/${path}`, { cache: 'no-store', signal: AbortSignal.timeout(35_000), ...init });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `Permintaan reviewer gagal (${res.status})`);
  return body as T;
}
const reviewerPhoto = (r: ReviewerAuditItem): ReviewerAuditItem => ({
  ...r, photoUrl: r.photoUrl ? (r.photoUrl.startsWith('http') ? r.photoUrl : mediaUrl(r.photoUrl)) : '',
});
export function fetchReviewerStats() {
  return reviewerRequest<ReviewerStats>('stats');
}
export async function fetchReviewerReports(options: { status?: string; search?: string; limit?: number; offset?: number } = {}) {
  const query = new URLSearchParams();
  if (options.status && options.status !== 'all') query.set('status', options.status);
  if (options.search?.trim()) query.set('search', options.search.trim());
  if (options.limit) query.set('limit', String(options.limit));
  if (options.offset) query.set('offset', String(options.offset));
  const res = await reviewerRequest<{ reports: ReviewerAuditItem[]; total: number }>(`reports?${query}`);
  return { reports: res.reports.map(reviewerPhoto), total: res.total };
}
export async function fetchReviewerReport(id: string): Promise<{ report: ReviewerAuditItem; place: Place | null }> {
  const res = await reviewerRequest<{ report: ReviewerAuditItem; place: ApiPlace | null }>(`reports/${encodeURIComponent(id)}`);
  return { report: reviewerPhoto(res.report), place: res.place ? toUiPlace(res.place) : null };
}
export function submitReportReview(id: string, payload: { decision: ReviewDecision; reviewer: string; note: string; checklist?: Record<string, boolean>; elements?: { element: string; status: AccessibilityStatus; note?: string }[] }) {
  return reviewerRequest<{ ok: boolean; report: ReviewerAuditItem }>(`reports/${encodeURIComponent(id)}/review`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
}
export async function fetchReviewerHistory(options: { limit?: number; offset?: number } = {}) {
  const query = new URLSearchParams();
  if (options.limit) query.set('limit', String(options.limit));
  if (options.offset) query.set('offset', String(options.offset));
  const res = await reviewerRequest<{ history: ReviewerAuditItem[]; total: number }>(`history?${query}`);
  return { history: res.history.map(reviewerPhoto), total: res.total };
}
