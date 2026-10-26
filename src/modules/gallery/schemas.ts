import { z } from "zod";
import { PHOTO_CONTENT_TYPES, PHOTO_MAX_SIZE_BYTES, PHOTO_STATUSES } from "./constants";

export const createPhotoUploadIntentSchema = z.object({
  fileName: z.string().trim().min(1).max(240),
  contentType: z.enum(PHOTO_CONTENT_TYPES, { message: "Choose a JPG, PNG, or WEBP image." }),
  sizeBytes: z.number().int().positive().max(PHOTO_MAX_SIZE_BYTES, "Each photo must be 10 MB or smaller."),
  eventId: z.string().trim().min(1).max(64).nullable().optional().default(null),
  caption: z.string().trim().max(300).optional().default(""),
}).strict();

export const guestPhotoUploadIntentSchema = createPhotoUploadIntentSchema.extend({
  eventId: z.string().trim().min(1).max(64),
});

export const galleryListQuerySchema = z.object({
  status: z.enum(PHOTO_STATUSES).optional(),
  eventId: z.string().trim().max(64).optional(),
}).strict();

export const reviewPhotoSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
}).strict();

export type CreatePhotoUploadIntentInput = z.infer<typeof createPhotoUploadIntentSchema>;
export type GuestPhotoUploadIntentInput = z.infer<typeof guestPhotoUploadIntentSchema>;
export type GalleryListQuery = z.infer<typeof galleryListQuerySchema>;
export type ReviewPhotoInput = z.infer<typeof reviewPhotoSchema>;
