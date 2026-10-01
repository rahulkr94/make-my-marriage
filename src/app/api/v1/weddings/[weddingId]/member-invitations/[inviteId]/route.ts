import { errorResponse, success } from "@/modules/auth/api";
import { assertSameOrigin, AuthError } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { revokeMemberInvitation } from "@/modules/members/service";

export const runtime = "nodejs";

export async function DELETE(request: Request, { params }: { params: Promise<{ weddingId: string; inviteId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to continue.", 401);
    const { weddingId, inviteId } = await params;
    return success(await revokeMemberInvitation(user.id, weddingId, inviteId));
  } catch (error) {
    return errorResponse(error);
  }
}
