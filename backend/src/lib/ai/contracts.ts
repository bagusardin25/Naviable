import { z } from "zod";
import { CHAIN_ELEMENTS, ELEMENT_STATUSES } from "../types.js";

export const AI_PROVIDER_NAMES = ["google", "openai", "openrouter"] as const;
export type AIProviderName = (typeof AI_PROVIDER_NAMES)[number];

export const VisualIntegritySchema = z.object({
  outcome: z.enum(["no_obvious_signs", "suspicious", "inconclusive"]),
  confidence: z.enum(["tinggi", "sedang", "rendah"]),
  reasons: z.array(z.string().max(500)).max(4),
}).strict();

/** Upper bound for the AI's plain-language photo description (shown to contributors and reviewers). */
export const PHOTO_DESCRIPTION_MAX = 600;

export const ModelAnalysisSchema = z.object({
  // Truncated rather than rejected: an over-long description must not fail the whole analysis
  // and trigger a provider failover. Missing (older/looser models) becomes an empty string.
  description: z.string().default("").transform(text => text.trim().slice(0, PHOTO_DESCRIPTION_MAX)),
  drafts: z.array(z.object({
    element: z.enum(CHAIN_ELEMENTS),
    status: z.enum(ELEMENT_STATUSES),
    confidence: z.enum(["tinggi", "sedang", "rendah"]),
    reason: z.string().max(1000),
  }).strict()).length(8).refine(items => new Set(items.map(item => item.element)).size === 8, "Setiap elemen harus unik"),
  needsMorePhotos: z.array(z.string().max(500)).max(8),
  visualIntegrity: VisualIntegritySchema,
}).strict();

export type ModelAnalysis = z.infer<typeof ModelAnalysisSchema>;
export type VisualIntegrity = z.infer<typeof VisualIntegritySchema>;

export type PhotoIntegritySignal = {
  source: "openai_provenance" | "visual_model";
  kind: "c2pa" | "synthid" | "visual_artifact" | "not_detected" | "check_unavailable";
  outcome: "detected" | "not_detected" | "suspicious" | "unavailable";
  detail: string;
};

export type PhotoIntegrityResult = {
  outcome: "trusted_ai_provenance" | "suspicious" | "inconclusive";
  confidence: "tinggi" | "sedang" | "rendah";
  signals: PhotoIntegritySignal[];
  recommendedAction: "allow" | "request_second_photo" | "request_new_capture";
  disclaimer: string;
};

export type AnalysisResult = ModelAnalysis & {
  provider: AIProviderName;
  attemptedProviders: AIProviderName[];
  photoIntegrity?: PhotoIntegrityResult;
  disclaimer: string;
};

export interface AIProvider {
  readonly name: AIProviderName;
  configured(): boolean;
  analyze(imageBase64: string, mimeType: string): Promise<unknown>;
}

export const MODEL_ANALYSIS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    // First, so the model describes what it sees before drafting element statuses.
    description: { type: "string" },
    drafts: {
      type: "array",
      minItems: 8,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          element: { type: "string", enum: [...CHAIN_ELEMENTS] },
          status: { type: "string", enum: [...ELEMENT_STATUSES] },
          confidence: { type: "string", enum: ["tinggi", "sedang", "rendah"] },
          reason: { type: "string" },
        },
        required: ["element", "status", "confidence", "reason"],
      },
    },
    needsMorePhotos: { type: "array", maxItems: 8, items: { type: "string" } },
    visualIntegrity: {
      type: "object",
      additionalProperties: false,
      properties: {
        outcome: { type: "string", enum: ["no_obvious_signs", "suspicious", "inconclusive"] },
        confidence: { type: "string", enum: ["tinggi", "sedang", "rendah"] },
        reasons: { type: "array", maxItems: 4, items: { type: "string" } },
      },
      required: ["outcome", "confidence", "reasons"],
    },
  },
  required: ["description", "drafts", "needsMorePhotos", "visualIntegrity"],
} as const;

export function normalizeModelAnalysis(input: unknown): ModelAnalysis {
  const parsed = ModelAnalysisSchema.parse(input);
  return {
    ...parsed,
    drafts: parsed.drafts.map(draft => draft.confidence === "rendah"
      ? { ...draft, status: "BELUM_DIKETAHUI" as const }
      : draft),
    visualIntegrity: parsed.visualIntegrity.outcome === "suspicious" && parsed.visualIntegrity.confidence === "rendah"
      ? { ...parsed.visualIntegrity, outcome: "inconclusive" as const }
      : parsed.visualIntegrity,
  };
}

export function inconclusiveIntegrity(detail = "Pemeriksaan provenance tidak tersedia atau tidak menemukan penanda yang didukung."): PhotoIntegrityResult {
  return {
    outcome: "inconclusive",
    confidence: "rendah",
    signals: [{ source: "openai_provenance", kind: "check_unavailable", outcome: "unavailable", detail }],
    recommendedAction: "allow",
    disclaimer: "Tidak ditemukannya penanda bukan bukti bahwa foto asli. Kontributor dan reviewer tetap harus memeriksa bukti lapangan.",
  };
}

export function mergePhotoIntegrity(provenance: PhotoIntegrityResult, visual: VisualIntegrity): PhotoIntegrityResult {
  if (provenance.outcome === "trusted_ai_provenance") return provenance;
  const visualSignal: PhotoIntegritySignal = {
    source: "visual_model",
    kind: "visual_artifact",
    outcome: visual.outcome === "suspicious" ? "suspicious" : "not_detected",
    detail: visual.reasons.join("; ") || (visual.outcome === "inconclusive"
      ? "Model tidak dapat menilai integritas visual foto."
      : "Tidak ada artefak sintetis yang jelas terlihat; ini bukan bukti keaslian."),
  };
  if (visual.outcome === "suspicious") {
    return {
      outcome: "suspicious",
      confidence: visual.confidence,
      signals: [...provenance.signals, visualSignal],
      recommendedAction: "request_second_photo",
      disclaimer: "Sinyal visual dapat keliru. Jangan menolak laporan hanya dari hasil model; minta foto kedua atau pemeriksaan reviewer.",
    };
  }
  return { ...provenance, signals: [...provenance.signals, visualSignal] };
}
