import { connectToDatabase } from "@/lib/mongodb";
import { AuthError } from "@/modules/auth/request-security";
import { WeddingMemberModel, WeddingModel } from "./models";
import type { CreateWeddingInput } from "./schemas";

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
