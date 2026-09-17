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

export type ProfileStatusFilter =
  | 'all'
  | 'UTUH'
  | 'TERHALANG'
  | 'TIDAK_STANDAR'
  | 'TIDAK_ADA'
  | 'BELUM_DIKETAHUI';

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
  updatedAt?: string | null;
  bottlenecks?: string[];
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

export const PROFILE_ELEMENT_MAP: Record<AccessibilityNeed, ChainElementCode[]> = {
  Mobilitas: ['E1', 'E2', 'E3', 'E4', 'E6', 'E8'],
  Visual: ['E5', 'E7', 'E8', 'E4'],
  Auditori: ['E7', 'E8', 'E1'],
  Sensorik: ['E7', 'E1'],
};

export type PlaceStatusResult = {
  status: AccessibilityStatus;
  label: string;
  short: string;
  symbol: string;
  color: string;
  pattern: string;
  ariaLabel: string;
  badgeClass: string;
  isPreSurvey: boolean;
};

// Evaluates a place's status dynamically according to active accessibility profile.
// NEVER falls back to wheelchairStatus for Visual, Auditori, or Sensorik users.
export function calculatePlaceProfileStatus(
  place: Place,
  profile: AccessibilityNeed = 'Mobilitas'
): PlaceStatusResult {
  const relevantCodes = PROFILE_ELEMENT_MAP[profile] ?? ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8'];
  const relevantElements = place.elements.filter((e) => relevantCodes.includes(e.code));
  const contributorElements = relevantElements.filter(
    (e) => e.lockedBy === 'kontributor' || (!e.isPreSurveyEvidence && e.status !== 'BELUM_DIKETAHUI')
  );

  if (contributorElements.length > 0) {
    if (contributorElements.some((e) => e.status === 'TIDAK_ADA')) {
      return {
        status: 'TIDAK_ADA',
        label: 'Bukti kontributor: Tidak ada',
        short: 'Elemen kunci tidak tersedia',
        symbol: '✕',
        color: '#df3a43',
        pattern: 'cross',
        ariaLabel: 'status tidak ada',
        badgeClass: 'status-tidak_ada',
        isPreSurvey: false,
      };
    }
    if (contributorElements.some((e) => e.status === 'TERHALANG')) {
      return {
        status: 'TERHALANG',
        label: 'Bukti kontributor: Terhalang',
        short: 'Elemen kunci terhalang',
        symbol: '!',
        color: '#e78a16',
        pattern: 'dashed',
        ariaLabel: 'status terhalang',
        badgeClass: 'status-terhalang',
        isPreSurvey: false,
      };
    }
    if (contributorElements.some((e) => e.status === 'TIDAK_STANDAR')) {
      return {
        status: 'TIDAK_STANDAR',
        label: 'Bukti kontributor: Tidak standar',
        short: 'Elemen berpotensi tidak aman/mandiri',
        symbol: '•',
        color: '#d4a100',
        pattern: 'dotted',
        ariaLabel: 'status tidak standar',
        badgeClass: 'status-tidak_standar',
        isPreSurvey: false,
      };
    }
    if (
      contributorElements.length === relevantCodes.length &&
      contributorElements.every((e) => e.status === 'UTUH')
    ) {
      return {
        status: 'UTUH',
        label: 'Bukti kontributor: Utuh',
        short: 'Dapat dipakai mandiri',
        symbol: '✓',
        color: '#16a25a',
        pattern: 'solid',
        ariaLabel: 'status utuh',
        badgeClass: 'status-utuh',
        isPreSurvey: false,
      };
    }
    const intactCount = contributorElements.filter((e) => e.status === 'UTUH').length;
    return {
      status: 'BELUM_DIKETAHUI',
      label: `Rantai belum lengkap (${intactCount}/${relevantCodes.length})`,
      short: 'Sebagian terkonfirmasi, sisanya belum diverifikasi',
      symbol: '?',
      color: '#7d8798',
      pattern: 'empty',
      ariaLabel: 'status belum lengkap',
      badgeClass: 'status-belum_diketahui',
      isPreSurvey: false,
    };
  }

  // Pre-survey baseline evaluation per profile
  if (profile === 'Mobilitas') {
    if (place.wheelchairStatus === 'yes') {
      return {
        status: 'UTUH',
        label: 'Pre-survey: Akses Kursi Roda Dilaporkan',
        short: 'Pre-survey: akses kursi roda dilaporkan tersedia',
        symbol: '✓',
        color: '#16a25a',
        pattern: 'solid',
        ariaLabel: 'pre-survey akses kursi roda dilaporkan',
        badgeClass: 'status-utuh',
        isPreSurvey: true,
      };
    }
    if (place.wheelchairStatus === 'limited') {
      return {
        status: 'TERHALANG',
        label: 'Pre-survey: Akses Terbatas Dilaporkan',
        short: 'Pre-survey: akses terbatas dilaporkan',
        symbol: '▲',
        color: '#e78a16',
        pattern: 'dashed',
        ariaLabel: 'pre-survey akses terbatas dilaporkan',
        badgeClass: 'status-terhalang',
        isPreSurvey: true,
      };
    }
    if (place.wheelchairStatus === 'no') {
      return {
        status: 'TIDAK_ADA',
        label: 'Pre-survey: Tidak Aksesibel Dilaporkan',
        short: 'Pre-survey: akses dilaporkan tidak memadai',
        symbol: '✕',
        color: '#df3a43',
        pattern: 'cross',
        ariaLabel: 'pre-survey tidak aksesibel',
        badgeClass: 'status-tidak_ada',
        isPreSurvey: true,
      };
    }
    return {
      status: 'BELUM_DIKETAHUI',
      label: 'Pre-survey: Belum Diketahui',
      short: 'Data akses mobilitas belum tercatat',
      symbol: '?',
      color: '#7d8798',
      pattern: 'empty',
      ariaLabel: 'pre-survey mobilitas belum diketahui',
      badgeClass: 'status-belum_diketahui',
      isPreSurvey: true,
    };
  }

  if (profile === 'Visual') {
    const hasTactile = place.elements.some((e) => e.code === 'E5' && e.isPreSurveyEvidence);
    if (hasTactile) {
      return {
        status: 'UTUH',
        label: 'Pre-survey: Jalur Pemandu Dilaporkan',
        short: 'Pre-survey: jalur pemandu dilaporkan ada',
        symbol: '✓',
        color: '#16a25a',
        pattern: 'solid',
        ariaLabel: 'pre-survey jalur pemandu dilaporkan',
        badgeClass: 'status-utuh',
        isPreSurvey: true,
      };
    }
    return {
      status: 'BELUM_DIKETAHUI',
      label: 'Belum Ada Bukti Visual',
      short: 'Jalur pemandu / rambu visual belum tercatat',
      symbol: '?',
      color: '#7d8798',
      pattern: 'empty',
      ariaLabel: 'bukti visual belum diketahui',
      badgeClass: 'status-belum_diketahui',
      isPreSurvey: true,
    };
  }

  if (profile === 'Auditori') {
    const hasSignage = place.elements.some((e) => e.code === 'E7' && e.isPreSurveyEvidence);
    if (hasSignage) {
      return {
        status: 'UTUH',
        label: 'Pre-survey: Signage Visual Dilaporkan',
        short: 'Pre-survey: informasi visual dilaporkan ada',
        symbol: '✓',
        color: '#16a25a',
        pattern: 'solid',
        ariaLabel: 'pre-survey signage dilaporkan',
        badgeClass: 'status-utuh',
        isPreSurvey: true,
      };
    }
    return {
      status: 'BELUM_DIKETAHUI',
      label: 'Belum Ada Bukti Auditori',
      short: 'Signage visual / pengumuman teks belum tercatat',
      symbol: '?',
      color: '#7d8798',
      pattern: 'empty',
      ariaLabel: 'bukti auditori belum diketahui',
      badgeClass: 'status-belum_diketahui',
      isPreSurvey: true,
    };
  }

  // Sensorik
  const hasSensory =
    place.elements.some((e) => e.code === 'E7' && e.isPreSurveyEvidence) ||
    place.features.some((f) => f.toLowerCase().includes('sensory') || f.toLowerCase().includes('quiet'));
  if (hasSensory) {
    return {
      status: 'UTUH',
      label: 'Pre-survey: Panduan Ruang Dilaporkan',
      short: 'Pre-survey: panduan ruang dilaporkan ada',
      symbol: '✓',
      color: '#16a25a',
      pattern: 'solid',
      ariaLabel: 'pre-survey panduan ruang dilaporkan',
      badgeClass: 'status-utuh',
      isPreSurvey: true,
    };
  }
  return {
    status: 'BELUM_DIKETAHUI',
    label: 'Belum Ada Bukti Sensorik',
    short: 'Informasi sensorik ruang belum tercatat',
    symbol: '?',
    color: '#7d8798',
    pattern: 'empty',
    ariaLabel: 'bukti sensorik belum diketahui',
    badgeClass: 'status-belum_diketahui',
    isPreSurvey: true,
  };
}

export function placeStatusMeta(
  place: Place,
  profile: AccessibilityNeed = 'Mobilitas'
): PlaceStatusResult {
  return calculatePlaceProfileStatus(place, profile);
}

// Evidence Freshness model
export type EvidenceFreshnessLevel = 'fresh' | 'aging' | 'stale' | 'presurvey';

export type EvidenceFreshness = {
  level: EvidenceFreshnessLevel;
  label: string;
  badgeClass: string;
  daysAgo: number | null;
  symbol: string;
};

export function getEvidenceFreshness(updatedAt?: string | null): EvidenceFreshness {
  if (!updatedAt) {
    return {
      level: 'presurvey',
      label: 'Pre-survey Baseline',
      badgeClass: 'freshness-presurvey',
      daysAgo: null,
      symbol: '📋',
    };
  }
  const date = new Date(updatedAt);
  if (isNaN(date.getTime())) {
    return {
      level: 'presurvey',
      label: 'Pre-survey Baseline',
      badgeClass: 'freshness-presurvey',
      daysAgo: null,
      symbol: '📋',
    };
  }
  const diffDays = Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)));
  if (diffDays <= 90) {
    return {
      level: 'fresh',
      label: `Segar (≤ 90 hr)`,
      badgeClass: 'freshness-fresh',
      daysAgo: diffDays,
      symbol: '🟢',
    };
  }
  if (diffDays <= 365) {
    return {
      level: 'aging',
      label: `Menua (${Math.max(1, Math.round(diffDays / 30))} bln)`,
      badgeClass: 'freshness-aging',
      daysAgo: diffDays,
      symbol: '🟡',
    };
  }
  return {
    level: 'stale',
    label: `Kedaluwarsa (> 1 thn)`,
    badgeClass: 'freshness-stale',
    daysAgo: diffDays,
    symbol: '⚪',
  };
}

// Conflict / Condition Change Detection
export type ConditionChange = {
  elementCode: string;
  elementLabel: string;
  previousStatus: AccessibilityStatus;
  currentStatus: AccessibilityStatus;
  previousDate: string;
  currentDate: string;
  currentReporter: string;
  previousReporter: string;
};

export function detectConditionChanges(
  reports: Array<{
    createdAt: string;
    reporterName: string;
    elements: Array<{ element: string; status: AccessibilityStatus; note?: string }>;
  }>
): ConditionChange[] {
  if (!reports || reports.length < 2) return [];
  const changes: ConditionChange[] = [];
  const checkedElements = new Set<string>();

  for (let i = 0; i < reports.length - 1; i++) {
    const current = reports[i];
    for (const curEl of current.elements) {
      if (checkedElements.has(curEl.element)) continue;
      for (let j = i + 1; j < reports.length; j++) {
        const prev = reports[j];
        const prevEl = prev.elements.find((e) => e.element === curEl.element);
        if (prevEl) {
          checkedElements.add(curEl.element);
          if (curEl.status !== prevEl.status) {
            // lookup human label
            const code = curEl.element.split('_')[0] as ChainElementCode;
            const elementLabel = CHAIN_ELEMENT_MAP[code]?.label ?? curEl.element;
            changes.push({
              elementCode: curEl.element,
              elementLabel,
              previousStatus: prevEl.status,
              currentStatus: curEl.status,
              previousDate: prev.createdAt,
              currentDate: current.createdAt,
              currentReporter: current.reporterName,
              previousReporter: prev.reporterName,
            });
          }
          break;
        }
      }
    }
  }
  return changes;
}

export type JourneyPoint = {
  id: string;
  name: string;
  category: string;
  lat: number | null;
  lng: number | null;
  overall: AccessibilityStatus;
  score: number | null;
  summary: string;
  bottlenecks?: string[];
  coverage?: { known: number; total: number };
  address?: string | null;
  kecamatan?: string | null;
  kelurahan?: string | null;
  role?: 'origin' | 'transit' | 'destination';
};

export type JourneyResponse = {
  points: JourneyPoint[];
  profile: string;
  hasBottlenecks: boolean;
  bottleneckCount: number;
  geometry: null;
  routing: false;
  disclaimer: string;
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

