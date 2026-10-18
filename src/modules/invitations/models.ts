import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const guestInvitationSchema = new Schema({
  weddingId: { type: Schema.Types.ObjectId, required: true },
  guestId: { type: Schema.Types.ObjectId, required: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  tokenVersion: { type: Number, required: true, min: 0, default: 0 },
  expiresAt: { type: Date, required: true },
  status: { type: String, enum: ["ACTIVE", "REVOKED"], required: true, default: "ACTIVE" },
  lastSentAt: { type: Date, default: null },
  lastDeliveryStatus: { type: String, enum: ["NOT_SENT", "PENDING", "SENT", "FAILED"], required: true, default: "NOT_SENT" },
  revokedAt: { type: Date, default: null },
}, { timestamps: true, strict: "throw" });

guestInvitationSchema.index({ weddingId: 1, guestId: 1 }, { unique: true, name: "unique_guest_invitation" });
guestInvitationSchema.index({ weddingId: 1, status: 1, updatedAt: -1 }, { name: "wedding_invitation_listing" });
guestInvitationSchema.index({ expiresAt: 1, status: 1 }, { name: "guest_invitation_expiry" });

export type GuestInvitation = InferSchemaType<typeof guestInvitationSchema>;
export const GuestInvitationModel = (models.GuestInvitation as Model<GuestInvitation> | undefined)
  ?? model<GuestInvitation>("GuestInvitation", guestInvitationSchema, "guest_invitations");
