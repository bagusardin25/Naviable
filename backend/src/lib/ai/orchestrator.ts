import { AI_PROVIDER_NAMES, normalizeModelAnalysis, type AIProvider, type AIProviderName, type AnalysisResult } from "./contracts.js";
import { googleProvider } from "./providers/google.js";
import { openAIProvider } from "./providers/openai.js";
import { openRouterProvider } from "./providers/openrouter.js";

const providersByName: Record<AIProviderName, AIProvider> = {
  google: googleProvider,
  openai: openAIProvider,
  openrouter: openRouterProvider,
};

export function configuredAIProviders() {
  return AI_PROVIDER_NAMES.filter(name => providersByName[name].configured());
}

export function orderedAIProviders() {
  const requested = (process.env.AI_PROVIDER_ORDER || "google,openai,openrouter")
    .split(",")
    .map(value => value.trim().toLowerCase())
    .filter((value): value is AIProviderName => AI_PROVIDER_NAMES.includes(value as AIProviderName));
  const unique = [...new Set(requested.length ? requested : AI_PROVIDER_NAMES)];
  return unique.map(name => providersByName[name]).filter(provider => provider.configured());
}

export async function analyzeWithProviders(
  imageBase64: string,
  mimeType: string,
  providers: AIProvider[] = orderedAIProviders(),
): Promise<AnalysisResult> {
  if (!providers.length) throw new Error("No AI provider is configured");
  const attemptedProviders: AIProviderName[] = [];
  for (const provider of providers) {
    attemptedProviders.push(provider.name);
    try {
      const analysis = normalizeModelAnalysis(await provider.analyze(imageBase64, mimeType));
      return {
        ...analysis,
        provider: provider.name,
        attemptedProviders,
        disclaimer: "Ini draf dari AI, bukan keputusan. Kontributor yang mengunci status akhir. AI tidak mengukur cm/kemiringan, dan pemeriksaan integritas visual bukan bukti keaslian.",
      };
    } catch {
      // Try the next configured provider. Provider details are intentionally not exposed to clients.
    }
  }
  throw new Error("All configured AI providers failed");
}
