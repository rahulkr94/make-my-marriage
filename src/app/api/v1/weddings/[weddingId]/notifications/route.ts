import { errorResponse, success } from "@/modules/auth/api";
import { AuthError } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { notificationListQuerySchema } from "@/modules/notifications/schemas";
import { listNotifications } from "@/modules/notifications/service";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ weddingId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to view notifications.", 401);
    const { weddingId } = await params;
    const query = notificationListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return success(await listNotifications(user.id, weddingId, query));
  } catch (error) {
    return errorResponse(error);
  }
}
