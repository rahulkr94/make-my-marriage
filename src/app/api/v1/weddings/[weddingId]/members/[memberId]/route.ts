import { errorResponse, readJson, success } from "@/modules/auth/api";
import { assertSameOrigin, AuthError } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { removeWeddingMember, updateMemberRole } from "@/modules/members/access";
import { updateMemberRoleSchema } from "@/modules/members/schemas";

export const runtime = "nodejs";
type Context = { params: Promise<{ weddingId: string; memberId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to continue.", 401);
    const { weddingId, memberId } = await params;
    const input = updateMemberRoleSchema.parse(await readJson(request));
    return success(await updateMemberRole(user.id, weddingId, memberId, input));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to continue.", 401);
    const { weddingId, memberId } = await params;
    return success(await removeWeddingMember(user.id, weddingId, memberId));
  } catch (error) {
    return errorResponse(error);
  }
}
