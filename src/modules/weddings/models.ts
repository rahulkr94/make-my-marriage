import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const weddingSchema = new Schema({
  createdBy: { type: Schema.Types.ObjectId, required: true, index: true },
  brideName: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  groomName: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  weddingDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  timeZone: { type: String, required: true, maxlength: 100 },
  mainVenueName: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  mainAddress: { type: String, required: true, trim: true, minlength: 5, maxlength: 300 },
  description: { type: String, trim: true, maxlength: 1000, default: "" },
  coverFileId: { type: Schema.Types.ObjectId },
  status: { type: String, enum: ["PLANNING", "ACTIVE", "COMPLETED", "ARCHIVED"], default: "PLANNING", required: true },
  galleryTokenHash: { type: String, select: false },
  galleryTokenVersion: { type: Number, required: true, min: 0, default: 0 },
  galleryTokenRotatedAt: { type: Date },
}, { timestamps: true, strict: "throw" });

const weddingMemberSchema = new Schema({
  weddingId: { type: Schema.Types.ObjectId, required: true },
  userId: { type: Schema.Types.ObjectId, required: true },
  role: { type: String, enum: ["ADMIN", "MANAGER", "MEMBER"], required: true },
  status: { type: String, enum: ["ACTIVE", "REMOVED"], required: true, default: "ACTIVE" },
  grants: [{ type: String, enum: ["CAN_MODERATE_GALLERY"] }],
  joinedAt: { type: Date, required: true },
  removedAt: { type: Date },
  invitedBy: { type: Schema.Types.ObjectId },
}, { timestamps: true, strict: "throw" });

weddingMemberSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { status: "ACTIVE" }, name: "one_active_wedding_per_user" },
);
weddingMemberSchema.index({ weddingId: 1, userId: 1 }, { unique: true, name: "unique_wedding_member" });
weddingMemberSchema.index({ weddingId: 1, status: 1, role: 1 }, { name: "wedding_member_listing" });

type Wedding = InferSchemaType<typeof weddingSchema>;
type WeddingMember = InferSchemaType<typeof weddingMemberSchema>;

export const WeddingModel = (models.Wedding as Model<Wedding> | undefined) ?? model<Wedding>("Wedding", weddingSchema, "weddings");
export const WeddingMemberModel = (models.WeddingMember as Model<WeddingMember> | undefined) ?? model<WeddingMember>("WeddingMember", weddingMemberSchema, "wedding_members");
