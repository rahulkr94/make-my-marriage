import { errorResponse, success } from "@/modules/auth/api";
import { assertSameOrigin, AuthError } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { rotateGalleryLink } from "@/modules/gallery/service";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ weddingId: string }> }) { try { assertSameOrigin(request); const user = await getCurrentUser(); if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to continue.", 401); return success(await rotateGalleryLink(user.id, (await params).weddingId, new URL(request.url).origin)); } catch (error) { return errorResponse(error); } }
