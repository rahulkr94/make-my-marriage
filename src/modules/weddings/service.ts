import { connectToDatabase } from "@/lib/mongodb";
import { AuthError } from "@/modules/auth/request-security";
import { EventModel } from "@/modules/events/models";
import { resolveEventSchedule } from "@/modules/events/schedule";
import { WeddingMemberModel, WeddingModel } from "./models";
import type { CreateWeddingInput, UpdateWeddingInput } from "./schemas";

export async function createWedding(userId: string, input: CreateWeddingInput) {
  const database = await connectToDatabase();
  const mongoSession = await database.startSession();
  let created: ReturnType<typeof sanitizeWedding> | undefined;

  try {
    await mongoSession.withTransaction(async () => {
      const existing = await WeddingMemberModel.exists({ userId, status: "ACTIVE" }).session(mongoSession);
      if (existing) throw new AuthError("ALREADY_IN_WEDDING", "Your account already belongs to a wedding workspace.", 409);

      const [wedding] = await WeddingModel.create([{
        ...input,
        createdBy: userId,
        status: "PLANNING",
        galleryTokenVersion: 0,
      }], { session: mongoSession });

      await WeddingMemberModel.create([{
        weddingId: wedding._id,
        userId,
        role: "ADMIN",
        status: "ACTIVE",
        grants: [],
        joinedAt: new Date(),
      }], { session: mongoSession });

      created = sanitizeWedding(wedding);
    });
  } catch (error) {
    if (isDuplicateKey(error)) throw new AuthError("ALREADY_IN_WEDDING", "Your account already belongs to a wedding workspace.", 409);
    throw error;
  } finally {
    await mongoSession.endSession();
  }

  if (!created) throw new Error("Wedding transaction completed without a result.");
  return created;
}

export async function getWorkspaceForUser(userId: string) {
  await connectToDatabase();
  const membership = await WeddingMemberModel.findOne({ userId, status: "ACTIVE" }).lean();
  if (!membership) return null;

  const wedding = await WeddingModel.findById(membership.weddingId).lean();
  if (!wedding) return null;

  return {
    membership: {
      id: String(membership._id),
      weddingId: String(membership.weddingId),
      role: membership.role,
      grants: membership.grants,
    },
    wedding: sanitizeWedding(wedding),
  };
}

export async function getWeddingForUser(userId: string, weddingId: string) {
  await connectToDatabase();
  const membership = await WeddingMemberModel.findOne({ userId, weddingId, status: "ACTIVE" }).lean();
  if (!membership) return null;

  const wedding = await WeddingModel.findById(weddingId).lean();
  if (!wedding) return null;

  return {
    membership: {
      id: String(membership._id),
      weddingId: String(membership.weddingId),
      role: membership.role,
      grants: membership.grants,
    },
    wedding: sanitizeWedding(wedding),
  };
}

export async function updateWedding(userId: string, weddingId: string, input: UpdateWeddingInput) {
  const database = await connectToDatabase();
  const session = await database.startSession();
  const { confirmTimeZoneChange = false, ...changes } = input;
  try {
    return await session.withTransaction(async () => {
      const wedding = await WeddingModel.findOneAndUpdate(
        { _id: weddingId },
        { $inc: { scheduleVersion: 1 } },
        { new: true, session, timestamps: false },
      );
      if (!wedding) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
      const membership = await WeddingMemberModel.findOne({ userId, weddingId, status: "ACTIVE" }).session(session).lean();
      if (!membership) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
      if (membership.role !== "ADMIN") throw new AuthError("FORBIDDEN", "Only wedding admins can update these settings.", 403);

      if (changes.timeZone && changes.timeZone !== wedding.timeZone) {
        const futureEvents = await EventModel.find({ weddingId, deletedAt: null, startsAtUtc: { $gte: new Date() } }).session(session);
        if (futureEvents.length && !confirmTimeZoneChange) {
          throw new AuthError("TIME_ZONE_CONFIRMATION_REQUIRED", `Changing the time zone will recalculate ${futureEvents.length} future event ${futureEvents.length === 1 ? "time" : "times"}. Confirm this change to continue.`, 409);
        }
        for (const event of futureEvents) {
          const schedule = resolveEventSchedule(event, changes.timeZone);
          event.set(schedule);
          await event.save({ session });
        }
      }

      wedding.set(changes);
      await wedding.save({ session });
      return sanitizeWedding(wedding);
    });
  } finally {
    await session.endSession();
  }
}

function sanitizeWedding(wedding: {
  _id: unknown;
  brideName: string;
  groomName: string;
  weddingDate: string;
  timeZone: string;
  mainVenueName: string;
  mainAddress: string;
  description?: string | null;
  status: string;
}) {
  return {
    id: String(wedding._id),
    brideName: wedding.brideName,
    groomName: wedding.groomName,
    weddingDate: wedding.weddingDate,
    timeZone: wedding.timeZone,
    mainVenueName: wedding.mainVenueName,
    mainAddress: wedding.mainAddress,
    description: wedding.description ?? "",
    status: wedding.status,
  };
}

function isDuplicateKey(error: unknown): error is { code: number } {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}
