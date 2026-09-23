import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Place } from "./lib/types.js";
import type { ReportInput, decodePhoto } from "./lib/validation.js";
import type { PhotoIntegrityResult } from "./lib/ai/index.js";
import { ApiError } from "./lib/errors.js";
import { loadSeed } from "./lib/seed-data.js";

export type Photo = ReturnType<typeof decodePhoto>;
export type Report = {
  id: string; placeId: string; actorId: string; reporterName: string; requestKey: string; inputHash: string;
  elements: ReportInput["elements"]; photoPath: string; mimeType: string; createdAt: string;
  photoIntegrity?: PhotoIntegrityResult;
  /** The vision model's plain-language description of the photo, made at submission for the
   *  reviewer. Null when the AI was unavailable. Not included in public report responses. */
  aiDescription?: string | null;
  reviewStatus: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "NEEDS_REVISION" | "APPROVED" | "REJECTED" | "PUBLISHED";
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  reviewChecklist?: Record<string, boolean> | null;
  /** The reviewer's corrected element statuses from an approval; null when approved as reported. */
  reviewedElements?: ReportInput["elements"] | null;
};
export type PublishInput = Omit<Report, "id" | "photoPath" | "mimeType" | "createdAt" | "reviewStatus" | "reviewedBy" | "reviewedAt" | "reviewNote" | "reviewChecklist" | "reviewedElements">;

/** Reports that still stand. Revised or rejected ones leave the public history and the place. */
export const STANDING_REVIEW_STATUSES: readonly Report["reviewStatus"][] = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "PUBLISHED"];
export const isStanding = (report: Pick<Report, "reviewStatus">) => STANDING_REVIEW_STATUSES.includes(report.reviewStatus);
/** What a report says about each element: the reviewer's correction when there is one. */
export const effectiveElements = (report: Pick<Report, "elements" | "reviewedElements">) =>
  report.reviewedElements?.length ? report.reviewedElements : report.elements;

/**
 * Re-derives a place's "Kondisi akses" from its reports, so the elements always match the
 * public history. Same rule as refresh_place_elements (migration 007): per element, the newest
 * standing report with a definite status wins; BELUM_DIKETAHUI never overwrites evidence.
 */
function refreshPlace(state: State, placeId: string) {
  const place = state.places.find(p => p.id === placeId);
  if (!place) return;
  const standing = state.reports
    .map((report, index) => ({ report, index }))
    .filter(({ report }) => report.placeId === placeId && isStanding(report))
    .sort((a, b) => b.report.createdAt.localeCompare(a.report.createdAt) || b.index - a.index)
    .map(({ report }) => report);
  const elements: Place["elements"] = {};
  for (const report of standing) {
    for (const el of effectiveElements(report)) {
      if (el.status === "BELUM_DIKETAHUI" || elements[el.element]) continue;
      elements[el.element] = { status: el.status, note: el.note ?? null, photoUrl: `/api/photos/${report.id}`, lockedBy: "kontributor", aiConfidence: null };
    }
  }
  place.elements = elements;
  place.reportCount = standing.length;
  place.photoCount = standing.length;
}
export type Review = { id: string; placeId: string; actorId: string; reviewerName: string; experience: string; createdAt: string; requestKey: string; inputHash: string };
export type ReviewInput = Omit<Review, "id" | "createdAt">;
export interface Store {
  listPlaces(): Promise<Place[]>;
  getPlace(id: string): Promise<Place | undefined>;
  listReports(placeId: string, limit?: number, offset?: number): Promise<Report[]>;
  getReport(id: string): Promise<Report | undefined>;
  listAllReports(options?: { status?: string; search?: string; limit?: number; offset?: number }): Promise<{ reports: (Report & { placeName?: string; placeAddress?: string | null })[]; total: number }>;
  getReviewerStats(): Promise<{ submitted: number; approvedToday: number; needsRevision: number; rejected: number; total: number }>;
  reviewReport(id: string, input: { decision: "APPROVED" | "NEEDS_REVISION" | "REJECTED" | "UNDER_REVIEW"; reviewer: string; note: string; checklist?: Record<string, boolean>; elements?: ReportInput["elements"] }): Promise<Report>;
  contributions(actorId: string): Promise<{ total: number; reports: Report[] }>;
  publish(input: PublishInput, photo: Photo, newPlace?: Place): Promise<{ report: Report; replayed: boolean }>;
  listReviews(placeId: string, limit: number, offset: number): Promise<{ reviews: Review[]; total: number }>;
  review(input: ReviewInput): Promise<{ review: Review; replayed: boolean }>;
  photo(report: Report): Promise<{ bytes: Buffer; mimeType: string } | { url: string }>;
  health(): Promise<void>;
}

type State = { version: 1; places: Place[]; reports: Report[]; reviews?: Review[] };

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
      this.state = { version: 1, places: await loadSeed(), reports: [], reviews: [] };
      await this.persist(this.state);
    }
    await this.normalize();
    return this;
  }
  /**
   * Brings a local database written by an older version in line with the current rules:
   * drops the generated demo reviews and demo reports (they read like real people's
   * experiences and field evidence) and re-derives every place from its reports.
   * Persists only when something changed.
   */
  private async normalize() {
    const before = JSON.stringify(this.state);
    const next = structuredClone(this.state);
    next.reviews = (next.reviews ?? []).filter(review => !review.id.startsWith("review-demo-"));
    next.reports = next.reports.filter(report => !report.inputHash.startsWith("demo-hash-"));
    for (const place of next.places) refreshPlace(next, place.id);
    if (JSON.stringify(next) === before) return;
    await this.persist(next);
    this.state = next;
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
  async listReports(placeId: string, limit = 50, offset = 0) {
    // Newest first, and only reports that still stand: the same set the place's elements come from.
    const standing = this.state.reports.filter(r => r.placeId === placeId && isStanding(r)).reverse()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return structuredClone(standing.slice(offset, offset + limit));
  }
  async getReport(id: string) { return structuredClone(this.state.reports.find(r => r.id === id)); }
  async listAllReports(options: { status?: string; search?: string; limit?: number; offset?: number } = {}) {
    const { status, search, limit = 50, offset = 0 } = options;
    const placesMap = new Map(this.state.places.map(p => [p.id, p]));
    let filtered = structuredClone(this.state.reports);
    if (status && status !== "all") {
      filtered = filtered.filter(r => r.reviewStatus === status);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(r => {
        const place = placesMap.get(r.placeId);
        const name = (place?.name ?? "").toLowerCase();
        const address = (place?.address ?? "").toLowerCase();
        const reporter = (r.reporterName ?? "").toLowerCase();
        return name.includes(q) || address.includes(q) || reporter.includes(q);
      });
    }
    // Newest first
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = filtered.length;
    const slice = filtered.slice(offset, offset + limit).map(r => {
      const place = placesMap.get(r.placeId);
      return { ...r, placeName: place?.name ?? r.placeId, placeAddress: place?.address ?? null };
    });
    return { reports: slice, total };
  }
  async getReviewerStats() {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    let submitted = 0;
    let approvedToday = 0;
    let needsRevision = 0;
    let rejected = 0;
    for (const r of this.state.reports) {
      if (r.reviewStatus === "SUBMITTED" || r.reviewStatus === "UNDER_REVIEW") submitted++;
      else if (r.reviewStatus === "APPROVED" || r.reviewStatus === "PUBLISHED") {
        if (r.reviewedAt && r.reviewedAt.slice(0, 10) === todayStr) approvedToday++;
      } else if (r.reviewStatus === "NEEDS_REVISION") needsRevision++;
      else if (r.reviewStatus === "REJECTED") rejected++;
    }
    return { submitted, approvedToday, needsRevision, rejected, total: this.state.reports.length };
  }
  async reviewReport(id: string, input: { decision: "APPROVED" | "NEEDS_REVISION" | "REJECTED" | "UNDER_REVIEW"; reviewer: string; note: string; checklist?: Record<string, boolean>; elements?: ReportInput["elements"] }) {
    const operation = this.queue.then(async () => {
      const report = this.state.reports.find(r => r.id === id);
      if (!report) throw new ApiError(404, "Laporan tidak ditemukan");
      if ((input.decision === "NEEDS_REVISION" || input.decision === "REJECTED") && (!input.note || !input.note.trim())) {
        throw new ApiError(400, "Catatan reviewer wajib diisi untuk minta revisi atau tolak laporan");
      }
      const next = structuredClone(this.state);
      const targetReport = next.reports.find(r => r.id === id)!;
      targetReport.reviewStatus = input.decision;
      targetReport.reviewedBy = input.reviewer;
      targetReport.reviewedAt = new Date().toISOString();
      targetReport.reviewNote = input.note;
      targetReport.reviewChecklist = input.checklist ?? null;
      // An approval replaces any earlier correction; other decisions keep it for the audit trail.
      if (input.decision === "APPROVED") targetReport.reviewedElements = input.elements?.length ? input.elements : null;

      if (input.decision === "APPROVED") {
        const place = next.places.find(p => p.id === targetReport.placeId);
        if (place) {
          place.verifiedByTeam = true;
          // An approved report is what puts a contributor-added place on the public map.
          place.pendingApproval = false;
          place.updatedAt = targetReport.reviewedAt;
        }
      }
      // Revising or rejecting takes the report's statuses off the place again.
      refreshPlace(next, targetReport.placeId);

      await this.persist(next);
      this.state = next;
      return structuredClone(targetReport);
    });
    this.queue = operation.catch(() => {});
    return operation;
  }
  async contributions(actorId: string) { const reports = this.state.reports.filter(r => r.actorId === actorId); return { total: reports.length, reports: structuredClone(reports.slice(-50).reverse()) }; }
  async health() { await readFile(join(this.directory, "database.json"), "utf8"); }
  async photo(report: Report) {
    try {
      return { bytes: await readFile(join(this.directory, report.photoPath)), mimeType: report.mimeType };
    } catch {
      // Fallback 1x1 SVG image if photo file not present locally
      const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="#e2e8f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#64748b">Bukti Foto Laporan</text></svg>`);
      return { bytes: svg, mimeType: "image/svg+xml" };
    }
  }
  // WHY: Sequential queue ensures zero write collisions in local dev mode.
  // TRADE-OFF: LocalStore serializes writes in-memory with atomic JSON file rename,
  // avoiding complex local DB setups. In production, SupabaseStore replaces this with
  // PostgreSQL transactions + publish_report RPC.
  // WARNING: Idempotency check prevents duplicate submissions on retry.
  async listReviews(placeId: string, limit: number, offset: number) {
    const reviews = (this.state.reviews ?? []).filter(r => r.placeId === placeId).reverse();
    return { reviews: structuredClone(reviews.slice(offset, offset + limit)), total: reviews.length };
  }
  review(input: ReviewInput) {
    const operation = this.queue.then(async () => {
      const existing = (this.state.reviews ?? []).find(r => r.actorId === input.actorId && r.requestKey === input.requestKey);
      if (existing) {
        if (existing.inputHash !== input.inputHash) throw new ApiError(409, "Kunci pengiriman sudah digunakan untuk review berbeda");
        return { review: structuredClone(existing), replayed: true };
      }
      if (!this.state.places.some(p => p.id === input.placeId)) throw new ApiError(404, "Lokasi tidak ditemukan");
      const next = structuredClone(this.state);
      const review = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
      (next.reviews ??= []).push(review);
      await this.persist(next);
      this.state = next;
      return { review: structuredClone(review), replayed: false };
    });
    this.queue = operation.catch(() => {});
    return operation;
  }
  publish(input: PublishInput, photo: Photo, newPlace?: Place) {
    const operation = this.queue.then(async () => {
      const existing = this.state.reports.find(r => r.actorId === input.actorId && r.requestKey === input.requestKey);
      if (existing) {
        if (existing.inputHash !== input.inputHash) throw new ApiError(409, "Kunci pengiriman sudah digunakan untuk laporan berbeda");
        return { report: structuredClone(existing), replayed: true };
      }
      const next = structuredClone(this.state);
      if (newPlace) next.places.push(structuredClone(newPlace));
      const place = next.places.find(p => p.id === input.placeId);
      if (!place) throw new ApiError(404, "Lokasi tidak ditemukan");
      const id = randomUUID();
      const report: Report = {
        ...input,
        id,
        photoPath: `photos/${id}.${photo.extension}`,
        mimeType: photo.mimeType,
        createdAt: new Date().toISOString(),
        reviewStatus: "SUBMITTED",
        reviewedBy: null,
        reviewedAt: null,
        reviewNote: null,
        reviewChecklist: null,
      };
      next.reports.push(report);
      refreshPlace(next, place.id);
      place.updatedAt = report.createdAt;
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
// pending_approval is optional so a database without migration 006 still reads as "all public".
type PlaceRow = ReturnType<typeof toPlaceRow> & { pending_approval?: boolean; updated_at: string | null; photo_count: number; report_count: number; place_elements: { element_code: keyof Place["elements"]; status: NonNullable<Place["elements"][keyof Place["elements"]]>["status"]; note: string | null; report_id: string }[] };
function fromPlaceRow(r: PlaceRow): Place {
  return { id: r.id, name: r.name, category: r.category, city: r.city, address: r.address, lat: r.lat, lng: r.lng,
    kecamatan: r.kecamatan, kelurahan: r.kelurahan, preSurvey: r.pre_survey, sources: r.sources,
    evidenceLevel: r.evidence_level, verifiedByTeam: r.verified_by_team, needsGeocoding: r.needs_geocoding,
    pendingApproval: r.pending_approval ?? false,
    updatedAt: r.updated_at, photoCount: r.photo_count, reportCount: r.report_count,
    elements: Object.fromEntries((r.place_elements ?? []).map(e => [e.element_code, { status: e.status, note: e.note, lockedBy: "kontributor", photoUrl: `/api/photos/${e.report_id}`, aiConfidence: null }])) };
}
type ReportRow = {
  payload: Report; review_status?: Report["reviewStatus"] | null; reviewed_by?: string | null; reviewed_at?: string | null;
  review_note?: string | null; review_checklist?: Record<string, boolean> | null;
  // Absent until migration 007 is applied.
  reviewed_elements?: ReportInput["elements"] | null;
};
// The review decision lives in dedicated columns, not in the payload frozen at submission,
// so merge them in; otherwise every report would read as the stale "SUBMITTED".
function fromReportRow(row: ReportRow): Report {
  const r = row.payload;
  return {
    ...r,
    reviewStatus: row.review_status ?? r.reviewStatus ?? "SUBMITTED",
    reviewedBy: row.reviewed_by ?? r.reviewedBy ?? null,
    reviewedAt: row.reviewed_at ?? r.reviewedAt ?? null,
    reviewNote: row.review_note ?? r.reviewNote ?? null,
    reviewChecklist: row.review_checklist ?? r.reviewChecklist ?? null,
    reviewedElements: row.reviewed_elements ?? null,
  };
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
    // Only reports that still stand: the same set place_elements is derived from (migration 007).
    const { data, error } = await this.client.from("reports").select("*").eq("place_id", placeId)
      .in("review_status", [...STANDING_REVIEW_STATUSES])
      .order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    dbError(error); return ((data ?? []) as ReportRow[]).map(fromReportRow);
  }
  async getReport(id: string) {
    const { data, error } = await this.client.from("reports").select("*").eq("id", id).maybeSingle();
    dbError(error); return data ? fromReportRow(data as ReportRow) : undefined;
  }
  async contributions(actorId: string) {
    const { data, error, count } = await this.client.from("reports")
      .select("*", { count: "exact" })
      .eq("actor_id", actorId).order("created_at", { ascending: false }).limit(50);
    dbError(error);
    return { total: count ?? 0, reports: ((data ?? []) as ReportRow[]).map(fromReportRow) };
  }
  async photo(report: Report) {
    const { data, error } = await this.client.storage.from("photos").createSignedUrl(report.photoPath, 300);
    dbError(error); return { url: data!.signedUrl };
  }
  async listReviews(placeId: string, limit: number, offset: number) {
    const { data, error, count } = await this.client.from("reviews").select("payload", { count: "exact" }).eq("place_id", placeId).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    dbError(error); return { reviews: (data ?? []).map(r => r.payload as Review), total: count ?? 0 };
  }
  async listAllReports(options: { status?: string; search?: string; limit?: number; offset?: number } = {}) {
    const { status, search, limit = 50, offset = 0 } = options;
    let query = this.client.from("reports").select("*, places(name, address)", { count: "exact" });
    if (status && status !== "all") {
      query = query.eq("review_status", status);
    }
    const { data, error, count } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    dbError(error);
    type ReportJoined = ReportRow & { places?: { name: string; address?: string | null } };
    const list = ((data ?? []) as ReportJoined[]).map(row => ({
      ...fromReportRow(row),
      placeName: row.places?.name ?? row.payload.placeId,
      placeAddress: row.places?.address ?? null,
    }));
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      const filtered = list.filter(r => (r.placeName ?? "").toLowerCase().includes(q) || (r.reporterName ?? "").toLowerCase().includes(q));
      return { reports: filtered, total: filtered.length };
    }
    return { reports: list, total: count ?? list.length };
  }
  async getReviewerStats() {
    const todayStr = new Date().toISOString().slice(0, 10);
    const { data, error } = await this.client.from("reports").select("review_status, reviewed_at");
    dbError(error);
    let submitted = 0;
    let approvedToday = 0;
    let needsRevision = 0;
    let rejected = 0;
    for (const r of (data ?? []) as { review_status?: string; reviewed_at?: string }[]) {
      const st = r.review_status ?? "SUBMITTED";
      if (st === "SUBMITTED" || st === "UNDER_REVIEW") submitted++;
      else if (st === "APPROVED" || st === "PUBLISHED") {
        if (r.reviewed_at && r.reviewed_at.slice(0, 10) === todayStr) approvedToday++;
      } else if (st === "NEEDS_REVISION") needsRevision++;
      else if (st === "REJECTED") rejected++;
    }
    return { submitted, approvedToday, needsRevision, rejected, total: data?.length ?? 0 };
  }
  async reviewReport(id: string, input: { decision: "APPROVED" | "NEEDS_REVISION" | "REJECTED" | "UNDER_REVIEW"; reviewer: string; note: string; checklist?: Record<string, boolean>; elements?: ReportInput["elements"] }) {
    if ((input.decision === "NEEDS_REVISION" || input.decision === "REJECTED") && (!input.note || !input.note.trim())) {
      throw new ApiError(400, "Catatan reviewer wajib diisi untuk minta revisi atau tolak laporan");
    }
    const { data, error } = await this.client.rpc("review_report", {
      p_report_id: id,
      p_reviewer: input.reviewer,
      p_decision: input.decision,
      p_note: input.note,
      p_checklist: input.checklist ?? {},
      p_elements: input.elements ?? null,
    });
    dbError(error);
    // review_report returns the raw reports ROW (snake_case, with the report itself
    // nested in `payload`). Normalize it to the same camelCase Report shape that
    // getReport/listAllReports hand back, so callers keep a consistent contract.
    const row = data as {
      payload: Report;
      review_status?: Report["reviewStatus"];
      reviewed_by?: string | null;
      reviewed_at?: string | null;
      review_note?: string | null;
      review_checklist?: Record<string, boolean> | null;
    };
    return {
      ...row.payload,
      reviewStatus: row.review_status ?? input.decision,
      reviewedBy: row.reviewed_by ?? input.reviewer,
      reviewedAt: row.reviewed_at ?? new Date().toISOString(),
      reviewNote: row.review_note ?? input.note,
      reviewChecklist: row.review_checklist ?? input.checklist ?? null,
      reviewedElements: (row as ReportRow).reviewed_elements ?? null,
      // The reviewer's corrections are what got applied to the place on APPROVE,
      // so surface them instead of the now-superseded reported statuses.
      elements: input.elements?.length ? input.elements : row.payload.elements,
    } satisfies Report;
  }
  async review(input: ReviewInput) {
    const review: Review = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    const { data, error } = await this.client.rpc("publish_review", { p_review: review });
    dbError(error);
    return { review: data as Review, replayed: data.id !== review.id };
  }
  async publish(input: PublishInput, photo: Photo, newPlace?: Place) {
    const id = randomUUID();
    const report: Report = {
      ...input,
      id,
      photoPath: `reports/${id}.${photo.extension}`,
      mimeType: photo.mimeType,
      createdAt: new Date().toISOString(),
      reviewStatus: "SUBMITTED",
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      reviewChecklist: null,
    };
    const { error: uploadError } = await this.client.storage.from("photos").upload(report.photoPath, photo.bytes, { contentType: photo.mimeType, upsert: false });
    dbError(uploadError);
    // Cleanup only when the DB definitively rejects or returns a previous report.
    // An ambiguous network failure may have committed; retain its photo for retry/reconciliation.
    const { data, error } = newPlace
      ? await this.client.rpc("create_place_report", { p_place: toPlaceRow(newPlace), p_report: report })
      : await this.client.rpc("publish_report", { p_report: report });
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

