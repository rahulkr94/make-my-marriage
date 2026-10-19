import { errorResponse, success } from "@/modules/auth/api";
import { getCurrentUser } from "@/modules/auth/session";
import { AuthError } from "@/modules/auth/request-security";
import { rsvpListQuerySchema } from "@/modules/rsvp/schemas";
import { listRsvps } from "@/modules/rsvp/service";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ weddingId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to view guest responses.", 401);
    const { weddingId } = await params;
    const url = new URL(request.url);
    const query = rsvpListQuerySchema.parse(Object.fromEntries(url.searchParams));
    return success(await listRsvps(user.id, weddingId, query));
  } catch (error) {
    return errorResponse(error);
  }
}
