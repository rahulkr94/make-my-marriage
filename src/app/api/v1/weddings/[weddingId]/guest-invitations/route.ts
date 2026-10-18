import { errorResponse, success } from "@/modules/auth/api";
import { AuthError } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { guestInvitationListQuerySchema } from "@/modules/invitations/schemas";
import { listGuestInvitations } from "@/modules/invitations/service";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ weddingId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to view guest invitations.", 401);
    const { weddingId } = await params;
    const url = new URL(request.url);
    const query = guestInvitationListQuerySchema.parse(Object.fromEntries([...url.searchParams].filter(([, value]) => value !== "")));
    return success(await listGuestInvitations(user.id, weddingId, query));
  } catch (error) {
    return errorResponse(error);
  }
}
