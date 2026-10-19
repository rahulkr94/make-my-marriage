import { isValidObjectId, type ClientSession } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { hashToken } from "@/modules/auth/crypto";
import { AuthError } from "@/modules/auth/request-security";
import { EventModel } from "@/modules/events/models";
import { GUEST_SIDE_LABELS, canManageGuests } from "@/modules/guests/constants";
import { EventGuestModel, GuestModel } from "@/modules/guests/models";
import { GuestInvitationModel } from "@/modules/invitations/models";
import { WeddingMemberModel, WeddingModel } from "@/modules/weddings/models";
import { RSVP_PAGE_SIZE, getRsvpMaxAttendees } from "./constants";
import { sendRsvpConfirmationEmail } from "./email";
import { RsvpModel } from "./models";
import type { PublicRsvpInput, RsvpListQuery } from "./schemas";

async function requirePlanner(userId: string, weddingId: string, session?: ClientSession) {
  if (!isValidObjectId(weddingId)) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  const membership = await WeddingMemberModel.findOne({ userId, weddingId, status: "ACTIVE" }).session(session ?? null).lean();
  if (!membership) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  if (!canManageGuests(membership.role)) throw new AuthError("FORBIDDEN", "Only Admins and Managers can view guest responses.", 403);
  return membership;
}

export async function submitPublicRsvp(rawToken: string, eventId: string, input: PublicRsvpInput) {
  if (!validToken(rawToken) || !isValidObjectId(eventId)) throw unavailable();
  const database = await connectToDatabase();
  const session = await database.startSession();
  let result: {
    confirmation: { email: string; guestName: string; coupleName: string; eventName: string };
    saved: { eventId: string; response: "YES" | "NO"; attendeeCount: number; respondedAt: string };
  } | null = null;
  try {
    result = await session.withTransaction(async () => {
      const now = new Date();
      const invitation = await GuestInvitationModel.findOne({ tokenHash: hashToken(rawToken), status: "ACTIVE", expiresAt: { $gt: now } }).select("+tokenHash").session(session).lean();
      if (!invitation) throw unavailable();
      const wedding = await WeddingModel.findOneAndUpdate(
        { _id: invitation.weddingId, status: { $ne: "ARCHIVED" } },
        { $inc: { scheduleVersion: 1 } },
        { new: true, session, timestamps: false },
      );
      if (!wedding) throw unavailable();
      const [guest, event, assignment] = await Promise.all([
        GuestModel.findOne({ _id: invitation.guestId, weddingId: invitation.weddingId, status: "ACTIVE" }).session(session).lean(),
        EventModel.findOne({ _id: eventId, weddingId: invitation.weddingId, status: "PUBLISHED", deletedAt: null }).session(session).lean(),
        EventGuestModel.findOne({ eventId, guestId: invitation.guestId, weddingId: invitation.weddingId, status: "ACTIVE" }).session(session).lean(),
      ]);
      if (!guest || !event || !assignment) throw unavailable();
      if (event.rsvpClosedAt && event.rsvpClosedAt <= now) throw new AuthError("RSVP_CLOSED", "Responses are closed for this ceremony.", 409);

      const rsvp = await RsvpModel.findOneAndUpdate(
        { eventId: event._id, guestId: guest._id },
        { $set: { weddingId: invitation.weddingId, eventId: event._id, guestId: guest._id, response: input.response, attendeeCount: input.attendeeCount, respondedAt: now } },
        { upsert: true, new: true, runValidators: true, session, setDefaultsOnInsert: true },
      );
      return {
        saved: { eventId: String(event._id), response: rsvp.response, attendeeCount: rsvp.attendeeCount, respondedAt: rsvp.respondedAt.toISOString() },
        confirmation: { email: guest.email ?? "", guestName: guest.name, coupleName: `${wedding.brideName} & ${wedding.groomName}`, eventName: event.name },
      };
    });
  } finally {
    await session.endSession();
  }
  if (!result) throw new Error("RSVP transaction completed without a result.");
  const { saved, confirmation } = result;
  let confirmationDelivered = false;
  if (confirmation.email) {
    try { confirmationDelivered = await sendRsvpConfirmationEmail({ ...confirmation, response: saved.response, attendeeCount: saved.attendeeCount }); } catch { confirmationDelivered = false; }
  }
  return { ...saved, confirmationDelivered };
}

export async function listRsvps(userId: string, weddingId: string, query: RsvpListQuery) {
  await connectToDatabase();
  await requirePlanner(userId, weddingId);
  const snapshot = await loadSnapshot(weddingId);
  let rows = snapshot.rows;
  if (query.q) {
    const needle = query.q.toLocaleLowerCase();
    rows = rows.filter((row) => row.guest.name.toLocaleLowerCase().includes(needle) || row.guest.email.toLocaleLowerCase().includes(needle));
  }
  if (query.eventId) rows = rows.filter((row) => row.event.id === query.eventId);
  if (query.response) rows = rows.filter((row) => (row.rsvp?.response ?? "PENDING") === query.response);
  if (query.side) rows = rows.filter((row) => row.guest.side === query.side);
  const total = rows.length;
  const start = (query.page - 1) * RSVP_PAGE_SIZE;
  return {
    rows: rows.slice(start, start + RSVP_PAGE_SIZE),
    total,
    page: query.page,
    pageSize: RSVP_PAGE_SIZE,
    summary: snapshot.summary,
    eventSummaries: snapshot.eventSummaries,
    eventOptions: snapshot.eventSummaries.map(({ id, name, localDate }) => ({ id, name, localDate })),
  };
}

export async function getRsvpDashboardSummary(userId: string, weddingId: string) {
  await connectToDatabase();
  await requirePlanner(userId, weddingId);
  const snapshot = await loadSnapshot(weddingId);
  return { ...snapshot.summary, events: snapshot.eventSummaries.slice(0, 3) };
}

async function loadSnapshot(weddingId: string) {
  const now = new Date();
  const events = await EventModel.find({ weddingId, status: "PUBLISHED", deletedAt: null }).sort({ startsAtUtc: 1, _id: 1 }).lean();
  const eventIds = events.map((event) => event._id);
  const assignments = eventIds.length ? await EventGuestModel.find({ weddingId, eventId: { $in: eventIds }, status: "ACTIVE" }).lean() : [];
  const guestIds = [...new Set(assignments.map((assignment) => String(assignment.guestId)))];
  const [guests, responses, invitations] = await Promise.all([
    guestIds.length ? GuestModel.find({ _id: { $in: guestIds }, weddingId, status: "ACTIVE" }).lean() : Promise.resolve([]),
    assignments.length ? RsvpModel.find({ weddingId, eventId: { $in: eventIds }, guestId: { $in: guestIds } }).lean() : Promise.resolve([]),
    guestIds.length ? GuestInvitationModel.find({ weddingId, guestId: { $in: guestIds } }).lean() : Promise.resolve([]),
  ]);
  const eventMap = new Map(events.map((event) => [String(event._id), event]));
  const guestMap = new Map(guests.map((guest) => [String(guest._id), guest]));
  const responseMap = new Map(responses.map((response) => [`${response.eventId}:${response.guestId}`, response]));
  const invitationMap = new Map(invitations.map((invitation) => [String(invitation.guestId), invitation]));
  const rows = assignments.flatMap((assignment) => {
    const event = eventMap.get(String(assignment.eventId));
    const guest = guestMap.get(String(assignment.guestId));
    if (!event || !guest) return [];
    const response = responseMap.get(`${assignment.eventId}:${assignment.guestId}`);
    const invitation = invitationMap.get(String(guest._id));
    return [{
      id: `${assignment.eventId}:${assignment.guestId}`,
      guest: { id: String(guest._id), name: guest.name, email: guest.email ?? "", side: guest.side, sideLabel: GUEST_SIDE_LABELS[guest.side] },
      event: { id: String(event._id), name: event.name, localDate: event.localDate, startLocalTime: event.startLocalTime },
      rsvp: response ? { response: response.response, attendeeCount: response.attendeeCount, respondedAt: response.respondedAt.toISOString() } : null,
      invitationStatus: invitationDeliveryState(invitation, now),
    }];
  }).sort((left, right) => left.event.localDate.localeCompare(right.event.localDate) || left.guest.name.localeCompare(right.guest.name));

  const summary = summarize(rows);
  const eventSummaries = events.map((event) => {
    const eventRows = rows.filter((row) => row.event.id === String(event._id));
    return {
      id: String(event._id), name: event.name, localDate: event.localDate, startLocalTime: event.startLocalTime,
      venueName: event.venueName, rsvpClosedAt: event.rsvpClosedAt?.toISOString() ?? null,
      rsvpClosed: Boolean(event.rsvpClosedAt && event.rsvpClosedAt <= now), ...summarize(eventRows),
    };
  });
  return { rows, summary, eventSummaries };
}

function summarize(rows: Array<{ rsvp: { response: "YES" | "NO"; attendeeCount: number } | null }>) {
  let accepted = 0; let declined = 0; let expectedAttendees = 0;
  for (const row of rows) {
    if (row.rsvp?.response === "YES") { accepted += 1; expectedAttendees += row.rsvp.attendeeCount; }
    else if (row.rsvp?.response === "NO") declined += 1;
  }
  const invitedGuestRecords = rows.length;
  const pending = Math.max(0, invitedGuestRecords - accepted - declined);
  return { invitedGuestRecords, accepted, declined, pending, expectedAttendees, responseRate: invitedGuestRecords ? Math.round(((accepted + declined) / invitedGuestRecords) * 100) : 0 };
}

function invitationDeliveryState(invitation: { status: string; expiresAt: Date; lastDeliveryStatus: string } | undefined, now: Date) {
  if (!invitation) return "NOT_CREATED" as const;
  if (invitation.status !== "ACTIVE" || invitation.expiresAt <= now) return "REVOKED" as const;
  if (invitation.lastDeliveryStatus === "SENT") return "SENT" as const;
  if (invitation.lastDeliveryStatus === "FAILED") return "DELIVERY_FAILED" as const;
  return "READY" as const;
}

function validToken(value: string) { return /^[A-Za-z0-9_-]{32,200}$/.test(value); }
function unavailable() { return new AuthError("INVITATION_UNAVAILABLE", "This invitation is no longer available.", 404); }

export type RsvpListView = Awaited<ReturnType<typeof listRsvps>>;
export type RsvpDashboardSummary = Awaited<ReturnType<typeof getRsvpDashboardSummary>>;
export { getRsvpMaxAttendees };
