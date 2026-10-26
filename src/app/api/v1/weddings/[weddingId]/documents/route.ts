import { errorResponse, success } from "@/modules/auth/api";
import { AuthError } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { documentListQuerySchema } from "@/modules/documents/schemas";
import { listDocuments } from "@/modules/documents/service";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ weddingId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to view private attachments.", 401);
    const { weddingId } = await params;
    const query = documentListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return success(await listDocuments(user.id, weddingId, query));
  } catch (error) { return errorResponse(error); }
}
