/**
 * Typed client for the AbleMap Express backend.
 * Base URL from NEXT_PUBLIC_API_URL (default http://localhost:4000).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type ApiPlace = {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  kelurahan: string | null;
  kecamatan: string | null;
  elements: Record<string, { status: string; lockedBy: string; photoUrl?: string | null; note?: string | null }>;
  score: number | null;
  summary: string;
};

export type ApiAnalysis = {
  drafts: { element: string; status: string; confidence: string; reason: string }[];
  needsMorePhotos: string[];
  disclaimer: string;
  /** present when AI failed → contributor fills checklist manually (doc §7.3) */
  fallback?: "manual_checklist";
};

export async function fetchPlaces(profile?: string): Promise<ApiPlace[]> {
  const url = new URL("/api/places", API_URL);
  if (profile) url.searchParams.set("profile", profile);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchPlaces failed: ${res.status}`);
  const json = (await res.json()) as { places: ApiPlace[] };
  return json.places;
}

export async function fetchPlace(id: string): Promise<ApiPlace> {
  const res = await fetch(`${API_URL}/api/places/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetchPlace failed: ${res.status}`);
  const json = (await res.json()) as { place: ApiPlace };
  return json.place;
}

export async function analyzePhoto(
  imageBase64: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp"
): Promise<ApiAnalysis> {
  const res = await fetch(`${API_URL}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: imageBase64, mimeType }),
  });
  const json = (await res.json()) as ApiAnalysis;
  return json;
}

export type ReportPayload = {
  placeId: string;
  reporterName: string;
  image?: string;
  mimeType?: "image/jpeg" | "image/png" | "image/webp";
  elements: { element: string; status: string; note?: string }[];
};

export async function submitReport(payload: ReportPayload): Promise<{ ok: boolean; reportId: string; photoUrl: string | null }> {
  const res = await fetch(`${API_URL}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(json.error ?? `submitReport failed: ${res.status}`);
  }
  return res.json();
}
