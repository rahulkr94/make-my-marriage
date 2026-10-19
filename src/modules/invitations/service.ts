import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { createOpaqueToken, hashToken } from "@/modules/auth/crypto";
import { AuthError } from "@/modules/auth/request-security";
import { EventModel } from "@/modules/events/models";
import { getDirectionsUrl } from "@/modules/events/schedule";
import { GUEST_RELATIONSHIP_LABELS, GUEST_SIDE_LABELS, canManageGuests } from "@/modules/guests/constants";
import { EventGuestModel, GuestModel } from "@/modules/guests/models";
import { WeddingMemberModel, WeddingModel } from "@/modules/weddings/models";
import { GUEST_INVITATION_AFTER_WEDDING_DAYS, GUEST_INVITATIONS_PAGE_SIZE, type GuestInvitationStatus } from "./constants";
import { createGuestInvitationUrl, sendGuestInvitationEmail } from "./email";
import { GuestInvitationModel, type GuestInvitation } from "./models";
import { createInvitationQrDataUrl } from "./qr";
import type { GuestInvitationListQuery } from "./schemas";
import { getRsvpMaxAttendees } from "@/modules/rsvp/constants";
import { RsvpModel } from "@/modules/rsvp/models";

type InvitationActor = { id: string; name: string; email: string };
type InvitationRecord = GuestInvitation & { _id: unknown; createdAt: Date; updatedAt: Date };

async function requirePlanner(userId: string, weddingId: string) {
  if (!isValidObjectId(weddingId)) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  const membership = await WeddingMemberModel.findOne({ userId, weddingId, status: "ACTIVE" }).lean();
  if (!membership) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  if (!canManageGuests(membership.role)) throw new AuthError("FORBIDDEN", "Only Admins and Managers can manage guest invitations.", 403);
  return membership;
}

export async function listGuestInvitations(userId: string, weddingId: string, query: GuestInvitationListQuery) {
  await connectToDatabase();
  await requirePlanner(userId, weddingId);
  const now = new Date();
  const [activeGuestIds, invitations] = await Promise.all([
    GuestModel.find({ weddingId, status: "ACTIVE" }).select("_id").lean(),
    GuestInvitationModel.find({ weddingId }).sort({ updatedAt: -1 }).lean(),
  ]);
  const activeIds = new Set(activeGuestIds.map((guest) => String(guest._id)));
  const invitationMap = new Map(invitations.filter((invitation) => activeIds.has(String(invitation.guestId))).map((invitation) => [String(invitation.guestId), invitation]));
  const statusByGuest = new Map<string, GuestInvitationStatus>();
  for (const id of activeIds) statusByGuest.set(id, invitationStatus(invitationMap.get(id), now));

  const filter: Record<string, unknown> = { weddingId, status: "ACTIVE" };
  if (query.q) {
    const search = new RegExp(escapeRegex(query.q), "i");
    filter.$or = [{ name: search }, { email: search }, { phone: search }];
  }
  if (query.side) filter.side = query.side;
  if (query.status) filter._id = { $in: [...statusByGuest].filter(([, status]) => status === query.status).map(([guestId]) => guestId) };

  const [guests, total, publishedEventIds] = await Promise.all([
    GuestModel.find(filter).sort({ name: 1, _id: 1 }).skip((query.page - 1) * GUEST_INVITATIONS_PAGE_SIZE).limit(GUEST_INVITATIONS_PAGE_SIZE).lean(),
    GuestModel.countDocuments(filter),
    EventModel.distinct("_id", { weddingId, status: "PUBLISHED", deletedAt: null }),
  ]);
  const assignedCounts = guests.length && publishedEventIds.length
    ? await EventGuestModel.aggregate<{ _id: unknown; count: number }>([
      { $match: { weddingId: guests[0].weddingId, guestId: { $in: guests.map((guest) => guest._id) }, eventId: { $in: publishedEventIds }, status: "ACTIVE" } },
      { $group: { _id: "$guestId", count: { $sum: 1 } } },
    ])
    : [];
  const countMap = new Map(assignedCounts.map((item) => [String(item._id), item.count]));
  const statusCounts = { NOT_CREATED: 0, READY: 0, SENT: 0, DELIVERY_FAILED: 0, REVOKED: 0 } satisfies Record<GuestInvitationStatus, number>;
  for (const status of statusByGuest.values()) statusCounts[status] += 1;

  return {
    invitations: guests.map((guest) => {
      const guestId = String(guest._id);
      return {
        guest: {
          id: guestId,
          name: guest.name,
          email: guest.email ?? "",
          phone: guest.phone ?? "",
          side: guest.side,
          sideLabel: GUEST_SIDE_LABELS[guest.side],
          relationship: guest.relationship,
          relationshipLabel: GUEST_RELATIONSHIP_LABELS[guest.relationship],
          assignedEventCount: countMap.get(guestId) ?? 0,
        },
        invitation: serializeInvitation(invitationMap.get(guestId), now),
      };
    }),
    total,
    page: query.page,
    pageSize: GUEST_INVITATIONS_PAGE_SIZE,
    summary: {
      totalGuests: activeIds.size,
      ready: statusCounts.READY,
      delivered: statusCounts.SENT,
      attention: statusCounts.DELIVERY_FAILED + statusCounts.REVOKED,
      notCreated: statusCounts.NOT_CREATED,
    },
  };
}

export async function getGuestInvitationDetail(userId: string, weddingId: string, guestId: string) {
  await connectToDatabase();
  await requirePlanner(userId, weddingId);
  assertIds(weddingId, guestId);
  const guest = await GuestModel.findOne({ _id: guestId, weddingId, status: "ACTIVE" }).lean();
  if (!guest) return null;
  const [invitation, assignments] = await Promise.all([
    GuestInvitationModel.findOne({ weddingId, guestId }).lean(),
    EventGuestModel.find({ weddingId, guestId, status: "ACTIVE" }).lean(),
  ]);
  const events = assignments.length
    ? await EventModel.find({ _id: { $in: assignments.map((assignment) => assignment.eventId) }, weddingId, status: "PUBLISHED", deletedAt: null }).sort({ startsAtUtc: 1, _id: 1 }).lean()
    : [];
  return {
    guest: {
      id: String(guest._id), name: guest.name, email: guest.email ?? "", phone: guest.phone ?? "",
      side: guest.side, sideLabel: GUEST_SIDE_LABELS[guest.side], relationship: guest.relationship,
      relationshipLabel: GUEST_RELATIONSHIP_LABELS[guest.relationship],
    },
    invitation: serializeInvitation(invitation, new Date()),
    assignedEvents: events.map((event) => ({
      id: String(event._id), name: event.name, type: event.type, localDate: event.localDate,
      startLocalTime: event.startLocalTime, endLocalTime: event.endLocalTime, venueName: event.venueName,
      address: event.address, status: event.status,
    })),
  };
}

export async function issueGuestInvitation(actor: InvitationActor, weddingId: string, guestId: string, requestOrigin?: string) {
  const issued = await rotateInvitation(actor.id, weddingId, guestId, "NOT_SENT", requestOrigin);
  return issuanceResponse(issued);
}

export async function sendGuestInvitation(actor: InvitationActor, weddingId: string, guestId: string, requestOrigin?: string) {
  const issued = await rotateInvitation(actor.id, weddingId, guestId, "PENDING", requestOrigin);
  let delivered = false;
  try {
    delivered = await sendGuestInvitationEmail({
      email: issued.guest.email,
      guestName: issued.guest.name,
      coupleName: `${issued.wedding.brideName} & ${issued.wedding.groomName}`,
      invitationUrl: issued.invitationUrl,
    });
  } catch {
    delivered = false;
  }
  const now = new Date();
  const invitation = await GuestInvitationModel.findOneAndUpdate(
    { _id: issued.invitation._id, tokenVersion: issued.invitation.tokenVersion },
    { $set: { lastDeliveryStatus: delivered ? "SENT" : "FAILED", lastSentAt: delivered ? now : null } },
    { new: true },
  );
  if (!invitation) throw new AuthError("INVITATION_REPLACED", "A newer private invitation was generated. Refresh before continuing.", 409);
  return { invitation: serializeInvitation(invitation, now), invitationUrl: issued.invitationUrl, delivered };
}

export async function issueGuestInvitationQr(actor: InvitationActor, weddingId: string, guestId: string, requestOrigin?: string) {
  const issued = await rotateInvitation(actor.id, weddingId, guestId, "NOT_SENT", requestOrigin);
  const qrDataUrl = await createInvitationQrDataUrl(issued.invitationUrl);
  return { ...issuanceResponse(issued), qrDataUrl, fileName: `${slugify(issued.guest.name) || "guest"}-wedding-invitation.png` };
}

export async function revokeGuestInvitation(userId: string, weddingId: string, guestId: string) {
  await connectToDatabase();
  await requirePlanner(userId, weddingId);
  assertIds(weddingId, guestId);
  const guest = await GuestModel.exists({ _id: guestId, weddingId, status: "ACTIVE" });
  if (!guest) throw new AuthError("NOT_FOUND", "Guest not found.", 404);
  const invitation = await GuestInvitationModel.findOneAndUpdate(
    { weddingId, guestId },
    { $set: { status: "REVOKED", revokedAt: new Date() } },
    { new: true },
  );
  if (!invitation) throw new AuthError("NOT_FOUND", "Guest invitation not found.", 404);
  return { invitation: serializeInvitation(invitation, new Date()) };
}

export async function getPublicGuestInvitation(rawToken: string) {
  if (!/^[A-Za-z0-9_-]{32,200}$/.test(rawToken)) return null;
  await connectToDatabase();
  const now = new Date();
  const invitation = await GuestInvitationModel.findOne({ tokenHash: hashToken(rawToken), status: "ACTIVE", expiresAt: { $gt: now } }).select("+tokenHash").lean();
  if (!invitation) return null;
  const [guest, wedding] = await Promise.all([
    GuestModel.findOne({ _id: invitation.guestId, weddingId: invitation.weddingId, status: "ACTIVE" }).lean(),
    WeddingModel.findOne({ _id: invitation.weddingId, status: { $ne: "ARCHIVED" } }).lean(),
  ]);
  if (!guest || !wedding) return null;
  const assignments = await EventGuestModel.find({ weddingId: invitation.weddingId, guestId: guest._id, status: "ACTIVE" }).lean();
  const events = assignments.length
    ? await EventModel.find({ _id: { $in: assignments.map((assignment) => assignment.eventId) }, weddingId: invitation.weddingId, status: "PUBLISHED", deletedAt: null }).sort({ startsAtUtc: 1, _id: 1 }).lean()
    : [];
  const responses = events.length
    ? await RsvpModel.find({ weddingId: invitation.weddingId, guestId: guest._id, eventId: { $in: events.map((event) => event._id) } }).lean()
    : [];
  const responseMap = new Map(responses.map((response) => [String(response.eventId), response]));
  return {
    guest: { name: guest.name },
    wedding: {
      brideName: wedding.brideName, groomName: wedding.groomName, weddingDate: wedding.weddingDate,
      mainVenueName: wedding.mainVenueName, mainAddress: wedding.mainAddress, description: wedding.description ?? "",
    },
    invitation: { expiresAt: invitation.expiresAt.toISOString(), tokenVersion: invitation.tokenVersion },
    rsvpMaxAttendees: getRsvpMaxAttendees(),
    events: events.map((event) => ({
      id: String(event._id), name: event.name, type: event.type, localDate: event.localDate,
      startLocalTime: event.startLocalTime, endLocalTime: event.endLocalTime, endsNextDay: event.endsNextDay,
      timeZone: event.timeZone, venueName: event.venueName, address: event.address,
      directionsUrl: getDirectionsUrl(event.address, event.mapUrl), liveStreamUrl: event.liveStreamUrl ?? "",
      description: event.description ?? "", rsvpClosedAt: event.rsvpClosedAt?.toISOString() ?? null,
      rsvpClosed: Boolean(event.rsvpClosedAt && event.rsvpClosedAt <= now),
      rsvp: responseMap.has(String(event._id)) ? {
        response: responseMap.get(String(event._id))!.response,
        attendeeCount: responseMap.get(String(event._id))!.attendeeCount,
        respondedAt: responseMap.get(String(event._id))!.respondedAt.toISOString(),
      } : null,
    })),
  };
}

async function rotateInvitation(userId: string, weddingId: string, guestId: string, deliveryStatus: "NOT_SENT" | "PENDING", requestOrigin?: string) {
  await connectToDatabase();
  await requirePlanner(userId, weddingId);
  assertIds(weddingId, guestId);
  const [guest, wedding] = await Promise.all([
    GuestModel.findOne({ _id: guestId, weddingId, status: "ACTIVE" }).lean(),
    WeddingModel.findById(weddingId).lean(),
  ]);
  if (!guest || !wedding) throw new AuthError("NOT_FOUND", "Guest not found.", 404);
  if (deliveryStatus === "PENDING" && !guest.email) throw new AuthError("GUEST_EMAIL_REQUIRED", "Add an email address to this guest before sending an invitation.", 409);
  const rawToken = createOpaqueToken(32);
  const invitationUrl = createGuestInvitationUrl(rawToken, requestOrigin);
  if (!invitationUrl) throw new AuthError("INVITATION_URL_UNAVAILABLE", "Configure the application URL before creating invitations.", 503);
  const invitation = await GuestInvitationModel.findOneAndUpdate(
    { weddingId, guestId },
    {
      $set: {
        tokenHash: hashToken(rawToken), expiresAt: invitationExpiry(wedding.weddingDate), status: "ACTIVE",
        lastDeliveryStatus: deliveryStatus, lastSentAt: null, revokedAt: null,
      },
      $inc: { tokenVersion: 1 },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: false },
  );
  return { guest, wedding, invitation, invitationUrl };
}

function issuanceResponse(issued: Awaited<ReturnType<typeof rotateInvitation>>) {
  return { invitation: serializeInvitation(issued.invitation, new Date()), invitationUrl: issued.invitationUrl };
}

function invitationStatus(invitation: InvitationRecord | null | undefined, now: Date): GuestInvitationStatus {
  if (!invitation) return "NOT_CREATED";
  if (invitation.status === "REVOKED" || invitation.expiresAt <= now) return "REVOKED";
  if (invitation.lastDeliveryStatus === "SENT") return "SENT";
  if (invitation.lastDeliveryStatus === "FAILED") return "DELIVERY_FAILED";
  return "READY";
}

function serializeInvitation(invitation: InvitationRecord | null | undefined, now: Date) {
  if (!invitation) return { id: null, status: "NOT_CREATED" as const, tokenVersion: 0, expiresAt: null, lastSentAt: null, lastDeliveryStatus: null, createdAt: null, updatedAt: null };
  return {
    id: String(invitation._id), status: invitationStatus(invitation, now), tokenVersion: invitation.tokenVersion,
    expiresAt: invitation.expiresAt.toISOString(), lastSentAt: invitation.lastSentAt?.toISOString() ?? null,
    lastDeliveryStatus: invitation.lastDeliveryStatus, createdAt: invitation.createdAt.toISOString(), updatedAt: invitation.updatedAt.toISOString(),
  };
}

function invitationExpiry(weddingDate: string) {
  const afterWedding = new Date(`${weddingDate}T23:59:59.999Z`);
  afterWedding.setUTCDate(afterWedding.getUTCDate() + GUEST_INVITATION_AFTER_WEDDING_DAYS);
  const minimum = new Date();
  minimum.setUTCDate(minimum.getUTCDate() + GUEST_INVITATION_AFTER_WEDDING_DAYS);
  return afterWedding > minimum ? afterWedding : minimum;
}

function assertIds(weddingId: string, guestId: string) {
  if (!isValidObjectId(weddingId) || !isValidObjectId(guestId)) throw new AuthError("NOT_FOUND", "Guest not found.", 404);
}
function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function slugify(value: string) { return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

export type GuestInvitationListView = Awaited<ReturnType<typeof listGuestInvitations>>;
export type GuestInvitationDetailView = NonNullable<Awaited<ReturnType<typeof getGuestInvitationDetail>>>;
export type PublicGuestInvitationView = NonNullable<Awaited<ReturnType<typeof getPublicGuestInvitation>>>;
