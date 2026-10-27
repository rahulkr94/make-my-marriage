import { Temporal } from "@js-temporal/polyfill";
import { isValidObjectId, Types, type FilterQuery } from "mongoose";
import { Resend } from "resend";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/modules/auth/models";
import { AuthError } from "@/modules/auth/request-security";
import { EventModel } from "@/modules/events/models";
import { EventGuestModel, GuestModel } from "@/modules/guests/models";
import { GuestInvitationModel } from "@/modules/invitations/models";
import { PhotoModel } from "@/modules/gallery/models";
import { RsvpModel } from "@/modules/rsvp/models";
import { TaskModel } from "@/modules/tasks/models";
import { WeddingMemberModel, WeddingModel } from "@/modules/weddings/models";
import {
  canManageNotifications,
  NOTIFICATION_BATCH_SIZE,
  NOTIFICATION_MAX_ATTEMPTS,
  NOTIFICATION_PAGE_SIZE,
  NOTIFICATION_TYPE_LABELS,
} from "./constants";
import { NotificationModel, NotificationSettingsModel, type Notification } from "./models";
import type { NotificationListQuery, NotificationSettingsInput } from "./schemas";

const DEFAULT_SETTINGS: NotificationSettingsInput = {
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
};

type Candidate = {
  weddingId: Types.ObjectId;
  type: keyof typeof NOTIFICATION_TYPE_LABELS;
  recipientEmail: string;
  recipientName: string;
  recipientKind: "GUEST" | "MEMBER";
  recipientId: Types.ObjectId;
  referenceType: "EVENT" | "TASK" | "WEDDING";
  referenceId: Types.ObjectId | null;
  referenceLabel: string;
  scheduledFor: Date;
};

async function requirePlanner(userId: string, weddingId: string) {
  if (!isValidObjectId(weddingId)) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  const membership = await WeddingMemberModel.findOne({ userId, weddingId, status: "ACTIVE" }).lean();
  if (!membership) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  if (!canManageNotifications(membership.role)) throw new AuthError("FORBIDDEN", "Only Admins and Managers can manage reminders.", 403);
  return membership;
}

async function settingsDocument(weddingId: string) {
  return NotificationSettingsModel.findOneAndUpdate(
    { weddingId },
    { $setOnInsert: { weddingId, ...DEFAULT_SETTINGS } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
}

export async function getNotificationSettings(userId: string, weddingId: string) {
  await connectToDatabase();
  await requirePlanner(userId, weddingId);
  return serializeSettings(await settingsDocument(weddingId));
}

export async function updateNotificationSettings(userId: string, weddingId: string, input: NotificationSettingsInput) {
  await connectToDatabase();
  await requirePlanner(userId, weddingId);
  const settings = await NotificationSettingsModel.findOneAndUpdate(
    { weddingId },
    { $set: input, $setOnInsert: { weddingId } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  ).lean();
  await synchronizeWeddingNotifications(weddingId);
  return serializeSettings(settings);
}

export async function listNotifications(userId: string, weddingId: string, query: NotificationListQuery) {
  await connectToDatabase();
  await requirePlanner(userId, weddingId);
  await synchronizeWeddingNotifications(weddingId);
  const filter: FilterQuery<Notification> = { weddingId };
  if (query.status) filter.status = query.status;
  if (query.type) filter.type = query.type;
  const [rows, total, counts] = await Promise.all([
    NotificationModel.find(filter).sort({ scheduledFor: -1, _id: -1 }).skip((query.page - 1) * NOTIFICATION_PAGE_SIZE).limit(NOTIFICATION_PAGE_SIZE).lean(),
    NotificationModel.countDocuments(filter),
    NotificationModel.aggregate<{ _id: string; count: number }>([{ $match: { weddingId: toObjectId(weddingId) } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);
  const summary = Object.fromEntries(counts.map((item) => [item._id, item.count]));
  return {
    notifications: rows.map(serializeNotification),
    total,
    page: query.page,
    pageSize: NOTIFICATION_PAGE_SIZE,
    summary: {
      queued: (summary.QUEUED ?? 0) + (summary.CLAIMED ?? 0),
      sent: summary.SENT ?? 0,
      failed: summary.FAILED ?? 0,
      cancelled: summary.CANCELLED ?? 0,
    },
  };
}

export async function retryNotification(userId: string, weddingId: string, notificationId: string) {
  await connectToDatabase();
  await requirePlanner(userId, weddingId);
  if (!isValidObjectId(notificationId)) throw new AuthError("NOT_FOUND", "Notification not found.", 404);
  const notification = await NotificationModel.findOneAndUpdate(
    { _id: notificationId, weddingId, status: "FAILED" },
    { $set: { status: "QUEUED", scheduledFor: new Date(), nextAttemptAt: null, leaseUntil: null, lastError: "" } },
    { new: true },
  ).lean();
  if (!notification) throw new AuthError("NOT_FOUND", "Only failed notifications can be retried.", 404);
  return serializeNotification(notification);
}

export async function synchronizeWeddingNotifications(weddingId: string, now = new Date()) {
  await connectToDatabase();
  const [wedding, settings] = await Promise.all([WeddingModel.findById(weddingId).lean(), settingsDocument(weddingId)]);
  if (!wedding || wedding.status === "ARCHIVED") return { created: 0 };
  const horizon = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const [events, tasks, members, pendingGuestPhotos] = await Promise.all([
    EventModel.find({ weddingId, status: "PUBLISHED", deletedAt: null, startsAtUtc: { $gt: now, $lte: horizon } }).lean(),
    TaskModel.find({ weddingId, deletedAt: null, status: { $nin: ["COMPLETED", "CANCELLED"] }, dueAt: { $ne: null, $lte: horizon } }).lean(),
    WeddingMemberModel.find({ weddingId, status: "ACTIVE" }).lean(),
    PhotoModel.countDocuments({ weddingId, uploadedByType: "GUEST", status: "PENDING" }),
  ]);
  const candidates: Candidate[] = [];

  const eventIds = events.map((event) => event._id);
  const assignments = eventIds.length ? await EventGuestModel.find({ weddingId, eventId: { $in: eventIds }, status: "ACTIVE" }).lean() : [];
  const guestIds = [...new Set(assignments.map((item) => String(item.guestId)))];
  const [guests, rsvps, invitations] = await Promise.all([
    guestIds.length ? GuestModel.find({ _id: { $in: guestIds }, weddingId, status: "ACTIVE", email: { $ne: "" } }).lean() : [],
    guestIds.length ? RsvpModel.find({ weddingId, eventId: { $in: eventIds }, guestId: { $in: guestIds } }).lean() : [],
    guestIds.length ? GuestInvitationModel.find({ weddingId, guestId: { $in: guestIds }, status: "ACTIVE", expiresAt: { $gt: now } }).lean() : [],
  ]);
  const guestById = new Map(guests.map((guest) => [String(guest._id), guest]));
  const invitationGuests = new Set(invitations.map((invitation) => String(invitation.guestId)));
  const responded = new Set(rsvps.map((rsvp) => `${rsvp.eventId}:${rsvp.guestId}`));
  const assignmentsByEvent = new Map<string, typeof assignments>();
  for (const assignment of assignments) {
    const key = String(assignment.eventId);
    assignmentsByEvent.set(key, [...(assignmentsByEvent.get(key) ?? []), assignment]);
  }
  for (const event of events) {
    const eventAssignments = assignmentsByEvent.get(String(event._id)) ?? [];
    for (const assignment of eventAssignments) {
      const guest = guestById.get(String(assignment.guestId));
      if (!guest || !invitationGuests.has(String(guest._id))) continue;
      if (settings.eventReminderEnabled) candidates.push(candidate({
        weddingId: wedding._id, type: "EVENT_REMINDER", recipientEmail: guest.email, recipientName: guest.name,
        recipientKind: "GUEST", recipientId: guest._id, referenceType: "EVENT", referenceId: event._id,
        referenceLabel: event.name, scheduledFor: resolveReminderInstant(event.localDate, settings.eventReminderTime, settings.eventReminderDaysBefore, wedding.timeZone, settings),
      }));
      if (settings.rsvpReminderEnabled && !event.rsvpClosedAt && !responded.has(`${event._id}:${guest._id}`)) candidates.push(candidate({
        weddingId: wedding._id, type: "RSVP_REMINDER", recipientEmail: guest.email, recipientName: guest.name,
        recipientKind: "GUEST", recipientId: guest._id, referenceType: "EVENT", referenceId: event._id,
        referenceLabel: event.name, scheduledFor: resolveReminderInstant(event.localDate, settings.rsvpReminderTime, settings.rsvpReminderDaysBefore, wedding.timeZone, settings),
      }));
    }
  }

  const memberById = new Map(members.map((member) => [String(member._id), member]));
  const memberUsers = await UserModel.find({ _id: { $in: members.map((member) => member.userId) }, status: "ACTIVE" }).lean();
  const userById = new Map(memberUsers.map((user) => [String(user._id), user]));
  if (settings.taskReminderEnabled) for (const task of tasks) {
    if (!task.dueAt || task.dueAt <= now || !task.assignedMemberId) continue;
    const member = memberById.get(String(task.assignedMemberId));
    const user = member ? userById.get(String(member.userId)) : undefined;
    if (!member || !user) continue;
    const dueDate = Temporal.Instant.fromEpochMilliseconds(task.dueAt.getTime()).toZonedDateTimeISO(wedding.timeZone).toPlainDate().toString();
    candidates.push(candidate({ weddingId: wedding._id, type: "TASK_DUE_REMINDER", recipientEmail: user.emailDisplay, recipientName: user.name, recipientKind: "MEMBER", recipientId: member._id, referenceType: "TASK", referenceId: task._id, referenceLabel: task.title, scheduledFor: resolveReminderInstant(dueDate, settings.taskReminderTime, settings.taskReminderDaysBefore, wedding.timeZone, settings) }));
  }

  const localToday = Temporal.Instant.fromEpochMilliseconds(now.getTime()).toZonedDateTimeISO(wedding.timeZone).toPlainDate().toString();
  const planners = members.filter((member) => member.role === "ADMIN" || member.role === "MANAGER");
  if (settings.overdueDigestEnabled && tasks.some((task) => task.dueAt && task.dueAt < now)) {
    for (const member of planners) {
      const user = userById.get(String(member.userId));
      if (user) candidates.push(candidate({ weddingId: wedding._id, type: "OVERDUE_TASK_DIGEST", recipientEmail: user.emailDisplay, recipientName: user.name, recipientKind: "MEMBER", recipientId: member._id, referenceType: "WEDDING", referenceId: null, referenceLabel: "Overdue wedding tasks", scheduledFor: resolveReminderInstant(localToday, settings.overdueDigestTime, 0, wedding.timeZone, settings) }));
    }
  }
  if (settings.photoDigestEnabled && pendingGuestPhotos > 0) {
    for (const member of planners) {
      const user = userById.get(String(member.userId));
      if (user) candidates.push(candidate({ weddingId: wedding._id, type: "PHOTO_SUBMISSION_DIGEST", recipientEmail: user.emailDisplay, recipientName: user.name, recipientKind: "MEMBER", recipientId: member._id, referenceType: "WEDDING", referenceId: null, referenceLabel: `${pendingGuestPhotos} guest photo${pendingGuestPhotos === 1 ? "" : "s"} awaiting review`, scheduledFor: resolveReminderInstant(localToday, settings.photoDigestTime, 0, wedding.timeZone, settings) }));
    }
  }
  const useful = candidates.filter((item) => item.scheduledFor.getTime() > now.getTime() - 24 * 60 * 60 * 1000);
  const activeKeys = useful.map(notificationDeliveryKey);
  if (useful.length) {
    await NotificationModel.bulkWrite(useful.map((item) => ({ updateOne: { filter: { idempotencyKey: notificationDeliveryKey(item) }, update: { $setOnInsert: { ...item, idempotencyKey: notificationDeliveryKey(item), status: "QUEUED", attempts: 0 } }, upsert: true } })), { ordered: false });
    await NotificationModel.updateMany({ weddingId, idempotencyKey: { $in: activeKeys }, status: "CANCELLED", scheduledFor: { $gte: now } }, { $set: { status: "QUEUED", lastError: "", nextAttemptAt: null } });
  }
  await NotificationModel.updateMany({ weddingId, status: { $in: ["QUEUED", "FAILED"] }, scheduledFor: { $gte: now }, ...(activeKeys.length ? { idempotencyKey: { $nin: activeKeys } } : {}) }, { $set: { status: "CANCELLED", lastError: "Reminder settings or source data changed." } });
  return { created: useful.length };
}

export async function runNotificationWorker(now = new Date()) {
  await connectToDatabase();
  const weddingIds = await WeddingModel.distinct("_id", { status: { $ne: "ARCHIVED" } });
  for (const weddingId of weddingIds.slice(0, 100)) await synchronizeWeddingNotifications(String(weddingId), now);
  let sent = 0; let failed = 0; let cancelled = 0;
  for (let index = 0; index < NOTIFICATION_BATCH_SIZE; index += 1) {
    const claimed = await NotificationModel.findOneAndUpdate(
      {
        scheduledFor: { $lte: now },
        attempts: { $lt: NOTIFICATION_MAX_ATTEMPTS },
        $or: [
          { status: "QUEUED" },
          { status: "FAILED", nextAttemptAt: { $lte: now } },
          { status: "CLAIMED", leaseUntil: { $lte: now } },
        ],
      },
      { $set: { status: "CLAIMED", leaseUntil: new Date(now.getTime() + 5 * 60 * 1000) }, $inc: { attempts: 1 } },
      { sort: { scheduledFor: 1 }, new: true },
    );
    if (!claimed) break;
    try {
      const result = await deliverNotification(claimed);
      if (result.cancelled) {
        await NotificationModel.updateOne({ _id: claimed._id, status: "CLAIMED" }, { $set: { status: "CANCELLED", leaseUntil: null, lastError: result.reason } });
        cancelled += 1;
      } else {
        await NotificationModel.updateOne({ _id: claimed._id, status: "CLAIMED" }, { $set: { status: "SENT", sentAt: new Date(), providerMessageId: result.providerMessageId, leaseUntil: null, lastError: "" } });
        sent += 1;
      }
    } catch (error) {
      const lastError = safeError(error);
      const terminal = claimed.attempts >= NOTIFICATION_MAX_ATTEMPTS;
      await NotificationModel.updateOne({ _id: claimed._id, status: "CLAIMED" }, { $set: { status: "FAILED", leaseUntil: null, lastError, nextAttemptAt: terminal ? null : new Date(now.getTime() + 5 * 60 * 1000 * 2 ** Math.max(0, claimed.attempts - 1)) } });
      failed += 1;
    }
  }
  return { processed: sent + failed + cancelled, sent, failed, cancelled };
}

async function deliverNotification(notification: Notification & { _id: unknown }) {
  const [wedding, recipientActive] = await Promise.all([
    WeddingModel.findById(notification.weddingId).lean(),
    notification.recipientKind === "GUEST"
      ? GuestModel.exists({ _id: notification.recipientId, weddingId: notification.weddingId, status: "ACTIVE", email: notification.recipientEmail })
      : WeddingMemberModel.exists({ _id: notification.recipientId, weddingId: notification.weddingId, status: "ACTIVE" }),
  ]);
  if (!wedding || wedding.status === "ARCHIVED" || !recipientActive) return { cancelled: true as const, reason: "The wedding or recipient is no longer eligible." };
  if (notification.type === "RSVP_REMINDER") {
    const [event, response, invitation] = await Promise.all([
      EventModel.findOne({ _id: notification.referenceId, weddingId: wedding._id, status: "PUBLISHED", deletedAt: null }).lean(),
      RsvpModel.exists({ weddingId: wedding._id, eventId: notification.referenceId, guestId: notification.recipientId }),
      GuestInvitationModel.exists({ weddingId: wedding._id, guestId: notification.recipientId, status: "ACTIVE", expiresAt: { $gt: new Date() } }),
    ]);
    if (!event || event.rsvpClosedAt || response || !invitation) return { cancelled: true as const, reason: "The RSVP reminder is no longer needed." };
  }
  if (notification.type === "EVENT_REMINDER" && !await EventModel.exists({ _id: notification.referenceId, weddingId: wedding._id, status: "PUBLISHED", deletedAt: null })) return { cancelled: true as const, reason: "The event is no longer published." };
  if (notification.type === "TASK_DUE_REMINDER" && !await TaskModel.exists({ _id: notification.referenceId, weddingId: wedding._id, status: { $nin: ["COMPLETED", "CANCELLED"] }, deletedAt: null, assignedMemberId: notification.recipientId })) return { cancelled: true as const, reason: "The task is complete, cancelled, or reassigned." };
  const apiKey = process.env.RESEND_API_KEY; const from = process.env.RESEND_FROM_EMAIL; const appUrl = process.env.APP_URL;
  if (!apiKey || !from || !appUrl) throw new Error("Email delivery is not configured.");
  const copy = emailCopy(notification, wedding, appUrl);
  const result = await new Resend(apiKey).emails.send({ from, to: notification.recipientEmail, subject: copy.subject, html: copy.html });
  if (result.error) throw new Error(result.error.message);
  return { cancelled: false as const, providerMessageId: result.data?.id ?? "" };
}

function emailCopy(notification: Notification, wedding: { brideName: string; groomName: string }, appUrl: string) {
  const couple = `${wedding.brideName} & ${wedding.groomName}`;
  const label = escapeHtml(notification.referenceLabel);
  const name = escapeHtml(notification.recipientName);
  const base = `<div style="font-family:Arial,sans-serif;color:#1d1b18;line-height:1.7;max-width:620px;margin:auto"><p>Hello ${name},</p>`;
  const close = `<p>With warmth,<br>${escapeHtml(couple)}</p></div>`;
  if (notification.type === "EVENT_REMINDER") return { subject: `Coming up: ${notification.referenceLabel}`, html: `${base}<p>A gentle reminder that <strong>${label}</strong> is coming up soon.</p><p>Please keep your invitation handy for the full ceremony details and directions.</p>${close}` };
  if (notification.type === "RSVP_REMINDER") return { subject: `RSVP reminder: ${notification.referenceLabel}`, html: `${base}<p>We are still waiting for your response to <strong>${label}</strong>.</p><p>Please use your private invitation to reply while responses remain open.</p>${close}` };
  if (notification.type === "TASK_DUE_REMINDER") return { subject: `Task due soon: ${notification.referenceLabel}`, html: `${base}<p>Your wedding task <strong>${label}</strong> is due soon.</p><p><a href="${escapeHtml(new URL("/tasks", appUrl).toString())}">Open wedding tasks</a></p>${close}` };
  if (notification.type === "OVERDUE_TASK_DIGEST") return { subject: "Wedding tasks need attention", html: `${base}<p>There are overdue tasks in the wedding workspace.</p><p><a href="${escapeHtml(new URL("/tasks?due=OVERDUE", appUrl).toString())}">Review overdue tasks</a></p>${close}` };
  return { subject: "Guest photos are waiting for review", html: `${base}<p>${label}.</p><p><a href="${escapeHtml(new URL("/gallery", appUrl).toString())}">Review guest photos</a></p>${close}` };
}

function candidate(value: Candidate) { return value; }
export function resolveReminderInstant(localDate: string, time: string, daysBefore: number, timeZone: string, settings: NotificationSettingsInput) {
  const date = Temporal.PlainDate.from(localDate).subtract({ days: daysBefore });
  let dateTime = date.toPlainDateTime(Temporal.PlainTime.from(time));
  if (settings.quietHoursEnabled && isQuiet(time, settings.quietHoursStart, settings.quietHoursEnd)) {
    const nextDate = settings.quietHoursStart < settings.quietHoursEnd || time >= settings.quietHoursStart ? date.add({ days: 1 }) : date;
    dateTime = nextDate.toPlainDateTime(Temporal.PlainTime.from(settings.quietHoursEnd));
  }
  return new Date(dateTime.toZonedDateTime(timeZone, { disambiguation: "compatible" }).epochMilliseconds);
}
function isQuiet(time: string, start: string, end: string) { return start < end ? time >= start && time < end : time >= start || time < end; }
export function notificationDeliveryKey(item: Pick<Candidate, "weddingId" | "type" | "recipientId" | "referenceId" | "scheduledFor">) { return [item.weddingId, item.type, item.recipientId, item.referenceId ?? "wedding", item.scheduledFor.toISOString()].join(":"); }
function serializeSettings(settings: NotificationSettingsInput & { updatedAt?: Date }) {
  return {
    eventReminderEnabled: settings.eventReminderEnabled,
    eventReminderDaysBefore: settings.eventReminderDaysBefore,
    eventReminderTime: settings.eventReminderTime,
    rsvpReminderEnabled: settings.rsvpReminderEnabled,
    rsvpReminderDaysBefore: settings.rsvpReminderDaysBefore,
    rsvpReminderTime: settings.rsvpReminderTime,
    taskReminderEnabled: settings.taskReminderEnabled,
    taskReminderDaysBefore: settings.taskReminderDaysBefore,
    taskReminderTime: settings.taskReminderTime,
    overdueDigestEnabled: settings.overdueDigestEnabled,
    overdueDigestTime: settings.overdueDigestTime,
    photoDigestEnabled: settings.photoDigestEnabled,
    photoDigestTime: settings.photoDigestTime,
    quietHoursEnabled: settings.quietHoursEnabled,
    quietHoursStart: settings.quietHoursStart,
    quietHoursEnd: settings.quietHoursEnd,
    updatedAt: settings.updatedAt?.toISOString() ?? null,
  };
}
function serializeNotification(item: Notification & { _id: unknown; createdAt: Date; updatedAt: Date }) { return { id: String(item._id), type: item.type, typeLabel: NOTIFICATION_TYPE_LABELS[item.type], recipientEmail: item.recipientEmail, recipientName: item.recipientName, recipientKind: item.recipientKind, referenceLabel: item.referenceLabel, scheduledFor: item.scheduledFor.toISOString(), status: item.status, attempts: item.attempts, sentAt: item.sentAt?.toISOString() ?? null, lastError: item.lastError, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }; }
function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character); }
function safeError(error: unknown) { const message = error instanceof Error ? error.message : "Delivery failed."; return message.replace(/[\r\n]+/g, " ").slice(0, 500); }
function toObjectId(value: string) { return new Types.ObjectId(value); }

export type NotificationListView = Awaited<ReturnType<typeof listNotifications>>;
