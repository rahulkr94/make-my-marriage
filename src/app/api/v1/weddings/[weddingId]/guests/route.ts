import { errorResponse, readJson, success } from "@/modules/auth/api";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { assertSameOrigin, AuthError, getClientKey } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { createGuestSchema, guestListQuerySchema } from "@/modules/guests/schemas";
import { createGuest, listGuests } from "@/modules/guests/service";

export const runtime = "nodejs";
type Context = { params: Promise<{ weddingId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to view guests.", 401);
    const { weddingId } = await params;
    const query = guestListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return success(await listGuests(user.id, weddingId, query));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to add a guest.", 401);
    await enforceRateLimit(getClientKey(request, `guest-create:${user.id}`), 120, 60 * 60 * 1000);
    const { weddingId } = await params;
    const input = createGuestSchema.parse(await readJson(request));
    return success({ guest: await createGuest(user.id, weddingId, input) }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
