/**
 * Intelligent Indonesian Search Query & Category Normalizer
 * Handles typos (e.g. "coffe"), conversational prefixes ("tempat wisata", "lokasi ngopi"),
 * and expands category synonyms so that both local places and external geocoders return rich results.
 */

export type QueryCategory =
  | 'cafe'
  | 'tourism'
  | 'food'
  | 'hotel'
  | 'worship'
  | 'health'
  | 'education'
  | 'shopping'
  | 'transit';

export type QueryIntent = {
  raw: string;
  clean: string;
  category?: QueryCategory;
  expandedTerms: string[];
};

export function analyzeSearchQuery(raw: string): QueryIntent {
  const clean = (raw || '')
    .trim()
    .toLowerCase()
    .replace(/^(?:cari|temukan|lihat|daftar|info)\s+/i, '')
    .replace(/\s+/g, ' ');

  // Strip common conversational prefix words like "tempat", "lokasi", "area", "daerah"
  const stripped = clean
    .replace(/^(?:tempat|lokasi|area|daerah|spot)\s+/i, '')
    .trim();

  // 1. Cafe & Coffee intent (including common typo "coffe" and Indonesian "ngopi")
  if (/(?:coffe\b|coffee|kopi|ngopi|cafe|kafe|warkop|caffe|nongkrong|espresso|latte)/i.test(clean)) {
    const isTypo = /coffe\b/i.test(stripped);
    const searchWord = isTypo ? stripped.replace(/coffe\b/i, 'coffee') : (stripped === 'ngopi' ? 'kopi' : stripped || 'cafe');
    return {
      raw,
      clean: searchWord,
      category: 'cafe',
      expandedTerms: ['coffee', 'cafe', 'kopi', 'ngopi', 'warkop', 'kafe'],
    };
  }

  // 2. Tourism & Recreation intent
  if (/(?:wisata|rekreasi|tamasya|hiburan|pariwisata|piknik|liburan)/i.test(clean)) {
    return {
      raw,
      clean: stripped || 'wisata',
      category: 'tourism',
      expandedTerms: ['wisata', 'taman', 'museum', 'monumen', 'attraction', 'zoo', 'pantai'],
    };
  }

  // 3. Food & Culinary intent
  if (/(?:makan|kuliner|restoran|resto|warung|food|cafe)/i.test(clean)) {
    return {
      raw,
      clean: stripped || 'restoran',
      category: 'food',
      expandedTerms: ['restoran', 'kuliner', 'makanan', 'warung', 'restaurant'],
    };
  }

  // 4. Hotel & Lodging intent
  if (/(?:hotel|penginapan|losmen|homestay|kost|resort|villa)/i.test(clean)) {
    return {
      raw,
      clean: stripped || 'hotel',
      category: 'hotel',
      expandedTerms: ['hotel', 'penginapan', 'guest_house', 'hostel'],
    };
  }

  // 5. Worship intent
  if (/(?:ibadah|masjid|mesjid|musholla|gereja|vihara|pura|klenteng)/i.test(clean)) {
    return {
      raw,
      clean: stripped || 'masjid',
      category: 'worship',
      expandedTerms: ['masjid', 'gereja', 'place_of_worship'],
    };
  }

  // 6. Health intent
  if (/(?:rumah sakit|rs\b|rsud|klinik|puskesmas|apotek|dokter)/i.test(clean)) {
    return {
      raw,
      clean: stripped || 'rumah sakit',
      category: 'health',
      expandedTerms: ['rumah sakit', 'hospital', 'clinic', 'puskesmas'],
    };
  }

  // 7. Shopping intent
  if (/(?:belanja|mall|mal\b|plaza|pasar|supermarket|minimarket|toko)/i.test(clean)) {
    return {
      raw,
      clean: stripped || 'mall',
      category: 'shopping',
      expandedTerms: ['mall', 'plaza', 'pasar', 'supermarket', 'shop'],
    };
  }

  // 8. Education intent
  if (/(?:kuliah|kampus|universitas|univ\b|sekolah|sma|smk|smp|sd\b|akademi)/i.test(clean)) {
    return {
      raw,
      clean: stripped || 'universitas',
      category: 'education',
      expandedTerms: ['universitas', 'sekolah', 'university', 'college', 'school'],
    };
  }

  return {
    raw,
    clean: stripped || clean,
    expandedTerms: [stripped || clean],
  };
}

/**
 * Checks whether a local place category or name matches a query intent
 */
export function matchesCategoryIntent(placeCategory: string, intent: QueryIntent): boolean {
  if (!intent.category) return false;
  const cat = (placeCategory || '').toLowerCase();

  switch (intent.category) {
    case 'cafe':
      return ['cafe', 'restaurant', 'fast_food', 'coffee', 'ice_cream'].some(c => cat.includes(c));
    case 'tourism':
      return ['tourism', 'museum', 'park', 'taman', 'attraction', 'monument', 'rekreasi', 'zoo'].some(c => cat.includes(c));
    case 'food':
      return ['restaurant', 'fast_food', 'food_court', 'cafe', 'kuliner', 'warung'].some(c => cat.includes(c));
    case 'hotel':
      return ['hotel', 'hostel', 'guest_house', 'lodging', 'penginapan'].some(c => cat.includes(c));
    case 'worship':
      return ['place_of_worship', 'masjid', 'mosque', 'church', 'gereja'].some(c => cat.includes(c));
    case 'health':
      return ['hospital', 'healthcare', 'clinic', 'kesehatan', 'pharmacy'].some(c => cat.includes(c));
    case 'shopping':
      return ['mall', 'supermarket', 'marketplace', 'shop', 'perbelanjaan'].some(c => cat.includes(c));
    case 'education':
      return ['university', 'college', 'school', 'kindergarten', 'pendidikan'].some(c => cat.includes(c));
    default:
      return false;
  }
}
