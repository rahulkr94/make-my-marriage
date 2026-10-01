import { errorResponse, readJson, success } from "@/modules/auth/api";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { assertSameOrigin, AuthError, getClientKey } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { acceptMemberInvitationSchema } from "@/modules/members/schemas";
import { acceptMemberInvitation } from "@/modules/members/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to accept this invitation.", 401);
    await enforceRateLimit(getClientKey(request, `member-invite-accept:${user.id}`), 20, 60 * 60 * 1000);
    const input = acceptMemberInvitationSchema.parse(await readJson(request));
    return success(await acceptMemberInvitation(user, input.token));
  } catch (error) {
    return errorResponse(error);
  }
}
