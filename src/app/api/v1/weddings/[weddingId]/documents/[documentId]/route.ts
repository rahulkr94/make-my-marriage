import { errorResponse, readJson, success } from "@/modules/auth/api";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { assertSameOrigin, AuthError, getClientKey } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { updateDocumentSchema } from "@/modules/documents/schemas";
import { removeDocument, updateDocument } from "@/modules/documents/service";

export const runtime = "nodejs";
type Context = { params: Promise<{ weddingId: string; documentId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to update this attachment.", 401);
    await enforceRateLimit(getClientKey(request, `document-update:${user.id}`), 120, 60 * 60 * 1000);
    const { weddingId, documentId } = await params;
    return success(await updateDocument(user.id, weddingId, documentId, updateDocumentSchema.parse(await readJson(request))));
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to delete this attachment.", 401);
    await enforceRateLimit(getClientKey(request, `document-delete:${user.id}`), 60, 60 * 60 * 1000);
    const { weddingId, documentId } = await params;
    return success(await removeDocument(user.id, weddingId, documentId));
  } catch (error) { return errorResponse(error); }
}
