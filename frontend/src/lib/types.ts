/**
 * AbleMap core domain types.
 * Source of truth: konsep_ablemap_diperdalam.md §6 — "Rantai 8 Elemen".
 *
 * Data unit is NOT a single score, but a chain of 8 elements,
 * each with one of 5 statuses. The score is only a summary.
 */

/** E1–E8 elements from Pebriyanti (2020) Table 2, extended with quality status */
export const CHAIN_ELEMENTS = [
  "E1_door",
  "E2_ramp",
  "E3_toilet",
  "E4_lift",
  "E5_guiding_block",
  "E6_parking",
  "E7_signage",
  "E8_crossing",
] as const;

export type ChainElement = (typeof CHAIN_ELEMENTS)[number];

export const CHAIN_ELEMENT_LABELS: Record<ChainElement, string> = {
  E1_door: "Pintu / akses masuk",
  E2_ramp: "Ramp",
  E3_toilet: "Toilet aksesibel",
  E4_lift: "Lift",
  E5_guiding_block: "Jalur pemandu",
  E6_parking: "Parkir disabilitas",
  E7_signage: "Rambu / signage",
  E8_crossing: "Penyeberangan",
};

/**
 * 5 statuses replacing the journal's binary V/X (§6.2).
 * UTUH       — exists and usable independently
 * TERHALANG  — exists but blocked (PKL, parking, broken)
 * TIDAK_STANDAR — exists but likely fails safety/independence
 * TIDAK_ADA  — needed element not found
 * BELUM_DIKETAHUI — no photo evidence yet (excluded from score denominator)
 */
export const ELEMENT_STATUSES = [
  "UTUH",
  "TERHALANG",
  "TIDAK_STANDAR",
  "TIDAK_ADA",
  "BELUM_DIKETAHUI",
] as const;

export type ElementStatus = (typeof ELEMENT_STATUSES)[number];

/** Score weights per §6.3: UTUH=1.0, TIDAK_STANDAR=0.5, TERHALANG=0.25, TIDAK_ADA=0 */
export const STATUS_WEIGHTS: Record<Exclude<ElementStatus, "BELUM_DIKETAHUI">, number> = {
  UTUH: 1.0,
  TIDAK_STANDAR: 0.5,
  TERHALANG: 0.25,
  TIDAK_ADA: 0,
};

/** Visual encoding: color + pattern + label (never color alone — §14 accessibility) */
export const STATUS_STYLE: Record<
  ElementStatus,
  { color: string; pattern: string; label: string }
> = {
  UTUH: { color: "#16a34a", pattern: "solid", label: "Bisa digunakan" },
  TERHALANG: { color: "#ea580c", pattern: "dashed", label: "Terhalang" },
  TIDAK_STANDAR: { color: "#ca8a04", pattern: "dotted", label: "Perlu perhatian" },
  TIDAK_ADA: { color: "#dc2626", pattern: "cross", label: "Tidak tersedia" },
  BELUM_DIKETAHUI: { color: "#6b7280", pattern: "empty", label: "Belum diketahui" },
};

/** User travel-need profiles (§6.3) — filter basis, not medical labels */
export const USER_PROFILES = [
  "mobilitas", // wheelchair — weighs E1–E4, E6, E8
  "visual", // tunanetra — weighs E5, E7, E8, E4
  "auditori", // weighs E7, E8 (visual signals)
  "sensorik", // cognitive/sensory — signage clarity, simple routes
] as const;

export type UserProfile = (typeof USER_PROFILES)[number];

export const USER_PROFILE_LABELS: Record<UserProfile, string> = {
  mobilitas: "Kursi roda",
  visual: "Tunanetra",
  auditori: "Tunarungu",
  sensorik: "Sensorik",
};

export type ElementEvidence = {
  status: ElementStatus;
  /** AI suggestion confidence before human lock: tinggi | sedang | rendah */
  aiConfidence?: "tinggi" | "sedang" | "rendah" | null;
  /** Who locked the status: human-locked checklist is the product (§3) */
  lockedBy: "kontributor" | "ai_draf";
  photoUrl?: string | null;
  note?: string | null;
};

export type Place = {
  id: string;
  name: string;
  category: string;
  /** PostGIS geography(Point, 4326) exposed as lat/lng */
  lat: number;
  lng: number;
  kelurahan: string | null;
  kecamatan: string | null;
  elements: Partial<Record<ChainElement, ElementEvidence>>;
};

/** Honest summary sentence — always shown WITH the score, never instead of it (§6.3) */
export function chainSummary(place: Place): string {
  const entries = CHAIN_ELEMENTS.map((el) => ({
    el,
    status: place.elements[el]?.status ?? "BELUM_DIKETAHUI",
  }));
  const broken = entries.filter(
    (e) => e.status === "TIDAK_ADA" || e.status === "TERHALANG"
  );
  const intact = entries.filter((e) => e.status === "UTUH");

  if (broken.length === 0 && intact.length === 0) {
    return "Belum ada informasi akses untuk tempat ini.";
  }
  if (broken.length === 0) {
    return `${intact.length} titik akses dilaporkan bisa digunakan.`;
  }
  const brokenNames = broken
    .map((b) => CHAIN_ELEMENT_LABELS[b.el].toLowerCase())
    .join(", ");
  return `Akses terputus di ${brokenNames}.`;
}

/** Weighted summary score. BELUM_DIKETAHUI excluded from denominator (§6.3). */
export function chainScore(place: Place, profile: UserProfile): number | null {
  const profileWeights: Record<UserProfile, Partial<Record<ChainElement, number>>> = {
    mobilitas: { E1_door: 2, E2_ramp: 2, E3_toilet: 2, E4_lift: 1.5, E6_parking: 1, E8_crossing: 1.5 },
    visual: { E5_guiding_block: 2, E7_signage: 2, E8_crossing: 2, E4_lift: 1 },
    auditori: { E7_signage: 2, E8_crossing: 2 },
    sensorik: { E7_signage: 2, E1_door: 1 },
  };
  const weights = profileWeights[profile];

  let sum = 0;
  let max = 0;
  for (const [el, weight] of Object.entries(weights) as [ChainElement, number][]) {
    const status = place.elements[el]?.status ?? "BELUM_DIKETAHUI";
    if (status === "BELUM_DIKETAHUI") continue; // excluded from denominator
    sum += STATUS_WEIGHTS[status] * weight;
    max += weight;
  }
  return max === 0 ? null : Math.round((sum / max) * 100);
}
