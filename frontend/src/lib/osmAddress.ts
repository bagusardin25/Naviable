/**
 * Formats an OpenStreetMap (Nominatim) address object into a compact street
 * address, e.g. "Jalan Tunjungan No. 1, Genteng, Surabaya". Shared by the
 * forward (/api/geocode) and reverse (/api/reverse-geocode) geocoding proxies.
 */
export function formatOsmAddress(addressObj?: Record<string, string>, rawDisplayName?: string): string {
  if (!addressObj) {
    if (rawDisplayName) {
      return rawDisplayName.split(',').slice(0, 4).map(s => s.trim()).join(', ');
    }
    return 'Surabaya, Jawa Timur';
  }

  const road = addressObj.road || addressObj.pedestrian || addressObj.footway || addressObj.street;
  const houseNumber = addressObj.house_number;
  const village = addressObj.village || addressObj.suburb || addressObj.neighbourhood;
  const district = addressObj.municipality || addressObj.city_district || addressObj.subdistrict;
  // Points just outside the city (e.g. Sidoarjo) carry `town`/`county` instead of `city`.
  const city = addressObj.city || addressObj.town || addressObj.county || 'Surabaya';

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
