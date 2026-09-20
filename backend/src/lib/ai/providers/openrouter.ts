import type { AIProvider } from "../contracts.js";
import { MODEL_ANALYSIS_JSON_SCHEMA } from "../contracts.js";
import { ACCESSIBILITY_PHOTO_PROMPT } from "../prompt.js";

export const openRouterProvider: AIProvider = {
  name: "openrouter",
  configured: () => Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_MODEL),
  async analyze(imageBase64, mimeType) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL;
    if (!apiKey || !model) throw new Error("OpenRouter provider is not configured");
    const request = async (structured: boolean) => fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.PUBLIC_API_URL || "http://localhost:4000",
        "X-Title": "Naviable",
      },
      signal: AbortSignal.timeout(Number(process.env.AI_PROVIDER_TIMEOUT_MS ?? 30_000)),
      body: JSON.stringify({
        model,
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: structured
                ? ACCESSIBILITY_PHOTO_PROMPT
                : `${ACCESSIBILITY_PHOTO_PROMPT}\nKembalikan hanya satu objek JSON valid tanpa markdown yang persis mengikuti schema ini: ${JSON.stringify(MODEL_ANALYSIS_JSON_SCHEMA)}`,
            },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        }],
        ...(structured ? {
          response_format: {
            type: "json_schema",
            json_schema: { name: "naviable_photo_analysis", strict: true, schema: MODEL_ANALYSIS_JSON_SCHEMA },
          },
          provider: { require_parameters: true },
        } : {}),
        temperature: 0,
        max_tokens: 4096,
      }),
    });

    const structured = !model.endsWith(":free");
    let response = await request(structured);
    if (structured && (response.status === 400 || response.status === 404)) response = await request(false);
    if (!response.ok) {
      const errorBody = await response.json().catch(() => null) as { error?: { message?: unknown } } | null;
      const detail = typeof errorBody?.error?.message === "string" ? `: ${errorBody.error.message}` : "";
      throw new Error(`OpenRouter provider failed with status ${response.status}${detail}`);
    }
    const body = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
    const content = body.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("OpenRouter response did not contain structured output");
    const unfenced = content.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    const start = unfenced.indexOf("{");
    const end = unfenced.lastIndexOf("}");
    if (start < 0 || end < start) throw new Error("OpenRouter response did not contain a JSON object");
    return JSON.parse(unfenced.slice(start, end + 1));
  },
};
