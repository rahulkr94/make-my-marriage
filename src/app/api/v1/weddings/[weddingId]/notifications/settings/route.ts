import { errorResponse, readJson, success } from "@/modules/auth/api";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { assertSameOrigin, AuthError, getClientKey } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { notificationSettingsSchema } from "@/modules/notifications/schemas";
import { getNotificationSettings, updateNotificationSettings } from "@/modules/notifications/service";

export const runtime = "nodejs";
type Context = { params: Promise<{ weddingId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to view reminder settings.", 401);
    return success(await getNotificationSettings(user.id, (await params).weddingId));
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to update reminder settings.", 401);
    await enforceRateLimit(getClientKey(request, `notification-settings:${user.id}`), 30, 60 * 60 * 1000);
    const input = notificationSettingsSchema.parse(await readJson(request));
    return success(await updateNotificationSettings(user.id, (await params).weddingId, input));
  } catch (error) { return errorResponse(error); }
}
