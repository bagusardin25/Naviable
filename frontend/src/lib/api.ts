import type { AccessibilityStatus, Place, JourneyResponse } from '@/types';
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
  needsMorePhotos: string[]; disclaimer: string; fallback?: 'manual_checklist'; error?: string;
};
export type ApiReport = { id: string; placeId: string; reporterName: string; createdAt: string; photoUrl: string; elements: { element: string; status: AccessibilityStatus; note?: string }[] };

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
  if (!result.Authorization && typeof window !== 'undefined') {
    const demoToken = localStorage.getItem('naviable_demo_token');
    if (demoToken) result.Authorization = `Bearer ${demoToken}`;
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
    return await request<{ storage: 'local' | 'supabase'; authRequired: boolean; aiConfigured: boolean }>('/api/health');
  } catch {
    return { storage: 'local' as const, authRequired: false, aiConfigured: false };
  }
}
export async function fetchContributions() {
  try {
    return await request<{ mode: string; total: number; reports: ApiReport[] }>('/api/me', { headers: await headers() });
  } catch {
    return { mode: 'preview', total: 0, reports: [] };
  }
}

export async function fetchJourney(from: string, to: string, profile = 'mobilitas'): Promise<JourneyResponse> {
  const query = new URLSearchParams({ from, to, profile });
  try {
    return await request<JourneyResponse>(`/api/journey?${query}`);
  } catch {
    return {
      points: [],
      profile,
      hasBottlenecks: false,
      bottleneckCount: 0,
      geometry: null,
      routing: false,
      disclaimer: 'Pratinjau transit antarmuka offline (menunggu server)',
    };
  }
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

// ==========================================
// REVIEWER PORTAL API METHODS
// ==========================================

import type { ReviewerAuditItem, ReviewerStats, ReviewDecision } from '@/types';

export async function fetchReviewerStats(): Promise<ReviewerStats> {
  try {
    return await request<ReviewerStats>('/api/reviewer/stats');
  } catch {
    // Fallback stats for local evaluation
    return {
      submitted: 12,
      approvedToday: 5,
      needsRevision: 3,
      rejected: 1,
      total: 21,
    };
  }
}

export async function fetchReviewerReports(options: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ reports: ReviewerAuditItem[]; total: number }> {
  const query = new URLSearchParams();
  if (options.status && options.status !== 'all') query.set('status', options.status);
  if (options.search && options.search.trim()) query.set('search', options.search.trim());
  if (options.limit) query.set('limit', String(options.limit));
  if (options.offset) query.set('offset', String(options.offset));

  try {
    const res = await request<{ reports: ReviewerAuditItem[]; total: number }>(
      `/api/reviewer/reports?${query.toString()}`
    );
    return {
      reports: res.reports.map(r => ({
        ...r,
        photoUrl: r.photoUrl ? (r.photoUrl.startsWith('http') ? r.photoUrl : mediaUrl(r.photoUrl)) : '',
      })),
      total: res.total,
    };
  } catch (error) {
    console.warn('Gagal memuat laporan reviewer dari backend, menggunakan data pratinjau:', error);
    // Offline preview data for standalone UI testing
    const fallbackReports: ReviewerAuditItem[] = [
      {
        id: '10000000-0000-4000-8000-000000000001',
        placeId: 'osm-node-4794254291',
        placeName: 'Stasiun Wonokromo (Surabaya)',
        placeAddress: 'Jalan Stasiun Wonokromo 1, Surabaya',
        reporterName: 'Ahmad Rizki',
        createdAt: '2026-09-18T10:15:00.000Z',
        photoUrl: '/images/login-community.svg',
        elements: [{ element: 'E2_ramp', status: 'TERHALANG', note: 'Ramp akses kursi roda tertutup parkir motor dan barang pedagang.' }],
        reviewStatus: 'SUBMITTED',
      },
      {
        id: '10000000-0000-4000-8000-000000000003',
        placeId: 'osm-node-4191188521',
        placeName: 'Calibre Coffee Roasters',
        placeAddress: 'Jalan Walikota Mustajab 67-69, Genteng, Surabaya',
        reporterName: 'Budi Wicaksono',
        createdAt: '2026-09-19T11:20:00.000Z',
        photoUrl: '/images/login-community.svg',
        elements: [{ element: 'E1_door', status: 'UTUH', note: 'Pintu masuk lebar tanpa undakan, ramah pengguna kursi roda.' }],
        reviewStatus: 'SUBMITTED',
      },
      {
        id: '10000000-0000-4000-8000-000000000002',
        placeId: 'osm-node-659961942',
        placeName: 'Carrefour Rungkut Surabaya',
        placeAddress: 'Jalan Raya Kali Rungkut No. 23-25, Surabaya',
        reporterName: 'Siti Nurhaliza',
        createdAt: '2026-09-19T07:20:00.000Z',
        photoUrl: '/images/login-community.svg',
        elements: [{ element: 'E5_guiding_block', status: 'UTUH', note: 'Jalur pemandu kuning terhubung rapi dari trotoar pintu masuk utama.' }],
        reviewStatus: 'APPROVED',
        reviewedBy: 'reviewer.naviable',
        reviewedAt: '2026-09-19T08:30:00.000Z',
        reviewNote: 'Foto jelas dan menunjukkan jalur pemandu terpasang utuh sesuai standar.',
      },
      {
        id: '10000000-0000-4000-8000-000000000004',
        placeId: 'osm-node-4191209387',
        placeName: 'Carl\'s Jr. Kertajaya Indah',
        placeAddress: 'Jalan Raya Kertajaya Indah Blok F No. 312, Mulyorejo, Surabaya',
        reporterName: 'Dewi Lestari',
        createdAt: '2026-09-18T14:40:00.000Z',
        photoUrl: '/images/login-community.svg',
        elements: [{ element: 'E4_lift', status: 'TIDAK_STANDAR', note: 'Tombol lift tidak ada huruf braille dan posisinya terlalu tinggi.' }],
        reviewStatus: 'NEEDS_REVISION',
        reviewedBy: 'reviewer.naviable',
        reviewedAt: '2026-09-19T09:10:00.000Z',
        reviewNote: 'Foto belum memperlihatkan tombol lift secara keseluruhan. Mohon kirimkan foto yang lebih fokus.',
      },
      {
        id: '10000000-0000-4000-8000-000000000005',
        placeId: 'osm-node-5873197056',
        placeName: 'Starbucks Surabaya Timur',
        placeAddress: 'Jalan Manyar Kertoarjo No. 88, Surabaya',
        reporterName: 'Anonim',
        createdAt: '2026-09-18T16:00:00.000Z',
        photoUrl: '/images/login-community.svg',
        elements: [{ element: 'E8_crossing', status: 'TIDAK_ADA', note: 'Tidak ada penyeberangan aman' }],
        reviewStatus: 'REJECTED',
        reviewedBy: 'reviewer.naviable',
        reviewedAt: '2026-09-18T17:20:00.000Z',
        reviewNote: 'Foto buram dan tidak menunjukkan titik lokasi penyeberangan yang dilaporkan.',
      }
    ];

    let filtered = fallbackReports;
    if (options.status && options.status !== 'all') {
      filtered = filtered.filter(r => r.reviewStatus === options.status);
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      filtered = filtered.filter(r => r.placeName.toLowerCase().includes(q) || r.reporterName.toLowerCase().includes(q));
    }
    return { reports: filtered, total: filtered.length };
  }
}

export async function fetchReviewerReport(id: string): Promise<{ report: ReviewerAuditItem; place: Place | null }> {
  try {
    const res = await request<{ report: ReviewerAuditItem; place: ApiPlace | null }>(
      `/api/reviewer/reports/${encodeURIComponent(id)}`
    );
    return {
      report: {
        ...res.report,
        photoUrl: res.report.photoUrl ? (res.report.photoUrl.startsWith('http') ? res.report.photoUrl : mediaUrl(res.report.photoUrl)) : '',
      },
      place: res.place ? toUiPlace(res.place) : null,
    };
  } catch {
    const reportsList = (await fetchReviewerReports({ limit: 100 })).reports;
    const report = reportsList.find(r => r.id === id) ?? reportsList[0];
    const seedPlaces = loadSeedPlaces();
    const place = seedPlaces.find(p => String(p.id) === report?.placeId) ?? seedPlaces[0] ?? null;
    return { report, place };
  }
}

export async function submitReportReview(
  id: string,
  payload: {
    decision: ReviewDecision;
    reviewer: string;
    note: string;
    checklist?: Record<string, boolean>;
  }
): Promise<{ ok: boolean; report: ReviewerAuditItem }> {
  try {
    return await request<{ ok: boolean; report: ReviewerAuditItem }>(
      `/api/reviewer/reports/${encodeURIComponent(id)}/review`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
  } catch (error) {
    // When offline / preview mode, simulate state update
    console.warn('Menggunakan update review lokal:', error);
    const item = (await fetchReviewerReport(id)).report;
    const updated: ReviewerAuditItem = {
      ...item,
      reviewStatus: payload.decision,
      reviewedBy: payload.reviewer,
      reviewedAt: new Date().toISOString(),
      reviewNote: payload.note,
      reviewChecklist: payload.checklist,
    };
    return { ok: true, report: updated };
  }
}

export async function fetchReviewerHistory(options: {
  limit?: number;
  offset?: number;
} = {}): Promise<{ history: ReviewerAuditItem[]; total: number }> {
  const query = new URLSearchParams();
  if (options.limit) query.set('limit', String(options.limit));
  if (options.offset) query.set('offset', String(options.offset));

  try {
    const res = await request<{ history: ReviewerAuditItem[]; total: number }>(
      `/api/reviewer/history?${query.toString()}`
    );
    return {
      history: res.history.map(r => ({
        ...r,
        photoUrl: r.photoUrl ? (r.photoUrl.startsWith('http') ? r.photoUrl : mediaUrl(r.photoUrl)) : '',
      })),
      total: res.total,
    };
  } catch {
    const all = (await fetchReviewerReports({ limit: 100 })).reports;
    const reviewed = all.filter(
      r => r.reviewStatus === 'APPROVED' || r.reviewStatus === 'NEEDS_REVISION' || r.reviewStatus === 'REJECTED' || r.reviewStatus === 'PUBLISHED'
    );
    return { history: reviewed, total: reviewed.length };
  }
}

