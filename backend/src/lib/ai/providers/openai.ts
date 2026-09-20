import type { AIProvider } from "../contracts.js";
import { MODEL_ANALYSIS_JSON_SCHEMA } from "../contracts.js";
import { ACCESSIBILITY_PHOTO_PROMPT } from "../prompt.js";

function responseText(body: unknown): string {
  const value = body as { output_text?: unknown; output?: Array<{ content?: Array<{ type?: string; text?: unknown }> }> };
  if (typeof value.output_text === "string") return value.output_text;
  for (const item of value.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  throw new Error("OpenAI response did not contain structured output");
}

async function providerError(response: Response): Promise<Error> {
  const body = await response.json().catch(() => null) as { error?: { message?: unknown } } | null;
  const detail = typeof body?.error?.message === "string" ? `: ${body.error.message}` : "";
  return new Error(`OpenAI provider failed with status ${response.status}${detail}`);
}

export const openAIProvider: AIProvider = {
  name: "openai",
  configured: () => Boolean(process.env.OPENAI_API_KEY),
  async analyze(imageBase64, mimeType) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OpenAI provider is not configured");
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(Number(process.env.AI_PROVIDER_TIMEOUT_MS ?? 30_000)),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        store: false,
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: ACCESSIBILITY_PHOTO_PROMPT },
            { type: "input_image", image_url: `data:${mimeType};base64,${imageBase64}`, detail: "low" },
          ],
        }],
        text: { format: { type: "json_schema", name: "naviable_photo_analysis", strict: true, schema: MODEL_ANALYSIS_JSON_SCHEMA } },
        max_output_tokens: 4096,
      }),
    });
    if (!response.ok) throw await providerError(response);
    return JSON.parse(responseText(await response.json()));
  },
};
