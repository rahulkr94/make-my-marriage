import { errorResponse, readJson, success } from "@/modules/auth/api";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { assertSameOrigin, AuthError, getClientKey } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { updateVendorSchema } from "@/modules/finance/vendor-schemas";
import { archiveVendor, getVendor, updateVendor } from "@/modules/finance/vendor-service";

export const runtime = "nodejs";
type Context = { params: Promise<{ weddingId: string; vendorId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to view this vendor.", 401);
    const { weddingId, vendorId } = await params;
    const vendor = await getVendor(user.id, weddingId, vendorId);
    if (!vendor) throw new AuthError("NOT_FOUND", "Vendor not found.", 404);
    return success({ vendor });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to update this vendor.", 401);
    await enforceRateLimit(getClientKey(request, `vendor-update:${user.id}`), 120, 60 * 60 * 1000);
    const { weddingId, vendorId } = await params;
    const input = updateVendorSchema.parse(await readJson(request));
    return success(await updateVendor(user.id, weddingId, vendorId, input));
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to archive this vendor.", 401);
    await enforceRateLimit(getClientKey(request, `vendor-archive:${user.id}`), 60, 60 * 60 * 1000);
    const { weddingId, vendorId } = await params;
    return success(await archiveVendor(user.id, weddingId, vendorId));
  } catch (error) { return errorResponse(error); }
}
