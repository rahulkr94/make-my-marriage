import { isValidObjectId, type ClientSession } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { AuthError } from "@/modules/auth/request-security";
import { WeddingMemberModel, WeddingModel } from "@/modules/weddings/models";
import { canManageEvents, EVENTS_PAGE_SIZE } from "./constants";
import { EventModel, type WeddingEvent } from "./models";
import { getDirectionsUrl, resolveEventSchedule } from "./schedule";
import { createEventSchema, type CreateEventInput, type UpdateEventInput } from "./schemas";

async function requireMembership(userId: string, weddingId: string, session?: ClientSession) {
  if (!isValidObjectId(weddingId)) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  const membership = await WeddingMemberModel.findOne({ userId, weddingId, status: "ACTIVE" }).session(session ?? null).lean();
  if (!membership) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  return membership;
}
export async function createEvent(userId: string, weddingId: string, input: CreateEventInput) {
  const database = await connectToDatabase();
  if (!isValidObjectId(weddingId)) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  const session = await database.startSession();
  try {
    return await session.withTransaction(async () => {
      // Serialize schedule creation with time-zone and member-access changes.
      const wedding = await WeddingModel.findOneAndUpdate({ _id: weddingId }, { $inc: { scheduleVersion: 1 } }, { new: true, session, timestamps: false });
      if (!wedding) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
      const membership = await requireMembership(userId, weddingId, session);
      if (!canManageEvents(membership.role)) throw new AuthError("FORBIDDEN", "Only Admins and Managers can create events.", 403);
      const schedule = resolveEventSchedule(input, wedding.timeZone);
      const [event] = await EventModel.create([{ ...input, ...schedule, weddingId }], { session });
      return serializeEvent(event);
    });
  } finally { await session.endSession(); }
}
export async function listEvents(userId: string, weddingId: string, page = 1) {
  await connectToDatabase();
  const membership = await requireMembership(userId, weddingId);
  const manager = canManageEvents(membership.role);
  const filter = { weddingId, deletedAt: null, ...(manager ? {} : { status: "PUBLISHED" }) };
  const [events, total, published, drafts, cancelled] = await Promise.all([
    EventModel.find(filter).sort({ startsAtUtc: 1, _id: 1 }).skip((page - 1) * EVENTS_PAGE_SIZE).limit(EVENTS_PAGE_SIZE).lean(),
    EventModel.countDocuments(filter),
    EventModel.countDocuments({ weddingId, deletedAt: null, status: "PUBLISHED" }),
    manager ? EventModel.countDocuments({ weddingId, deletedAt: null, status: "DRAFT" }) : Promise.resolve(0),
    manager ? EventModel.countDocuments({ weddingId, deletedAt: null, status: "CANCELLED" }) : Promise.resolve(0),
  ]);
  return { events: events.map(serializeEvent), total, published, drafts, cancelled, page, pageSize: EVENTS_PAGE_SIZE };
}
export async function getEvent(userId: string, weddingId: string, eventId: string) {
  await connectToDatabase();
  const membership = await requireMembership(userId, weddingId);
  if (!isValidObjectId(eventId)) return null;
  const event = await EventModel.findOne({ _id: eventId, weddingId, deletedAt: null, ...(canManageEvents(membership.role) ? {} : { status: "PUBLISHED" }) }).lean();
  return event ? serializeEvent(event) : null;
}
export async function updateEvent(userId: string, weddingId: string, eventId: string, input: UpdateEventInput) {
  const database = await connectToDatabase();
  if (!isValidObjectId(weddingId) || !isValidObjectId(eventId)) throw new AuthError("NOT_FOUND", "Event not found.", 404);
  const session = await database.startSession();
  try {
    return await session.withTransaction(async () => {
      const wedding = await WeddingModel.findOneAndUpdate({ _id: weddingId }, { $inc: { scheduleVersion: 1 } }, { new: true, session, timestamps: false });
      if (!wedding) throw new AuthError("NOT_FOUND", "Event not found.", 404);
      const membership = await requireMembership(userId, weddingId, session);
      if (!canManageEvents(membership.role)) throw new AuthError("FORBIDDEN", "Only Admins and Managers can edit events.", 403);
      const event = await EventModel.findOne({ _id: eventId, weddingId, deletedAt: null }).session(session);
      if (!event) throw new AuthError("NOT_FOUND", "Event not found.", 404);
      const nextStatus = input.status ?? event.status;
      if (input.status === "CANCELLED" && event.status === "DRAFT") throw new AuthError("INVALID_EVENT_TRANSITION", "Publish this event before cancelling it, or remove the draft instead.", 409);
      if (input.status === "PUBLISHED" && event.status === "CANCELLED") throw new AuthError("INVALID_EVENT_TRANSITION", "Restore this event to draft and review it before publishing again.", 409);
      const values = createEventSchema.parse({
        name: event.name, type: event.type, localDate: event.localDate, startLocalTime: event.startLocalTime,
        endLocalTime: event.endLocalTime, endsNextDay: event.endsNextDay, venueName: event.venueName,
        address: event.address, mapUrl: event.mapUrl, liveStreamUrl: event.liveStreamUrl,
        description: event.description,
        ...input,
        status: nextStatus === "CANCELLED" ? "DRAFT" : nextStatus,
      });
      event.set({ ...values, status: nextStatus, ...resolveEventSchedule(values, wedding.timeZone) });
      await event.save({ session });
      return serializeEvent(event);
    });
  } finally {
    await session.endSession();
  }
}
export async function removeEvent(userId: string, weddingId: string, eventId: string) {
  const database = await connectToDatabase();
  if (!isValidObjectId(weddingId) || !isValidObjectId(eventId)) throw new AuthError("NOT_FOUND", "Event not found.", 404);
  const session = await database.startSession();
  try {
    return await session.withTransaction(async () => {
      const wedding = await WeddingModel.findOneAndUpdate({ _id: weddingId }, { $inc: { scheduleVersion: 1 } }, { new: true, session, timestamps: false });
      if (!wedding) throw new AuthError("NOT_FOUND", "Event not found.", 404);
      const membership = await requireMembership(userId, weddingId, session);
      if (!canManageEvents(membership.role)) throw new AuthError("FORBIDDEN", "Only Admins and Managers can remove events.", 403);
      const event = await EventModel.findOneAndUpdate(
        { _id: eventId, weddingId, deletedAt: null },
        { $set: { status: "CANCELLED", deletedAt: new Date() } },
        { new: true, session },
      );
      if (!event) throw new AuthError("NOT_FOUND", "Event not found.", 404);
      return { id: String(event._id), removed: true as const };
    });
  } finally {
    await session.endSession();
  }
}
export async function getUpcomingEvents(userId: string, weddingId: string) {
  await connectToDatabase();
  await requireMembership(userId, weddingId);
  const events = await EventModel.find({ weddingId, status: "PUBLISHED", deletedAt: null, startsAtUtc: { $gte: new Date() } }).sort({ startsAtUtc: 1, _id: 1 }).limit(3).lean();
  return events.map(serializeEvent);
}
function serializeEvent(event: WeddingEvent & { _id: unknown }) {
  return {
    id: String(event._id), name: event.name, type: event.type, localDate: event.localDate,
    startLocalTime: event.startLocalTime, endLocalTime: event.endLocalTime, endsNextDay: event.endsNextDay,
    startsAtUtc: event.startsAtUtc.toISOString(), endsAtUtc: event.endsAtUtc?.toISOString() ?? null,
    timeZone: event.timeZone, venueName: event.venueName, address: event.address, mapUrl: event.mapUrl,
    liveStreamUrl: event.liveStreamUrl ?? "",
    directionsUrl: getDirectionsUrl(event.address, event.mapUrl), description: event.description, status: event.status,
  };
}
export type EventView = ReturnType<typeof serializeEvent>;
