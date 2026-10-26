import { errorResponse, readJson, success } from "@/modules/auth/api";
import { assertSameOrigin } from "@/modules/auth/request-security";
import { hashToken } from "@/modules/auth/crypto";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { guestPhotoUploadIntentSchema } from "@/modules/gallery/schemas";
import { createGuestPhotoUploadIntent } from "@/modules/gallery/service";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) { try { assertSameOrigin(request); const { token } = await params; await enforceRateLimit(hashToken(`guest-photo-intent:${token}`), 30, 60 * 60 * 1000); return success(await createGuestPhotoUploadIntent(token, guestPhotoUploadIntentSchema.parse(await readJson(request))), 201); } catch (error) { return errorResponse(error); } }
