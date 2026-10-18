import { isValidObjectId, Types, type ClientSession } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { AuthError } from "@/modules/auth/request-security";
import { EventModel } from "@/modules/events/models";
import { WeddingMemberModel, WeddingModel } from "@/modules/weddings/models";
import { canManageGuests, GUESTS_PAGE_SIZE } from "./constants";
import { EventGuestModel, GuestModel, type Guest } from "./models";
import { createGuestSchema, type CreateGuestInput, type GuestListQuery, type UpdateGuestInput } from "./schemas";

async function requirePlanner(userId: string, weddingId: string, session?: ClientSession) {
  if (!isValidObjectId(weddingId)) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  const membership = await WeddingMemberModel.findOne({ userId, weddingId, status: "ACTIVE" }).session(session ?? null).lean();
  if (!membership) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  if (!canManageGuests(membership.role)) throw new AuthError("FORBIDDEN", "Only Admins and Managers can manage guests.", 403);
  return membership;
}

async function lockWedding(weddingId: string, session: ClientSession) {
  const wedding = await WeddingModel.findOneAndUpdate({ _id: weddingId }, { $inc: { scheduleVersion: 1 } }, { new: true, session, timestamps: false });
  if (!wedding) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  return wedding;
}

async function validatePublishedEvents(weddingId: string, eventIds: string[], session: ClientSession) {
  if (!eventIds.length) return [];
  const events = await EventModel.find({ _id: { $in: eventIds }, weddingId, status: "PUBLISHED", deletedAt: null }).session(session).lean();
  if (events.length !== eventIds.length) throw new AuthError("INVALID_EVENT_ASSIGNMENT", "Choose only published events from this wedding.", 400, [{ path: "eventIds", message: "One or more selected events are unavailable." }]);
  return events;
}

async function reconcileAssignments(weddingId: string, guestId: string, eventIds: string[], userId: string, session: ClientSession) {
  const now = new Date();
  await EventGuestModel.updateMany(
    { weddingId, guestId, status: "ACTIVE", ...(eventIds.length ? { eventId: { $nin: eventIds } } : {}) },
    { $set: { status: "REMOVED", removedAt: now } },
    { session },
  );
  if (!eventIds.length) return;
  const weddingObjectId = new Types.ObjectId(weddingId);
  const guestObjectId = new Types.ObjectId(guestId);
  const userObjectId = new Types.ObjectId(userId);
  await EventGuestModel.bulkWrite(eventIds.map((eventId) => ({
    updateOne: {
      filter: { eventId: new Types.ObjectId(eventId), guestId: guestObjectId },
      update: { $set: { weddingId: weddingObjectId, eventId: new Types.ObjectId(eventId), guestId: guestObjectId, status: "ACTIVE", assignedBy: userObjectId, assignedAt: now, removedAt: null } },
      upsert: true,
    },
  })), { session });
}

export async function createGuest(userId: string, weddingId: string, input: CreateGuestInput) {
  const database = await connectToDatabase();
  if (!isValidObjectId(weddingId)) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  const session = await database.startSession();
  try {
    return await session.withTransaction(async () => {
      await lockWedding(weddingId, session);
      await requirePlanner(userId, weddingId, session);
      await validatePublishedEvents(weddingId, input.eventIds, session);
      const { eventIds, ...guestValues } = input;
      const [guest] = await GuestModel.create([{ ...guestValues, weddingId, createdBy: userId, status: "ACTIVE" }], { session });
      await reconcileAssignments(weddingId, String(guest._id), eventIds, userId, session);
      return serializeGuest(guest, await assignedEventViews(weddingId, [String(guest._id)], session).then((map) => map.get(String(guest._id)) ?? []));
    });
  } finally {
    await session.endSession();
  }
}

export async function listGuests(userId: string, weddingId: string, query: GuestListQuery) {
  await connectToDatabase();
  await requirePlanner(userId, weddingId);
  const publishedEvents = await EventModel.find({ weddingId, status: "PUBLISHED", deletedAt: null }).sort({ startsAtUtc: 1, _id: 1 }).lean();
  const publishedIds = publishedEvents.map((event) => event._id);
  const filter: Record<string, unknown> = { weddingId, status: "ACTIVE" };
  if (query.side) filter.side = query.side;
  if (query.relationship) filter.relationship = query.relationship;
  if (query.q) {
    const search = new RegExp(escapeRegex(query.q), "i");
    filter.$or = [{ name: search }, { email: search }, { phone: search }];
  }
  if (query.eventId) {
    const ids = await EventGuestModel.distinct("guestId", { weddingId, eventId: query.eventId, status: "ACTIVE" });
    filter._id = { $in: ids };
  }
  const [guests, total, allTotal, bride, groom, common, assignedIds] = await Promise.all([
    GuestModel.find(filter).sort({ name: 1, _id: 1 }).skip((query.page - 1) * GUESTS_PAGE_SIZE).limit(GUESTS_PAGE_SIZE).lean(),
    GuestModel.countDocuments(filter),
    GuestModel.countDocuments({ weddingId, status: "ACTIVE" }),
    GuestModel.countDocuments({ weddingId, status: "ACTIVE", side: "BRIDE" }),
    GuestModel.countDocuments({ weddingId, status: "ACTIVE", side: "GROOM" }),
    GuestModel.countDocuments({ weddingId, status: "ACTIVE", side: "COMMON" }),
    publishedIds.length ? EventGuestModel.distinct("guestId", { weddingId, eventId: { $in: publishedIds }, status: "ACTIVE" }) : Promise.resolve([]),
  ]);
  const assignments = await assignedEventViews(weddingId, guests.map((guest) => String(guest._id)));
  return {
    guests: guests.map((guest) => serializeGuest(guest, assignments.get(String(guest._id)) ?? [])),
    total,
    summary: { total: allTotal, bride, groom, common, unassigned: Math.max(0, allTotal - assignedIds.length) },
    eventOptions: publishedEvents.map(serializeEventOption),
    page: query.page,
    pageSize: GUESTS_PAGE_SIZE,
  };
}

export async function getGuest(userId: string, weddingId: string, guestId: string) {
  await connectToDatabase();
  await requirePlanner(userId, weddingId);
  if (!isValidObjectId(guestId)) return null;
  const guest = await GuestModel.findOne({ _id: guestId, weddingId, status: "ACTIVE" }).lean();
  if (!guest) return null;
  const assignments = await assignedEventViews(weddingId, [guestId]);
  return serializeGuest(guest, assignments.get(guestId) ?? []);
}

export async function getAssignableEvents(userId: string, weddingId: string) {
  await connectToDatabase();
  await requirePlanner(userId, weddingId);
  const events = await EventModel.find({ weddingId, status: "PUBLISHED", deletedAt: null }).sort({ startsAtUtc: 1, _id: 1 }).lean();
  return events.map(serializeEventOption);
}

export async function updateGuest(userId: string, weddingId: string, guestId: string, input: UpdateGuestInput) {
  const database = await connectToDatabase();
  if (!isValidObjectId(weddingId) || !isValidObjectId(guestId)) throw new AuthError("NOT_FOUND", "Guest not found.", 404);
  const session = await database.startSession();
  try {
    return await session.withTransaction(async () => {
      await lockWedding(weddingId, session);
      await requirePlanner(userId, weddingId, session);
      const guest = await GuestModel.findOne({ _id: guestId, weddingId, status: "ACTIVE" }).session(session);
      if (!guest) throw new AuthError("NOT_FOUND", "Guest not found.", 404);
      const currentEventIds = (await EventGuestModel.find({ weddingId, guestId, status: "ACTIVE" }).session(session).lean()).map((assignment) => String(assignment.eventId));
      const values = createGuestSchema.parse({
        name: guest.name, email: guest.email, phone: guest.phone, side: guest.side,
        relationship: guest.relationship, notes: guest.notes, eventIds: currentEventIds, ...input,
      });
      await validatePublishedEvents(weddingId, values.eventIds, session);
      guest.set({ name: values.name, email: values.email, phone: values.phone, side: values.side, relationship: values.relationship, notes: values.notes });
      await guest.save({ session });
      await reconcileAssignments(weddingId, guestId, values.eventIds, userId, session);
      const assignments = await assignedEventViews(weddingId, [guestId], session);
      return serializeGuest(guest, assignments.get(guestId) ?? []);
    });
  } finally {
    await session.endSession();
  }
}

export async function removeGuest(userId: string, weddingId: string, guestId: string) {
  const database = await connectToDatabase();
  if (!isValidObjectId(weddingId) || !isValidObjectId(guestId)) throw new AuthError("NOT_FOUND", "Guest not found.", 404);
  const session = await database.startSession();
  try {
    return await session.withTransaction(async () => {
      await lockWedding(weddingId, session);
      await requirePlanner(userId, weddingId, session);
      const now = new Date();
      const guest = await GuestModel.findOneAndUpdate({ _id: guestId, weddingId, status: "ACTIVE" }, { $set: { status: "REMOVED", removedAt: now } }, { new: true, session });
      if (!guest) throw new AuthError("NOT_FOUND", "Guest not found.", 404);
      await EventGuestModel.updateMany({ weddingId, guestId, status: "ACTIVE" }, { $set: { status: "REMOVED", removedAt: now } }, { session });
      return { id: String(guest._id), removed: true as const };
    });
  } finally {
    await session.endSession();
  }
}

export async function getGuestSummary(userId: string, weddingId: string) {
  await connectToDatabase();
  await requirePlanner(userId, weddingId);
  const activeGuests = await GuestModel.countDocuments({ weddingId, status: "ACTIVE" });
  return { activeGuests };
}

async function assignedEventViews(weddingId: string, guestIds: string[], session?: ClientSession) {
  const result = new Map<string, EventOption[]>();
  if (!guestIds.length) return result;
  const assignments = await EventGuestModel.find({ weddingId, guestId: { $in: guestIds }, status: "ACTIVE" }).session(session ?? null).lean();
  if (!assignments.length) return result;
  const events = await EventModel.find({ _id: { $in: assignments.map((assignment) => assignment.eventId) }, weddingId, status: "PUBLISHED", deletedAt: null }).session(session ?? null).lean();
  const eventMap = new Map(events.map((event) => [String(event._id), serializeEventOption(event)]));
  for (const assignment of assignments) {
    const event = eventMap.get(String(assignment.eventId));
    if (!event) continue;
    const guestId = String(assignment.guestId);
    result.set(guestId, [...(result.get(guestId) ?? []), event]);
  }
  for (const [guestId, items] of result) result.set(guestId, items.sort((a, b) => a.startsAtUtc.localeCompare(b.startsAtUtc)));
  return result;
}

function serializeGuest(guest: Guest & { _id: unknown }, assignedEvents: EventOption[]) {
  return { id: String(guest._id), name: guest.name, email: guest.email ?? "", phone: guest.phone ?? "", side: guest.side, relationship: guest.relationship, notes: guest.notes ?? "", assignedEvents };
}
function serializeEventOption(event: { _id: unknown; name: string; type: string; localDate: string; startLocalTime: string; venueName: string; startsAtUtc: Date }) {
  return { id: String(event._id), name: event.name, type: event.type, localDate: event.localDate, startLocalTime: event.startLocalTime, venueName: event.venueName, startsAtUtc: event.startsAtUtc.toISOString() };
}
function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
export type GuestView = ReturnType<typeof serializeGuest>;
export type EventOption = ReturnType<typeof serializeEventOption>;
