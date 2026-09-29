import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const userSchema = new Schema({
  emailNormalized: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 254 },
  emailDisplay: { type: String, required: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  status: { type: String, enum: ["ACTIVE", "DISABLED"], default: "ACTIVE", required: true },
  passwordChangedAt: { type: Date },
}, { timestamps: true, strict: "throw" });

const sessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  sessionHash: { type: String, required: true, unique: true, select: false },
  expiresAt: { type: Date, required: true },
  lastSeenAt: { type: Date, required: true },
  revokedAt: { type: Date },
}, { timestamps: true, strict: "throw" });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const passwordResetTokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date },
}, { timestamps: true, strict: "throw" });
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const rateLimitSchema = new Schema({
  keyHash: { type: String, required: true, unique: true },
  count: { type: Number, required: true, min: 1 },
  windowStartedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true, strict: "throw" });
rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

type User = InferSchemaType<typeof userSchema>;
type Session = InferSchemaType<typeof sessionSchema>;
type PasswordResetToken = InferSchemaType<typeof passwordResetTokenSchema>;
type RateLimit = InferSchemaType<typeof rateLimitSchema>;

export const UserModel = (models.User as Model<User> | undefined) ?? model<User>("User", userSchema, "users");
export const SessionModel = (models.Session as Model<Session> | undefined) ?? model<Session>("Session", sessionSchema, "sessions");
export const PasswordResetTokenModel = (models.PasswordResetToken as Model<PasswordResetToken> | undefined) ?? model<PasswordResetToken>("PasswordResetToken", passwordResetTokenSchema, "password_reset_tokens");
export const RateLimitModel = (models.RateLimit as Model<RateLimit> | undefined) ?? model<RateLimit>("RateLimit", rateLimitSchema, "rate_limits");
