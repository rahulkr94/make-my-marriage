import { Temporal } from "@js-temporal/polyfill";
import { z } from "zod";
import { TASK_DUE_FILTERS, TASK_PRIORITIES, TASK_STATUSES } from "./constants";

function validDate(value: string) {
  try { Temporal.PlainDate.from(value); return true; } catch { return false; }
}

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Choose a valid option.");
const optionalObjectId = z.union([objectId, z.literal(""), z.null()]).transform((value) => value || null);
const dueDate = z.union([
  z.string().regex(/^(19|20|21)\d{2}-\d{2}-\d{2}$/, "Choose a valid date.").refine(validDate, "Choose a valid calendar date."),
  z.literal(""),
  z.null(),
]).transform((value) => value || null);
const dueTime = z.union([
  z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time."),
  z.literal(""),
  z.null(),
]).transform((value) => value || null);

const taskFields = {
  title: z.string().trim().min(2, "Enter a task title.").max(160, "Use no more than 160 characters."),
  description: z.string().trim().max(2000, "Use no more than 2,000 characters."),
  assignedMemberId: optionalObjectId,
  eventId: optionalObjectId,
  dueDate,
  dueTime,
  priority: z.enum(TASK_PRIORITIES),
  status: z.enum(TASK_STATUSES),
};

function validateDueDate(value: { dueDate?: string | null; dueTime?: string | null }, ctx: z.RefinementCtx) {
  if (value.dueTime && !value.dueDate) ctx.addIssue({ code: "custom", path: ["dueDate"], message: "Choose a due date when adding a due time." });
}

export const createTaskSchema = z.object({
  ...taskFields,
  description: taskFields.description.optional().default(""),
  assignedMemberId: taskFields.assignedMemberId.optional().default(null),
  eventId: taskFields.eventId.optional().default(null),
  dueDate: taskFields.dueDate.optional().default(null),
  dueTime: taskFields.dueTime.optional().default(null),
  priority: taskFields.priority.optional().default("MEDIUM"),
  status: taskFields.status.optional().default("TODO"),
}).strict().superRefine(validateDueDate);

export const updateTaskSchema = z.object(taskFields).partial().strict()
  .refine((value) => Object.keys(value).length > 0, { message: "Include at least one task detail to update." })
  .superRefine(validateDueDate);

export const memberTaskStatusSchema = z.object({ status: z.enum(TASK_STATUSES) }).strict();

export const taskListQuerySchema = z.object({
  q: z.string().trim().max(100).default(""),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assignedMemberId: objectId.optional(),
  eventId: objectId.optional(),
  due: z.enum(TASK_DUE_FILTERS).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
}).strict();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskListQuery = z.infer<typeof taskListQuerySchema>;
