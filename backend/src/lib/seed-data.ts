import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { Place } from "./types.js";

const source = z.object({ name: z.string().optional(), url: z.url().optional(), license: z.string().optional(), retrieved_at: z.string().optional() }).passthrough();
const record = z.object({
  id: z.string(), name: z.string(), category: z.string(), address: z.string().nullable().optional(),
  lat: z.number().min(-90).max(90).nullable(), lng: z.number().min(-180).max(180).nullable(),
  kecamatan: z.string().nullable().optional(), kelurahan: z.string().nullable().optional(),
  pre_survey: z.record(z.string(), z.unknown()), evidence_level: z.string(),
  source: source.optional(), sources: z.array(source).optional(), needs_geocoding: z.boolean().optional(),
});
export async function loadSeed(): Promise<Place[]> {
  const raw = JSON.parse(await readFile(new URL("../../../data/surabaya-accessibility-seed.json", import.meta.url), "utf8"));
  const records = z.array(record).parse(raw.records);
  if (new Set(records.map(r => r.id)).size !== records.length) throw new Error("Duplicate seed IDs");
  return records.map(r => ({
    id: r.id, name: r.name, category: r.category, address: r.address ?? null, city: "Surabaya",
    lat: r.lat, lng: r.lng, kecamatan: r.kecamatan ?? null, kelurahan: r.kelurahan ?? null,
    preSurvey: r.pre_survey, sources: r.sources ?? (r.source ? [r.source] : []),
    evidenceLevel: r.evidence_level, verifiedByTeam: false,
    needsGeocoding: Boolean(r.needs_geocoding) || r.lat === null || r.lng === null,
    elements: {}, updatedAt: null, photoCount: 0, reportCount: 0,
  }));
}
