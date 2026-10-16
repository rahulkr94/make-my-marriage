import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectToDatabase } from "@/lib/mongodb";
import { updateMemberRole, removeWeddingMember } from "@/modules/members/access";
import { acceptMemberInvitation, getWeddingMemberSummary, listWeddingMembers } from "@/modules/members/service";
import { MemberInviteModel } from "@/modules/members/models";
import { hashToken } from "@/modules/auth/crypto";
import { WeddingMemberModel, WeddingModel } from "@/modules/weddings/models";
import { createWedding, getWorkspaceForUser, updateWedding } from "@/modules/weddings/service";

// Opt in with NODE_ENV=development MMM_RUN_DB_TESTS=1 to load .env.local.
// All fixtures live in a fresh test database;
// the configured application database is never used or cleared by this suite.
describe.skipIf(process.env.MMM_RUN_DB_TESTS !== "1")("member access with MongoDB transactions", () => {
  const databaseName = `mmm_access_test_${randomUUID().replaceAll("-", "").slice(0, 16)}`;

  beforeAll(async () => {
    loadEnvConfig(process.cwd());
    process.env.MONGODB_DB = databaseName;
    await connectToDatabase();
    await WeddingMemberModel.syncIndexes();
    await MemberInviteModel.syncIndexes();
  }, 60_000);

  afterAll(async () => {
    try {
      if (mongoose.connection.db?.databaseName === databaseName) await mongoose.connection.db.dropDatabase();
    } finally {
      await mongoose.disconnect();
    }
  }, 30_000);

  async function fixture(secondRole: "ADMIN" | "MANAGER" | "MEMBER" = "MEMBER") {
    const actorId = new Types.ObjectId().toString();
    const wedding = await createWedding(actorId, {
      brideName: "Test Bride", groomName: "Test Groom", weddingDate: "2027-02-14", timeZone: "Asia/Kolkata",
      mainVenueName: "Test Venue", mainAddress: "Test venue address", description: "Isolated access test",
    });
    const actor = await WeddingMemberModel.findOne({ weddingId: wedding.id, userId: actorId }).orFail();
    const member = await WeddingMemberModel.create({ weddingId: wedding.id, userId: new Types.ObjectId(), role: secondRole, status: "ACTIVE", joinedAt: new Date(), grants: [] });
    return { actorId, actor, weddingId: wedding.id, member };
  }

  it("promotes a member, applies new permissions, and immediately denies demoted admin operations", async () => {
    const { actorId, weddingId, member } = await fixture();
    const userId = String(member.userId);
    await expect(listWeddingMembers(userId, weddingId)).rejects.toMatchObject({ status: 403 });
    expect(await updateMemberRole(actorId, weddingId, member.id, { role: "ADMIN" })).toMatchObject({ role: "ADMIN" });
    await expect(listWeddingMembers(userId, weddingId)).resolves.toBeDefined();
    await updateMemberRole(actorId, weddingId, member.id, { role: "MANAGER" });
    await expect(listWeddingMembers(userId, weddingId)).rejects.toMatchObject({ status: 403 });
    await expect(updateWedding(userId, weddingId, { description: "Unauthorized" })).rejects.toMatchObject({ status: 403 });
    expect((await getWorkspaceForUser(userId))?.membership.role).toBe("MANAGER");
  });

  it("rejects both ways of losing the final admin, with no persisted partial change", async () => {
    const { actorId, actor, weddingId } = await fixture();
    await expect(updateMemberRole(actorId, weddingId, actor.id, { role: "MEMBER" })).rejects.toMatchObject({ code: "LAST_ADMIN" });
    await expect(removeWeddingMember(actorId, weddingId, actor.id)).rejects.toMatchObject({ code: "LAST_ADMIN" });
    expect((await WeddingMemberModel.findById(actor.id))?.role).toBe("ADMIN");
    expect((await WeddingModel.findById(weddingId))?.memberAccessVersion).toBe(0);
  });

  it.each(["MANAGER", "MEMBER"] as const)("rejects %s mutations and cross-wedding targets", async (role) => {
    const { actorId, actor, weddingId, member } = await fixture(role);
    await expect(updateMemberRole(String(member.userId), weddingId, member.id, { role: "ADMIN" })).rejects.toMatchObject({ status: 403 });
    await expect(removeWeddingMember(String(member.userId), weddingId, actor.id)).rejects.toMatchObject({ status: 403 });
    const other = await fixture();
    await expect(removeWeddingMember(actorId, weddingId, other.member.id)).rejects.toMatchObject({ status: 404 });
    await expect(updateMemberRole(other.actorId, weddingId, member.id, { role: "ADMIN" })).rejects.toMatchObject({ status: 404 });
    await expect(removeWeddingMember(actorId, weddingId, "invalid")).rejects.toMatchObject({ status: 404 });
  });

  it("soft removes access, updates counts, and reactivates the same membership only with a new invitation", async () => {
    const { actorId, weddingId, member } = await fixture("MANAGER");
    await removeWeddingMember(actorId, weddingId, member.id);
    expect(await getWorkspaceForUser(String(member.userId))).toBeNull();
    expect(await getWeddingMemberSummary(actorId, weddingId)).toMatchObject({ activeMembers: 1 });
    await expect(getWeddingMemberSummary(String(member.userId), weddingId)).rejects.toMatchObject({ status: 404 });
    expect(await WeddingMemberModel.findById(member.id).lean()).toMatchObject({ status: "REMOVED", removedAt: expect.any(Date) });
    const token = randomUUID() + randomUUID();
    const email = "rejoin@example.test";
    await MemberInviteModel.create({ weddingId, emailNormalized: email, role: "MEMBER", tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60_000), invitedBy: actorId });
    await acceptMemberInvitation({ id: String(member.userId), name: "Test Member", email }, token);
    const rejoined = await WeddingMemberModel.findById(member.id).lean();
    expect(rejoined).toMatchObject({ status: "ACTIVE", role: "MEMBER", grants: [] });
    expect(rejoined?.removedAt).toBeUndefined();
    expect(await WeddingMemberModel.countDocuments({ userId: member.userId, weddingId })).toBe(1);
  });

  it.each(["demote", "remove"])("preserves an admin when both admins concurrently %s themselves", async (action) => {
    const { actorId, actor, weddingId, member } = await fixture("ADMIN");
    const change = action === "remove"
      ? (userId: string, id: string) => removeWeddingMember(userId, weddingId, id)
      : (userId: string, id: string) => updateMemberRole(userId, weddingId, id, { role: "MEMBER" });
    const results = await Promise.allSettled([change(actorId, actor.id), change(String(member.userId), member.id)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({ reason: { code: "LAST_ADMIN" } });
    expect(await WeddingMemberModel.countDocuments({ weddingId, role: "ADMIN", status: "ACTIVE" })).toBe(1);
  });

  it("rechecks the actor when two admins concurrently remove each other", async () => {
    const { actorId, actor, weddingId, member } = await fixture("ADMIN");
    const results = await Promise.allSettled([
      removeWeddingMember(actorId, weddingId, member.id),
      removeWeddingMember(String(member.userId), weddingId, actor.id),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({ reason: { status: 404 } });
    expect(await WeddingMemberModel.countDocuments({ weddingId, role: "ADMIN", status: "ACTIVE" })).toBe(1);
  });
});
