import { errorResponse, success } from "@/modules/auth/api";
import { assertSameOrigin, AuthError } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { getGalleryLinkStatus, revokeGalleryLink } from "@/modules/gallery/service";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ weddingId: string }> }) { try { const user = await getCurrentUser(); if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to continue.", 401); return success(await getGalleryLinkStatus(user.id, (await params).weddingId)); } catch (error) { return errorResponse(error); } }
export async function DELETE(request: Request, { params }: { params: Promise<{ weddingId: string }> }) { try { assertSameOrigin(request); const user = await getCurrentUser(); if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to continue.", 401); return success(await revokeGalleryLink(user.id, (await params).weddingId)); } catch (error) { return errorResponse(error); } }
