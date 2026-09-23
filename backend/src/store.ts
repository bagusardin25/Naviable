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
};
export type PublishInput = Omit<Report, "id" | "photoPath" | "mimeType" | "createdAt" | "reviewStatus" | "reviewedBy" | "reviewedAt" | "reviewNote" | "reviewChecklist">;
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

// Demo visitor reviews for local/dev mode. Without these the place drawer's review
// history is empty for every location (no contributor flow has run yet), so the
// "review history" section can never demonstrate real entries. One review per seed
// place keeps the section populated no matter which place is opened. Never used by
// SupabaseStore, which reads real reviews from the database.
const DEMO_REVIEWERS = ["Rina Andriani", "Fajar Nugroho", "Melati Kusuma", "Yoga Pratama", "Sari Wulandari", "Bagas Saputra"];
const DEMO_REVIEW_TEMPLATES = [
  (name: string) => `Berkunjung ke ${name} bersama keluarga. Petugas cukup membantu mengarahkan jalur akses menuju pintu masuk.`,
  (name: string) => `Sebagai pengguna kursi roda, akses masuk ${name} masih bisa dilalui walau ada beberapa titik yang perlu perhatian.`,
  (name: string) => `Jalur pemandu dan rambu di ${name} lumayan jelas. Semoga fasilitas toiletnya makin ramah difabel.`,
  (name: string) => `Pengalaman di ${name} cukup baik. Area parkir dan penyeberangan terdekat masih agak menantang bagi tunanetra.`,
];
function buildDemoReviews(places: Place[]): Review[] {
  return places.map((place, i) => ({
    id: `review-demo-${(i + 1).toString().padStart(4, "0")}`,
    placeId: place.id,
    actorId: `00000000-0000-4000-9000-${(i + 1).toString().padStart(12, "0")}`,
    reviewerName: DEMO_REVIEWERS[i % DEMO_REVIEWERS.length],
    experience: DEMO_REVIEW_TEMPLATES[i % DEMO_REVIEW_TEMPLATES.length](place.name),
    createdAt: new Date(Date.UTC(2026, 8, 12 + (i % 6), 2 + (i % 9), (i * 11) % 60)).toISOString(),
    requestKey: `review-demo-key-${(i + 1).toString().padStart(4, "0")}`,
    inputHash: `review-demo-hash-${(i + 1).toString().padStart(4, "0")}`,
  }));
}

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
      const seedPlaces = await loadSeed();
      const demoReportSeed: Report[] = [
        {
          id: "10000000-0000-4000-8000-000000000001",
          placeId: seedPlaces[3]?.id ?? "osm-node-4794254291",
          actorId: "00000000-0000-4000-8000-000000000001",
          reporterName: "Ahmad Rizki",
          requestKey: "20000000-0000-4000-8000-000000000001",
          inputHash: "demo-hash-1",
          elements: [{ element: "E2_ramp", status: "TERHALANG", note: "Ramp akses kursi roda tertutup parkir motor dan barang pedagang." }],
          photoPath: "photos/demo-ramp.jpg",
          mimeType: "image/jpeg",
          createdAt: "2026-09-18T10:15:00.000Z",
          reviewStatus: "SUBMITTED",
          reviewedBy: null,
          reviewedAt: null,
          reviewNote: null,
          reviewChecklist: null,
        },
        {
          id: "10000000-0000-4000-8000-000000000002",
          placeId: seedPlaces[0]?.id ?? "osm-node-659961942",
          actorId: "00000000-0000-4000-8000-000000000002",
          reporterName: "Siti Nurhaliza",
          requestKey: "20000000-0000-4000-8000-000000000002",
          inputHash: "demo-hash-2",
          elements: [{ element: "E5_guiding_block", status: "UTUH", note: "Jalur pemandu kuning terhubung rapi dari trotoar pintu masuk utama." }],
          photoPath: "photos/demo-tactile.jpg",
          mimeType: "image/jpeg",
          createdAt: "2026-09-19T07:20:00.000Z",
          reviewStatus: "APPROVED",
          reviewedBy: "reviewer.naviable",
          reviewedAt: "2026-09-19T08:30:00.000Z",
          reviewNote: "Foto jelas dan menunjukkan jalur pemandu terpasang utuh sesuai standar.",
          reviewChecklist: { photoMatchesPlace: true, photoShowsElement: true, descriptionMatchesEvidence: true, notDuplicate: true, accessStatusMatchesEvidence: true },
        },
        {
          id: "10000000-0000-4000-8000-000000000003",
          placeId: seedPlaces[1]?.id ?? "osm-node-4191188521",
          actorId: "00000000-0000-4000-8000-000000000003",
          reporterName: "Budi Wicaksono",
          requestKey: "20000000-0000-4000-8000-000000000003",
          inputHash: "demo-hash-3",
          elements: [{ element: "E1_door", status: "UTUH", note: "Pintu masuk lebar tanpa undakan, ramah pengguna kursi roda." }],
          photoPath: "photos/demo-door.jpg",
          mimeType: "image/jpeg",
          createdAt: "2026-09-19T11:20:00.000Z",
          reviewStatus: "SUBMITTED",
          reviewedBy: null,
          reviewedAt: null,
          reviewNote: null,
          reviewChecklist: null,
        },
        {
          id: "10000000-0000-4000-8000-000000000004",
          placeId: seedPlaces[2]?.id ?? "osm-node-4191209387",
          actorId: "00000000-0000-4000-8000-000000000004",
          reporterName: "Dewi Lestari",
          requestKey: "20000000-0000-4000-8000-000000000004",
          inputHash: "demo-hash-4",
          elements: [{ element: "E4_lift", status: "TIDAK_STANDAR", note: "Tombol lift tidak ada huruf braille dan posisinya terlalu tinggi." }],
          photoPath: "photos/demo-lift.jpg",
          mimeType: "image/jpeg",
          createdAt: "2026-09-18T14:40:00.000Z",
          reviewStatus: "NEEDS_REVISION",
          reviewedBy: "reviewer.naviable",
          reviewedAt: "2026-09-19T09:10:00.000Z",
          reviewNote: "Foto belum memperlihatkan tombol lift secara keseluruhan. Mohon kirimkan foto yang lebih fokus.",
          reviewChecklist: { photoMatchesPlace: true, photoShowsElement: false, descriptionMatchesEvidence: true, notDuplicate: true, accessStatusMatchesEvidence: false },
        },
        {
          id: "10000000-0000-4000-8000-000000000005",
          placeId: seedPlaces[4]?.id ?? "osm-node-5873197056",
          actorId: "00000000-0000-4000-8000-000000000005",
          reporterName: "Anonim",
          requestKey: "20000000-0000-4000-8000-000000000005",
          inputHash: "demo-hash-5",
          elements: [{ element: "E8_crossing", status: "TIDAK_ADA", note: "Tidak ada penyeberangan aman" }],
          photoPath: "photos/demo-crossing.jpg",
          mimeType: "image/jpeg",
          createdAt: "2026-09-18T16:00:00.000Z",
          reviewStatus: "REJECTED",
          reviewedBy: "reviewer.naviable",
          reviewedAt: "2026-09-18T17:20:00.000Z",
          reviewNote: "Foto buram dan tidak menunjukkan titik lokasi penyeberangan yang dilaporkan.",
          reviewChecklist: { photoMatchesPlace: false, photoShowsElement: false, descriptionMatchesEvidence: false, notDuplicate: true, accessStatusMatchesEvidence: false },
        },
        {
          id: "10000000-0000-4000-8000-000000000006",
          placeId: "osm-relation-6664927", // Tunjungan Plaza
          actorId: "00000000-0000-4000-8000-000000000006",
          reporterName: "Nadia Puspita",
          requestKey: "20000000-0000-4000-8000-000000000006",
          inputHash: "demo-hash-6",
          elements: [{ element: "E6_parking", status: "UTUH", note: "Parkir khusus difabel tersedia dekat pintu utama dan bertanda jelas." }],
          photoPath: "photos/demo-parking.jpg",
          mimeType: "image/jpeg",
          createdAt: "2026-09-20T09:05:00.000Z",
          reviewStatus: "SUBMITTED",
          reviewedBy: null,
          reviewedAt: null,
          reviewNote: null,
          reviewChecklist: null,
        },
        {
          id: "10000000-0000-4000-8000-000000000007",
          placeId: "osm-way-307282859", // Pakuwon City Mall
          actorId: "00000000-0000-4000-8000-000000000007",
          reporterName: "Hendra Gunawan",
          requestKey: "20000000-0000-4000-8000-000000000007",
          inputHash: "demo-hash-7",
          elements: [{ element: "E3_toilet", status: "UTUH", note: "Toilet difabel bersih dengan pegangan dan ruang gerak kursi roda memadai." }],
          photoPath: "photos/demo-toilet.jpg",
          mimeType: "image/jpeg",
          createdAt: "2026-09-20T13:40:00.000Z",
          reviewStatus: "APPROVED",
          reviewedBy: "reviewer.naviable",
          reviewedAt: "2026-09-21T02:15:00.000Z",
          reviewNote: "Foto jelas memperlihatkan toilet ramah difabel sesuai laporan.",
          reviewChecklist: { photoMatchesPlace: true, photoShowsElement: true, descriptionMatchesEvidence: true, notDuplicate: true, accessStatusMatchesEvidence: true },
        },
        {
          id: "10000000-0000-4000-8000-000000000008",
          placeId: "desk-taman-bungkul", // Taman Bungkul
          actorId: "00000000-0000-4000-8000-000000000008",
          reporterName: "Ayu Lestari",
          requestKey: "20000000-0000-4000-8000-000000000008",
          inputHash: "demo-hash-8",
          elements: [{ element: "E8_crossing", status: "TIDAK_STANDAR", note: "Penyeberangan menuju taman ada, tapi tanpa pemandu taktil dan lampu penyeberangan." }],
          photoPath: "photos/demo-crossing-2.jpg",
          mimeType: "image/jpeg",
          createdAt: "2026-09-19T23:30:00.000Z",
          reviewStatus: "SUBMITTED",
          reviewedBy: null,
          reviewedAt: null,
          reviewNote: null,
          reviewChecklist: null,
        }
      ];
      // Skip any demo report whose place is not in the current seed set.
      const demoReports = demoReportSeed.filter(report => seedPlaces.some(place => place.id === report.placeId));
      this.state = { version: 1, places: seedPlaces, reports: demoReports, reviews: buildDemoReviews(seedPlaces) };
      await this.persist(this.state);
    }
    await this.backfillDemoReviews();
    return this;
  }
  /**
   * Older or partial local databases — created before demo reviews existed, or left behind by a
   * smoke test — leave the place drawer's review history empty for every location. Seed the demo
   * reviews once so the section always has entries to show. Idempotent: it only fills an
   * absent/empty reviews list and never touches real contributor reviews.
   */
  private async backfillDemoReviews() {
    if (Array.isArray(this.state.reviews) && this.state.reviews.length > 0) return;
    const reviews = buildDemoReviews(this.state.places);
    if (reviews.length === 0) return;
    this.state.reviews = reviews;
    await this.persist(this.state);
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

      if (input.decision === "APPROVED") {
        const place = next.places.find(p => p.id === targetReport.placeId);
        if (place) {
          place.verifiedByTeam = true;
          // Reviewer-corrected statuses win over the reported ones; unknowns leave the element untouched.
          const elementsToApply = input.elements?.length ? input.elements : targetReport.elements;
          for (const el of elementsToApply) {
            if (el.status === "BELUM_DIKETAHUI") continue;
            place.elements[el.element] = {
              status: el.status,
              note: el.note ?? null,
              photoUrl: `/api/photos/${targetReport.id}`,
              lockedBy: "kontributor",
              aiConfidence: null,
            };
          }
          place.updatedAt = targetReport.reviewedAt;
        }
      }

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
      for (const el of input.elements) {
        place.elements[el.element] = {
          status: el.status,
          note: el.note ?? null,
          photoUrl: `/api/photos/${id}`,
          lockedBy: "kontributor",
          aiConfidence: null,
        };
      }
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
    // The review decision lives in dedicated columns, not in the stored payload, so we
    // merge them in — otherwise a contributor would always see the stale "SUBMITTED" payload.
    const { data, error, count } = await this.client.from("reports")
      .select("payload, review_status, reviewed_at, review_note, review_checklist", { count: "exact" })
      .eq("actor_id", actorId).order("created_at", { ascending: false }).limit(50);
    dbError(error);
    type ReportRow = { payload: Report; review_status?: Report["reviewStatus"]; reviewed_at?: string | null; review_note?: string | null; review_checklist?: Record<string, boolean> | null };
    const reports = ((data ?? []) as ReportRow[]).map(row => ({
      ...row.payload,
      reviewStatus: row.review_status ?? row.payload.reviewStatus ?? "SUBMITTED",
      reviewedAt: row.reviewed_at ?? row.payload.reviewedAt ?? null,
      reviewNote: row.review_note ?? row.payload.reviewNote ?? null,
      reviewChecklist: row.review_checklist ?? row.payload.reviewChecklist ?? null,
    }));
    return { total: count ?? 0, reports };
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
    type ReportJoined = { payload: Report; review_status?: string; places?: { name: string; address?: string | null } };
    const list = ((data ?? []) as ReportJoined[]).map(row => {
      const r = row.payload;
      return {
        ...r,
        reviewStatus: (row.review_status as Report["reviewStatus"]) ?? r.reviewStatus ?? "SUBMITTED",
        placeName: row.places?.name ?? r.placeId,
        placeAddress: row.places?.address ?? null,
      };
    });
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

