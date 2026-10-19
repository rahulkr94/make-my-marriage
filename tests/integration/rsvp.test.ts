import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectToDatabase } from "@/lib/mongodb";
import { EventModel } from "@/modules/events/models";
import { createEvent, updateEvent } from "@/modules/events/service";
import { EventGuestModel, GuestModel } from "@/modules/guests/models";
import { createGuest, updateGuest } from "@/modules/guests/service";
import { GuestInvitationModel } from "@/modules/invitations/models";
import { getPublicGuestInvitation, issueGuestInvitation } from "@/modules/invitations/service";
import { RsvpModel } from "@/modules/rsvp/models";
import { getRsvpDashboardSummary, listRsvps, submitPublicRsvp } from "@/modules/rsvp/service";
import { WeddingMemberModel } from "@/modules/weddings/models";
import { createWedding } from "@/modules/weddings/service";

describe.skipIf(process.env.MMM_RUN_DB_TESTS !== "1")("RSVP collection with MongoDB", () => {
  const databaseName = `mmm_rsvp_test_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
  beforeAll(async () => {
    loadEnvConfig(process.cwd());
    process.env.MONGODB_DB = databaseName;
    process.env.RESEND_API_KEY = "";
    await connectToDatabase();
    await Promise.all([WeddingMemberModel.syncIndexes(), EventModel.syncIndexes(), GuestModel.syncIndexes(), EventGuestModel.syncIndexes(), GuestInvitationModel.syncIndexes(), RsvpModel.syncIndexes()]);
  }, 60_000);
  afterAll(async () => { try { if (mongoose.connection.db?.databaseName === databaseName) await mongoose.connection.db.dropDatabase(); } finally { await mongoose.disconnect(); } }, 30_000);

  async function fixture() {
    const adminId = new Types.ObjectId().toString();
    const wedding = await createWedding(adminId, { brideName: "Aanya", groomName: "Rohan", weddingDate: "2027-02-14", timeZone: "Asia/Kolkata", mainVenueName: "Rosewood Palace", mainAddress: "Jaipur, Rajasthan", description: "Celebrate with us." });
    const member = await WeddingMemberModel.create({ weddingId: wedding.id, userId: new Types.ObjectId(), role: "MEMBER", status: "ACTIVE", joinedAt: new Date(), grants: [] });
    const event = await createEvent(adminId, wedding.id, { name: "Wedding Ceremony", type: "WEDDING", localDate: "2027-02-14", startLocalTime: "18:00", endLocalTime: "21:00", endsNextDay: false, venueName: "Royal Lawn", address: "Rosewood Palace, Jaipur", mapUrl: "", liveStreamUrl: "", description: "The wedding ceremony.", status: "PUBLISHED" });
    const guest = await createGuest(adminId, wedding.id, { name: "Priya Sharma", email: "", phone: "", side: "BRIDE", relationship: "FRIEND", notes: "", eventIds: [event.id] });
    const issued = await issueGuestInvitation({ id: adminId, name: "Aanya", email: "admin@example.test" }, wedding.id, guest.id, "https://wedding.test");
    const token = decodeURIComponent(new URL(issued.invitationUrl).pathname.split("/").pop() ?? "");
    return { adminId, memberId: String(member.userId), wedding, event, guest, token };
  }

  it("creates and updates a per-event response and reports current totals", async () => {
    const data = await fixture();
    expect((await getPublicGuestInvitation(data.token))?.events[0].rsvp).toBeNull();
    await submitPublicRsvp(data.token, data.event.id, { response: "YES", attendeeCount: 2 });
    expect((await getPublicGuestInvitation(data.token))?.events[0].rsvp).toMatchObject({ response: "YES", attendeeCount: 2 });
    expect((await listRsvps(data.adminId, data.wedding.id, { q: "", page: 1 })).summary).toMatchObject({ invitedGuestRecords: 1, accepted: 1, declined: 0, pending: 0, expectedAttendees: 2 });
    await submitPublicRsvp(data.token, data.event.id, { response: "NO", attendeeCount: 0 });
    expect(await getRsvpDashboardSummary(data.adminId, data.wedding.id)).toMatchObject({ accepted: 0, declined: 1, pending: 0, expectedAttendees: 0 });
  });

  it("enforces close state and current assignments while preserving history", async () => {
    const data = await fixture();
    await submitPublicRsvp(data.token, data.event.id, { response: "YES", attendeeCount: 1 });
    await updateEvent(data.adminId, data.wedding.id, data.event.id, { rsvpClosedAt: new Date().toISOString() });
    await expect(submitPublicRsvp(data.token, data.event.id, { response: "NO", attendeeCount: 0 })).rejects.toMatchObject({ code: "RSVP_CLOSED" });
    await updateEvent(data.adminId, data.wedding.id, data.event.id, { rsvpClosedAt: null });
    await updateGuest(data.adminId, data.wedding.id, data.guest.id, { eventIds: [] });
    await expect(submitPublicRsvp(data.token, data.event.id, { response: "NO", attendeeCount: 0 })).rejects.toMatchObject({ code: "INVITATION_UNAVAILABLE" });
    expect((await listRsvps(data.adminId, data.wedding.id, { q: "", page: 1 })).summary.invitedGuestRecords).toBe(0);
    expect(await RsvpModel.findOne({ eventId: data.event.id, guestId: data.guest.id }).lean()).toMatchObject({ response: "YES", attendeeCount: 1 });
  });

  it("keeps RSVP reports private from regular members", async () => {
    const data = await fixture();
    await expect(listRsvps(data.memberId, data.wedding.id, { q: "", page: 1 })).rejects.toMatchObject({ status: 403 });
  });
});
