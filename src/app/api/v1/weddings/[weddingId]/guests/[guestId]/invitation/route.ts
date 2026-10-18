import { errorResponse, success } from "@/modules/auth/api";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { assertSameOrigin, AuthError, getClientKey } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { issueGuestInvitation, revokeGuestInvitation } from "@/modules/invitations/service";

export const runtime = "nodejs";
type Context = { params: Promise<{ weddingId: string; guestId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to create an invitation.", 401);
    await enforceRateLimit(getClientKey(request, `guest-invitation-issue:${user.id}`), 100, 60 * 60 * 1000);
    const { weddingId, guestId } = await params;
    return success(await issueGuestInvitation(user, weddingId, guestId, new URL(request.url).origin), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to revoke an invitation.", 401);
    await enforceRateLimit(getClientKey(request, `guest-invitation-revoke:${user.id}`), 100, 60 * 60 * 1000);
    const { weddingId, guestId } = await params;
    return success(await revokeGuestInvitation(user.id, weddingId, guestId));
  } catch (error) {
    return errorResponse(error);
  }
}
