import { errorResponse, success } from "@/modules/auth/api";
import { AuthError } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { getWorkspaceForUser } from "@/modules/weddings/service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Sign in to continue.", 401);
    const workspace = await getWorkspaceForUser(user.id);
    return success({ user, membership: workspace?.membership ?? null, wedding: workspace?.wedding ?? null });
  } catch (error) {
    return errorResponse(error);
  }
}
