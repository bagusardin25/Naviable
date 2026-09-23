import { NextRequest, NextResponse } from 'next/server';
import { formatOsmAddress } from '@/lib/osmAddress';

// Turns a point picked on the map (or from the device's location) into a street
// address for the "Tambah Lokasi" form. Proxied server-side so Nominatim receives
// the identifying User-Agent its usage policy requires, with a small cache so a
// contributor nudging the pin back and forth doesn't exceed its rate limit.
const USER_AGENT = 'Naviable-Surabaya-Accessibility-Portal/1.0 (https://github.com/bagusardin25/Naviable)';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const CACHE_MAX_ENTRIES = 500;
const cache = new Map<string, { timestamp: number; address: string }>();

async function reverseNominatim(lat: number, lng: number): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=id`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(4000),
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || data.error || !data.address) return null;
  return formatOsmAddress(data.address, data.display_name);
}

async function reversePhoton(lat: number, lng: number): Promise<string | null> {
  const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&limit=1`, {
    signal: AbortSignal.timeout(3000),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const props = data?.features?.[0]?.properties;
  if (!props) return null;
  const street = props.street ? (props.housenumber ? `${props.street} No. ${props.housenumber}` : props.street) : props.name;
  const parts = [street, props.district || props.locality, props.city].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

function parseCoordinate(raw: string | null, limit: number): number | null {
  if (raw === null || raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseCoordinate(searchParams.get('lat'), 90);
  const lng = parseCoordinate(searchParams.get('lng'), 180);
  if (lat === null || lng === null) {
    return NextResponse.json({ error: 'Koordinat tidak valid.' }, { status: 400 });
  }

  // ~1 m precision is plenty for an address, and lets nearby nudges share an entry.
  const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ address: cached.address });
  }

  const address =
    (await reverseNominatim(lat, lng).catch(() => null)) ??
    (await reversePhoton(lat, lng).catch(() => null));

  if (!address) {
    // Not cached, so a transient provider failure doesn't stick to this point.
    return NextResponse.json({ address: null });
  }

  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(cacheKey, { timestamp: Date.now(), address });
  return NextResponse.json(
    { address },
    { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } }
  );
}
