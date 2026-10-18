import { errorResponse, success } from "@/modules/auth/api";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { assertSameOrigin, AuthError, getClientKey } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { issueGuestInvitationQr } from "@/modules/invitations/service";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ weddingId: string; guestId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to generate an invitation QR code.", 401);
    await enforceRateLimit(getClientKey(request, `guest-invitation-qr:${user.id}`), 80, 60 * 60 * 1000);
    const { weddingId, guestId } = await params;
    return success(await issueGuestInvitationQr(user, weddingId, guestId, new URL(request.url).origin), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
