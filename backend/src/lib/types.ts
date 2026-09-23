/**
 * Naviable core domain types — shared domain vocabulary.
 * Source of truth: konsep_naviable_diperdalam.md §6 — "Rantai 8 Elemen".
 * (The frontend has a mirrored copy at src/lib/types.ts with UI styling.)
 */

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

/**
 * 5 statuses replacing the journal's binary V/X (§6.2).
 * BELUM_DIKETAHUI = no evidence yet, excluded from score denominator (§6.3).
 */
export const ELEMENT_STATUSES = [
  "UTUH",
  "TERHALANG",
  "TIDAK_STANDAR",
  "TIDAK_ADA",
  "BELUM_DIKETAHUI",
] as const;

export type ElementStatus = (typeof ELEMENT_STATUSES)[number];

export const STATUS_WEIGHTS: Record<Exclude<ElementStatus, "BELUM_DIKETAHUI">, number> = {
  UTUH: 1.0,
  TIDAK_STANDAR: 0.5,
  TERHALANG: 0.25,
  TIDAK_ADA: 0,
};

export type ElementEvidence = {
  status: ElementStatus;
  aiConfidence?: "tinggi" | "sedang" | "rendah" | null;
  /** Who set the status: human-locked checklist is the product (§3) */
  lockedBy: "kontributor" | "ai_draf";
  photoUrl?: string | null;
  note?: string | null;
};

export type Place = {
  id: string;
  name: string;
  category: string;
  lat: number | null;
  lng: number | null;
  kelurahan: string | null;
  kecamatan: string | null;
  elements: Partial<Record<ChainElement, ElementEvidence>>;
  address: string | null;
  city: string;
  preSurvey: Record<string, unknown>;
  sources: { name?: string; url?: string; license?: string; retrieved_at?: string; [key: string]: unknown }[];
  evidenceLevel: string;
  verifiedByTeam: boolean;
  needsGeocoding: boolean;
  /** A contributor-added place stays off every public listing (map, search, observatory, CSV)
   *  until a reviewer approves one of its reports. Absent on seed places, which are public. */
  pendingApproval?: boolean;
  updatedAt: string | null;
  photoCount: number;
  reportCount: number;
};

/** Profile weights per §6.3 — relevance depends on travel need */
export const PROFILE_WEIGHTS: Record<string, Partial<Record<ChainElement, number>>> = {
  mobilitas: { E1_door: 2, E2_ramp: 2, E3_toilet: 2, E4_lift: 1.5, E6_parking: 1, E8_crossing: 1.5 },
  visual: { E5_guiding_block: 2, E7_signage: 2, E8_crossing: 2, E4_lift: 1 },
  auditori: { E7_signage: 2, E8_crossing: 2 },
  sensorik: { E7_signage: 2, E1_door: 1 },
};

export const USER_PROFILES = ["mobilitas", "visual", "auditori", "sensorik"] as const;
export type UserProfile = (typeof USER_PROFILES)[number];

// WHY: Calculate profile-weighted accessibility score (0-100).
// TRADE-OFF: We deliberately use 5 discrete statuses and dynamic profile weights
// rather than a single static score, because wheelchair users and blind users have
// completely different critical bottlenecks.
// WARNING: BELUM_DIKETAHUI must strictly be excluded from the denominator.
// Never penalize or artificially inflate compliance for elements that haven't been surveyed yet.
export function chainScore(
  elements: Place["elements"],
  profile: UserProfile
): number | null {
  const weights = PROFILE_WEIGHTS[profile] ?? {};
  let sum = 0;
  let max = 0;
  for (const [el, weight] of Object.entries(weights) as [ChainElement, number][]) {
    const status = elements[el]?.lockedBy === "kontributor" ? elements[el]!.status : "BELUM_DIKETAHUI";
    if (status === "BELUM_DIKETAHUI") continue;
    sum += STATUS_WEIGHTS[status] * weight;
    max += weight;
  }
  return max === 0 ? null : Math.round((sum / max) * 100);
}

/** Plain-Indonesian names for each chain element, for messages shown to people. */
export const CHAIN_ELEMENT_LABELS: Record<ChainElement, string> = {
  E1_door: "pintu",
  E2_ramp: "ramp",
  E3_toilet: "toilet",
  E4_lift: "lift",
  E5_guiding_block: "jalur pemandu",
  E6_parking: "parkir",
  E7_signage: "rambu",
  E8_crossing: "penyeberangan",
};

/** Honest summary sentence — shown WITH the score, never instead of it. */
export function chainSummary(elements: Place["elements"], profile?: UserProfile): string {
  const LABELS = CHAIN_ELEMENT_LABELS;
  const broken: string[] = [];
  let intact = 0;
  const relevant = profile ? Object.keys(PROFILE_WEIGHTS[profile]) as ChainElement[] : CHAIN_ELEMENTS;
  let unknown = 0;
  for (const el of relevant) {
    const status = elements[el]?.lockedBy === "kontributor" ? elements[el]!.status : "BELUM_DIKETAHUI";
    if (status === "BELUM_DIKETAHUI") unknown++;
    if (status === "TIDAK_ADA" || status === "TERHALANG" || status === "TIDAK_STANDAR") broken.push(LABELS[el]);
    else if (status === "UTUH") intact += 1;
  }
  if (broken.length === 0 && intact === 0)
    return "Belum ada bukti foto untuk lokasi ini — bantu petakan.";
  const uncertainty = unknown ? ` ${unknown} elemen belum diketahui.` : "";
  if (broken.length === 0) return `${intact} elemen dikonfirmasi utuh oleh kontributor.${uncertainty}`;
  return `Rantai perlu perhatian pada ${broken.join(", ")}.${uncertainty}`;
}

export function summarizePlace(place: Place, profile?: UserProfile) {
  const relevant = profile ? Object.keys(PROFILE_WEIGHTS[profile]) as ChainElement[] : CHAIN_ELEMENTS;
  const statuses = relevant.map(el => place.elements[el]?.lockedBy === "kontributor" ? place.elements[el]!.status : "BELUM_DIKETAHUI");
  const known = statuses.filter(s => s !== "BELUM_DIKETAHUI").length;
  const overall = (["TIDAK_ADA", "TERHALANG", "TIDAK_STANDAR", "BELUM_DIKETAHUI"] as const).find(s => statuses.includes(s)) ?? "UTUH";
  const bottlenecks = relevant.filter(el => {
    const s = place.elements[el]?.status;
    return s === "TERHALANG" || s === "TIDAK_STANDAR" || s === "TIDAK_ADA";
  });
  return {
    ...place,
    score: profile ? chainScore(place.elements, profile) : null,
    summary: chainSummary(place.elements, profile),
    overall,
    bottlenecks,
    coverage: { known, total: relevant.length }
  };
}

export type UserRole = "USER" | "REVIEWER";

export const REPORT_REVIEW_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "NEEDS_REVISION",
  "APPROVED",
  "REJECTED",
  "PUBLISHED",
] as const;

export type ReportReviewStatus = (typeof REPORT_REVIEW_STATUSES)[number];

