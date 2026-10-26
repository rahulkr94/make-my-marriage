import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { PHOTO_STATUSES } from "./constants";

const photoSchema = new Schema({
  weddingId: { type: Schema.Types.ObjectId, required: true },
  fileId: { type: Schema.Types.ObjectId, required: true, unique: true },
  eventId: { type: Schema.Types.ObjectId, default: null },
  uploadedByType: { type: String, enum: ["MEMBER", "GUEST"], required: true },
  uploadedById: { type: Schema.Types.ObjectId, required: true },
  invitationVersion: { type: Number, min: 0, default: null },
  status: { type: String, enum: PHOTO_STATUSES, required: true, default: "PENDING" },
  caption: { type: String, trim: true, maxlength: 300, default: "" },
  reviewedBy: { type: Schema.Types.ObjectId, default: null },
  reviewedAt: { type: Date, default: null },
}, { timestamps: true, strict: "throw" });

photoSchema.index({ weddingId: 1, status: 1, createdAt: -1 }, { name: "wedding_photo_moderation" });
photoSchema.index({ weddingId: 1, eventId: 1, status: 1, createdAt: -1 }, { name: "wedding_photo_event_gallery" });

export type WeddingPhoto = InferSchemaType<typeof photoSchema>;
export const PhotoModel = (models.WeddingPhoto as Model<WeddingPhoto> | undefined)
  ?? model<WeddingPhoto>("WeddingPhoto", photoSchema, "photos");
