import { errorResponse, success } from "@/modules/auth/api";
import { AuthError } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { getEvent } from "@/modules/events/service";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ weddingId: string; eventId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to view this event.", 401);
    const { weddingId, eventId } = await params;
    const event = await getEvent(user.id, weddingId, eventId);
    if (!event) throw new AuthError("NOT_FOUND", "Event not found.", 404);
    return success({ event });
  } catch (error) {
    return errorResponse(error);
  }
}
