import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { EVENT_TYPES } from "./constants";

const eventSchema = new Schema({
  weddingId: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  type: { type: String, enum: EVENT_TYPES, required: true },
  localDate: { type: String, required: true },
  startLocalTime: { type: String, required: true },
  endLocalTime: { type: String, default: "" },
  endsNextDay: { type: Boolean, default: false },
  startsAtUtc: { type: Date, required: true },
  endsAtUtc: { type: Date, default: null },
  timeZone: { type: String, required: true },
  venueName: { type: String, required: true, trim: true, maxlength: 120 },
  address: { type: String, required: true, trim: true, maxlength: 300 },
  mapUrl: { type: String, default: "", maxlength: 2048 },
  description: { type: String, default: "", maxlength: 2000 },
  status: { type: String, enum: ["DRAFT", "PUBLISHED", "CANCELLED"], required: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true, strict: "throw" });
eventSchema.index({ weddingId: 1, deletedAt: 1, startsAtUtc: 1, _id: 1 }, { name: "wedding_event_schedule" });
eventSchema.index({ weddingId: 1, deletedAt: 1, status: 1, startsAtUtc: 1, _id: 1 }, { name: "published_event_schedule" });
export type WeddingEvent = InferSchemaType<typeof eventSchema>;
export const EventModel = (models.WeddingEvent as Model<WeddingEvent> | undefined) ?? model<WeddingEvent>("WeddingEvent", eventSchema, "events");
