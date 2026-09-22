import { CHAIN_ELEMENT_LABELS, type ChainElement } from "../types.js";
import type { ModelAnalysis } from "./contracts.js";
import type { ReportInput } from "../validation.js";

export type PhotoElementMatch = {
  /** False only when the model clearly could not find ANY claimed element in the photo. */
  matches: boolean;
  /** Elements the contributor asserted a definite status for (BELUM_DIKETAHUI is not a claim). */
  claimed: ChainElement[];
  /** Claimed elements the model could actually see. */
  supported: ChainElement[];
  /** Claimed elements the model could not find in the photo. */
  unsupported: ChainElement[];
  /** Short, human-readable reason, safe to show a contributor. */
  detail: string;
};

/**
 * Decides whether an uploaded photo actually shows the access element the contributor
 * picked — the "is this photo even about the chosen dimension?" question.
 *
 * WHY this rule: `normalizeModelAnalysis` already downgrades any low-confidence draft to
 * BELUM_DIKETAHUI, so "the model returned BELUM_DIKETAHUI for element X" is precisely
 * "the model could not see X in this photo". We deliberately do NOT compare the contributor's
 * status against the model's status: a disagreement (contributor says TERHALANG, model says
 * UTUH) is a judgement call that belongs to a human reviewer, not an automatic rejection.
 * Only a photo that shows none of the claimed elements is auto-flagged.
 */
export function matchPhotoToElements(
  analysis: ModelAnalysis,
  elements: ReportInput["elements"],
): PhotoElementMatch {
  const claimed = elements
    .filter(item => item.status !== "BELUM_DIKETAHUI")
    .map(item => item.element as ChainElement);

  // Nothing definite was asserted, so there is nothing for the photo to contradict.
  if (!claimed.length) {
    return { matches: true, claimed, supported: [], unsupported: [], detail: "Tidak ada kondisi pasti yang diklaim untuk diperiksa." };
  }

  const supported: ChainElement[] = [];
  const unsupported: ChainElement[] = [];
  for (const element of claimed) {
    const draft = analysis.drafts.find(item => item.element === element);
    // A missing draft means the model said nothing about this element; treat it as unseen.
    if (draft && draft.status !== "BELUM_DIKETAHUI") supported.push(element);
    else unsupported.push(element);
  }

  const label = (element: ChainElement) => CHAIN_ELEMENT_LABELS[element] ?? element;
  if (supported.length) {
    return {
      matches: true,
      claimed,
      supported,
      unsupported,
      detail: `Foto menunjukkan ${supported.map(label).join(", ")}.`,
    };
  }
  return {
    matches: false,
    claimed,
    supported,
    unsupported,
    detail: `Foto tidak memperlihatkan ${unsupported.map(label).join(", ")} yang Anda pilih.`,
  };
}

/** The automated reviewer note a contributor sees in their profile after a mismatch. */
export function mismatchNote(match: PhotoElementMatch): string {
  const labels = match.unsupported.map(element => CHAIN_ELEMENT_LABELS[element] ?? element).join(", ");
  return [
    `Pemeriksaan otomatis: foto yang diunggah sepertinya tidak memperlihatkan ${labels} yang Anda pilih.`,
    "Mohon unggah ulang foto yang menampilkan elemen tersebut dengan jelas, atau ubah pilihan elemen agar sesuai isi foto.",
    "Pemeriksaan ini dibantu AI dan bisa keliru — jika menurut Anda foto sudah benar, kirim ulang dan tim reviewer akan memeriksanya secara manual.",
  ].join(" ");
}

/** Label used as the "reviewer" for automated decisions, to distinguish them from humans. */
export const AI_REVIEWER_LABEL = "naviable-ai";
