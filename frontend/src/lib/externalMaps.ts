export type TravelMode = 'walking' | 'transit' | 'driving';

export interface GeoPoint {
  lat: number | null | undefined;
  lng: number | null | undefined;
  name?: string | null;
}

/**
 * Validates if latitude and longitude numbers are strictly within real geographical bounds.
 */
export function isValidCoordinate(lat: number | null | undefined, lng: number | null | undefined): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function formatCoordinate(point: GeoPoint): string | null {
  if (!isValidCoordinate(point.lat, point.lng)) return null;
  return `${point.lat},${point.lng}`;
}

export interface RouteOptions {
  origin: GeoPoint;
  destination: GeoPoint;
  waypoints?: GeoPoint[];
  travelMode?: TravelMode;
}

/**
 * Builds a universal Google Maps Directions URL between origin and destination,
 * optionally including waypoints (intermediate transit points) and travel mode.
 *
 * Example output:
 * https://www.google.com/maps/dir/?api=1&origin=-7.2575,112.7521&destination=-7.2600,112.7550&waypoints=-7.2580,112.7530&travelmode=walking
 */
export function buildGoogleMapsRouteUrl(options: RouteOptions): string | null {
  const originStr = formatCoordinate(options.origin);
  const destStr = formatCoordinate(options.destination);

  if (!originStr || !destStr) {
    return null;
  }

  const params = new URLSearchParams({
    api: '1',
    origin: originStr,
    destination: destStr,
    travelmode: options.travelMode || 'walking',
  });

  if (options.waypoints && options.waypoints.length > 0) {
    const validWaypoints = options.waypoints
      .map(formatCoordinate)
      .filter((wp): wp is string => wp !== null);

    if (validWaypoints.length > 0) {
      params.set('waypoints', validWaypoints.join('|'));
    }
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export interface PlaceNavigationOptions {
  destination: GeoPoint;
  origin?: GeoPoint | null;
  travelMode?: TravelMode;
  /**
   * Text Google Maps can search for when the destination has no usable coordinates
   * (e.g. a place still waiting for a map point). Without it, invalid coordinates give null.
   */
  fallbackQuery?: string | null;
}

/**
 * Builds a Google Maps Directions URL targeting a specific destination.
 * If origin is omitted or invalid, Google Maps uses the device's current GPS location.
 *
 * Example output:
 * https://www.google.com/maps/dir/?api=1&destination=-7.2575,112.7521&travelmode=walking
 */
export function buildGoogleMapsPlaceUrl(options: PlaceNavigationOptions): string | null {
  const destStr = formatCoordinate(options.destination) ?? (options.fallbackQuery?.trim() || null);
  if (!destStr) {
    return null;
  }

  const params = new URLSearchParams({
    api: '1',
    destination: destStr,
    travelmode: options.travelMode || 'walking',
  });

  if (options.origin) {
    const originStr = formatCoordinate(options.origin);
    if (originStr) {
      params.set('origin', originStr);
    }
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export interface DirectionsPlace {
  name: string;
  address?: string | null;
  lat: number | null;
  lng: number | null;
  needsGeocoding?: boolean;
}

/**
 * Google Maps directions to a Naviable place. Uses the exact map point when the place
 * has one; a place still waiting for a precise point falls back to a "name, address,
 * Surabaya" search, so every listed place can offer directions.
 */
export function buildPlaceDirectionsUrl(place: DirectionsPlace, travelMode: TravelMode = 'walking'): string | null {
  const hasPoint = !place.needsGeocoding && isValidCoordinate(place.lat, place.lng);
  const parts = [place.name, place.address].map((part) => part?.trim()).filter((part): part is string => Boolean(part));
  if (!parts.some((part) => /surabaya/i.test(part))) parts.push('Surabaya');
  return buildGoogleMapsPlaceUrl({
    destination: hasPoint ? { lat: place.lat, lng: place.lng, name: place.name } : { lat: null, lng: null },
    fallbackQuery: parts.join(', '),
    travelMode,
  });
}
