import { errorResponse, success } from "@/modules/auth/api";
import { AuthError } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { createDocumentDownload } from "@/modules/documents/service";

export const runtime = "nodejs";
type Context = { params: Promise<{ weddingId: string; documentId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to open this private attachment.", 401);
    const { weddingId, documentId } = await params;
    const preview = new URL(request.url).searchParams.get("preview") === "1";
    return success(await createDocumentDownload(user.id, weddingId, documentId, preview));
  } catch (error) { return errorResponse(error); }
}
