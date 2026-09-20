import { GoogleGenAI, Type } from "@google/genai";
import type { AIProvider } from "../contracts.js";
import { ACCESSIBILITY_PHOTO_PROMPT } from "../prompt.js";

let client: GoogleGenAI | null = null;

function googleClient() {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Google AI provider is not configured");
    client = new GoogleGenAI({ apiKey, httpOptions: { timeout: Number(process.env.AI_PROVIDER_TIMEOUT_MS ?? 30_000) } });
  }
  return client;
}

export const googleProvider: AIProvider = {
  name: "google",
  configured: () => Boolean(process.env.GEMINI_API_KEY),
  async analyze(imageBase64, mimeType) {
    const response = await googleClient().models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
      contents: [{ role: "user", parts: [{ text: ACCESSIBILITY_PHOTO_PROMPT }, { inlineData: { mimeType, data: imageBase64 } }] }],
      config: {
        temperature: 0,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            drafts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  element: { type: Type.STRING },
                  status: { type: Type.STRING, enum: ["UTUH", "TERHALANG", "TIDAK_STANDAR", "TIDAK_ADA", "BELUM_DIKETAHUI"] },
                  confidence: { type: Type.STRING, enum: ["tinggi", "sedang", "rendah"] },
                  reason: { type: Type.STRING },
                },
                required: ["element", "status", "confidence", "reason"],
              },
            },
            needsMorePhotos: { type: Type.ARRAY, items: { type: Type.STRING } },
            visualIntegrity: {
              type: Type.OBJECT,
              properties: {
                outcome: { type: Type.STRING, enum: ["no_obvious_signs", "suspicious", "inconclusive"] },
                confidence: { type: Type.STRING, enum: ["tinggi", "sedang", "rendah"] },
                reasons: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["outcome", "confidence", "reasons"],
            },
          },
          required: ["drafts", "needsMorePhotos", "visualIntegrity"],
        },
      },
    });
    return JSON.parse(response.text ?? "{}");
  },
};
