import { errorResponse, success } from "@/modules/auth/api";
import { getCurrentUser } from "@/modules/auth/session";
import { AuthError } from "@/modules/auth/request-security";
import { listWeddingMembers } from "@/modules/members/service";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ weddingId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to continue.", 401);
    const { weddingId } = await params;
    return success(await listWeddingMembers(user.id, weddingId));
  } catch (error) {
    return errorResponse(error);
  }
}
