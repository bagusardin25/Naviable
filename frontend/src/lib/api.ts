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
