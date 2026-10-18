import { errorResponse, readJson, success } from "@/modules/auth/api";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { assertSameOrigin, AuthError, getClientKey } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { updateGuestSchema } from "@/modules/guests/schemas";
import { getGuest, removeGuest, updateGuest } from "@/modules/guests/service";

export const runtime = "nodejs";
type Context = { params: Promise<{ weddingId: string; guestId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to view this guest.", 401);
    const { weddingId, guestId } = await params;
    const guest = await getGuest(user.id, weddingId, guestId);
    if (!guest) throw new AuthError("NOT_FOUND", "Guest not found.", 404);
    return success({ guest });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to edit this guest.", 401);
    await enforceRateLimit(getClientKey(request, `guest-update:${user.id}`), 240, 60 * 60 * 1000);
    const { weddingId, guestId } = await params;
    const input = updateGuestSchema.parse(await readJson(request));
    return success({ guest: await updateGuest(user.id, weddingId, guestId, input) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to remove this guest.", 401);
    await enforceRateLimit(getClientKey(request, `guest-remove:${user.id}`), 80, 60 * 60 * 1000);
    const { weddingId, guestId } = await params;
    return success(await removeGuest(user.id, weddingId, guestId));
  } catch (error) {
    return errorResponse(error);
  }
}
