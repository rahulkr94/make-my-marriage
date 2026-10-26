import { errorResponse, success } from "@/modules/auth/api";
import { assertSameOrigin } from "@/modules/auth/request-security";
import { hashToken } from "@/modules/auth/crypto";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { completeGuestPhotoUpload } from "@/modules/gallery/service";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ token: string; fileId: string }> }) { try { assertSameOrigin(request); const { token, fileId } = await params; await enforceRateLimit(hashToken(`guest-photo-complete:${token}`), 60, 60 * 60 * 1000); return success(await completeGuestPhotoUpload(token, fileId)); } catch (error) { return errorResponse(error); } }
