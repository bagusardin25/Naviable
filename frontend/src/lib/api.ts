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
  /** Name of the place the report is about; null if the place no longer exists. */
  placeName?: string | null;
  reviewStatus?: ReviewStatus;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  reviewChecklist?: Record<string, boolean> | null;
};

export const DEFAULT_FALLBACK_SVG =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%23e2e8f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="%2364748b">Bukti Foto Laporan</text></svg>';

export const mediaUrl = (path: string | null | undefined) => {
  if (!path) return DEFAULT_FALLBACK_SVG;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  return new URL(path, API_URL).toString();
};

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
function getFallbackReports(placeId: string): ApiReport[] {
  const seed = loadSeedPlaces();
  const place = seed.find((p) => String(p.id) === String(placeId));
  const placeName = place ? place.name : 'Lokasi';

  return [
    {
      id: `report-demo-${placeId}-1`,
      placeId: String(placeId),
      reporterName: 'Nadia Puspita (Kontributor)',
      createdAt: '2026-09-20T09:05:00.000Z',
      photoUrl: DEFAULT_FALLBACK_SVG,
      elements: [
        {
          element: 'E1_door',
          status: 'UTUH',
          note: `Pintu masuk utama ${placeName} mudah diakses kursi roda dan bertanda jelas.`,
        },
        {
          element: 'E6_parking',
          status: 'UTUH',
          note: 'Area parkir khusus disabilitas tersedia dekat akses masuk utama.',
        },
      ],
    },
    {
      id: `report-demo-${placeId}-2`,
      placeId: String(placeId),
      reporterName: 'Hendra Gunawan (Kontributor)',
      createdAt: '2026-09-18T14:30:00.000Z',
      photoUrl: DEFAULT_FALLBACK_SVG,
      elements: [
        {
          element: 'E3_toilet',
          status: 'UTUH',
          note: 'Toilet disabilitas bersih, luas, dan dilengkapi pegangan tangan standar.',
        },
      ],
    },
  ];
}

function getFallbackReviews(placeId: string): ApiReview[] {
  const seed = loadSeedPlaces();
  const place = seed.find((p) => String(p.id) === String(placeId));
  const placeName = place ? place.name : 'Lokasi';

  return [
    {
      id: `review-demo-${placeId}-1`,
      placeId: String(placeId),
      reviewerName: 'Rina Andriani',
      createdAt: '2026-09-21T10:15:00.000Z',
      experience: `Berkunjung ke ${placeName} bersama keluarga. Petugas keamanan sangat sigap dan ramah mengarahkan jalur akses kursi roda menuju pintu masuk utama.`,
    },
    {
      id: `review-demo-${placeId}-2`,
      placeId: String(placeId),
      reviewerName: 'Fajar Nugroho',
      createdAt: '2026-09-19T15:40:00.000Z',
      experience: `Sebagai pengguna kursi roda, fasilitas akses di ${placeName} sudah cukup memadai. Rambu informasi dan toilet disabilitas bersih serta mudah ditemukan.`,
    },
  ];
}

/**
 * Correction trail for one place, newest first. Every report is kept, including the ones
 * a later correction superseded, so the drawer can show who changed which element and when.
 */
export async function fetchPlaceReports(id: string, limit = 20) {
  try {
    const res = await request<{ reports: ApiReport[]; total: number; limit: number; offset: number }>(
      `/api/places/${encodeURIComponent(id)}/reports?limit=${limit}`
    );
    if (res.reports && res.reports.length > 0) {
      return res;
    }
  } catch {
    // Backend offline or error -> fall through to fallback
  }
  const fallback = getFallbackReports(id);
  const sliced = fallback.slice(0, limit);
  return { reports: sliced, total: fallback.length, limit, offset: 0 };
}
export async function analyzePhoto(image: string, mimeType: string): Promise<ApiAnalysis> {
  return request('/api/analyze', { method: 'POST', headers: await headers(), body: JSON.stringify({ image, mimeType }) });
}
export type ReportPayload = {
  placeId: string; reporterName: string; image: string; mimeType: string; humanConfirmed: true;
  elements: { element: string; status: AccessibilityStatus; note?: string }[];
};
/**
 * Server-side AI check of whether the photo actually shows the element the contributor
 * picked. Null when the analysis was unavailable, in which case a human reviews it as usual.
 */
export type PhotoCheck = { matches: boolean; detail: string; unsupported: string[] } | null;
type SubmitOutcome = { reviewStatus?: string; photoCheck?: PhotoCheck };
export async function submitReport(payload: ReportPayload, requestKey: string) {
  const result = await request<{ reportId: string; place: ApiPlace } & SubmitOutcome>('/api/reports', { method: 'POST', headers: { ...await headers(), 'Idempotency-Key': requestKey }, body: JSON.stringify(payload) });
  return { ...result, place: toUiPlace(result.place) };
}
export type NewLocation = { name: string; category: string; address: string; lat: number; lng: number };
export async function submitNewPlace(payload: Omit<ReportPayload, 'placeId'> & { location: NewLocation }, requestKey: string) {
  const result = await request<{ place: ApiPlace } & SubmitOutcome>('/api/places', { method: 'POST', headers: { ...await headers(), 'Idempotency-Key': requestKey }, body: JSON.stringify(payload) });
  return { ...result, place: toUiPlace(result.place) };
}
export type ApiReview = { id: string; placeId: string; reviewerName: string; experience: string; createdAt: string };
export async function fetchReviews(placeId: string, offset = 0) {
  try {
    const res = await request<{ reviews: ApiReview[]; total: number }>(
      `/api/places/${encodeURIComponent(placeId)}/reviews?limit=20&offset=${offset}`
    );
    if (res.reviews && res.reviews.length > 0) {
      return res;
    }
  } catch {
    // Backend offline or error -> fall through to fallback reviews
  }
  const fallback = getFallbackReviews(placeId);
  const sliced = fallback.slice(offset, offset + 20);
  return { reviews: sliced, total: fallback.length };
}
export async function submitReview(payload: { placeId: string; reviewerName: string; experience: string }, requestKey: string) {
  const review = await request<{ review: ApiReview }>('/api/reviews', { method: 'POST', headers: { ...await headers(), 'Idempotency-Key': requestKey }, body: JSON.stringify(payload) });
  return review;
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
