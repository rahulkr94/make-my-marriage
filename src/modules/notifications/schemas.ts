import { z } from "zod";
import { NOTIFICATION_STATUSES, NOTIFICATION_TYPES } from "./constants";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a 24-hour time such as 09:00.");

export const notificationSettingsSchema = z.object({
  eventReminderEnabled: z.boolean(),
  eventReminderDaysBefore: z.coerce.number().int().min(1).max(30),
  eventReminderTime: time,
  rsvpReminderEnabled: z.boolean(),
  rsvpReminderDaysBefore: z.coerce.number().int().min(1).max(60),
  rsvpReminderTime: time,
  taskReminderEnabled: z.boolean(),
  taskReminderDaysBefore: z.coerce.number().int().min(0).max(30),
  taskReminderTime: time,
  overdueDigestEnabled: z.boolean(),
  overdueDigestTime: time,
  photoDigestEnabled: z.boolean(),
  photoDigestTime: time,
  quietHoursEnabled: z.boolean(),
  quietHoursStart: time,
  quietHoursEnd: time,
});

export const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  status: z.enum(NOTIFICATION_STATUSES).optional(),
  type: z.enum(NOTIFICATION_TYPES).optional(),
});

export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>;
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;
