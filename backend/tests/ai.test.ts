import test from "node:test";
import assert from "node:assert/strict";
import { analyzeWithProviders } from "../src/lib/ai/orchestrator.js";
import { CHAIN_ELEMENTS } from "../src/lib/types.js";
import { mergePhotoIntegrity, type AIProvider, type PhotoIntegrityResult } from "../src/lib/ai/contracts.js";

function validAnalysis() {
  return {
    drafts: CHAIN_ELEMENTS.map((element, index) => ({
      element,
      status: index === 0 ? "UTUH" : "BELUM_DIKETAHUI",
      confidence: index === 0 ? "rendah" : "sedang",
      reason: "Hanya hasil fixture.",
    })),
    needsMorePhotos: [],
    visualIntegrity: { outcome: "no_obvious_signs", confidence: "rendah", reasons: [] },
  };
}

test("AI orchestrator fails over and normalizes low-confidence accessibility drafts", async () => {
  const google: AIProvider = { name: "google", configured: () => true, analyze: async () => { throw new Error("timeout"); } };
  const openai: AIProvider = { name: "openai", configured: () => true, analyze: async () => validAnalysis() };
  const result = await analyzeWithProviders("image", "image/png", [google, openai]);
  assert.equal(result.provider, "openai");
  assert.deepEqual(result.attemptedProviders, ["google", "openai"]);
  assert.equal(result.drafts[0].status, "BELUM_DIKETAHUI");
});

test("visual suspicion requests a second photo but trusted provenance takes precedence", () => {
  const inconclusive: PhotoIntegrityResult = {
    outcome: "inconclusive", confidence: "rendah", recommendedAction: "allow",
    signals: [], disclaimer: "Tidak pasti.",
  };
  const suspicious = mergePhotoIntegrity(inconclusive, { outcome: "suspicious", confidence: "sedang", reasons: ["Teks pada rambu tidak konsisten."] });
  assert.equal(suspicious.outcome, "suspicious");
  assert.equal(suspicious.recommendedAction, "request_second_photo");

  const trusted: PhotoIntegrityResult = {
    outcome: "trusted_ai_provenance", confidence: "tinggi", recommendedAction: "request_new_capture",
    signals: [], disclaimer: "AI terverifikasi.",
  };
  assert.equal(mergePhotoIntegrity(trusted, { outcome: "no_obvious_signs", confidence: "tinggi", reasons: [] }).outcome, "trusted_ai_provenance");
});
