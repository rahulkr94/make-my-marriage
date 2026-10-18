import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { GUEST_RELATIONSHIPS, GUEST_SIDES } from "./constants";

const guestSchema = new Schema({
  weddingId: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, default: "", trim: true, maxlength: 320 },
  phone: { type: String, default: "", trim: true, maxlength: 30 },
  side: { type: String, enum: GUEST_SIDES, required: true },
  relationship: { type: String, enum: GUEST_RELATIONSHIPS, required: true },
  notes: { type: String, default: "", maxlength: 1000 },
  status: { type: String, enum: ["ACTIVE", "REMOVED"], required: true, default: "ACTIVE" },
  createdBy: { type: Schema.Types.ObjectId, required: true },
  removedAt: { type: Date, default: null },
}, { timestamps: true, strict: "throw" });
guestSchema.index({ weddingId: 1, status: 1, side: 1, name: 1, _id: 1 }, { name: "wedding_guest_list" });

const eventGuestSchema = new Schema({
  weddingId: { type: Schema.Types.ObjectId, required: true },
  eventId: { type: Schema.Types.ObjectId, required: true },
  guestId: { type: Schema.Types.ObjectId, required: true },
  status: { type: String, enum: ["ACTIVE", "REMOVED"], required: true, default: "ACTIVE" },
  assignedBy: { type: Schema.Types.ObjectId, required: true },
  assignedAt: { type: Date, required: true },
  removedAt: { type: Date, default: null },
}, { timestamps: true, strict: "throw" });
eventGuestSchema.index({ eventId: 1, guestId: 1 }, { unique: true, name: "unique_event_guest" });
eventGuestSchema.index({ weddingId: 1, guestId: 1, status: 1 }, { name: "wedding_guest_assignments" });

export type Guest = InferSchemaType<typeof guestSchema>;
export type EventGuest = InferSchemaType<typeof eventGuestSchema>;
export const GuestModel = (models.Guest as Model<Guest> | undefined) ?? model<Guest>("Guest", guestSchema, "guests");
export const EventGuestModel = (models.EventGuest as Model<EventGuest> | undefined) ?? model<EventGuest>("EventGuest", eventGuestSchema, "event_guests");
