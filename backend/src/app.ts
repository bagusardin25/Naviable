import { createHash, randomUUID } from "node:crypto";
import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import cors from "cors";
import { z, ZodError } from "zod";
import type { Config } from "./config.js";
import type { Store, Report } from "./store.js";
import { ApiError } from "./lib/errors.js";
import { AddPlaceBody, AnalyzeBody, decodePhoto, ElementInput, PlaceId, PlaceQuery, ReportBody, ReviewBody, type ReportInput } from "./lib/validation.js";
import { CHAIN_ELEMENTS, ELEMENT_STATUSES, summarizePlace, USER_PROFILES, type Place } from "./lib/types.js";
import { evidenceCsv, journeyHint, observatory } from "./lib/evidence.js";
import { AI_REVIEWER_LABEL, analyzeAccessPhoto, checkPhotoProvenance, configuredAIProviders, matchPhotoToElements, mergePhotoIntegrity, mismatchNote, type PhotoElementMatch } from "./lib/ai/index.js";

type Options = {
  store: Store;
  config: Config;
  authenticate?: (token: string) => Promise<string | undefined>;
  authenticateReviewer?: (token: string) => Promise<{ id: string; email?: string } | undefined>;
  analyze?: typeof analyzeAccessPhoto;
  checkIntegrity?: typeof checkPhotoProvenance;
};
export function createApp({ store, config, authenticate, authenticateReviewer, analyze = analyzeAccessPhoto, checkIntegrity = checkPhotoProvenance }: Options) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy);
  app.use((_req, res, next) => { res.set({ "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Cache-Control": "no-store" }); next(); });
  app.use((req, _res, next) => {
    if (config.mode === "local" && !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host ?? "")) return next(new ApiError(403, "Mode lokal hanya tersedia melalui localhost"));
    next();
  });
  app.use(cors({ origin(origin, callback) { callback(!origin || config.origins.includes(origin) ? null : new ApiError(403, "Origin tidak diizinkan"), true); }, exposedHeaders: ["Content-Disposition"] }));
  const buckets = new Map<string, { count: number; expires: number }>();
  function limiter(label: string, maximum: number): RequestHandler {
    return (req, res, next) => {
      const now = Date.now();
      for (const [key, value] of buckets) if (value.expires < now) buckets.delete(key);
      const key = `${label}:${res.locals.actorId ?? req.ip}`;
      const value = buckets.get(key) ?? { count: 0, expires: now + 15 * 60 * 1000 };
      value.count++;
      buckets.set(key, value);
      if (value.count > maximum) { res.setHeader("Retry-After", Math.ceil((value.expires - now) / 1000)); return next(new ApiError(429, "Terlalu banyak permintaan. Coba lagi nanti.")); }
      next();
    };
  }
  const auth: RequestHandler = async (req, res, next) => {
    const token = /^Bearer (\S+)$/i.exec(req.headers.authorization ?? "")?.[1];
    if (!token) throw new ApiError(401, "Masuk terlebih dahulu untuk mengirim bukti");
    let actorId: string | undefined;
    try { actorId = await authenticate?.(token); } catch { throw new ApiError(503, "Layanan autentikasi tidak tersedia"); }
    if (!actorId) throw new ApiError(401, "Sesi tidak valid atau sudah berakhir");
    res.locals.actorId = actorId;
    next();
  };
  app.use(["/api/reports", "/api/analyze", "/api/places", "/api/reviews"], (req, res, next) => req.method === "POST" ? limiter("writes-ip", 60)(req, res, next) : next());
  app.use(["/api/reports", "/api/analyze", "/api/places", "/api/reviews"], (req, res, next) => req.method === "POST" ? auth(req, res, next) : next());
  app.use(express.json({ limit: "8mb" }));
  app.get(["/health", "/api/health"], (_req, res) => {
    const aiProviders = configuredAIProviders();
    res.json({
      status: "ok",
      service: "naviable-backend",
      storage: config.mode,
      authRequired: true,
      aiConfigured: aiProviders.length > 0,
      aiProviders,
      photoIntegrityConfigured: Boolean(process.env.OPENAI_API_KEY),
    });
  });
  app.get("/api/ready", async (_req, res) => { await store.health(); res.json({ status: "ready", storage: config.mode }); });

  async function filtered(query: unknown) {
    const filters = PlaceQuery.parse(query);
    const places = (await store.listPlaces()).filter(p => {
      if (filters.q && ![p.name, p.category, p.address, p.kecamatan].join(" ").toLowerCase().includes(filters.q.toLowerCase())) return false;
      if (filters.category && p.category !== filters.category) return false;
      if (filters.district && p.kecamatan !== filters.district) return false;
      const geocoded = !p.needsGeocoding && p.lat !== null && p.lng !== null;
      if (filters.geocoded && geocoded !== (filters.geocoded === "true")) return false;
      if (filters.bbox) { const [w,s,e,n] = filters.bbox; if (!geocoded || p.lng! < w || p.lng! > e || p.lat! < s || p.lat! > n) return false; }
      return true;
    }).sort((a,b) => a.id.localeCompare(b.id));
    return { places, filters };
  }
  async function placeById(id: unknown): Promise<Place> {
    const place = await store.getPlace(PlaceId.parse(id));
    if (!place) throw new ApiError(404, "Lokasi tidak ditemukan");
    return place;
  }
  function publicReport(r: Report) {
    return { id: r.id, placeId: r.placeId, reporterName: r.reporterName, elements: r.elements, createdAt: r.createdAt, photoUrl: `/api/photos/${r.id}`, lockedBy: "kontributor", photoIntegrity: r.photoIntegrity };
  }
  async function verifiedPhotoIntegrity(photo: ReturnType<typeof decodePhoto>) {
    const integrity = await checkIntegrity(photo.bytes, photo.mimeType);
    if (integrity.outcome === "trusted_ai_provenance") {
      throw new ApiError(422, "Foto memiliki penanda asal AI yang terverifikasi. Ambil foto baru langsung dari lokasi.");
    }
    return integrity;
  }
  /**
   * Reads the photo with the vision model and checks it against the element the contributor
   * picked. Returns null when the analysis is unavailable so an AI outage never blocks a
   * genuine contribution — the report then goes to the human queue as usual.
   */
  async function photoElementMatch(photo: ReturnType<typeof decodePhoto>, elements: ReportInput["elements"]) {
    try {
      return matchPhotoToElements(await analyze(photo.base64, photo.mimeType), elements);
    } catch {
      return null;
    }
  }
  /**
   * A photo that does not show the chosen element goes straight back to the contributor as
   * NEEDS_REVISION instead of into the reviewer queue; the automated note is what they see in
   * their profile. Never fails the submission — an unsaved flag just leaves it for a human.
   */
  async function autoFlagMismatch(report: Report, match: PhotoElementMatch | null) {
    if (!match || match.matches) return report;
    try {
      return await store.reviewReport(report.id, { decision: "NEEDS_REVISION", reviewer: AI_REVIEWER_LABEL, note: mismatchNote(match) });
    } catch {
      return report;
    }
  }
  function photoCheckResponse(match: PhotoElementMatch | null) {
    return match ? { matches: match.matches, detail: match.detail, unsupported: match.unsupported } : null;
  }
  app.get("/api/me", auth, async (_req, res) => {
    const result = await store.contributions(res.locals.actorId);
    // Name each report's place so the contributor's notifications and profile can say which
    // location a decision is about (one lookup per distinct place, at most 50 reports).
    const placeIds = [...new Set(result.reports.map(r => r.placeId))];
    const placeNames = new Map(await Promise.all(placeIds.map(async id => [id, (await store.getPlace(id))?.name ?? null] as const)));
    // Contributors see the review outcome of their OWN reports (status, reviewer note, checklist).
    // reviewedBy is intentionally omitted: the reviewer's identity is internal.
    res.json({
      mode: config.mode,
      total: result.total,
      reports: result.reports.map(r => ({
        ...publicReport(r),
        placeName: placeNames.get(r.placeId) ?? null,
        reviewStatus: r.reviewStatus,
        reviewedAt: r.reviewedAt ?? null,
        reviewNote: r.reviewNote ?? null,
        reviewChecklist: r.reviewChecklist ?? null,
      })),
    });
  });
  app.get("/api/places", async (req, res) => {
    const { places, filters } = await filtered(req.query);
    res.json({ places: places.slice(filters.offset, filters.offset + filters.limit).map(p => summarizePlace(p, filters.profile)), total: places.length, offset: filters.offset, limit: filters.limit, profile: filters.profile ?? null, storage: config.mode });
  });
  app.get("/api/places/:id", async (req, res) => {
    const profile = z.enum(USER_PROFILES).optional().parse(req.query.profile);
    const place = await placeById(req.params.id);
    res.json({ place: summarizePlace(place, profile), reports: (await store.listReports(place.id)).map(publicReport) });
  });
  app.get("/api/places/:id/reports", async (req, res) => {
    const place = await placeById(req.params.id);
    const { limit, offset } = PlaceQuery.parse(req.query);
    res.json({ reports: (await store.listReports(place.id, limit, offset)).map(publicReport), total: place.reportCount, limit, offset });
  });
  app.post("/api/places", limiter("reports", 30), async (req, res) => {
    const body = AddPlaceBody.parse(req.body);
    const requestKey = z.uuid().parse(req.headers["idempotency-key"] ?? randomUUID());
    const photo = decodePhoto(body.image, body.mimeType);
    const [photoIntegrity, match] = await Promise.all([verifiedPhotoIntegrity(photo), photoElementMatch(photo, body.elements)]);
    const place: Place = { ...body.location, id: `place-${randomUUID()}`, city: "Surabaya", kecamatan: null, kelurahan: null,
      preSurvey: {}, sources: [], evidenceLevel: "contributor", verifiedByTeam: false, needsGeocoding: false,
      elements: {}, updatedAt: null, photoCount: 0, reportCount: 0 };
    const inputHash = createHash("sha256").update(JSON.stringify({ kind: "new-place", ...body, image: photo.base64 })).digest("hex");
    const { report, replayed } = await store.publish({ placeId: place.id, reporterName: body.reporterName, actorId: res.locals.actorId, requestKey, inputHash, elements: body.elements, photoIntegrity }, photo, place);
    const reviewed = replayed ? report : await autoFlagMismatch(report, match);
    res.status(replayed ? 200 : 201).json({ reportId: report.id, replayed, reviewStatus: reviewed.reviewStatus, photoCheck: photoCheckResponse(match), place: summarizePlace(await placeById(report.placeId)) });
  });
  function publicReview(r: import("./store.js").Review) {
    return { id: r.id, placeId: r.placeId, reviewerName: r.reviewerName, experience: r.experience, createdAt: r.createdAt };
  }
  app.get("/api/places/:id/reviews", async (req, res) => {
    const place = await placeById(req.params.id);
    const { limit, offset } = PlaceQuery.parse(req.query);
    const result = await store.listReviews(place.id, limit, offset);
    res.json({ reviews: result.reviews.map(publicReview), total: result.total, limit, offset });
  });
  app.post("/api/reviews", limiter("reviews", 30), async (req, res) => {
    const body = ReviewBody.parse(req.body);
    const requestKey = z.uuid().parse(req.headers["idempotency-key"] ?? randomUUID());
    await placeById(body.placeId);
    const inputHash = createHash("sha256").update(JSON.stringify(body)).digest("hex");
    const { review, replayed } = await store.review({ ...body, actorId: res.locals.actorId, requestKey, inputHash });
    res.status(replayed ? 200 : 201).json({ review: publicReview(review), replayed });
  });
  app.post("/api/reports", limiter("reports", 30), async (req, res) => {
    const body = ReportBody.parse(req.body);
    const requestKey = z.uuid().parse(req.headers["idempotency-key"] ?? randomUUID());
    const photo = decodePhoto(body.image, body.mimeType);
    await placeById(body.placeId);
    const [photoIntegrity, match] = await Promise.all([verifiedPhotoIntegrity(photo), photoElementMatch(photo, body.elements)]);
    const inputHash = createHash("sha256").update(JSON.stringify({ ...body, image: photo.base64 })).digest("hex");
    const { report, replayed } = await store.publish({ placeId: body.placeId, reporterName: body.reporterName, actorId: res.locals.actorId, requestKey, inputHash, elements: body.elements, photoIntegrity }, photo);
    const reviewed = replayed ? report : await autoFlagMismatch(report, match);
    res.status(replayed ? 200 : 201).json({ ok: true, reportId: report.id, replayed, reviewStatus: reviewed.reviewStatus, photoCheck: photoCheckResponse(match), photoUrl: `/api/photos/${report.id}`, report: publicReport(reviewed), place: summarizePlace(await placeById(body.placeId)) });
  });
  app.post("/api/analyze", limiter("analyze", 10), async (req, res) => {
    const body = AnalyzeBody.parse(req.body);
    const photo = decodePhoto(body.image, body.mimeType);
    const [analysis, provenance] = await Promise.allSettled([
      analyze(photo.base64, photo.mimeType),
      checkIntegrity(photo.bytes, photo.mimeType),
    ]);
    if (analysis.status === "rejected") {
      res.status(503).json({
        error: "Analisis AI tidak tersedia. Isi checklist manual berdasarkan foto.",
        fallback: "manual_checklist",
        drafts: [],
        photoIntegrity: provenance.status === "fulfilled" ? provenance.value : undefined,
      });
      return;
    }
    res.json({
      ...analysis.value,
      photoIntegrity: provenance.status === "fulfilled"
        ? mergePhotoIntegrity(provenance.value, analysis.value.visualIntegrity)
        : undefined,
    });
  });
  app.get("/api/photos/:id", async (req, res) => {
    const report = await store.getReport(z.uuid().parse(req.params.id));
    if (!report) throw new ApiError(404, "Foto tidak ditemukan");
    const photo = await store.photo(report);
    if ("url" in photo) return res.redirect(photo.url);
    res.set({ "Content-Type": photo.mimeType, "Content-Security-Policy": "default-src 'none'; sandbox", "Content-Disposition": "inline" }).send(photo.bytes);
  });
  app.get("/api/observatory", async (req, res) => { const { places } = await filtered(req.query); res.json(observatory(places)); });
  app.get("/api/evidence.csv", async (req, res) => {
    const { places } = await filtered(req.query);
    const filterQuery = z.object({
      profile: z.enum(USER_PROFILES).optional(),
      element: z.enum(CHAIN_ELEMENTS).optional(),
      status: z.enum(ELEMENT_STATUSES).optional(),
    }).parse(req.query);
    res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="naviable-evidence-${new Date().toISOString().slice(0,10)}.csv"` }).send(evidenceCsv(places, config.publicUrl, filterQuery));
  });
  app.get("/api/journey", async (req, res) => {
    const input = z.object({ from: PlaceId, to: PlaceId, profile: z.enum(USER_PROFILES).default("mobilitas") }).parse(req.query);
    if (input.from === input.to) throw new ApiError(400, "Pilih dua lokasi berbeda");
    const from = await placeById(input.from), to = await placeById(input.to);
    if ([from, to].some(p => p.needsGeocoding || p.lat === null || p.lng === null)) throw new ApiError(422, "Koordinat asal dan tujuan belum tersedia");
    res.json(journeyHint(await store.listPlaces(), from, to, input.profile));
  });
  // Reviewer Endpoints
  app.use('/api/reviewer', limiter('reviewer-ip', 120), auth, async (req, res, next) => {
    const token = /^Bearer (\S+)$/i.exec(req.headers.authorization ?? '')?.[1];
    const reviewer = token ? await authenticateReviewer?.(token) : undefined;
    if (!reviewer || reviewer.id !== res.locals.actorId) throw new ApiError(403, 'Hak reviewer diperlukan');
    res.locals.reviewerLabel = reviewer.email || reviewer.id;
    next();
  });
  app.get("/api/reviewer/stats", async (_req, res) => {
    res.json(await store.getReviewerStats());
  });
  app.get("/api/reviewer/reports", async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const result = await store.listAllReports({ status, search, limit, offset });
    res.json({
      reports: result.reports.map(r => ({
        id: r.id,
        placeId: r.placeId,
        placeName: r.placeName,
        placeAddress: r.placeAddress,
        reporterName: r.reporterName,
        elements: r.elements,
        createdAt: r.createdAt,
        photoUrl: `/api/photos/${r.id}`,
        reviewStatus: r.reviewStatus,
        reviewedBy: r.reviewedBy,
        reviewedAt: r.reviewedAt,
        reviewNote: r.reviewNote,
        reviewChecklist: r.reviewChecklist,
        photoIntegrity: r.photoIntegrity,
      })),
      total: result.total,
      limit,
      offset,
    });
  });
  app.get("/api/reviewer/reports/:id", async (req, res) => {
    const report = await store.getReport(z.uuid().parse(req.params.id));
    if (!report) throw new ApiError(404, "Laporan tidak ditemukan");
    const place = await store.getPlace(report.placeId);
    res.json({
      report: {
        ...report,
        placeName: place?.name ?? report.placeId,
        placeAddress: place?.address ?? null,
        photoUrl: `/api/photos/${report.id}`,
      },
      place: place ? summarizePlace(place) : null,
    });
  });
  app.post("/api/reviewer/reports/:id/review", async (req, res) => {
    const ReviewDecisionBody = z.object({
      decision: z.enum(["APPROVED", "NEEDS_REVISION", "REJECTED", "UNDER_REVIEW"]),
      note: z.string().default(""),
      checklist: z.record(z.string(), z.boolean()).optional(),
      // Optional reviewer-corrected element statuses, applied on APPROVED in place of the reported ones.
      elements: z.array(ElementInput).min(1).max(8)
        .refine(items => new Set(items.map(i => i.element)).size === items.length, "Duplicate elements")
        .optional(),
    });
    const body = ReviewDecisionBody.parse(req.body);
    const reportId = z.uuid().parse(req.params.id);
    const updated = await store.reviewReport(reportId, { ...body, reviewer: res.locals.reviewerLabel ?? res.locals.actorId });
    // Mirror the GET /reports/:id shape so the reviewer UI can swap this straight into
    // its state after a decision without losing the place name, address or photo.
    const place = await store.getPlace(updated.placeId);
    res.json({
      ok: true,
      report: {
        ...updated,
        placeName: place?.name ?? updated.placeId,
        placeAddress: place?.address ?? null,
        photoUrl: `/api/photos/${updated.id}`,
      },
    });
  });
  app.get("/api/reviewer/history", async (req, res) => {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const result = await store.listAllReports({ limit: 1000 });
    const reviewed = result.reports
      .filter(r => r.reviewStatus === "APPROVED" || r.reviewStatus === "NEEDS_REVISION" || r.reviewStatus === "REJECTED" || r.reviewStatus === "PUBLISHED")
      .sort((a, b) => new Date(b.reviewedAt ?? b.createdAt).getTime() - new Date(a.reviewedAt ?? a.createdAt).getTime());
    res.json({
      history: reviewed.slice(offset, offset + limit),
      total: reviewed.length,
      limit,
      offset,
    });
  });

  app.use((_req, res) => res.status(404).json({ error: "Endpoint tidak ditemukan" }));
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof ZodError) { res.status(400).json({ error: "Data permintaan tidak valid", issues: error.issues.map(i => ({ path: i.path, message: i.message })) }); return; }
    if (error instanceof ApiError) { res.status(error.status).json({ error: error.message }); return; }
    if (error?.type === "entity.too.large") { res.status(413).json({ error: "Permintaan terlalu besar; foto maksimal 5 MB" }); return; }
    if (error?.type === "entity.parse.failed") { res.status(400).json({ error: "JSON tidak valid" }); return; }
    console.error("Unhandled API error", error instanceof Error ? error.name : "unknown");
    res.status(500).json({ error: "Terjadi kesalahan server" });
  };
  app.use(errors);
  return app;
}
