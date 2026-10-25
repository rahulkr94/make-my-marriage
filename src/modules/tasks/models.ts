import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { TASK_PRIORITIES, TASK_STATUSES } from "./constants";

const taskSchema = new Schema({
  weddingId: { type: Schema.Types.ObjectId, required: true },
  eventId: { type: Schema.Types.ObjectId, default: null },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, default: "", trim: true, maxlength: 2000 },
  assignedMemberId: { type: Schema.Types.ObjectId, default: null },
  dueAt: { type: Date, default: null },
  priority: { type: String, enum: TASK_PRIORITIES, required: true, default: "MEDIUM" },
  status: { type: String, enum: TASK_STATUSES, required: true, default: "TODO" },
  createdBy: { type: Schema.Types.ObjectId, required: true },
  completedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null },
}, { timestamps: true, strict: "throw" });

taskSchema.index({ weddingId: 1, deletedAt: 1, status: 1, dueAt: 1, _id: 1 }, { name: "wedding_task_status_due" });
taskSchema.index({ assignedMemberId: 1, deletedAt: 1, status: 1, dueAt: 1 }, { name: "member_task_status_due" });
taskSchema.index({ weddingId: 1, eventId: 1, deletedAt: 1 }, { name: "wedding_event_tasks" });

export type WeddingTask = InferSchemaType<typeof taskSchema>;
export const TaskModel = (models.WeddingTask as Model<WeddingTask> | undefined)
  ?? model<WeddingTask>("WeddingTask", taskSchema, "tasks");
