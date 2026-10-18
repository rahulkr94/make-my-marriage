import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectToDatabase } from "@/lib/mongodb";
import { createEvent } from "@/modules/events/service";
import { EventModel } from "@/modules/events/models";
import { EventGuestModel, GuestModel } from "@/modules/guests/models";
import { createGuest, removeGuest, updateGuest } from "@/modules/guests/service";
import { GuestInvitationModel } from "@/modules/invitations/models";
import { getPublicGuestInvitation, issueGuestInvitation, issueGuestInvitationQr, listGuestInvitations, revokeGuestInvitation, sendGuestInvitation } from "@/modules/invitations/service";
import { WeddingMemberModel } from "@/modules/weddings/models";
import { createWedding } from "@/modules/weddings/service";

describe.skipIf(process.env.MMM_RUN_DB_TESTS !== "1")("guest invitations with MongoDB", () => {
  const databaseName = `mmm_invitations_test_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
  beforeAll(async () => {
    loadEnvConfig(process.cwd()); process.env.MONGODB_DB = databaseName;
    await connectToDatabase();
    await Promise.all([WeddingMemberModel.syncIndexes(), EventModel.syncIndexes(), GuestModel.syncIndexes(), EventGuestModel.syncIndexes(), GuestInvitationModel.syncIndexes()]);
  }, 60_000);
  afterAll(async () => { try { if (mongoose.connection.db?.databaseName === databaseName) await mongoose.connection.db.dropDatabase(); } finally { await mongoose.disconnect(); } }, 30_000);

  async function fixture() {
    const adminId = new Types.ObjectId().toString();
    const wedding = await createWedding(adminId, { brideName: "Aanya", groomName: "Rohan", weddingDate: "2027-02-14", timeZone: "Asia/Kolkata", mainVenueName: "Rosewood Palace", mainAddress: "Jaipur, Rajasthan", description: "Celebrate with us." });
    const member = await WeddingMemberModel.create({ weddingId: wedding.id, userId: new Types.ObjectId(), role: "MEMBER", status: "ACTIVE", joinedAt: new Date(), grants: [] });
    const first = await createEvent(adminId, wedding.id, { name: "Mehendi", type: "MEHENDI", localDate: "2027-02-12", startLocalTime: "16:00", endLocalTime: "19:00", endsNextDay: false, venueName: "Garden Courtyard", address: "Rosewood Palace, Jaipur", mapUrl: "", liveStreamUrl: "https://example.test/live", description: "An afternoon of colour.", status: "PUBLISHED" });
    const second = await createEvent(adminId, wedding.id, { name: "Wedding Ceremony", type: "WEDDING", localDate: "2027-02-14", startLocalTime: "18:00", endLocalTime: "21:00", endsNextDay: false, venueName: "Royal Lawn", address: "Rosewood Palace, Jaipur", mapUrl: "", liveStreamUrl: "", description: "The wedding ceremony.", status: "PUBLISHED" });
    const guest = await createGuest(adminId, wedding.id, { name: "Meera Sharma", email: "meera@example.test", phone: "", side: "BRIDE", relationship: "RELATIVE", notes: "Private note", eventIds: [first.id] });
    return { actor: { id: adminId, name: "Aanya", email: "admin@example.test" }, memberId: String(member.userId), wedding, guest, first, second };
  }
  function tokenFrom(url: string) { return decodeURIComponent(new URL(url).pathname.split("/").pop() ?? ""); }

  it("issues only hashed credentials, rotates old links, and projects current assignments", async () => {
    const data = await fixture();
    const firstIssue = await issueGuestInvitation(data.actor, data.wedding.id, data.guest.id, "https://wedding.test");
    const firstToken = tokenFrom(firstIssue.invitationUrl);
    const stored = await GuestInvitationModel.findOne({ guestId: data.guest.id }).select("+tokenHash").lean();
    expect(stored?.tokenHash).not.toBe(firstToken);
    expect(JSON.stringify(stored)).not.toContain(firstToken);
    const publicFirst = await getPublicGuestInvitation(firstToken);
    expect(publicFirst).toMatchObject({ guest: { name: "Meera Sharma" }, wedding: { brideName: "Aanya", groomName: "Rohan" } });
    expect(publicFirst?.events.map((event) => event.name)).toEqual(["Mehendi"]);
    expect(JSON.stringify(publicFirst)).not.toContain("Private note");
    expect(JSON.stringify(publicFirst)).not.toContain("meera@example.test");

    await updateGuest(data.actor.id, data.wedding.id, data.guest.id, { eventIds: [data.second.id] });
    expect((await getPublicGuestInvitation(firstToken))?.events.map((event) => event.name)).toEqual(["Wedding Ceremony"]);
    const secondIssue = await issueGuestInvitation(data.actor, data.wedding.id, data.guest.id, "https://wedding.test");
    expect(await getPublicGuestInvitation(firstToken)).toBeNull();
    expect(await getPublicGuestInvitation(tokenFrom(secondIssue.invitationUrl))).not.toBeNull();
  });

  it("generates a downloadable QR, enforces planner access, and revokes credentials", async () => {
    const data = await fixture();
    await expect(issueGuestInvitation({ id: data.memberId, name: "Member", email: "member@example.test" }, data.wedding.id, data.guest.id, "https://wedding.test")).rejects.toMatchObject({ status: 403 });
    const issued = await issueGuestInvitationQr(data.actor, data.wedding.id, data.guest.id, "https://wedding.test");
    expect(issued.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    const token = tokenFrom(issued.invitationUrl);
    expect(await getPublicGuestInvitation(token)).not.toBeNull();
    await revokeGuestInvitation(data.actor.id, data.wedding.id, data.guest.id);
    expect(await getPublicGuestInvitation(token)).toBeNull();
  });

  it("lists delivery states and revokes access when a guest is removed", async () => {
    const data = await fixture();
    const before = await listGuestInvitations(data.actor.id, data.wedding.id, { q: "", page: 1 });
    expect(before.summary.notCreated).toBe(1);
    const issued = await issueGuestInvitation(data.actor, data.wedding.id, data.guest.id, "https://wedding.test");
    const ready = await listGuestInvitations(data.actor.id, data.wedding.id, { q: "", status: "READY", page: 1 });
    expect(ready.invitations).toHaveLength(1);
    await removeGuest(data.actor.id, data.wedding.id, data.guest.id);
    expect(await getPublicGuestInvitation(tokenFrom(issued.invitationUrl))).toBeNull();
    expect(await GuestInvitationModel.findOne({ guestId: data.guest.id }).lean()).toMatchObject({ status: "REVOKED" });
  });

  it("does not rotate a credential when email delivery is requested without an address", async () => {
    const data = await fixture();
    const guest = await createGuest(data.actor.id, data.wedding.id, { name: "Guest Without Email", email: "", phone: "+91 98765 43210", side: "COMMON", relationship: "FRIEND", notes: "", eventIds: [] });
    await expect(sendGuestInvitation(data.actor, data.wedding.id, guest.id, "https://wedding.test")).rejects.toMatchObject({ code: "GUEST_EMAIL_REQUIRED" });
    expect(await GuestInvitationModel.findOne({ guestId: guest.id })).toBeNull();
  });
});
