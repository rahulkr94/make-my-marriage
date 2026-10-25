import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/modules/auth/models";
import { EventModel } from "@/modules/events/models";
import { createEvent } from "@/modules/events/service";
import { TaskModel } from "@/modules/tasks/models";
import { createTask, getTaskDashboardSummary, getTaskTimeline, listTasks, removeTask, updateTask } from "@/modules/tasks/service";
import { WeddingMemberModel } from "@/modules/weddings/models";
import { createWedding } from "@/modules/weddings/service";

describe.skipIf(process.env.MMM_RUN_DB_TESTS !== "1")("wedding tasks with MongoDB", () => {
  const databaseName = `mmm_tasks_test_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
  beforeAll(async () => {
    loadEnvConfig(process.cwd());
    process.env.MONGODB_DB = databaseName;
    process.env.RESEND_API_KEY = "";
    await connectToDatabase();
    await Promise.all([UserModel.syncIndexes(), WeddingMemberModel.syncIndexes(), EventModel.syncIndexes(), TaskModel.syncIndexes()]);
  }, 60_000);
  afterAll(async () => { try { if (mongoose.connection.db?.databaseName === databaseName) await mongoose.connection.db.dropDatabase(); } finally { await mongoose.disconnect(); } }, 30_000);

  async function user(name: string) {
    const id = new Types.ObjectId();
    await UserModel.create({ _id: id, name, emailNormalized: `${name.toLowerCase().replaceAll(" ", ".")}@example.test`, emailDisplay: `${name.toLowerCase().replaceAll(" ", ".")}@example.test`, passwordHash: "test", status: "ACTIVE" });
    return String(id);
  }

  async function fixture() {
    const adminId = await user(`Admin ${randomUUID().slice(0, 6)}`);
    const managerId = await user(`Manager ${randomUUID().slice(0, 6)}`);
    const memberId = await user(`Member ${randomUUID().slice(0, 6)}`);
    const otherMemberId = await user(`Other ${randomUUID().slice(0, 6)}`);
    const wedding = await createWedding(adminId, { brideName: "Aanya", groomName: "Rohan", weddingDate: "2027-02-14", timeZone: "Asia/Kolkata", mainVenueName: "Rosewood Palace", mainAddress: "Jaipur, Rajasthan", description: "Tasks test" });
    const manager = await WeddingMemberModel.create({ weddingId: wedding.id, userId: managerId, role: "MANAGER", status: "ACTIVE", joinedAt: new Date(), grants: [] });
    const member = await WeddingMemberModel.create({ weddingId: wedding.id, userId: memberId, role: "MEMBER", status: "ACTIVE", joinedAt: new Date(), grants: [] });
    const otherMember = await WeddingMemberModel.create({ weddingId: wedding.id, userId: otherMemberId, role: "MEMBER", status: "ACTIVE", joinedAt: new Date(), grants: [] });
    const event = await createEvent(adminId, wedding.id, { name: "Wedding Ceremony", type: "WEDDING", localDate: "2027-02-14", startLocalTime: "18:00", endLocalTime: "21:00", endsNextDay: false, venueName: "Royal Lawn", address: "Rosewood Palace, Jaipur", mapUrl: "", liveStreamUrl: "", description: "The ceremony", status: "PUBLISHED" });
    return { adminId, managerId, memberId, otherMemberId, wedding, manager, member, otherMember, event };
  }

  const input = (memberId: string, eventId: string) => ({ title: "Confirm final catering menu", description: "Approve the midnight dessert spread.", assignedMemberId: memberId, eventId, dueDate: "2027-02-13", dueTime: "18:30", priority: "HIGH" as const, status: "TODO" as const });

  it("lets planners assign a same-wedding task and exposes only assigned work to Members", async () => {
    const data = await fixture();
    const created = await createTask(data.adminId, data.wedding.id, input(String(data.member._id), data.event.id));
    expect(created.task).toMatchObject({ title: "Confirm final catering menu", assignedMemberId: String(data.member._id), eventId: data.event.id, dueAt: "2027-02-13T13:00:00.000Z" });
    expect((await listTasks(data.adminId, data.wedding.id, { q: "", page: 1 })).tasks).toHaveLength(1);
    expect((await listTasks(data.memberId, data.wedding.id, { q: "", page: 1 })).tasks[0].id).toBe(created.task.id);
    expect((await listTasks(data.otherMemberId, data.wedding.id, { q: "", page: 1 })).tasks).toHaveLength(0);
    expect((await listTasks(data.otherMemberId, data.wedding.id, { q: "", page: 1, assignedMemberId: String(data.member._id) })).tasks).toHaveLength(0);
    await expect(createTask(data.memberId, data.wedding.id, input(String(data.member._id), data.event.id))).rejects.toMatchObject({ status: 403 });
  });

  it("allows an assignee to change status only and tracks completion on the dashboard", async () => {
    const data = await fixture();
    const created = await createTask(data.managerId, data.wedding.id, input(String(data.member._id), data.event.id));
    await expect(updateTask(data.otherMemberId, data.wedding.id, created.task.id, { status: "COMPLETED" })).rejects.toMatchObject({ status: 404 });
    await expect(updateTask(data.memberId, data.wedding.id, created.task.id, { title: "Unauthorized edit" })).rejects.toMatchObject({ status: 403 });
    expect((await updateTask(data.memberId, data.wedding.id, created.task.id, { status: "COMPLETED" })).task).toMatchObject({ status: "COMPLETED", completedAt: expect.any(String) });
    expect(await getTaskDashboardSummary(data.memberId, data.wedding.id)).toMatchObject({ completed: 1, completionRate: 100, overdue: 0 });
    await expect(removeTask(data.memberId, data.wedding.id, created.task.id)).rejects.toMatchObject({ status: 403 });
  });

  it("rejects cross-wedding references and soft-removes planner tasks", async () => {
    const first = await fixture();
    const second = await fixture();
    await expect(createTask(first.adminId, first.wedding.id, input(String(second.member._id), first.event.id))).rejects.toMatchObject({ code: "INVALID_ASSIGNEE" });
    await expect(createTask(first.adminId, first.wedding.id, input(String(first.member._id), second.event.id))).rejects.toMatchObject({ code: "INVALID_EVENT" });
    const created = await createTask(first.adminId, first.wedding.id, input(String(first.member._id), first.event.id));
    await expect(removeTask(second.adminId, first.wedding.id, created.task.id)).rejects.toMatchObject({ status: 404 });
    await expect(removeTask(first.managerId, first.wedding.id, created.task.id)).resolves.toEqual({ id: created.task.id, removed: true });
    expect(await TaskModel.findById(created.task.id).lean()).toMatchObject({ status: "CANCELLED", deletedAt: expect.any(Date) });
  });

  it("combines ceremony and task deadlines in the member-visible timeline", async () => {
    const data = await fixture();
    const created = await createTask(data.adminId, data.wedding.id, input(String(data.member._id), data.event.id));
    const timeline = await getTaskTimeline(data.memberId, data.wedding.id);
    expect(timeline.items.map((item) => `${item.kind}:${item.id}`)).toEqual([`TASK:${created.task.id}`, `EVENT:${data.event.id}`]);
    expect(timeline.timeZone).toBe("Asia/Kolkata");
  });
});
