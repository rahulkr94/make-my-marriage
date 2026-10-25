import { describe, expect, it } from "vitest";
import { createTaskSchema, taskListQuerySchema, updateTaskSchema } from "@/modules/tasks/schemas";

const memberId = "507f1f77bcf86cd799439011";
const eventId = "507f1f77bcf86cd799439012";

describe("task schemas", () => {
  it("normalizes a complete task and supplies safe defaults", () => {
    expect(createTaskSchema.parse({ title: "  Confirm catering menu  ", assignedMemberId: memberId, eventId, dueDate: "2027-02-14", dueTime: "18:30", priority: "HIGH" })).toEqual({
      title: "Confirm catering menu", description: "", assignedMemberId: memberId, eventId, dueDate: "2027-02-14", dueTime: "18:30", priority: "HIGH", status: "TODO",
    });
  });

  it("rejects impossible dates, a time without a date, invalid references, and unknown fields", () => {
    expect(createTaskSchema.safeParse({ title: "Task", dueDate: "2027-02-30" }).success).toBe(false);
    expect(createTaskSchema.safeParse({ title: "Task", dueTime: "10:00" }).success).toBe(false);
    expect(createTaskSchema.safeParse({ title: "Task", assignedMemberId: "other" }).success).toBe(false);
    expect(createTaskSchema.safeParse({ title: "Task", weddingId: memberId }).success).toBe(false);
  });

  it("accepts strict partial status updates while rejecting empty updates", () => {
    expect(updateTaskSchema.parse({ status: "COMPLETED" })).toEqual({ status: "COMPLETED" });
    expect(updateTaskSchema.safeParse({}).success).toBe(false);
    expect(updateTaskSchema.safeParse({ status: "DONE" }).success).toBe(false);
    expect(updateTaskSchema.safeParse({ title: "Task", createdBy: memberId }).success).toBe(false);
  });

  it("bounds and validates task-list filters", () => {
    expect(taskListQuerySchema.parse({ q: " menu ", page: "2", status: "TODO", due: "OVERDUE" })).toMatchObject({ q: "menu", page: 2, status: "TODO", due: "OVERDUE" });
    expect(taskListQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    expect(taskListQuerySchema.safeParse({ due: "LATE" }).success).toBe(false);
  });
});
