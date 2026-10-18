import { errorResponse, success } from "@/modules/auth/api";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { assertSameOrigin, AuthError, getClientKey } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { sendGuestInvitation } from "@/modules/invitations/service";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ weddingId: string; guestId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to send an invitation.", 401);
    await enforceRateLimit(getClientKey(request, `guest-invitation-send:${user.id}`), 40, 60 * 60 * 1000);
    const { weddingId, guestId } = await params;
    return success(await sendGuestInvitation(user, weddingId, guestId, new URL(request.url).origin));
  } catch (error) {
    return errorResponse(error);
  }
}
