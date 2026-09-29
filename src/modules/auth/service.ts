import { connectToDatabase } from "@/lib/mongodb";
import { PASSWORD_RESET_AGE_MS } from "./constants";
import { createOpaqueToken, hashPassword, hashToken, verifyPassword } from "./crypto";
import { sendPasswordResetEmail } from "./email";
import { PasswordResetTokenModel, SessionModel, UserModel } from "./models";
import { AuthError } from "./request-security";
import { normalizeEmail, type LoginInput, type PasswordResetInput, type SignupInput } from "./schemas";
import { createSession } from "./session";

let dummyPasswordHash: Promise<string> | undefined;

export async function signup(input: SignupInput) {
  await connectToDatabase();
  const emailNormalized = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);

  try {
    const user = await UserModel.create({
      name: input.name,
      emailNormalized,
      emailDisplay: input.email.trim(),
      passwordHash,
      status: "ACTIVE",
    });
    return { user: sanitizeUser(user), session: await createSession(String(user._id)) };
  } catch (error) {
    if (isDuplicateKey(error)) throw new AuthError("CONFLICT", "An account already exists for this email.", 409);
    throw error;
  }
}

export async function login(input: LoginInput) {
  await connectToDatabase();
  const user = await UserModel.findOne({ emailNormalized: normalizeEmail(input.email) }).select("+passwordHash");
  const comparisonHash = user?.passwordHash ?? (dummyPasswordHash ??= hashPassword("Dummy-password-12345"));
  const valid = await verifyPassword(await comparisonHash, input.password);

  if (!user || !valid || user.status !== "ACTIVE") {
    throw new AuthError("UNAUTHENTICATED", "Email or password is incorrect.", 401);
  }

  return { user: sanitizeUser(user), session: await createSession(String(user._id)) };
}

export async function requestPasswordReset(email: string) {
  await connectToDatabase();
  const user = await UserModel.findOne({ emailNormalized: normalizeEmail(email), status: "ACTIVE" });
  if (!user) return;

  const rawToken = createOpaqueToken();
  const token = await PasswordResetTokenModel.create({
    userId: user._id,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_AGE_MS),
  });

  try {
    const delivered = await sendPasswordResetEmail({ name: user.name, email: user.emailDisplay, token: rawToken });
    if (!delivered) await PasswordResetTokenModel.deleteOne({ _id: token._id });
  } catch {
    await PasswordResetTokenModel.deleteOne({ _id: token._id });
  }
}

export async function resetPassword(input: PasswordResetInput) {
  const database = await connectToDatabase();
  const passwordHash = await hashPassword(input.password);
  const mongoSession = await database.startSession();
  const now = new Date();

  try {
    await mongoSession.withTransaction(async () => {
      const token = await PasswordResetTokenModel.findOneAndUpdate(
        { tokenHash: hashToken(input.token), usedAt: { $exists: false }, expiresAt: { $gt: now } },
        { $set: { usedAt: now } },
        { new: true, session: mongoSession },
      );
      if (!token) throw new AuthError("RESET_TOKEN_UNAVAILABLE", "This reset link is invalid or has expired.", 400);

      await UserModel.updateOne({ _id: token.userId, status: "ACTIVE" }, { $set: { passwordHash, passwordChangedAt: now } }, { session: mongoSession });
      await SessionModel.updateMany({ userId: token.userId, revokedAt: { $exists: false } }, { $set: { revokedAt: now } }, { session: mongoSession });
      await PasswordResetTokenModel.updateMany({ userId: token.userId, _id: { $ne: token._id }, usedAt: { $exists: false } }, { $set: { usedAt: now } }, { session: mongoSession });
    });
  } finally {
    await mongoSession.endSession();
  }
}

function sanitizeUser(user: { _id: unknown; name: string; emailDisplay: string; status: string }) {
  return { id: String(user._id), name: user.name, email: user.emailDisplay, status: user.status };
}

function isDuplicateKey(error: unknown): error is { code: number } {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}
