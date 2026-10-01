import { errorResponse, success } from "@/modules/auth/api";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { assertSameOrigin, AuthError, getClientKey } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { resendMemberInvitation } from "@/modules/members/service";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ weddingId: string; inviteId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to continue.", 401);
    await enforceRateLimit(getClientKey(request, `member-invite-resend:${user.id}`), 30, 60 * 60 * 1000);
    const { weddingId, inviteId } = await params;
    return success(await resendMemberInvitation(user, weddingId, inviteId));
  } catch (error) {
    return errorResponse(error);
  }
}
