import { z } from "zod";
import { CHAIN_ELEMENTS, ELEMENT_STATUSES, USER_PROFILES } from "./types.js";
import { ApiError } from "./errors.js";

export const PlaceId = z.string().min(1).max(120).regex(/^[a-zA-Z0-9_-]+$/);
export const MimeType = z.enum(["image/jpeg", "image/png", "image/webp"]);
export const ElementInput = z.object({
  element: z.enum(CHAIN_ELEMENTS), status: z.enum(ELEMENT_STATUSES), note: z.string().trim().max(1000).optional(),
}).strict();
export const ReportBody = z.object({
  placeId: PlaceId,
  reporterName: z.string().trim().min(1).max(80),
  image: z.string().min(16).max(7_000_000), mimeType: MimeType,
  humanConfirmed: z.literal(true),
  elements: z.array(ElementInput).min(1).max(8).refine(items => new Set(items.map(i => i.element)).size === items.length, "Duplicate elements"),
}).strict();
export type ReportInput = z.infer<typeof ReportBody>;
export const NewPlaceBody = z.object({
  name: z.string().trim().min(2).max(160), category: z.string().trim().min(2).max(80),
  address: z.string().trim().min(5).max(500),
  lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180),
}).strict();
export const AddPlaceBody = ReportBody.omit({ placeId: true }).extend({ location: NewPlaceBody });
export const ReviewBody = z.object({
  placeId: PlaceId, reviewerName: z.string().trim().min(1).max(80),
  experience: z.string().trim().min(10).max(2000),
}).strict();
export const AnalyzeBody = z.object({ image: z.string().min(16).max(7_000_000), mimeType: MimeType }).strict();
export const PlaceQuery = z.object({
  profile: z.enum(USER_PROFILES).optional(), q: z.string().trim().max(120).optional(),
  category: z.string().max(80).optional(), district: z.string().max(80).optional(),
  geocoded: z.enum(["true", "false"]).optional(),
  bbox: z.string().transform(s => s.split(",").map(Number)).pipe(z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90), z.number().min(-180).max(180), z.number().min(-90).max(90)]).refine(([w,s,e,n]) => w <= e && s <= n)).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export function decodePhoto(image: string, mimeType: z.infer<typeof MimeType>) {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(image);
  if (image.startsWith("data:") && (!match || match[1] !== mimeType)) throw new ApiError(400, "Tipe foto tidak cocok");
  const base64 = match?.[2] ?? image;
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) throw new ApiError(400, "Base64 foto tidak valid");
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length > 5 * 1024 * 1024) throw new ApiError(413, "Foto maksimal 5 MB");
  const valid = mimeType === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : mimeType === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (bytes.length < 16 || !valid) throw new ApiError(400, "Isi berkas bukan foto JPG, PNG, atau WebP yang sesuai");
  return { bytes, base64, mimeType, extension: mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1] };
}
