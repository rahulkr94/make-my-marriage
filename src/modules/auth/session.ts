import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import {
  SESSION_ABSOLUTE_AGE_MS,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  SESSION_IDLE_AGE_MS,
  SESSION_TOUCH_INTERVAL_MS,
} from "./constants";
import { createOpaqueToken, hashToken } from "./crypto";
import { SessionModel, UserModel } from "./models";

export async function createSession(userId: string) {
  await connectToDatabase();
  const token = createOpaqueToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_ABSOLUTE_AGE_MS);
  await SessionModel.create({ userId, sessionHash: hashToken(token), lastSeenAt: now, expiresAt });
  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, { ...SESSION_COOKIE_OPTIONS, expires: expiresAt });
}

export async function clearSessionCookie() {
  (await cookies()).set(SESSION_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
}

export async function revokeSessionToken(rawToken?: string) {
  if (!rawToken) return;
  await connectToDatabase();
  await SessionModel.updateOne(
    { sessionHash: hashToken(rawToken), revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );
}

export async function getCurrentUser() {
  const rawToken = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!rawToken) return null;

  await connectToDatabase();
  const now = new Date();
  const [session] = await SessionModel.aggregate<{
    _id: unknown;
    lastSeenAt: Date;
    user: { _id: unknown; name: string; emailDisplay: string; status: "ACTIVE" | "DISABLED" } | null;
  }>([
    { $match: { sessionHash: hashToken(rawToken), revokedAt: { $exists: false }, expiresAt: { $gt: now } } },
    { $limit: 1 },
    { $lookup: { from: UserModel.collection.name, localField: "userId", foreignField: "_id", as: "user" } },
    { $set: { user: { $first: "$user" } } },
    { $project: { _id: 1, lastSeenAt: 1, "user._id": 1, "user.name": 1, "user.emailDisplay": 1, "user.status": 1 } },
  ]);

  if (!session || now.getTime() - session.lastSeenAt.getTime() > SESSION_IDLE_AGE_MS) {
    if (session) await SessionModel.updateOne({ _id: session._id }, { $set: { revokedAt: now } });
    return null;
  }

  if (now.getTime() - session.lastSeenAt.getTime() > SESSION_TOUCH_INTERVAL_MS) {
    await SessionModel.updateOne({ _id: session._id }, { $set: { lastSeenAt: now } });
  }

  const user = session.user;
  if (!user || user.status !== "ACTIVE") return null;

  return { id: String(user._id), name: user.name, email: user.emailDisplay, status: user.status };
}
