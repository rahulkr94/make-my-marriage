import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { AuthError } from "@/modules/auth/request-security";
import { WeddingMemberModel, WeddingModel } from "@/modules/weddings/models";
import type { UpdateMemberRoleInput } from "./schemas";

export async function updateMemberRole(userId: string, weddingId: string, memberId: string, input: UpdateMemberRoleInput) {
  return changeMemberAccess(userId, weddingId, memberId, input.role);
}

export async function removeWeddingMember(userId: string, weddingId: string, memberId: string) {
  return changeMemberAccess(userId, weddingId, memberId, null);
}

async function changeMemberAccess(userId: string, weddingId: string, memberId: string, role: UpdateMemberRoleInput["role"] | null) {
  if (!isValidObjectId(weddingId) || !isValidObjectId(memberId)) {
    throw new AuthError("NOT_FOUND", "Wedding member not found.", 404);
  }
  const database = await connectToDatabase();
  const session = await database.startSession();

  try {
    return await session.withTransaction(async () => {
      // Every role/removal transaction writes the same wedding first. Concurrent
      // changes retry with a fresh snapshot rather than both removing the last admins.
      const wedding = await WeddingModel.findOneAndUpdate(
        { _id: weddingId },
        { $inc: { memberAccessVersion: 1 } },
        { session, new: true, timestamps: false },
      );
      if (!wedding) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);

      const actor = await WeddingMemberModel.findOne({ userId, weddingId, status: "ACTIVE" }).session(session);
      if (!actor) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
      if (actor.role !== "ADMIN") throw new AuthError("FORBIDDEN", "Only wedding admins can manage members.", 403);

      const member = await WeddingMemberModel.findOne({ _id: memberId, weddingId, status: "ACTIVE" }).session(session);
      if (!member) throw new AuthError("NOT_FOUND", "Active wedding member not found.", 404);
      if (member.role === "ADMIN" && role !== "ADMIN") {
        const adminCount = await WeddingMemberModel.countDocuments({ weddingId, status: "ACTIVE", role: "ADMIN" }).session(session);
        if (adminCount <= 1) {
          throw new AuthError("LAST_ADMIN", "Keep at least one active Admin. Make another member an Admin first.", 409);
        }
      }

      if (role === null) {
        member.status = "REMOVED";
        member.removedAt = new Date();
        member.grants = [];
      } else if (role !== member.role) {
        member.role = role;
        member.grants = [];
      }
      await member.save({ session });
      return { id: String(member._id), userId: String(member.userId), role: member.role, status: member.status };
    });
  } finally {
    await session.endSession();
  }
}
