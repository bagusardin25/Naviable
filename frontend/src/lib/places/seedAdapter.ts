import {
  Place,
  ElementItem,
  ChainElementCode,
  PreSurveyWheelchairStatus,
  PreSurveyVerificationStatus,
  AccessibilityStatus,
  CHAIN_ELEMENT_MAP,
  EVIDENCE_LEVEL_LABELS,
} from '@/types';
import rawSeedData from '@/data/surabaya-accessibility-seed.json';

interface RawSeedRecord {
  id?: string | number;
  name: string;
  category?: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  needs_geocoding?: boolean;
  verified_by_team?: boolean;
  evidence_level?: string;
  source?: {
    name?: string;
    url?: string;
    license?: string;
    retrieved_at?: string;
  };
  sources?: Array<{
    name?: string;
    url?: string;
    license?: string;
    retrieved_at?: string;
  }>;
  pre_survey?: {
    wheelchair?: string;
    toilet_accessible?: string;
    tactile_paving?: string;
    claims_for_elements?: string[];
    features?: string[];
    summary?: string;
  };
}

const SURABAYA_CENTER = { lat: -7.2575, lng: 112.7521 };

// Bounding box for schematic calculation
const SURABAYA_BOUNDS = {
  minLat: -7.36,
  maxLat: -7.21,
  minLng: 112.63,
  maxLng: 112.83,
};

const CATEGORY_MAP: Record<string, string> = {
  supermarket: 'Supermarket',
  cafe: 'Cafe',
  fast_food: 'Fast Food',
  station: 'Stasiun Kereta Api',
  place_of_worship: 'Tempat Ibadah',
  restaurant: 'Restoran',
  ice_cream: 'Kedai Es Krim',
  bus_stop: 'Halte Bus',
  ticket_office: 'Loket Tiket',
  conference_centre: 'Pusat Konvensi',
  hookah_lounge: 'Lounge',
  photo_booth: 'Studio Foto',
  mall: 'Pusat Perbelanjaan / Mall',
  hotel: 'Hotel',
  toilet: 'Toilet Umum',
  museum: 'Museum',
  kindergarten: 'Pendidikan Anak',
  marketplace: 'Pasar Tradisional',
  university: 'Universitas / Kampus',
  hostel: 'Penginapan / Kost',
  government_service: 'Pelayanan Publik',
  library: 'Perpustakaan',
  park: 'Taman Kota',
  healthcare: 'Fasilitas Kesehatan',
};

function normalizeCategory(raw: string): string {
  if (CATEGORY_MAP[raw]) return CATEGORY_MAP[raw];
  return raw
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function extractDistrict(address: string | null, name: string): string {
  const text = `${address ?? ''} ${name}`.toLowerCase();
  if (text.includes('wonokromo')) return 'Wonokromo';
  if (text.includes('genteng')) return 'Genteng';
  if (text.includes('tegalsari')) return 'Tegalsari';
  if (text.includes('mulyorejo')) return 'Mulyorejo';
  if (text.includes('gubeng')) return 'Gubeng';
  if (text.includes('tambaksari') || text.includes('pacar keling')) return 'Tambaksari';
  if (text.includes('bubutan')) return 'Bubutan';
  if (text.includes('dukuh pakis') || text.includes('gunungsari')) return 'Dukuh Pakis';
  if (text.includes('wiyung') || text.includes('babatan') || text.includes('lontar') || text.includes('citraland')) return 'Wiyung';
  if (text.includes('sukolilo') || text.includes('manyar')) return 'Sukolilo';
  if (text.includes('rungkut')) return 'Rungkut';
  if (text.includes('gayungan') || text.includes('pagesangan') || text.includes('ketintang')) return 'Gayungan';
  if (text.includes('kenjeran') || text.includes('tanah merah')) return 'Kenjeran';
  if (text.includes('semampir') || text.includes('gembong')) return 'Semampir';
  if (text.includes('pabean cantian')) return 'Pabean Cantian';
  if (text.includes('sawahan') || text.includes('banyu urip')) return 'Sawahan';
  if (text.includes('tandes') || text.includes('manukan')) return 'Tandes';
  return 'Surabaya';
}

function calculateDistance(lat: number | null, lng: number | null): string {
  if (lat === null || lng === null) return 'Perlu geocoding';
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat - SURABAYA_CENTER.lat);
  const dLng = toRad(lng - SURABAYA_CENTER.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(SURABAYA_CENTER.lat)) *
      Math.cos(toRad(lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return `${d.toFixed(1).replace('.', ',')} km`;
}

function calculateSchematicXY(lat: number | null, lng: number | null): { x: number; y: number } {
  if (lat === null || lng === null) return { x: 50, y: 50 };
  const normX = ((lng - SURABAYA_BOUNDS.minLng) / (SURABAYA_BOUNDS.maxLng - SURABAYA_BOUNDS.minLng)) * 100;
  const normY = ((SURABAYA_BOUNDS.maxLat - lat) / (SURABAYA_BOUNDS.maxLat - SURABAYA_BOUNDS.minLat)) * 100;
  const clampedX = Math.max(8, Math.min(92, Math.round(normX)));
  const clampedY = Math.max(12, Math.min(88, Math.round(normY)));
  return { x: clampedX, y: clampedY };
}

function buildElementsChain(record: RawSeedRecord): ElementItem[] {
  const claims = record.pre_survey?.claims_for_elements ?? [];
  const features = record.pre_survey?.features ?? [];
  const wheelchair = record.pre_survey?.wheelchair;
  const toilet = record.pre_survey?.toilet_accessible;
  const tactile = record.pre_survey?.tactile_paving;

  const codes: ChainElementCode[] = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8'];

  return codes.map((code) => {
    const meta = CHAIN_ELEMENT_MAP[code];
    let note = 'Belum ada bukti foto atau verifikasi lapangan mandiri untuk elemen ini.';
    let isPreSurvey = false;
    const status: AccessibilityStatus = 'BELUM_DIKETAHUI';

    // Check specific claims
    if (claims.includes(meta.codeName)) {
      isPreSurvey = true;
      const relevantFeature = features.find((f) =>
        f.toLowerCase().includes(meta.label.toLowerCase()) ||
        f.toLowerCase().includes(code.toLowerCase())
      );
      note = relevantFeature
        ? `Pre-survey evidence: "${relevantFeature}" dilaporkan pada referensi awal. Belum diverifikasi langsung oleh tim Naviable.`
        : `Pre-survey evidence: Indikasi ${meta.label} tercantum pada dokumen pendukung awal. Belum diverifikasi langsung oleh tim Naviable.`;
    } else if (code === 'E1' && wheelchair === 'yes') {
      isPreSurvey = true;
      note = 'Pre-survey evidence: Akses masuk ramah kursi roda dilaporkan pada data awal. Belum diverifikasi langsung oleh tim Naviable.';
    } else if (code === 'E3' && toilet === 'yes') {
      isPreSurvey = true;
      note = 'Pre-survey evidence: Toilet disabilitas dilaporkan tersedia pada data awal. Belum diverifikasi langsung oleh tim Naviable.';
    } else if (code === 'E5' && tactile === 'yes') {
      isPreSurvey = true;
      note = 'Pre-survey evidence: Jalur pemandu dilaporkan tersedia pada data awal. Belum diverifikasi langsung oleh tim Naviable.';
    }

    return {
      code,
      label: meta.label,
      status,
      note,
      isPreSurveyEvidence: isPreSurvey,
    };
  });
}

function generateChainSummary(wheelchair: PreSurveyWheelchairStatus, hasCoords: boolean): string {
  if (!hasCoords) {
    return 'Pre-survey: Titik lokasi memerlukan koordinat geocoding sebelum audit lapangan.';
  }
  switch (wheelchair) {
    case 'yes':
      return 'Pre-survey: Akses kursi roda dilaporkan tersedia pada data awal. Belum diverifikasi tim Naviable.';
    case 'limited':
      return 'Pre-survey: Akses kursi roda terbatas dilaporkan. Memerlukan konfirmasi bukti lapangan.';
    case 'no':
      return 'Pre-survey: Akses kursi roda dilaporkan tidak memadai atau belum tersedia.';
    case 'unknown':
    default:
      return 'Pre-survey: Data aksesibilitas belum tercatat, masuk daftar prioritas survei komunitas.';
  }
}

export function loadSeedPlaces(): Place[] {
  const records = rawSeedData.records as RawSeedRecord[];

  return records.map((record: RawSeedRecord, index: number) => {
    const lat = typeof record.lat === 'number' && !isNaN(record.lat) ? record.lat : null;
    const lng = typeof record.lng === 'number' && !isNaN(record.lng) ? record.lng : null;
    const hasValidCoords = lat !== null && lng !== null;
    const needsGeocoding = Boolean(record.needs_geocoding) || !hasValidCoords;

    const wheelchairStatus: PreSurveyWheelchairStatus =
      record.pre_survey?.wheelchair === 'yes'
        ? 'yes'
        : record.pre_survey?.wheelchair === 'limited'
        ? 'limited'
        : record.pre_survey?.wheelchair === 'no'
        ? 'no'
        : 'unknown';

    const verificationStatus: PreSurveyVerificationStatus = needsGeocoding
      ? 'needs-geocoding'
      : record.verified_by_team
      ? 'verified'
      : 'pre-survey';

    let overall: AccessibilityStatus = 'BELUM_DIKETAHUI';
    if (wheelchairStatus === 'yes') overall = 'UTUH';
    else if (wheelchairStatus === 'limited') overall = 'TERHALANG';
    else if (wheelchairStatus === 'no') overall = 'TIDAK_ADA';

    const rawCategory = record.category ?? 'general';
    const category = normalizeCategory(rawCategory);
    const district = extractDistrict(record.address ?? null, record.name);
    const distance = calculateDistance(lat, lng);
    const { x, y } = calculateSchematicXY(lat, lng);
    const elements = buildElementsChain(record);
    const chainSummary = generateChainSummary(wheelchairStatus, hasValidCoords);

    const sourceName = record.source?.name ?? record.sources?.[0]?.name ?? 'OpenStreetMap';
    const sourceUrl = record.source?.url ?? record.sources?.[0]?.url ?? undefined;
    const sourceLicense = record.source?.license ?? 'ODbL 1.0';
    const retrievedAt = record.source?.retrieved_at ?? record.sources?.[0]?.retrieved_at ?? '2026-09-13';

    const evidenceLevel = record.evidence_level ?? 'community_reported';
    const evidenceLevelLabel = EVIDENCE_LEVEL_LABELS[evidenceLevel] ?? evidenceLevel;

    return {
      id: record.id ?? index + 1,
      name: record.name,
      category,
      rawCategory,
      district,
      address: record.address ?? null,
      distance,
      lat,
      lng,
      x,
      y,
      overall,
      wheelchairStatus,
      verificationStatus,
      features: record.pre_survey?.features ?? [],
      evidenceLevel,
      evidenceLevelLabel,
      sourceName,
      sourceUrl,
      sourceLicense,
      retrievedAt,
      verifiedByTeam: Boolean(record.verified_by_team),
      needsGeocoding,
      chainSummary,
      updated: '13 Sep 2026 (Pre-survey)',
      photos: 0,
      elements,
    };
  });
}
