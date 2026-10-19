import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { RSVP_RESPONSES } from "./constants";

const rsvpSchema = new Schema({
  weddingId: { type: Schema.Types.ObjectId, required: true },
  eventId: { type: Schema.Types.ObjectId, required: true },
  guestId: { type: Schema.Types.ObjectId, required: true },
  response: { type: String, enum: RSVP_RESPONSES, required: true },
  attendeeCount: { type: Number, required: true, min: 0, max: 100 },
  respondedAt: { type: Date, required: true },
}, { timestamps: true, strict: "throw" });

rsvpSchema.index({ eventId: 1, guestId: 1 }, { unique: true, name: "unique_event_guest_rsvp" });
rsvpSchema.index({ weddingId: 1, eventId: 1, response: 1 }, { name: "wedding_event_rsvp_summary" });
rsvpSchema.index({ weddingId: 1, guestId: 1 }, { name: "wedding_guest_rsvps" });

export type Rsvp = InferSchemaType<typeof rsvpSchema>;
export const RsvpModel = (models.Rsvp as Model<Rsvp> | undefined) ?? model<Rsvp>("Rsvp", rsvpSchema, "rsvps");
