import { errorResponse, readJson, success } from "@/modules/auth/api";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { assertSameOrigin, AuthError, getClientKey } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { createMemberInvitationSchema } from "@/modules/members/schemas";
import { createMemberInvitation } from "@/modules/members/service";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ weddingId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to continue.", 401);
    await enforceRateLimit(getClientKey(request, `member-invite:${user.id}`), 20, 60 * 60 * 1000);
    const { weddingId } = await params;
    const input = createMemberInvitationSchema.parse(await readJson(request));
    return success(await createMemberInvitation(user, weddingId, input), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
