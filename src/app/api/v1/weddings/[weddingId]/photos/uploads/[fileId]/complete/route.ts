import { errorResponse, success } from "@/modules/auth/api";
import { assertSameOrigin, AuthError } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { completeMemberPhotoUpload } from "@/modules/gallery/service";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ weddingId: string; fileId: string }> }) { try { assertSameOrigin(request); const user = await getCurrentUser(); if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to continue.", 401); const { weddingId, fileId } = await params; return success(await completeMemberPhotoUpload(user.id, weddingId, fileId)); } catch (error) { return errorResponse(error); } }
