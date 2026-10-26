import { errorResponse, readJson, success } from "@/modules/auth/api";
import { assertSameOrigin, AuthError } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { hashToken } from "@/modules/auth/crypto";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { createPhotoUploadIntentSchema } from "@/modules/gallery/schemas";
import { createMemberPhotoUploadIntent } from "@/modules/gallery/service";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ weddingId: string }> }) { try { assertSameOrigin(request); const user = await getCurrentUser(); if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to continue.", 401); await enforceRateLimit(hashToken(`member-photo-intent:${user.id}`), 120, 60 * 60 * 1000); const { weddingId } = await params; return success(await createMemberPhotoUploadIntent(user.id, weddingId, createPhotoUploadIntentSchema.parse(await readJson(request))), 201); } catch (error) { return errorResponse(error); } }
