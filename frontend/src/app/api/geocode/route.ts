import { NextRequest, NextResponse } from 'next/server';
import { analyzeSearchQuery } from '@/lib/searchNormalizer';
import { formatOsmAddress } from '@/lib/osmAddress';

export type ExternalPlace = {
  id: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  category: string;
  address: string;
  source: 'openstreetmap' | 'photon';
};

// Simple in-memory TTL cache to reduce external geocoding requests
const cache = new Map<string, { timestamp: number; data: ExternalPlace[] }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// Surabaya bounding box coordinates (including metropolitan outskirts)
const SURABAYA_BOUNDS = {
  minLat: -7.45,
  maxLat: -7.10,
  minLng: 112.45,
  maxLng: 112.98,
};

function isInSurabayaArea(lat: number, lng: number): boolean {
  return (
    lat >= SURABAYA_BOUNDS.minLat &&
    lat <= SURABAYA_BOUNDS.maxLat &&
    lng >= SURABAYA_BOUNDS.minLng &&
    lng <= SURABAYA_BOUNDS.maxLng
  );
}

function mapOsmCategory(category?: string, type?: string): string {
  if (!type && !category) return 'Fasilitas Publik';
  const val = (type || category || '').toLowerCase();

  if (['cafe', 'coffee_shop', 'restaurant', 'fast_food', 'food_court', 'bar', 'pub', 'ice_cream', 'bakery'].includes(val)) {
    return 'Kuliner & Kafe';
  }
  if (['tourism', 'museum', 'attraction', 'zoo', 'aquarium', 'artwork', 'monument', 'theme_park', 'viewpoint', 'gallery'].includes(val)) {
    return 'Wisata & Rekreasi';
  }
  if (['park', 'garden', 'playground', 'sports_centre', 'stadium', 'pitch'].includes(val)) {
    return 'Taman & Rekreasi';
  }
  if (['hotel', 'motel', 'hostel', 'guest_house', 'lodging', 'apartment'].includes(val)) {
    return 'Hotel & Penginapan';
  }
  if (['university', 'college', 'school', 'kindergarten', 'library', 'research_institute'].includes(val)) {
    return 'Pendidikan';
  }
  if (['hospital', 'clinic', 'doctors', 'pharmacy', 'dentist', 'veterinary'].includes(val)) {
    return 'Kesehatan';
  }
  if (['place_of_worship', 'mosque', 'church', 'temple'].includes(val)) {
    return 'Tempat Ibadah';
  }
  if (['bus_stop', 'station', 'subway_entrance', 'ferry_terminal', 'halt', 'platform'].includes(val)) {
    return 'Transportasi';
  }
  if (['mall', 'supermarket', 'marketplace', 'department_store', 'convenience', 'bank', 'shop'].includes(val)) {
    return 'Perbelanjaan';
  }
  if (['townhall', 'courthouse', 'police', 'post_office', 'community_centre', 'government'].includes(val)) {
    return 'Layanan Publik';
  }
  return 'Fasilitas Publik';
}

async function fetchNominatim(query: string, signal: AbortSignal): Promise<ExternalPlace[]> {
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    query
  )}&format=jsonv2&addressdetails=1&limit=6&countrycodes=id&viewbox=112.50,-7.12,112.95,-7.42&bounded=0`;

  const res = await fetch(nominatimUrl, {
    signal,
    headers: {
      'User-Agent': 'Naviable-Surabaya-Accessibility-Portal/1.0 (https://github.com/bagusardin25/Naviable)',
      'Accept': 'application/json',
    },
  });

  if (!res.ok) return [];
  const items = await res.json();
  if (!Array.isArray(items)) return [];

  const results: ExternalPlace[] = [];
  for (const item of items) {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (!isInSurabayaArea(lat, lng)) continue;

    const name = item.name || item.address?.amenity || item.address?.building || item.display_name?.split(',')[0]?.trim();
    if (!name) continue;

    results.push({
      id: `osm-${item.osm_type || 'node'}-${item.osm_id || item.place_id}`,
      name,
      displayName: item.display_name || name,
      lat,
      lng,
      category: mapOsmCategory(item.category, item.type),
      address: formatOsmAddress(item.address, item.display_name),
      source: 'openstreetmap',
    });
  }
  return results;
}

async function fetchPhoton(query: string, signal: AbortSignal): Promise<ExternalPlace[]> {
  // Always bound Photon to Surabaya Metropolitan Area
  const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
    query
  )}&lat=-7.2575&lon=112.7521&bbox=112.45,-7.45,112.98,-7.10&limit=6`;

  const res = await fetch(photonUrl, {
    signal,
    headers: { 'Accept': 'application/json' },
  });

  if (!res.ok) return [];
  const geojson = await res.json();
  const features = geojson.features || [];
  const results: ExternalPlace[] = [];

  for (const feat of features) {
    const coords = feat.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const lng = coords[0];
    const lat = coords[1];

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (!isInSurabayaArea(lat, lng)) continue;

    const props = feat.properties || {};
    const name = props.name || props.street || '';
    if (!name) continue;

    const streetPart = props.street ? (props.housenumber ? `${props.street} No. ${props.housenumber}` : props.street) : '';
    const districtPart = props.district || props.locality || '';
    const cityPart = props.city || 'Surabaya';
    const address = [streetPart, districtPart, cityPart].filter(Boolean).join(', ') || 'Surabaya';

    results.push({
      id: `photon-${props.osm_type || 'N'}-${props.osm_id || Math.random().toString(36).slice(2, 9)}`,
      name,
      displayName: [name, address].filter(Boolean).join(', '),
      lat,
      lng,
      category: mapOsmCategory(props.osm_key, props.osm_value),
      address,
      source: 'photon',
    });
  }
  return results;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get('q') || '';
  const query = rawQuery.trim().slice(0, 100);

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const cacheKey = query.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ results: cached.data }, {
      headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' },
    });
  }

  // Analyze intent, normalize typos (e.g. "coffe" -> "coffee") and strip conversational prefixes ("tempat wisata" -> "wisata")
  const intent = analyzeSearchQuery(query);
  const searchTerm = intent.clean || query;

  const hasCityContext = /(surabaya|sby|ketintang|gubeng|wonokromo|rungkut|sukolilo|tegalsari|darmo|tunjungan)/i.test(searchTerm);
  const nominatimQuery = hasCityContext
    ? searchTerm
    : (intent.category ? `${searchTerm} Surabaya` : `${searchTerm}, Surabaya`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    // Run Photon and Nominatim concurrently to ensure both speed and coverage
    const [nominatimSettled, photonSettled] = await Promise.allSettled([
      fetchNominatim(nominatimQuery, controller.signal),
      fetchPhoton(searchTerm, controller.signal),
    ]);
    clearTimeout(timeoutId);

    const nominatimResults = nominatimSettled.status === 'fulfilled' ? nominatimSettled.value : [];
    const photonResults = photonSettled.status === 'fulfilled' ? photonSettled.value : [];

    // Deduplicate between sources by proximity (< 80m) and clean name
    const combined: ExternalPlace[] = [];
    const isDuplicate = (candidate: ExternalPlace) => {
      return combined.some(existing => {
        const dLat = Math.abs(existing.lat - candidate.lat);
        const dLng = Math.abs(existing.lng - candidate.lng);
        if (dLat < 0.0008 && dLng < 0.0008) return true;

        const normExisting = existing.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normCandidate = candidate.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normExisting === normCandidate && dLat < 0.003 && dLng < 0.003) return true;
        return false;
      });
    };

    // Prioritize Photon results for category queries (strong POI/venue coverage), Nominatim for streets/landmarks
    const primary = intent.category ? photonResults : nominatimResults;
    const secondary = intent.category ? nominatimResults : photonResults;

    for (const item of primary) {
      if (!isDuplicate(item)) combined.push(item);
    }
    for (const item of secondary) {
      if (!isDuplicate(item)) combined.push(item);
    }

    if (combined.length > 0) {
      const topResults = combined.slice(0, 8);
      cache.set(cacheKey, { timestamp: Date.now(), data: topResults });
      return NextResponse.json({ results: topResults }, {
        headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' },
      });
    }
  } catch (err) {
    console.warn('Geocoding request failed:', err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ results: [] });
}

