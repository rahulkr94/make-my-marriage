import { created, errorResponse, readJson } from "@/modules/auth/api";
import { AuthError, assertSameOrigin } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { createWeddingSchema } from "@/modules/weddings/schemas";
import { createWedding } from "@/modules/weddings/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Sign in to create your wedding workspace.", 401);

    const input = createWeddingSchema.parse(await readJson(request));
    const wedding = await createWedding(user.id, input);
    return created({ wedding, membership: { weddingId: wedding.id, role: "ADMIN", grants: [] } }, `/api/v1/weddings/${wedding.id}`);
  } catch (error) {
    return errorResponse(error);
  }
}
