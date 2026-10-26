import { errorResponse, success } from "@/modules/auth/api";
import { hashToken } from "@/modules/auth/crypto";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { AuthError } from "@/modules/auth/request-security";
import { getPublicGallery } from "@/modules/gallery/service";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) { try { const { token } = await params; await enforceRateLimit(hashToken(`public-gallery:${token}`), 240, 15 * 60 * 1000); const gallery = await getPublicGallery(token); if (!gallery) throw new AuthError("NOT_FOUND", "Gallery not found.", 404); return success(gallery); } catch (error) { return errorResponse(error); } }
