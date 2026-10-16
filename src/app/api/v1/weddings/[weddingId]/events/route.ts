import { errorResponse, readJson, success } from "@/modules/auth/api";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { assertSameOrigin, AuthError, getClientKey } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { createEventSchema, eventListQuerySchema } from "@/modules/events/schemas";
import { createEvent, listEvents } from "@/modules/events/service";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ weddingId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to view wedding events.", 401);
    const { weddingId } = await params;
    const query = eventListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return success(await listEvents(user.id, weddingId, query.page));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ weddingId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to create an event.", 401);
    await enforceRateLimit(getClientKey(request, `event-create:${user.id}`), 40, 60 * 60 * 1000);
    const { weddingId } = await params;
    const input = createEventSchema.parse(await readJson(request));
    return success({ event: await createEvent(user.id, weddingId, input) }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
