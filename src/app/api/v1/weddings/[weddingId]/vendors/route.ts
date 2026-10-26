import { errorResponse, readJson, success } from "@/modules/auth/api";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { assertSameOrigin, AuthError, getClientKey } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { createVendorSchema, vendorListQuerySchema } from "@/modules/finance/vendor-schemas";
import { createVendor, listVendors } from "@/modules/finance/vendor-service";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ weddingId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to view wedding vendors.", 401);
    const { weddingId } = await params;
    const query = vendorListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return success(await listVendors(user.id, weddingId, query));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ weddingId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to add a vendor.", 401);
    await enforceRateLimit(getClientKey(request, `vendor-create:${user.id}`), 80, 60 * 60 * 1000);
    const { weddingId } = await params;
    const input = createVendorSchema.parse(await readJson(request));
    return success(await createVendor(user.id, weddingId, input), 201);
  } catch (error) { return errorResponse(error); }
}
