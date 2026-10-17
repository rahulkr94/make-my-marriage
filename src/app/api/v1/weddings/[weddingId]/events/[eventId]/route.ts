import { errorResponse, readJson, success } from "@/modules/auth/api";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { assertSameOrigin, AuthError, getClientKey } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { updateEventSchema } from "@/modules/events/schemas";
import { getEvent, updateEvent } from "@/modules/events/service";

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

export async function PATCH(request: Request, { params }: { params: Promise<{ weddingId: string; eventId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to edit this event.", 401);
    await enforceRateLimit(getClientKey(request, `event-update:${user.id}`), 120, 60 * 60 * 1000);
    const { weddingId, eventId } = await params;
    const input = updateEventSchema.parse(await readJson(request));
    return success({ event: await updateEvent(user.id, weddingId, eventId, input) });
  } catch (error) {
    return errorResponse(error);
  }
}
