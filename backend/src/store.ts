import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Place } from "./lib/types.js";
import type { ReportInput, decodePhoto } from "./lib/validation.js";
import { ApiError } from "./lib/errors.js";
import { loadSeed } from "./lib/seed-data.js";

export type Photo = ReturnType<typeof decodePhoto>;
export type Report = {
  id: string; placeId: string; actorId: string; reporterName: string; requestKey: string; inputHash: string;
  elements: ReportInput["elements"]; photoPath: string; mimeType: string; createdAt: string;
};
export type PublishInput = Omit<Report, "id" | "photoPath" | "mimeType" | "createdAt">;
export interface Store {
  listPlaces(): Promise<Place[]>;
  getPlace(id: string): Promise<Place | undefined>;
  listReports(placeId: string, limit?: number, offset?: number): Promise<Report[]>;
  getReport(id: string): Promise<Report | undefined>;
  contributions(actorId: string): Promise<{ total: number; reports: Report[] }>;
  publish(input: PublishInput, photo: Photo): Promise<{ report: Report; replayed: boolean }>;
  photo(report: Report): Promise<{ bytes: Buffer; mimeType: string } | { url: string }>;
  health(): Promise<void>;
}

type State = { version: 1; places: Place[]; reports: Report[] };
export class LocalStore implements Store {
  private state!: State;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private directory: string) {}
  async init() {
    await mkdir(join(this.directory, "photos"), { recursive: true });
    try {
      this.state = JSON.parse(await readFile(join(this.directory, "database.json"), "utf8"));
      if (this.state.version !== 1 || !Array.isArray(this.state.places) || !Array.isArray(this.state.reports)) throw new Error("Unsupported local database");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      this.state = { version: 1, places: await loadSeed(), reports: [] };
      await this.persist(this.state);
    }
    return this;
  }
  private async persist(state: State) {
    const temporary = join(this.directory, `database-${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, JSON.stringify(state), { flag: "wx" });
      await rename(temporary, join(this.directory, "database.json"));
    } finally { await unlink(temporary).catch(() => {}); }
  }
  async listPlaces() { return structuredClone(this.state.places); }
  async getPlace(id: string) { return structuredClone(this.state.places.find(p => p.id === id)); }
  async listReports(placeId: string, limit = 50, offset = 0) { return structuredClone(this.state.reports.filter(r => r.placeId === placeId).reverse().slice(offset, offset + limit)); }
  async getReport(id: string) { return structuredClone(this.state.reports.find(r => r.id === id)); }
  async contributions(actorId: string) { const reports = this.state.reports.filter(r => r.actorId === actorId); return { total: reports.length, reports: structuredClone(reports.slice(-50).reverse()) }; }
  async health() { await readFile(join(this.directory, "database.json"), "utf8"); }
  async photo(report: Report) { return { bytes: await readFile(join(this.directory, report.photoPath)), mimeType: report.mimeType }; }
  // WHY: Sequential queue ensures zero write collisions in local dev mode.
  // TRADE-OFF: LocalStore serializes writes in-memory with atomic JSON file rename,
  // avoiding complex local DB setups. In production, SupabaseStore replaces this with
  // PostgreSQL transactions + publish_report RPC.
  // WARNING: Idempotency check prevents duplicate submissions on retry.
  publish(input: PublishInput, photo: Photo) {
    const operation = this.queue.then(async () => {
      const existing = this.state.reports.find(r => r.actorId === input.actorId && r.requestKey === input.requestKey);
      if (existing) {
        if (existing.inputHash !== input.inputHash) throw new ApiError(409, "Kunci pengiriman sudah digunakan untuk laporan berbeda");
        return { report: structuredClone(existing), replayed: true };
      }
      const next = structuredClone(this.state);
      const place = next.places.find(p => p.id === input.placeId);
      if (!place) throw new ApiError(404, "Lokasi tidak ditemukan");
      const id = randomUUID();
      const report: Report = { ...input, id, photoPath: `photos/${id}.${photo.extension}`, mimeType: photo.mimeType, createdAt: new Date().toISOString() };
      for (const el of input.elements) place.elements[el.element] = {
        status: el.status, note: el.note ?? null, photoUrl: `/api/photos/${id}`, lockedBy: "kontributor", aiConfidence: null,
      };
      place.updatedAt = report.createdAt;
      place.reportCount++;
      place.photoCount++;
      next.reports.push(report);
      await writeFile(join(this.directory, report.photoPath), photo.bytes, { flag: "wx" });
      try { await this.persist(next); }
      catch (error) { await unlink(join(this.directory, report.photoPath)).catch(() => {}); throw error; }
      this.state = next;
      return { report: structuredClone(report), replayed: false };
    });
    this.queue = operation.catch(() => {});
    return operation;
  }
}

export function toPlaceRow(p: Place) {
  return { id: p.id, name: p.name, category: p.category, city: p.city, address: p.address, lat: p.lat, lng: p.lng,
    kecamatan: p.kecamatan, kelurahan: p.kelurahan, pre_survey: p.preSurvey, sources: p.sources,
    evidence_level: p.evidenceLevel, verified_by_team: p.verifiedByTeam, needs_geocoding: p.needsGeocoding };
}
type PlaceRow = ReturnType<typeof toPlaceRow> & { updated_at: string | null; photo_count: number; report_count: number; place_elements: { element_code: keyof Place["elements"]; status: NonNullable<Place["elements"][keyof Place["elements"]]>["status"]; note: string | null; report_id: string }[] };
function fromPlaceRow(r: PlaceRow): Place {
  return { id: r.id, name: r.name, category: r.category, city: r.city, address: r.address, lat: r.lat, lng: r.lng,
    kecamatan: r.kecamatan, kelurahan: r.kelurahan, preSurvey: r.pre_survey, sources: r.sources,
    evidenceLevel: r.evidence_level, verifiedByTeam: r.verified_by_team, needsGeocoding: r.needs_geocoding,
    updatedAt: r.updated_at, photoCount: r.photo_count, reportCount: r.report_count,
    elements: Object.fromEntries((r.place_elements ?? []).map(e => [e.element_code, { status: e.status, note: e.note, lockedBy: "kontributor", photoUrl: `/api/photos/${e.report_id}`, aiConfidence: null }])) };
}
function dbError(error: { code?: string; message: string } | null): void {
  if (!error) return;
  if (error.message.includes("idempotency_conflict")) throw new ApiError(409, "Kunci pengiriman sudah digunakan untuk laporan berbeda");
  if (error.code === "23503") throw new ApiError(404, "Lokasi tidak ditemukan");
  console.error("Database operation failed", error.code);
  throw new ApiError(503, "Penyimpanan tidak tersedia. Silakan coba lagi.");
}
export class SupabaseStore implements Store {
  constructor(private client: SupabaseClient) {}
  async health() { const { error } = await this.client.from("places").select("id").limit(1); dbError(error); }
  async listPlaces() {
    const places: Place[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await this.client.from("places").select("*,place_elements(*)").order("id").range(offset, offset + 999);
      dbError(error);
      places.push(...(data as PlaceRow[]).map(fromPlaceRow));
      if (!data || data.length < 1000) return places;
    }
  }
  async getPlace(id: string) {
    const { data, error } = await this.client.from("places").select("*,place_elements(*)").eq("id", id).maybeSingle();
    dbError(error); return data ? fromPlaceRow(data as PlaceRow) : undefined;
  }
  async listReports(placeId: string, limit = 50, offset = 0) {
    const { data, error } = await this.client.from("reports").select("payload").eq("place_id", placeId).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    dbError(error); return (data ?? []).map(r => r.payload as Report);
  }
  async getReport(id: string) {
    const { data, error } = await this.client.from("reports").select("payload").eq("id", id).maybeSingle();
    dbError(error); return data?.payload as Report | undefined;
  }
  async contributions(actorId: string) {
    const { data, error, count } = await this.client.from("reports").select("payload", { count: "exact" }).eq("actor_id", actorId).order("created_at", { ascending: false }).limit(50);
    dbError(error); return { total: count ?? 0, reports: (data ?? []).map(r => r.payload as Report) };
  }
  async photo(report: Report) {
    const { data, error } = await this.client.storage.from("photos").createSignedUrl(report.photoPath, 300);
    dbError(error); return { url: data!.signedUrl };
  }
  async publish(input: PublishInput, photo: Photo) {
    const id = randomUUID();
    const report: Report = { ...input, id, photoPath: `reports/${id}.${photo.extension}`, mimeType: photo.mimeType, createdAt: new Date().toISOString() };
    const { error: uploadError } = await this.client.storage.from("photos").upload(report.photoPath, photo.bytes, { contentType: photo.mimeType, upsert: false });
    dbError(uploadError);
    // Cleanup only when the DB definitively rejects or returns a previous report.
    // An ambiguous network failure may have committed; retain its photo for retry/reconciliation.
    const { data, error } = await this.client.rpc("publish_report", { p_report: report });
    if (error) {
      if (error.code && /^\d|^P\d/.test(error.code)) await this.client.storage.from("photos").remove([report.photoPath]);
      dbError(error);
    }
    const saved = data as Report;
    const replayed = saved.id !== report.id;
    if (replayed) await this.client.storage.from("photos").remove([report.photoPath]);
    return { report: saved, replayed };
  }
}
