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

export type ElementItem = {
  code: ChainElementCode;
  label: string;
  status: AccessibilityStatus;
  note: string;
  photoUrl?: string | null;
  lockedBy?: 'kontributor' | 'ai_draf';
};

export type Place = {
  id: number;
  name: string;
  category: string;
  district: string;
  address?: string;
  distance: string;
  lat: number;
  lng: number;
  x: number;
  y: number;
  overall: AccessibilityStatus;
  chainSummary: string;
  updated: string;
  photos: number;
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

export const CHAIN_ELEMENT_MAP: Record<ChainElementCode, { label: string; full: string }> = {
  E1: { label: 'Pintu / akses masuk', full: 'Entrance / Door Access' },
  E2: { label: 'Ramp', full: 'Ramp Access' },
  E3: { label: 'Toilet aksesibel', full: 'Accessible Toilet' },
  E4: { label: 'Lift', full: 'Elevator / Lift' },
  E5: { label: 'Jalur pemandu', full: 'Tactile / Guiding Path' },
  E6: { label: 'Parkir disabilitas', full: 'Accessible Parking' },
  E7: { label: 'Rambu / signage', full: 'Signage & Information' },
  E8: { label: 'Penyeberangan', full: 'Accessible Crossing' },
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
