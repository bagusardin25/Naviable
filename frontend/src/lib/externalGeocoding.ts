import type { Place } from '@/types';

export type ExternalPlaceResult = {
  id: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  category: string;
  address: string;
  source: 'openstreetmap' | 'photon';
  isExistingInNaviable?: boolean;
  existingPlaceId?: string;
  existingPlaceName?: string;
};

/**
 * Calculates distance in meters between two coordinate pairs using the Haversine formula.
 */
export function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  if (!Number.isFinite(lat1) || !Number.isFinite(lng1) || !Number.isFinite(lat2) || !Number.isFinite(lng2)) {
    return Infinity;
  }
  const R = 6371000; // Earth radius in meters
  const radLat1 = (lat1 * Math.PI) / 180;
  const radLat2 = (lat2 * Math.PI) / 180;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Normalizes a place name for fuzzy matching against local records.
 */
export function normalizePlaceName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/\b(jl|jalan|universitas|univ|fakultas|institut|rs|rsud|taman|gedung|halte)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Checks whether an external POI result is already registered in local Naviable places.
 * A match is found if coordinates are within 50 meters, or if normalized names match with nearby proximity.
 */
export function findMatchingLocalPlace(
  ext: { lat: number; lng: number; name: string },
  localPlaces: Place[]
): Place | undefined {
  if (!localPlaces || localPlaces.length === 0) return undefined;

  const extNormName = normalizePlaceName(ext.name);

  for (const p of localPlaces) {
    if (typeof p.lat !== 'number' || typeof p.lng !== 'number') continue;
    const dist = calculateDistanceMeters(ext.lat, ext.lng, p.lat, p.lng);

    // 1. Exact or very close geographic proximity (within 50 meters)
    if (dist <= 50) {
      return p;
    }

    // 2. Same normalized name and within 400 meters
    if (extNormName.length >= 4) {
      const localNormName = normalizePlaceName(p.name);
      if (
        (extNormName.includes(localNormName) || localNormName.includes(extNormName)) &&
        dist <= 400
      ) {
        return p;
      }
    }
  }

  return undefined;
}

/**
 * Client service to query the Next.js /api/geocode endpoint and enrich results with local Naviable status.
 */
export async function fetchExternalPlaces(
  query: string,
  localPlaces: Place[] = [],
  signal?: AbortSignal
): Promise<ExternalPlaceResult[]> {
  const clean = query.trim();
  if (clean.length < 2) return [];

  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(clean)}`, {
      signal,
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const rawResults: ExternalPlaceResult[] = data.results || [];

    return rawResults.map((item) => {
      const match = findMatchingLocalPlace(item, localPlaces);
      if (match) {
        return {
          ...item,
          isExistingInNaviable: true,
          existingPlaceId: String(match.id),
          existingPlaceName: match.name,
        };
      }
      return item;
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return [];
    console.warn('fetchExternalPlaces error:', e);
    return [];
  }
}

/**
 * Resolves a map point to a street address through the /api/reverse-geocode proxy.
 * Returns null when no address is found or the lookup fails, so the caller can fall
 * back to manual entry. An abort is re-thrown so a superseded lookup can be ignored.
 */
export async function reverseGeocode(lat: number, lng: number, signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`, {
      signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.address === 'string' && data.address.trim() ? data.address.trim() : null;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    console.warn('reverseGeocode error:', e);
    return null;
  }
}
