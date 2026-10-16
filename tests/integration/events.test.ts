import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectToDatabase } from "@/lib/mongodb";
import { EventModel } from "@/modules/events/models";
import { createEvent, getEvent, listEvents } from "@/modules/events/service";
import { WeddingMemberModel } from "@/modules/weddings/models";
import { createWedding, updateWedding } from "@/modules/weddings/service";

describe.skipIf(process.env.MMM_RUN_DB_TESTS !== "1")("events with MongoDB transactions", () => {
  const databaseName = `mmm_events_test_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
  beforeAll(async () => { loadEnvConfig(process.cwd()); process.env.MONGODB_DB = databaseName; await connectToDatabase(); await WeddingMemberModel.syncIndexes(); await EventModel.syncIndexes(); }, 60_000);
  afterAll(async () => { try { if (mongoose.connection.db?.databaseName === databaseName) await mongoose.connection.db.dropDatabase(); } finally { await mongoose.disconnect(); } }, 30_000);
  async function fixture() { const adminId = new Types.ObjectId().toString(); const wedding = await createWedding(adminId, { brideName: "Test Bride", groomName: "Test Groom", weddingDate: "2027-02-20", timeZone: "Asia/Kolkata", mainVenueName: "Main Palace", mainAddress: "Palace Road, Jaipur", description: "Events test" }); const manager = await WeddingMemberModel.create({ weddingId: wedding.id, userId: new Types.ObjectId(), role: "MANAGER", status: "ACTIVE", joinedAt: new Date(), grants: [] }); const member = await WeddingMemberModel.create({ weddingId: wedding.id, userId: new Types.ObjectId(), role: "MEMBER", status: "ACTIVE", joinedAt: new Date(), grants: [] }); return { adminId, wedding, managerId: String(manager.userId), memberId: String(member.userId) }; }
  function input(status: "DRAFT" | "PUBLISHED" = "PUBLISHED") { return { name: `${status} Sangeet`, type: "SANGEET" as const, localDate: "2027-02-19", startLocalTime: "19:00", endLocalTime: "23:00", endsNextDay: false, venueName: "Royal Garden", address: "12 Palace Road, Jaipur", mapUrl: "", description: "Music and dinner", status }; }

  it("lets Admins and Managers create while Members only see published events", async () => { const { adminId, wedding, managerId, memberId } = await fixture(); const published = await createEvent(adminId, wedding.id, input()); await createEvent(managerId, wedding.id, input("DRAFT")); await expect(createEvent(memberId, wedding.id, input())).rejects.toMatchObject({ status: 403 }); expect((await listEvents(adminId, wedding.id)).events).toHaveLength(2); const memberList = await listEvents(memberId, wedding.id); expect(memberList.events.map((event) => event.id)).toEqual([published.id]); expect(memberList.drafts).toBe(0); expect(await getEvent(memberId, wedding.id, published.id)).not.toBeNull(); });
  it("keeps event IDs scoped to their wedding", async () => { const first = await fixture(); const second = await fixture(); const event = await createEvent(first.adminId, first.wedding.id, input()); expect(await getEvent(second.adminId, second.wedding.id, event.id)).toBeNull(); });
  it("requires confirmation and recalculates future instants when the wedding time zone changes", async () => { const { adminId, wedding } = await fixture(); const event = await createEvent(adminId, wedding.id, input()); await expect(updateWedding(adminId, wedding.id, { timeZone: "Europe/London" })).rejects.toMatchObject({ code: "TIME_ZONE_CONFIRMATION_REQUIRED" }); await updateWedding(adminId, wedding.id, { timeZone: "Europe/London", confirmTimeZoneChange: true }); const updated = await EventModel.findById(event.id).orFail(); expect(updated.timeZone).toBe("Europe/London"); expect(updated.startsAtUtc.toISOString()).toBe("2027-02-19T19:00:00.000Z"); });
});
