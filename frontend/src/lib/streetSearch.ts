import type { Place } from '@/types';

/**
 * Normalizes Indonesian street names, titles, and address terms for robust search matching.
 * Converts synonyms, abbreviations, and case into canonical search tokens.
 *
 * Examples:
 * - "Jalan Tunjungan" -> "jl tunjungan"
 * - "Jl. Raya Darmo No. 12" -> "jl raya darmo no 12"
 * - "Jln. Mayjend. Jonosewojo" -> "jl mayjen jonosewojo"
 * - "Gang Dolly" -> "gg dolly"
 */
export function normalizeStreetText(text: string | null | undefined): string {
  if (!text) return '';

  let normalized = text.toLowerCase();

  // Normalize punctuation to spaces except keep alphanumeric
  normalized = normalized.replace(/[,/\\()\-]/g, ' ');

  // Standardize common street prefixes & titles
  // Jalan / Jln / Jl -> jl
  normalized = normalized.replace(/\b(?:jalan|jln|jl)\.?\b/gi, 'jl');

  // Gang / Gg -> gg
  normalized = normalized.replace(/\b(?:gang|gg)\.?\b/gi, 'gg');

  // Raya / Ry -> raya
  normalized = normalized.replace(/\b(?:raya|ry)\.?\b/gi, 'raya');

  // Nomor / No -> no
  normalized = normalized.replace(/\b(?:nomor|no)\.?\b/gi, 'no');

  // Mayjen / Mayjend / Mayor Jenderal -> mayjen
  normalized = normalized.replace(/\b(?:mayor\s+jenderal|mayjend|mayjen)\.?\b/gi, 'mayjen');

  // Jenderal / Jend -> jenderal
  normalized = normalized.replace(/\b(?:jend|jenderal)\.?\b/gi, 'jenderal');

  // Dokter / Dr -> dr
  normalized = normalized.replace(/\b(?:dokter|dr)\.?\b/gi, 'dr');

  // Profesor / Prof -> prof
  normalized = normalized.replace(/\b(?:profesor|prof)\.?\b/gi, 'prof');

  // Kolonel / Kol -> kol
  normalized = normalized.replace(/\b(?:kolonel|kol)\.?\b/gi, 'kol');

  // Hapus titik yang tersisa dan spasi berlebih
  normalized = normalized.replace(/\./g, ' ').replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Extracts the primary street name from an address string.
 * Example:
 * - "Jl. Tunjungan No. 1-3, Surabaya" -> "Jl. Tunjungan"
 * - "Pakuwon Trade Centre, Jl. Mayjend. Jonosewojo No. 2, Surabaya" -> "Jl. Mayjend. Jonosewojo"
 * - "Jl. Raya Darmo, Wonokromo, Surabaya" -> "Jl. Raya Darmo"
 */
export function extractStreetName(address: string | null | undefined): string | null {
  if (!address) return null;

  // Match pattern starting with Jl. / Jalan / Gang / Gg up to "No." or comma or city name
  const match = address.match(/(?:(?:Jl|Jalan|Jln|Gang|Gg)\.?\s+[^,0-9\n]+?)(?=\s+(?:No|Nomor|\d|,\s*|Surabaya|$))/i);
  if (match) {
    const rawStreet = match[0].trim();
    // Capitalize first letter of each word neatly
    return formatTitleCase(rawStreet);
  }

  // Fallback: take first segment before comma if it looks like an address line
  const firstSegment = address.split(',')[0]?.trim();
  if (firstSegment && /^(?:Jl|Jalan|Jln|Gang|Gg)\b/i.test(firstSegment)) {
    return formatTitleCase(firstSegment.replace(/\s+No\.?.*$/i, '').trim());
  }

  return null;
}

function formatTitleCase(str: string): string {
  return str
    .split(/\s+/)
    .map(word => {
      if (/^jl\.?$/i.test(word)) return 'Jl.';
      if (/^gg\.?$/i.test(word)) return 'Gg.';
      if (/^dr\.?$/i.test(word)) return 'Dr.';
      if (/^no\.?$/i.test(word)) return 'No.';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

import { analyzeSearchQuery, matchesCategoryIntent } from './searchNormalizer';

export type PlaceQueryMatch = {
  matched: boolean;
  matchedOnStreet: boolean;
  matchedField?: 'name' | 'street' | 'district' | 'category';
  score: number;
};

/**
 * Checks if a Place matches a user query across its name, street/address, district, and category,
 * with intelligent Indonesian street name normalization and category intent matching.
 */
export function matchesPlaceQuery(place: Place, rawQuery: string): PlaceQueryMatch {
  const query = rawQuery.trim();
  if (!query) {
    return { matched: true, matchedOnStreet: false, score: 1.0 };
  }

  const queryNorm = normalizeStreetText(query);
  const nameNorm = normalizeStreetText(place.name);
  const addressNorm = normalizeStreetText(place.address || '');
  const districtNorm = normalizeStreetText(place.district || '');
  const categoryNorm = normalizeStreetText(place.category || '');

  // 1. Exact match on place name
  if (nameNorm === queryNorm) {
    return { matched: true, matchedOnStreet: false, matchedField: 'name', score: 1.0 };
  }

  // 2. Substring match on place name
  if (nameNorm.includes(queryNorm)) {
    return { matched: true, matchedOnStreet: false, matchedField: 'name', score: 0.9 };
  }

  // 3. Street/Address match with street normalization
  if (addressNorm) {
    // Check if query is directly inside normalized address
    if (addressNorm.includes(queryNorm)) {
      return { matched: true, matchedOnStreet: true, matchedField: 'street', score: 0.85 };
    }

    // Also check if query without "jl" matches address
    const queryWithoutStreetPrefix = queryNorm.replace(/^jl\s+/, '').trim();
    if (queryWithoutStreetPrefix.length >= 3 && addressNorm.includes(queryWithoutStreetPrefix)) {
      return { matched: true, matchedOnStreet: true, matchedField: 'street', score: 0.8 };
    }

    // Check extracted street name
    const extractedStreet = extractStreetName(place.address);
    if (extractedStreet) {
      const extractedNorm = normalizeStreetText(extractedStreet);
      if (extractedNorm.includes(queryNorm) || queryNorm.includes(extractedNorm)) {
        return { matched: true, matchedOnStreet: true, matchedField: 'street', score: 0.82 };
      }
    }
  }

  // 4. District match
  if (districtNorm && districtNorm.includes(queryNorm)) {
    return { matched: true, matchedOnStreet: false, matchedField: 'district', score: 0.7 };
  }

  // 5. Direct category match
  if (categoryNorm && (categoryNorm.includes(queryNorm) || queryNorm.includes(categoryNorm))) {
    return { matched: true, matchedOnStreet: false, matchedField: 'category', score: 0.65 };
  }

  // 6. Intelligent category & synonym intent matching (e.g. "coffe", "tempat wisata", "makan")
  const intent = analyzeSearchQuery(rawQuery);
  if (intent.category && matchesCategoryIntent(place.category || place.rawCategory || '', intent)) {
    return { matched: true, matchedOnStreet: false, matchedField: 'category', score: 0.75 };
  }

  // 7. Check if any expanded intent term matches place name or category
  for (const term of intent.expandedTerms) {
    const termNorm = normalizeStreetText(term);
    if (termNorm.length >= 3) {
      if (nameNorm.includes(termNorm)) {
        return { matched: true, matchedOnStreet: false, matchedField: 'name', score: 0.88 };
      }
      if (categoryNorm.includes(termNorm)) {
        return { matched: true, matchedOnStreet: false, matchedField: 'category', score: 0.7 };
      }
    }
  }

  return { matched: false, matchedOnStreet: false, score: 0 };
}

export type StreetCorridor = {
  name: string;
  normalized: string;
  count: number;
};

/**
 * Aggregates unique and popular street corridors in Surabaya from the dataset.
 */
export function getPopularStreetCorridors(places: Place[], minCount = 1): StreetCorridor[] {
  const map = new Map<string, { name: string; count: number }>();

  for (const place of places) {
    const street = extractStreetName(place.address);
    if (!street) continue;

    const norm = normalizeStreetText(street);
    if (!norm || norm === 'jl' || norm.length < 4) continue;

    const existing = map.get(norm);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(norm, { name: street, count: 1 });
    }
  }

  return Array.from(map.entries())
    .map(([normalized, item]) => ({
      name: item.name,
      normalized,
      count: item.count,
    }))
    .filter(c => c.count >= minCount)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
