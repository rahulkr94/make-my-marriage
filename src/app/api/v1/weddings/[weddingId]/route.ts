import mongoose from "mongoose";
import { errorResponse, success } from "@/modules/auth/api";
import { AuthError } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { getWeddingForUser } from "@/modules/weddings/service";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ weddingId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Sign in to continue.", 401);

    const { weddingId } = await params;
    if (!mongoose.isObjectIdOrHexString(weddingId)) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
    const workspace = await getWeddingForUser(user.id, weddingId);
    if (!workspace) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);

    return success(workspace);
  } catch (error) {
    return errorResponse(error);
  }
}
