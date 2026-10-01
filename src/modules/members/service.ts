import { connectToDatabase } from "@/lib/mongodb";
import { createOpaqueToken, hashToken } from "@/modules/auth/crypto";
import { UserModel } from "@/modules/auth/models";
import { AuthError } from "@/modules/auth/request-security";
import { normalizeEmail } from "@/modules/auth/schemas";
import { WeddingMemberModel, WeddingModel } from "@/modules/weddings/models";
import { isValidObjectId } from "mongoose";
import { MEMBER_INVITATION_AGE_MS } from "./constants";
import { createMemberInvitationUrl, sendMemberInvitationEmail } from "./email";
import { MemberInviteModel } from "./models";
import type { CreateMemberInvitationInput } from "./schemas";

type InvitationActor = { id: string; name: string; email: string };

export async function listWeddingMembers(userId: string, weddingId: string) {
  await connectToDatabase();
  await requireWeddingAdmin(userId, weddingId);
  const now = new Date();

  const [memberships, invitations] = await Promise.all([
    WeddingMemberModel.find({ weddingId, status: "ACTIVE" }).sort({ joinedAt: 1 }).lean(),
    MemberInviteModel.find({ weddingId, status: "PENDING", expiresAt: { $gt: now } }).sort({ createdAt: -1 }).lean(),
  ]);
  const users = await UserModel.find({ _id: { $in: memberships.map((membership) => membership.userId) } }).lean();
  const usersById = new Map(users.map((user) => [String(user._id), user]));

  return {
    members: memberships.flatMap((membership) => {
      const user = usersById.get(String(membership.userId));
      if (!user) return [];
      return [{
        id: String(membership._id),
        userId: String(membership.userId),
        name: user.name,
        email: user.emailDisplay,
        role: membership.role,
        joinedAt: membership.joinedAt.toISOString(),
      }];
    }),
    invitations: invitations.map(sanitizeInvitation),
  };
}

export async function createMemberInvitation(actor: InvitationActor, weddingId: string, input: CreateMemberInvitationInput) {
  await connectToDatabase();
  const { wedding } = await requireWeddingAdmin(actor.id, weddingId);
  const emailNormalized = normalizeEmail(input.email);
  await MemberInviteModel.updateMany(
    { weddingId, emailNormalized, status: "PENDING", expiresAt: { $lte: new Date() } },
    { $set: { status: "EXPIRED" } },
  );
  const invitedUser = await UserModel.findOne({ emailNormalized }).lean();
  if (invitedUser) {
    const existingMembership = await WeddingMemberModel.findOne({ userId: invitedUser._id, status: "ACTIVE" }).lean();
    if (existingMembership?.weddingId.toString() === weddingId) {
      throw new AuthError("CONFLICT", "This person already belongs to your wedding workspace.", 409);
    }
    if (existingMembership) {
      throw new AuthError("ALREADY_IN_WEDDING", "This account already belongs to another wedding workspace.", 409);
    }
  }

  const duplicate = await MemberInviteModel.exists({ weddingId, emailNormalized, status: "PENDING" });
  if (duplicate) throw new AuthError("CONFLICT", "A pending invitation already exists for this email.", 409);

  const rawToken = createOpaqueToken();
  let invitation;
  try {
    invitation = await MemberInviteModel.create({
      weddingId,
      emailNormalized,
      role: input.role,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + MEMBER_INVITATION_AGE_MS),
      status: "PENDING",
      deliveryStatus: "PENDING",
      invitedBy: actor.id,
    });
  } catch (error) {
    if (isDuplicateKey(error)) throw new AuthError("CONFLICT", "A pending invitation already exists for this email.", 409);
    throw error;
  }

  const delivered = await deliverInvitation({ actor, wedding, email: emailNormalized, role: input.role, token: rawToken });
  const now = new Date();
  invitation.deliveryStatus = delivered ? "SENT" : "FAILED";
  invitation.sentAt = delivered ? now : undefined;
  await invitation.save();

  return { invitation: sanitizeInvitation(invitation), invitationUrl: createMemberInvitationUrl(rawToken) };
}

export async function resendMemberInvitation(actor: InvitationActor, weddingId: string, invitationId: string) {
  await connectToDatabase();
  assertObjectId(invitationId);
  const { wedding } = await requireWeddingAdmin(actor.id, weddingId);
  const rawToken = createOpaqueToken();
  const invitation = await MemberInviteModel.findOneAndUpdate(
    { _id: invitationId, weddingId, status: "PENDING" },
    { $set: { tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + MEMBER_INVITATION_AGE_MS), deliveryStatus: "PENDING" }, $unset: { sentAt: 1 } },
    { new: true },
  );
  if (!invitation) throw new AuthError("NOT_FOUND", "Pending invitation not found.", 404);

  const delivered = await deliverInvitation({ actor, wedding, email: invitation.emailNormalized, role: invitation.role, token: rawToken });
  invitation.deliveryStatus = delivered ? "SENT" : "FAILED";
  invitation.sentAt = delivered ? new Date() : undefined;
  await invitation.save();
  return { invitation: sanitizeInvitation(invitation), invitationUrl: createMemberInvitationUrl(rawToken) };
}

export async function revokeMemberInvitation(userId: string, weddingId: string, invitationId: string) {
  await connectToDatabase();
  assertObjectId(invitationId);
  await requireWeddingAdmin(userId, weddingId);
  const invitation = await MemberInviteModel.findOneAndUpdate(
    { _id: invitationId, weddingId, status: "PENDING" },
    { $set: { status: "REVOKED", revokedAt: new Date() } },
    { new: true },
  );
  if (!invitation) throw new AuthError("NOT_FOUND", "Pending invitation not found.", 404);
  return { id: String(invitation._id), status: invitation.status };
}

export async function getMemberInvitationPreview(rawToken: string) {
  await connectToDatabase();
  const now = new Date();
  const invitation = await MemberInviteModel.findOne({ tokenHash: hashToken(rawToken), status: "PENDING" }).select("+tokenHash").lean();
  if (!invitation || invitation.expiresAt <= now) {
    if (invitation && invitation.expiresAt <= now) await MemberInviteModel.updateOne({ _id: invitation._id, status: "PENDING" }, { $set: { status: "EXPIRED" } });
    return null;
  }
  const wedding = await WeddingModel.findById(invitation.weddingId).lean();
  if (!wedding) return null;
  return {
    email: invitation.emailNormalized,
    role: invitation.role,
    expiresAt: invitation.expiresAt.toISOString(),
    wedding: { brideName: wedding.brideName, groomName: wedding.groomName },
  };
}

export async function acceptMemberInvitation(user: InvitationActor, rawToken: string) {
  const database = await connectToDatabase();
  const mongoSession = await database.startSession();
  const now = new Date();
  let weddingId = "";

  try {
    await mongoSession.withTransaction(async () => {
      const invitation = await MemberInviteModel.findOne({
        tokenHash: hashToken(rawToken),
        status: "PENDING",
        expiresAt: { $gt: now },
      }).select("+tokenHash").session(mongoSession);
      if (!invitation) throw new AuthError("INVITATION_UNAVAILABLE", "This invitation is invalid, expired, or has already been used.", 404);
      if (invitation.emailNormalized !== normalizeEmail(user.email)) {
        throw new AuthError("INVITATION_EMAIL_MISMATCH", `Sign in with ${invitation.emailNormalized} to accept this invitation.`, 403);
      }

      const existingMembership = await WeddingMemberModel.findOne({ userId: user.id, status: "ACTIVE" }).session(mongoSession);
      if (existingMembership && String(existingMembership.weddingId) !== String(invitation.weddingId)) {
        throw new AuthError("ALREADY_IN_WEDDING", "Your account already belongs to another wedding workspace.", 409);
      }
      if (existingMembership) throw new AuthError("CONFLICT", "You already belong to this wedding workspace.", 409);

      await WeddingMemberModel.findOneAndUpdate(
        { weddingId: invitation.weddingId, userId: user.id },
        {
          $set: { role: invitation.role, status: "ACTIVE", grants: [], joinedAt: now, invitedBy: invitation.invitedBy },
          $unset: { removedAt: 1 },
        },
        { upsert: true, new: true, session: mongoSession, runValidators: true },
      );
      const consumed = await MemberInviteModel.updateOne(
        { _id: invitation._id, status: "PENDING", tokenHash: invitation.tokenHash },
        { $set: { status: "ACCEPTED", acceptedBy: user.id, acceptedAt: now } },
        { session: mongoSession },
      );
      if (consumed.modifiedCount !== 1) throw new AuthError("INVITATION_UNAVAILABLE", "This invitation has already been used.", 404);
      weddingId = String(invitation.weddingId);
    });
  } catch (error) {
    if (isDuplicateKey(error)) throw new AuthError("ALREADY_IN_WEDDING", "Your account already belongs to a wedding workspace.", 409);
    throw error;
  } finally {
    await mongoSession.endSession();
  }

  return { weddingId };
}

async function requireWeddingAdmin(userId: string, weddingId: string) {
  assertObjectId(weddingId);
  const membership = await WeddingMemberModel.findOne({ userId, weddingId, status: "ACTIVE" }).lean();
  if (!membership) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  if (membership.role !== "ADMIN") throw new AuthError("FORBIDDEN", "Only wedding administrators can manage members.", 403);
  const wedding = await WeddingModel.findById(weddingId).lean();
  if (!wedding) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  return { membership, wedding };
}

async function deliverInvitation(input: {
  actor: InvitationActor;
  wedding: { brideName: string; groomName: string };
  email: string;
  role: "MANAGER" | "MEMBER";
  token: string;
}) {
  try {
    return await sendMemberInvitationEmail({
      email: input.email,
      token: input.token,
      weddingName: `${input.wedding.brideName} & ${input.wedding.groomName}`,
      inviterName: input.actor.name,
      role: input.role,
    });
  } catch {
    return false;
  }
}

function sanitizeInvitation(invitation: {
  _id: unknown;
  emailNormalized: string;
  role: "MANAGER" | "MEMBER";
  status: string;
  deliveryStatus: "PENDING" | "SENT" | "FAILED";
  expiresAt: Date;
  sentAt?: Date | null;
  createdAt: Date;
}) {
  return {
    id: String(invitation._id),
    email: invitation.emailNormalized,
    role: invitation.role,
    status: invitation.status,
    deliveryStatus: invitation.deliveryStatus,
    expiresAt: invitation.expiresAt.toISOString(),
    sentAt: invitation.sentAt?.toISOString() ?? null,
    createdAt: invitation.createdAt.toISOString(),
  };
}

function isDuplicateKey(error: unknown): error is { code: number } {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

function assertObjectId(value: string) {
  if (!isValidObjectId(value)) throw new AuthError("NOT_FOUND", "Wedding resource not found.", 404);
}
