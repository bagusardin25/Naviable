export type AccessibilityStatus =
  | 'UTUH'
  | 'TERHALANG'
  | 'TIDAK_STANDAR'
  | 'TIDAK_ADA'
  | 'BELUM_DIKETAHUI';

export type ChainElementCode =
  | 'E1'
  | 'E2'
  | 'E3'
  | 'E4'
  | 'E5'
  | 'E6'
  | 'E7'
  | 'E8';

export type AccessibilityNeed = 'Mobilitas' | 'Visual' | 'Auditori' | 'Sensorik';

export type Screen = 'map' | 'report' | 'dashboard' | 'profile';

export type PreSurveyWheelchairStatus = 'yes' | 'limited' | 'no' | 'unknown';

export type PreSurveyVerificationStatus = 'verified' | 'pre-survey' | 'needs-geocoding';

export type PreSurveyFilter =
  | 'all'
  | 'yes'
  | 'limited'
  | 'no'
  | 'unknown'
  | 'needs-geocoding';

export type ElementItem = {
  code: ChainElementCode;
  label: string;
  status: AccessibilityStatus;
  note: string;
  photoUrl?: string | null;
  lockedBy?: 'kontributor' | 'ai_draf';
  isPreSurveyEvidence?: boolean;
};

export type Place = {
  id: string | number;
  name: string;
  category: string;
  rawCategory: string;
  district: string;
  address?: string | null;
  distance: string;
  lat: number | null;
  lng: number | null;
  x: number;
  y: number;
  overall: AccessibilityStatus;
  wheelchairStatus: PreSurveyWheelchairStatus;
  verificationStatus: PreSurveyVerificationStatus;
  features: string[];
  evidenceLevel: string;
  evidenceLevelLabel: string;
  sourceName?: string;
  sourceUrl?: string;
  sourceLicense?: string;
  retrievedAt?: string;
  verifiedByTeam: boolean;
  needsGeocoding: boolean;
  chainSummary: string;
  updated: string;
  photos: number;
  reportCount?: number;
  score?: number | null;
  coverage?: { known: number; total: number };
  elements: ElementItem[];
};

export type StatusMeta = {
  label: string;
  short: string;
  symbol: string;
  color: string;
  pattern: string;
};

export const STATUS_META: Record<AccessibilityStatus, StatusMeta> = {
  UTUH: {
    label: 'Utuh',
    short: 'Dapat dipakai mandiri',
    symbol: '✓',
    color: '#16a25a',
    pattern: 'solid',
  },
  TERHALANG: {
    label: 'Terhalang',
    short: 'Ada, tetapi sedang terhalang',
    symbol: '!',
    color: '#e78a16',
    pattern: 'dashed',
  },
  TIDAK_STANDAR: {
    label: 'Tidak standar',
    short: 'Ada, tetapi berpotensi tidak aman/mandiri',
    symbol: '•',
    color: '#d4a100',
    pattern: 'dotted',
  },
  TIDAK_ADA: {
    label: 'Tidak ada',
    short: 'Elemen belum tersedia',
    symbol: '×',
    color: '#df3a43',
    pattern: 'cross',
  },
  BELUM_DIKETAHUI: {
    label: 'Belum diketahui',
    short: 'Belum ada bukti yang cukup',
    symbol: '?',
    color: '#7d8798',
    pattern: 'empty',
  },
};

export type WheelchairStatusMeta = {
  label: string;
  short: string;
  symbol: string;
  color: string;
  pattern: string;
  ariaLabel: string;
  badgeClass: string;
};

export const WHEELCHAIR_STATUS_META: Record<PreSurveyWheelchairStatus, WheelchairStatusMeta> = {
  yes: {
    label: 'Akses Kursi Roda Dilaporkan',
    short: 'Pre-survey: akses kursi roda dilaporkan tersedia',
    symbol: '✓',
    color: '#16a25a',
    pattern: 'solid',
    ariaLabel: 'pre-survey wheelchair access reported',
    badgeClass: 'status-utuh',
  },
  limited: {
    label: 'Akses Terbatas Dilaporkan',
    short: 'Pre-survey: akses kursi roda terbatas dilaporkan',
    symbol: '▲',
    color: '#e78a16',
    pattern: 'dashed',
    ariaLabel: 'pre-survey limited wheelchair access reported',
    badgeClass: 'status-terhalang',
  },
  no: {
    label: 'Tidak Aksesibel Dilaporkan',
    short: 'Pre-survey: akses kursi roda dilaporkan tidak tersedia',
    symbol: '✕',
    color: '#df3a43',
    pattern: 'cross',
    ariaLabel: 'pre-survey wheelchair access reported unavailable',
    badgeClass: 'status-tidak_ada',
  },
  unknown: {
    label: 'Belum Diketahui',
    short: 'Pre-survey: data aksesibilitas belum diketahui',
    symbol: '?',
    color: '#7d8798',
    pattern: 'empty',
    ariaLabel: 'pre-survey accessibility unknown',
    badgeClass: 'status-belum_diketahui',
  },
};

export function placeStatusMeta(place: Place): WheelchairStatusMeta {
  if (!place.reportCount) return WHEELCHAIR_STATUS_META[place.wheelchairStatus];
  const meta = STATUS_META[place.overall];
  return { ...meta, label: `Bukti kontributor: ${meta.label}`, ariaLabel: meta.label, badgeClass: `status-${place.overall.toLowerCase()}` };
}

export const CHAIN_ELEMENT_MAP: Record<ChainElementCode, { label: string; full: string; codeName: string }> = {
  E1: { label: 'Pintu / akses masuk', full: 'Entrance / Door Access', codeName: 'E1_door' },
  E2: { label: 'Ramp', full: 'Ramp Access', codeName: 'E2_ramp' },
  E3: { label: 'Toilet aksesibel', full: 'Accessible Toilet', codeName: 'E3_toilet' },
  E4: { label: 'Lift', full: 'Elevator / Lift', codeName: 'E4_lift' },
  E5: { label: 'Jalur pemandu', full: 'Tactile / Guiding Path', codeName: 'E5_guiding_block' },
  E6: { label: 'Parkir disabilitas', full: 'Accessible Parking', codeName: 'E6_parking' },
  E7: { label: 'Rambu / signage', full: 'Signage & Information', codeName: 'E7_signage' },
  E8: { label: 'Penyeberangan', full: 'Accessible Crossing', codeName: 'E8_crossing' },
};

export const EVIDENCE_LEVEL_LABELS: Record<string, string> = {
  community_reported: 'Community reported (OpenStreetMap)',
  official_documentation: 'Official documentation',
  research_documentation: 'Research documentation',
  government_registry: 'Government registry',
  news_report: 'News report',
  operator_statement_reported_by_news: 'Operator statement reported by news',
};

export type AccessibilitySettings = {
  contrast: boolean;
  largeText: boolean;
  reduceMotion: boolean;
  dyslexia: boolean;
};

export type ReportDraft = {
  placeName: string;
  elementCode: ChainElementCode;
  status: AccessibilityStatus;
  note: string;
  photoUrl?: string | null;
};
