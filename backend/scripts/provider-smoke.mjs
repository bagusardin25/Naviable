import { readFile } from "node:fs/promises";
import { loadEnv } from "../dist/config.js";
import { normalizeModelAnalysis } from "../dist/lib/ai/contracts.js";
import { checkPhotoProvenance } from "../dist/lib/ai/provenance.js";
import { googleProvider } from "../dist/lib/ai/providers/google.js";
import { openAIProvider } from "../dist/lib/ai/providers/openai.js";
import { openRouterProvider } from "../dist/lib/ai/providers/openrouter.js";

loadEnv();

// The repository icon is a real, non-user image that vision providers can decode reliably.
const imageBytes = await readFile(new URL("../../frontend/src/app/icon.png", import.meta.url));
const image = imageBytes.toString("base64");
const providers = [googleProvider, openAIProvider, openRouterProvider];
let failed = false;

for (const provider of providers) {
  if (!provider.configured()) {
    console.log(`${provider.name}: not configured`);
    continue;
  }
  try {
    normalizeModelAnalysis(await provider.analyze(image, "image/png"));
    console.log(`${provider.name}: ok`);
  } catch (error) {
    failed = true;
    const message = error instanceof Error ? error.message.replace(/[A-Za-z0-9_-]{20,}/g, "[redacted]") : "unknown error";
    console.log(`${provider.name}: failed (${message})`);
  }
}

const provenance = await checkPhotoProvenance(imageBytes, "image/png");
const provenanceUnavailable = provenance.signals.every(signal => signal.kind === "check_unavailable");
console.log(`openai-provenance: ${provenanceUnavailable ? "unavailable" : "ok"} (${provenance.outcome})`);
if (provenanceUnavailable) failed = true;

if (failed) process.exitCode = 1;
