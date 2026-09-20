import { createHash } from "node:crypto";
import { z } from "zod";
import { inconclusiveIntegrity, type PhotoIntegrityResult, type PhotoIntegritySignal } from "./contracts.js";

const ProvenanceResponse = z.object({
  results: z.array(z.object({
    outcome: z.string(),
    type: z.string(),
    issuer: z.string().nullish(),
    model: z.string().nullish(),
    validation_state: z.string().nullish(),
  }).passthrough()),
}).passthrough();

const cache = new Map<string, { expiresAt: number; result: PhotoIntegrityResult }>();

function extension(mimeType: string) {
  return mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : "webp";
}

export async function checkPhotoProvenance(bytes: Buffer, mimeType: string): Promise<PhotoIntegrityResult> {
  const hash = createHash("sha256").update(bytes).digest("hex");
  const cached = cache.get(hash);
  if (cached && cached.expiresAt > Date.now()) return structuredClone(cached.result);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return inconclusiveIntegrity("Pemeriksaan provenance belum dikonfigurasi.");
  try {
    const form = new FormData();
    form.set("file", new Blob([bytes], { type: mimeType }), `photo.${extension(mimeType)}`);
    const response = await fetch("https://api.openai.com/v1/content_provenance_checks", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(Number(process.env.PHOTO_INTEGRITY_TIMEOUT_MS ?? 8_000)),
    });
    if (!response.ok) throw new Error(`Provenance check failed with status ${response.status}`);
    const parsed = ProvenanceResponse.parse(await response.json());
    const signals: PhotoIntegritySignal[] = parsed.results.map(result => ({
      source: "openai_provenance",
      kind: result.type.toLowerCase() === "synthid" ? "synthid" : result.type.toLowerCase() === "c2pa" ? "c2pa" : "not_detected",
      outcome: result.outcome === "detected" ? "detected" : "not_detected",
      detail: result.outcome === "detected"
        ? `Penanda ${result.type.toUpperCase()} terdeteksi${result.issuer ? ` dari ${result.issuer}` : ""}${result.model ? ` (${result.model})` : ""}.`
        : `Penanda ${result.type.toUpperCase()} yang didukung tidak terdeteksi.`,
    }));
    const trustedDetection = parsed.results.some(result => result.outcome === "detected" && (!result.validation_state || result.validation_state === "trusted"));
    const result: PhotoIntegrityResult = trustedDetection ? {
      outcome: "trusted_ai_provenance",
      confidence: "tinggi",
      signals,
      recommendedAction: "request_new_capture",
      disclaimer: "Foto memiliki penanda provenance AI yang didukung dan tidak dapat digunakan sebagai bukti lapangan. Ambil foto baru dari lokasi.",
    } : {
      outcome: "inconclusive",
      confidence: "rendah",
      signals: signals.length ? signals : [{ source: "openai_provenance", kind: "not_detected", outcome: "not_detected", detail: "Tidak ada penanda provenance yang didukung pada respons provider." }],
      recommendedAction: "allow",
      disclaimer: "Tidak ditemukannya penanda bukan bukti bahwa foto asli. Metadata atau watermark dapat hilang, dan generator lain mungkin tidak terdeteksi.",
    };
    cache.set(hash, { expiresAt: Date.now() + 10 * 60_000, result });
    return structuredClone(result);
  } catch {
    return inconclusiveIntegrity("Pemeriksaan provenance sedang tidak tersedia; laporan tetap memerlukan verifikasi manusia.");
  }
}
