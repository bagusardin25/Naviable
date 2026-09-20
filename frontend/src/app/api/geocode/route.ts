import { NextRequest, NextResponse } from 'next/server';

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
  if (['park', 'garden', 'playground', 'sports_centre', 'stadium', 'pitch'].includes(val)) {
    return 'Taman & Rekreasi';
  }
  if (['mall', 'supermarket', 'marketplace', 'department_store', 'convenience', 'bank'].includes(val)) {
    return 'Perbelanjaan';
  }
  if (['townhall', 'courthouse', 'police', 'post_office', 'community_centre'].includes(val)) {
    return 'Layanan Publik';
  }
  return 'Fasilitas Publik';
}

function formatOsmAddress(addressObj?: Record<string, string>, rawDisplayName?: string): string {
  if (!addressObj) {
    if (rawDisplayName) {
      // Return first 3-4 segments of display name
      return rawDisplayName.split(',').slice(0, 4).map(s => s.trim()).join(', ');
    }
    return 'Surabaya, Jawa Timur';
  }

  const road = addressObj.road || addressObj.pedestrian || addressObj.footway || addressObj.street;
  const houseNumber = addressObj.house_number;
  const village = addressObj.village || addressObj.suburb || addressObj.neighbourhood;
  const district = addressObj.municipality || addressObj.city_district || addressObj.subdistrict;
  const city = addressObj.city || 'Surabaya';

  const parts: string[] = [];
  if (road) {
    if (houseNumber) {
      parts.push(`${road} No. ${houseNumber}`);
    } else {
      parts.push(road);
    }
  }
  if (village && village !== district) parts.push(village);
  if (district) parts.push(district);
  if (city) parts.push(city);

  return parts.length > 0 ? parts.join(', ') : (rawDisplayName?.split(',').slice(0, 3).join(', ') || 'Surabaya');
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

  // Ensure query mentions Surabaya or area if generic
  const hasCityContext = /(surabaya|sby|ketintang|gubeng|wonokromo|rungkut|sukolilo|tegalsari|darmo|tunjungan)/i.test(query);
  const nominatimQuery = hasCityContext ? query : `${query}, Surabaya`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    // 1. Try Nominatim with Surabaya viewbox priority
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      nominatimQuery
    )}&format=jsonv2&addressdetails=1&limit=6&countrycodes=id&viewbox=112.50,-7.12,112.95,-7.42&bounded=0`;

    const res = await fetch(nominatimUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Naviable-Surabaya-Accessibility-Portal/1.0 (https://github.com/bagusardin25/Naviable)',
        'Accept': 'application/json',
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const items = await res.json();
      if (Array.isArray(items) && items.length > 0) {
        const results: ExternalPlace[] = [];

        for (const item of items) {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
          if (!isInSurabayaArea(lat, lng)) continue;

          // Extract best clean name
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

        if (results.length > 0) {
          cache.set(cacheKey, { timestamp: Date.now(), data: results });
          return NextResponse.json({ results }, {
            headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' },
          });
        }
      }
    }
  } catch (err) {
    // If Nominatim timed out or failed, continue to Photon fallback
    console.warn('Nominatim geocoding failed or timed out:', err instanceof Error ? err.message : err);
  }

  // 2. Fallback to Photon API (Komoot OSM Geocoder)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=-7.2575&lon=112.7521&limit=5`;
    const photonRes = await fetch(photonUrl, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeoutId);

    if (photonRes.ok) {
      const geojson = await photonRes.json();
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

      cache.set(cacheKey, { timestamp: Date.now(), data: results });
      return NextResponse.json({ results }, {
        headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' },
      });
    }
  } catch (photonErr) {
    console.warn('Photon geocoding fallback failed:', photonErr instanceof Error ? photonErr.message : photonErr);
  }

  return NextResponse.json({ results: [] });
}
