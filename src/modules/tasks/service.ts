import { Temporal } from "@js-temporal/polyfill";
import { isValidObjectId, type ClientSession, type FilterQuery } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/modules/auth/models";
import { AuthError } from "@/modules/auth/request-security";
import { EventModel } from "@/modules/events/models";
import { WeddingMemberModel, WeddingModel } from "@/modules/weddings/models";
import { canManageTasks, TASKS_PAGE_SIZE } from "./constants";
import { sendTaskAssignmentEmail } from "./email";
import { TaskModel, type WeddingTask } from "./models";
import type { CreateTaskInput, TaskListQuery, UpdateTaskInput } from "./schemas";

type AssignmentEmail = { email: string; assigneeName: string; assignerName: string; weddingName: string; taskTitle: string; dueLabel: string | null };

export async function createTask(userId: string, weddingId: string, input: CreateTaskInput) {
  const database = await connectToDatabase();
  assertObjectId(weddingId, "Wedding workspace not found.");
  const session = await database.startSession();
  let result: TaskView | undefined;
  let assignmentEmail: AssignmentEmail | null = null;

  try {
    await session.withTransaction(async () => {
      const wedding = await WeddingModel.findOneAndUpdate(
        { _id: weddingId },
        { $inc: { memberAccessVersion: 1 } },
        { new: true, session, timestamps: false },
      );
      if (!wedding) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
      const membership = await requireMembership(userId, weddingId, session);
      if (!canManageTasks(membership.role)) throw new AuthError("FORBIDDEN", "Only Admins and Managers can create tasks.", 403);
      const references = await validateReferences(weddingId, input.assignedMemberId, input.eventId, session);
      const dueAt = resolveDueAt(input.dueDate, input.dueTime, wedding.timeZone);
      const completedAt = input.status === "COMPLETED" ? new Date() : null;
      const [task] = await TaskModel.create([{
        weddingId,
        eventId: input.eventId,
        title: input.title,
        description: input.description,
        assignedMemberId: input.assignedMemberId,
        dueAt,
        priority: input.priority,
        status: input.status,
        createdBy: userId,
        completedAt,
      }], { session });
      result = serializeTask(task, references.assignee, references.event, wedding.timeZone);
      if (references.assignee) assignmentEmail = await prepareAssignmentEmail(userId, references.assignee.userId, wedding, task, session);
    });
  } finally {
    await session.endSession();
  }

  if (!result) throw new Error("Task transaction completed without a result.");
  const emailDelivered = assignmentEmail ? await deliverAssignmentEmail(assignmentEmail) : null;
  return { task: result, assignmentEmailDelivered: emailDelivered };
}

export async function listTasks(userId: string, weddingId: string, query: TaskListQuery) {
  await connectToDatabase();
  const membership = await requireMembership(userId, weddingId);
  const planner = canManageTasks(membership.role);
  const wedding = await WeddingModel.findById(weddingId).lean();
  if (!wedding) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  const base: FilterQuery<WeddingTask> = {
    weddingId,
    deletedAt: null,
    ...(planner ? {} : { assignedMemberId: membership._id }),
  };
  const filter: FilterQuery<WeddingTask> = { ...base };
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.assignedMemberId && planner) filter.assignedMemberId = query.assignedMemberId;
  if (query.eventId) filter.eventId = query.eventId;
  if (query.q) filter.$or = [
    { title: { $regex: escapeRegex(query.q), $options: "i" } },
    { description: { $regex: escapeRegex(query.q), $options: "i" } },
  ];
  Object.assign(filter, dueFilter(query.due, wedding.timeZone));

  const now = new Date();
  const [tasks, total, allTasks, members, events] = await Promise.all([
    TaskModel.find(filter).sort({ dueAt: 1, createdAt: -1, _id: 1 }).skip((query.page - 1) * TASKS_PAGE_SIZE).limit(TASKS_PAGE_SIZE).lean(),
    TaskModel.countDocuments(filter),
    TaskModel.find(base).select("status dueAt priority").lean(),
    WeddingMemberModel.find({ weddingId, status: "ACTIVE" }).sort({ joinedAt: 1 }).lean(),
    EventModel.find({ weddingId, deletedAt: null }).sort({ startsAtUtc: 1, _id: 1 }).lean(),
  ]);
  const taskMemberIds = tasks.flatMap((task) => task.assignedMemberId ? [task.assignedMemberId] : []);
  const membershipById = new Map(members.map((member) => [String(member._id), member]));
  const historicalMemberships = taskMemberIds.length
    ? await WeddingMemberModel.find({ _id: { $in: taskMemberIds }, weddingId }).lean()
    : [];
  for (const member of historicalMemberships) membershipById.set(String(member._id), member);
  const userIds = [...new Set([...membershipById.values()].map((member) => String(member.userId)))];
  const users = await UserModel.find({ _id: { $in: userIds } }).lean();
  const userById = new Map(users.map((user) => [String(user._id), user]));
  const assigneeByMembership = new Map([...membershipById.entries()].map(([id, member]) => {
    const user = userById.get(String(member.userId));
    return [id, user ? { id, userId: String(member.userId), name: user.name, email: user.emailDisplay, role: member.role, active: member.status === "ACTIVE" } : null];
  }));
  const eventById = new Map(events.map((event) => [String(event._id), event]));
  const summary = summarizeTasks(allTasks, now);

  return {
    tasks: tasks.map((task) => serializeTask(task, task.assignedMemberId ? assigneeByMembership.get(String(task.assignedMemberId)) ?? null : null, task.eventId ? eventById.get(String(task.eventId)) ?? null : null, wedding.timeZone)),
    summary,
    total,
    page: query.page,
    pageSize: TASKS_PAGE_SIZE,
    canManage: planner,
    currentMembershipId: String(membership._id),
    assigneeOptions: planner ? members.flatMap((member) => {
      const user = userById.get(String(member.userId));
      return user ? [{ id: String(member._id), name: user.name, role: member.role }] : [];
    }) : [],
    eventOptions: events.filter((event) => event.status !== "CANCELLED").map((event) => ({ id: String(event._id), name: event.name, localDate: event.localDate, status: event.status })),
  };
}

export async function getTask(userId: string, weddingId: string, taskId: string) {
  await connectToDatabase();
  const membership = await requireMembership(userId, weddingId);
  if (!isValidObjectId(taskId)) return null;
  const task = await TaskModel.findOne({
    _id: taskId,
    weddingId,
    deletedAt: null,
    ...(canManageTasks(membership.role) ? {} : { assignedMemberId: membership._id }),
  }).lean();
  if (!task) return null;
  const [event, assignedMembership] = await Promise.all([
    task.eventId ? EventModel.findOne({ _id: task.eventId, weddingId, deletedAt: null }).lean() : null,
    task.assignedMemberId ? WeddingMemberModel.findOne({ _id: task.assignedMemberId, weddingId }).lean() : null,
  ]);
  const assigneeUser = assignedMembership ? await UserModel.findById(assignedMembership.userId).lean() : null;
  const assignee = assignedMembership && assigneeUser ? { id: String(assignedMembership._id), userId: String(assignedMembership.userId), name: assigneeUser.name, email: assigneeUser.emailDisplay, role: assignedMembership.role, active: assignedMembership.status === "ACTIVE" } : null;
  return serializeTask(task, assignee, event, null);
}

export async function updateTask(userId: string, weddingId: string, taskId: string, input: UpdateTaskInput) {
  const database = await connectToDatabase();
  assertObjectId(weddingId, "Task not found.");
  assertObjectId(taskId, "Task not found.");
  const session = await database.startSession();
  let result: TaskView | undefined;
  let assignmentEmail: AssignmentEmail | null = null;

  try {
    await session.withTransaction(async () => {
      const wedding = await WeddingModel.findOneAndUpdate(
        { _id: weddingId },
        { $inc: { memberAccessVersion: 1 } },
        { new: true, session, timestamps: false },
      );
      if (!wedding) throw new AuthError("NOT_FOUND", "Task not found.", 404);
      const membership = await requireMembership(userId, weddingId, session);
      const task = await TaskModel.findOne({ _id: taskId, weddingId, deletedAt: null }).session(session);
      if (!task) throw new AuthError("NOT_FOUND", "Task not found.", 404);
      const planner = canManageTasks(membership.role);
      if (!planner) {
        if (String(task.assignedMemberId ?? "") !== String(membership._id)) throw new AuthError("NOT_FOUND", "Task not found.", 404);
        if (Object.keys(input).some((key) => key !== "status")) throw new AuthError("FORBIDDEN", "Members can update only the status of their assigned tasks.", 403);
      }

      const assigneeChanged = planner && input.assignedMemberId !== undefined && String(input.assignedMemberId ?? "") !== String(task.assignedMemberId ?? "");
      const nextAssigneeId = input.assignedMemberId !== undefined ? input.assignedMemberId : task.assignedMemberId ? String(task.assignedMemberId) : null;
      const nextEventId = input.eventId !== undefined ? input.eventId : task.eventId ? String(task.eventId) : null;
      const references = await validateReferences(weddingId, nextAssigneeId, nextEventId, session, {
        allowInactiveAssignee: input.assignedMemberId === undefined,
        allowUnavailableEvent: input.eventId === undefined,
      });

      const changes: Record<string, unknown> = {};
      if (planner) {
        if (input.title !== undefined) changes.title = input.title;
        if (input.description !== undefined) changes.description = input.description;
        if (input.assignedMemberId !== undefined) changes.assignedMemberId = input.assignedMemberId;
        if (input.eventId !== undefined) changes.eventId = input.eventId;
        if (input.priority !== undefined) changes.priority = input.priority;
        if (input.dueDate !== undefined || input.dueTime !== undefined) {
          const existingLocal = task.dueAt ? localDueParts(task.dueAt, wedding.timeZone) : { dueDate: null, dueTime: null };
          changes.dueAt = resolveDueAt(input.dueDate !== undefined ? input.dueDate : existingLocal.dueDate, input.dueTime !== undefined ? input.dueTime : existingLocal.dueTime, wedding.timeZone);
        }
      }
      if (input.status !== undefined) {
        changes.status = input.status;
        changes.completedAt = input.status === "COMPLETED" ? (task.completedAt ?? new Date()) : null;
      }
      task.set(changes);
      await task.save({ session });
      result = serializeTask(task, references.assignee, references.event, wedding.timeZone);
      if (assigneeChanged && references.assignee) assignmentEmail = await prepareAssignmentEmail(userId, references.assignee.userId, wedding, task, session);
    });
  } finally {
    await session.endSession();
  }

  if (!result) throw new Error("Task transaction completed without a result.");
  const emailDelivered = assignmentEmail ? await deliverAssignmentEmail(assignmentEmail) : null;
  return { task: result, assignmentEmailDelivered: emailDelivered };
}

export async function removeTask(userId: string, weddingId: string, taskId: string) {
  await connectToDatabase();
  assertObjectId(weddingId, "Task not found.");
  assertObjectId(taskId, "Task not found.");
  const membership = await requireMembership(userId, weddingId);
  if (!canManageTasks(membership.role)) throw new AuthError("FORBIDDEN", "Only Admins and Managers can remove tasks.", 403);
  const task = await TaskModel.findOneAndUpdate(
    { _id: taskId, weddingId, deletedAt: null },
    { $set: { status: "CANCELLED", deletedAt: new Date() } },
    { new: true },
  );
  if (!task) throw new AuthError("NOT_FOUND", "Task not found.", 404);
  return { id: String(task._id), removed: true as const };
}

export async function getTaskTimeline(userId: string, weddingId: string) {
  await connectToDatabase();
  const membership = await requireMembership(userId, weddingId);
  const planner = canManageTasks(membership.role);
  const [wedding, tasks, events] = await Promise.all([
    WeddingModel.findById(weddingId).lean(),
    TaskModel.find({ weddingId, deletedAt: null, status: { $ne: "CANCELLED" }, dueAt: { $ne: null }, ...(planner ? {} : { assignedMemberId: membership._id }) }).sort({ dueAt: 1, _id: 1 }).limit(150).lean(),
    EventModel.find({ weddingId, deletedAt: null, ...(planner ? { status: { $ne: "CANCELLED" } } : { status: "PUBLISHED" }) }).sort({ startsAtUtc: 1, _id: 1 }).limit(100).lean(),
  ]);
  if (!wedding) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  const memberships = await WeddingMemberModel.find({ _id: { $in: tasks.flatMap((task) => task.assignedMemberId ? [task.assignedMemberId] : []) }, weddingId }).lean();
  const users = await UserModel.find({ _id: { $in: memberships.map((member) => member.userId) } }).lean();
  const userById = new Map(users.map((user) => [String(user._id), user]));
  const assigneeById = new Map(memberships.map((member) => [String(member._id), userById.get(String(member.userId))?.name ?? "Former member"]));
  const items = [
    ...tasks.map((task) => ({
      id: String(task._id), kind: "TASK" as const, at: task.dueAt!.toISOString(), title: task.title,
      status: task.status, priority: task.priority, assigneeName: task.assignedMemberId ? assigneeById.get(String(task.assignedMemberId)) ?? "Former member" : null,
      href: `/tasks?taskId=${task._id}`,
    })),
    ...events.map((event) => ({
      id: String(event._id), kind: "EVENT" as const, at: event.startsAtUtc.toISOString(), title: event.name,
      status: event.status, venueName: event.venueName, localDate: event.localDate, startLocalTime: event.startLocalTime,
      href: `/events/${event._id}`,
    })),
  ].sort((a, b) => a.at.localeCompare(b.at) || a.kind.localeCompare(b.kind));
  return { items, timeZone: wedding.timeZone };
}

export async function getTaskDashboardSummary(userId: string, weddingId: string) {
  await connectToDatabase();
  const membership = await requireMembership(userId, weddingId);
  const filter = { weddingId, deletedAt: null, ...(canManageTasks(membership.role) ? {} : { assignedMemberId: membership._id }) };
  const tasks = await TaskModel.find(filter).sort({ dueAt: 1, createdAt: -1 }).lean();
  const summary = summarizeTasks(tasks, new Date());
  const upcoming = tasks.filter((task) => task.status !== "COMPLETED" && task.status !== "CANCELLED" && task.dueAt).slice(0, 4).map((task) => ({ id: String(task._id), title: task.title, dueAt: task.dueAt!.toISOString(), priority: task.priority, status: task.status }));
  return { ...summary, upcoming };
}

async function requireMembership(userId: string, weddingId: string, session?: ClientSession) {
  if (!isValidObjectId(weddingId)) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  const membership = await WeddingMemberModel.findOne({ userId, weddingId, status: "ACTIVE" }).session(session ?? null).lean();
  if (!membership) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  return membership;
}

async function validateReferences(weddingId: string, assignedMemberId: string | null | undefined, eventId: string | null | undefined, session?: ClientSession, options: { allowInactiveAssignee?: boolean; allowUnavailableEvent?: boolean } = {}) {
  const [membership, event] = await Promise.all([
    assignedMemberId ? WeddingMemberModel.findOne({ _id: assignedMemberId, weddingId, ...(options.allowInactiveAssignee ? {} : { status: "ACTIVE" }) }).session(session ?? null).lean() : null,
    eventId ? EventModel.findOne({ _id: eventId, weddingId, ...(options.allowUnavailableEvent ? {} : { deletedAt: null, status: { $ne: "CANCELLED" } }) }).session(session ?? null).lean() : null,
  ]);
  if (assignedMemberId && !membership) throw new AuthError("INVALID_ASSIGNEE", "Choose an active member from this wedding.", 409);
  if (eventId && !event) throw new AuthError("INVALID_EVENT", "Choose an available ceremony from this wedding.", 409);
  let assignee = null;
  if (membership) {
    const user = await UserModel.findById(membership.userId).session(session ?? null).lean();
    if (!user) throw new AuthError("INVALID_ASSIGNEE", "Choose an active member from this wedding.", 409);
    assignee = { id: String(membership._id), userId: String(membership.userId), name: user.name, email: user.emailDisplay, role: membership.role, active: membership.status === "ACTIVE" };
  }
  return { assignee, event };
}

function resolveDueAt(dueDate: string | null | undefined, dueTime: string | null | undefined, timeZone: string) {
  if (!dueDate) return null;
  const time = dueTime || "23:59";
  try {
    return new Date(Temporal.ZonedDateTime.from(`${dueDate}T${time}:00[${timeZone}]`).epochMilliseconds);
  } catch {
    throw new AuthError("INVALID_DUE_DATE", "Choose a valid due date and time for the wedding time zone.", 400);
  }
}

function localDueParts(dueAt: Date, timeZone: string) {
  const value = Temporal.Instant.fromEpochMilliseconds(dueAt.getTime()).toZonedDateTimeISO(timeZone);
  return { dueDate: value.toPlainDate().toString(), dueTime: `${String(value.hour).padStart(2, "0")}:${String(value.minute).padStart(2, "0")}` };
}

function serializeTask(task: WeddingTask & { _id: unknown; createdAt: Date; updatedAt: Date }, assignee: { id: string; userId: string; name: string; email: string; role: string; active: boolean } | null, event: { _id: unknown; name: string; localDate: string; status: string } | null | undefined, timeZone: string | null) {
  const local = task.dueAt && timeZone ? localDueParts(task.dueAt, timeZone) : { dueDate: null, dueTime: null };
  return {
    id: String(task._id), title: task.title, description: task.description ?? "", priority: task.priority, status: task.status,
    dueAt: task.dueAt?.toISOString() ?? null, dueDate: local.dueDate, dueTime: local.dueTime,
    assignedMemberId: task.assignedMemberId ? String(task.assignedMemberId) : null,
    assignee: assignee ? { id: assignee.id, name: assignee.name, role: assignee.role, active: assignee.active } : null,
    eventId: task.eventId ? String(task.eventId) : null,
    event: event ? { id: String(event._id), name: event.name, localDate: event.localDate, status: event.status } : null,
    createdBy: String(task.createdBy), completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(), updatedAt: task.updatedAt.toISOString(),
  };
}

function summarizeTasks(tasks: Array<{ status: string; dueAt?: Date | null }>, now: Date) {
  const open = tasks.filter((task) => task.status === "TODO").length;
  const inProgress = tasks.filter((task) => task.status === "IN_PROGRESS").length;
  const completed = tasks.filter((task) => task.status === "COMPLETED").length;
  const cancelled = tasks.filter((task) => task.status === "CANCELLED").length;
  const overdue = tasks.filter((task) => task.dueAt && task.dueAt < now && task.status !== "COMPLETED" && task.status !== "CANCELLED").length;
  const activeTotal = tasks.length - cancelled;
  return { total: tasks.length, open, inProgress, completed, cancelled, overdue, completionRate: activeTotal ? Math.round((completed / activeTotal) * 100) : 0 };
}

function dueFilter(value: TaskListQuery["due"], timeZone: string) {
  if (!value) return {};
  const now = new Date();
  if (value === "OVERDUE") return { dueAt: { $lt: now }, status: { $nin: ["COMPLETED", "CANCELLED"] } };
  if (value === "NO_DUE_DATE") return { dueAt: null };
  const localNow = Temporal.Now.zonedDateTimeISO(timeZone);
  const nextWeek = localNow.toPlainDate().add({ days: 8 - localNow.dayOfWeek }).toZonedDateTime({ timeZone, plainTime: "00:00" });
  const endOfWeek = new Date(nextWeek.epochMilliseconds);
  if (value === "THIS_WEEK") return { dueAt: { $gte: now, $lt: endOfWeek } };
  return { dueAt: { $gte: endOfWeek } };
}

async function prepareAssignmentEmail(userId: string, assigneeUserId: string, wedding: { brideName: string; groomName: string; timeZone: string }, task: WeddingTask, session: ClientSession) {
  const [assigner, assignee] = await Promise.all([
    UserModel.findById(userId).session(session).lean(),
    UserModel.findById(assigneeUserId).session(session).lean(),
  ]);
  if (!assigner || !assignee) return null;
  return {
    email: assignee.emailDisplay,
    assigneeName: assignee.name,
    assignerName: assigner.name,
    weddingName: `${wedding.brideName} & ${wedding.groomName}`,
    taskTitle: task.title,
    dueLabel: task.dueAt ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: wedding.timeZone }).format(task.dueAt) : null,
  };
}

async function deliverAssignmentEmail(input: AssignmentEmail) {
  try { return await sendTaskAssignmentEmail(input); } catch { return false; }
}

function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function assertObjectId(value: string, message: string) { if (!isValidObjectId(value)) throw new AuthError("NOT_FOUND", message, 404); }

export type TaskView = ReturnType<typeof serializeTask>;
export type TaskListView = Awaited<ReturnType<typeof listTasks>>;
export type TaskTimelineView = Awaited<ReturnType<typeof getTaskTimeline>>;
