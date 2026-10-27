import { Types } from "mongoose";
import { describe, expect, it } from "vitest";
import { notificationSettingsSchema } from "@/modules/notifications/schemas";
import { notificationDeliveryKey, resolveReminderInstant } from "@/modules/notifications/service";

const settings = notificationSettingsSchema.parse({
  eventReminderEnabled: true,
  eventReminderDaysBefore: 2,
  eventReminderTime: "18:00",
  rsvpReminderEnabled: true,
  rsvpReminderDaysBefore: 7,
  rsvpReminderTime: "18:00",
  taskReminderEnabled: true,
  taskReminderDaysBefore: 1,
  taskReminderTime: "09:00",
  overdueDigestEnabled: true,
  overdueDigestTime: "09:00",
  photoDigestEnabled: false,
  photoDigestTime: "18:00",
  quietHoursEnabled: true,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
});

describe("notification schedules", () => {
  it("resolves wedding-local reminder time to a UTC instant", () => {
    expect(resolveReminderInstant("2027-02-20", "18:00", 2, "Asia/Kolkata", settings).toISOString()).toBe("2027-02-18T12:30:00.000Z");
  });

  it("moves a quiet-hours delivery to the local quiet-hours end", () => {
    expect(resolveReminderInstant("2027-02-20", "23:30", 0, "Asia/Kolkata", settings).toISOString()).toBe("2027-02-21T02:30:00.000Z");
  });

  it("builds a stable key that separates recipients and schedules", () => {
    const weddingId = new Types.ObjectId(); const recipientId = new Types.ObjectId(); const referenceId = new Types.ObjectId(); const scheduledFor = new Date("2027-02-18T12:30:00.000Z");
    const first = notificationDeliveryKey({ weddingId, recipientId, referenceId, scheduledFor, type: "EVENT_REMINDER" });
    const second = notificationDeliveryKey({ weddingId, recipientId, referenceId, scheduledFor, type: "EVENT_REMINDER" });
    const changed = notificationDeliveryKey({ weddingId, recipientId: new Types.ObjectId(), referenceId, scheduledFor, type: "EVENT_REMINDER" });
    expect(first).toBe(second); expect(changed).not.toBe(first);
  });

  it("rejects unsafe schedule bounds and malformed times", () => {
    expect(notificationSettingsSchema.safeParse({ ...settings, eventReminderDaysBefore: 31 }).success).toBe(false);
    expect(notificationSettingsSchema.safeParse({ ...settings, quietHoursStart: "25:00" }).success).toBe(false);
  });
});
