import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const memberInviteSchema = new Schema({
  weddingId: { type: Schema.Types.ObjectId, required: true },
  emailNormalized: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  role: { type: String, enum: ["MANAGER", "MEMBER"], required: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  expiresAt: { type: Date, required: true },
  status: { type: String, enum: ["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"], required: true, default: "PENDING" },
  deliveryStatus: { type: String, enum: ["PENDING", "SENT", "FAILED"], required: true, default: "PENDING" },
  invitedBy: { type: Schema.Types.ObjectId, required: true },
  acceptedBy: { type: Schema.Types.ObjectId },
  acceptedAt: { type: Date },
  revokedAt: { type: Date },
  sentAt: { type: Date },
}, { timestamps: true, strict: "throw" });

memberInviteSchema.index(
  { weddingId: 1, emailNormalized: 1 },
  { unique: true, partialFilterExpression: { status: "PENDING" }, name: "one_pending_member_invite_per_email" },
);
memberInviteSchema.index({ weddingId: 1, status: 1, createdAt: -1 }, { name: "wedding_member_invite_listing" });
memberInviteSchema.index({ expiresAt: 1, status: 1 }, { name: "member_invite_expiry" });

type MemberInvite = InferSchemaType<typeof memberInviteSchema>;

export const MemberInviteModel = (models.MemberInvite as Model<MemberInvite> | undefined)
  ?? model<MemberInvite>("MemberInvite", memberInviteSchema, "member_invites");
