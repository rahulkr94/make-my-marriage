import { errorResponse, success } from "@/modules/auth/api";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { assertSameOrigin, AuthError, getClientKey } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { completeDocumentUpload } from "@/modules/documents/service";

export const runtime = "nodejs";
type Context = { params: Promise<{ weddingId: string; fileId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to finish this upload.", 401);
    await enforceRateLimit(getClientKey(request, `document-complete:${user.id}`), 120, 60 * 60 * 1000);
    const { weddingId, fileId } = await params;
    return success(await completeDocumentUpload(user.id, weddingId, fileId));
  } catch (error) { return errorResponse(error); }
}
