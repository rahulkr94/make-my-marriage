import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { NOTIFICATION_STATUSES, NOTIFICATION_TYPES } from "./constants";

const notificationSchema = new Schema({
  weddingId: { type: Schema.Types.ObjectId, required: true },
  type: { type: String, enum: NOTIFICATION_TYPES, required: true },
  recipientEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 320 },
  recipientName: { type: String, required: true, trim: true, maxlength: 120 },
  recipientKind: { type: String, enum: ["GUEST", "MEMBER"], required: true },
  recipientId: { type: Schema.Types.ObjectId, required: true },
  referenceType: { type: String, enum: ["EVENT", "TASK", "WEDDING"], required: true },
  referenceId: { type: Schema.Types.ObjectId, default: null },
  referenceLabel: { type: String, required: true, trim: true, maxlength: 180 },
  scheduledFor: { type: Date, required: true },
  status: { type: String, enum: NOTIFICATION_STATUSES, required: true, default: "QUEUED" },
  idempotencyKey: { type: String, required: true, maxlength: 300 },
  attempts: { type: Number, required: true, min: 0, default: 0 },
  nextAttemptAt: { type: Date, default: null },
  leaseUntil: { type: Date, default: null },
  providerMessageId: { type: String, default: "", maxlength: 200 },
  sentAt: { type: Date, default: null },
  lastError: { type: String, default: "", maxlength: 500 },
}, { timestamps: true, strict: "throw" });

notificationSchema.index({ idempotencyKey: 1 }, { unique: true, name: "unique_notification_delivery" });
notificationSchema.index({ status: 1, scheduledFor: 1, nextAttemptAt: 1, leaseUntil: 1 }, { name: "notification_delivery_queue" });
notificationSchema.index({ weddingId: 1, createdAt: -1, _id: -1 }, { name: "wedding_notification_history" });

const notificationSettingsSchema = new Schema({
  weddingId: { type: Schema.Types.ObjectId, required: true, unique: true },
  eventReminderEnabled: { type: Boolean, required: true, default: true },
  eventReminderDaysBefore: { type: Number, required: true, min: 1, max: 30, default: 2 },
  eventReminderTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: "18:00" },
  rsvpReminderEnabled: { type: Boolean, required: true, default: true },
  rsvpReminderDaysBefore: { type: Number, required: true, min: 1, max: 60, default: 7 },
  rsvpReminderTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: "18:00" },
  taskReminderEnabled: { type: Boolean, required: true, default: true },
  taskReminderDaysBefore: { type: Number, required: true, min: 0, max: 30, default: 1 },
  taskReminderTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: "09:00" },
  overdueDigestEnabled: { type: Boolean, required: true, default: true },
  overdueDigestTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: "09:00" },
  photoDigestEnabled: { type: Boolean, required: true, default: false },
  photoDigestTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: "18:00" },
  quietHoursEnabled: { type: Boolean, required: true, default: true },
  quietHoursStart: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: "22:00" },
  quietHoursEnd: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: "08:00" },
}, { timestamps: true, strict: "throw" });

export type Notification = InferSchemaType<typeof notificationSchema>;
export type NotificationSettings = InferSchemaType<typeof notificationSettingsSchema>;
export const NotificationModel = (models.Notification as Model<Notification> | undefined) ?? model<Notification>("Notification", notificationSchema, "notifications");
export const NotificationSettingsModel = (models.NotificationSettings as Model<NotificationSettings> | undefined) ?? model<NotificationSettings>("NotificationSettings", notificationSettingsSchema, "notification_settings");
