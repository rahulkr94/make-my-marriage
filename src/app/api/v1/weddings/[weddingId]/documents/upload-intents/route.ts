import { errorResponse, readJson, success } from "@/modules/auth/api";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { assertSameOrigin, AuthError, getClientKey } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { createDocumentUploadIntentSchema } from "@/modules/documents/schemas";
import { createDocumentUploadIntent } from "@/modules/documents/service";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ weddingId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to upload a private attachment.", 401);
    await enforceRateLimit(getClientKey(request, `document-upload:${user.id}`), 60, 60 * 60 * 1000);
    const { weddingId } = await params;
    const input = createDocumentUploadIntentSchema.parse(await readJson(request));
    return success(await createDocumentUploadIntent(user.id, weddingId, input), 201);
  } catch (error) { return errorResponse(error); }
}
