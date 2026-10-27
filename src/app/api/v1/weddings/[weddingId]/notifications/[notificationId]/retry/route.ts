import { errorResponse, success } from "@/modules/auth/api";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { assertSameOrigin, AuthError, getClientKey } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { retryNotification } from "@/modules/notifications/service";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ weddingId: string; notificationId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to retry this notification.", 401);
    await enforceRateLimit(getClientKey(request, `notification-retry:${user.id}`), 40, 60 * 60 * 1000);
    const { weddingId, notificationId } = await params;
    return success(await retryNotification(user.id, weddingId, notificationId));
  } catch (error) { return errorResponse(error); }
}
