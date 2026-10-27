import { errorResponse, readJson, success } from "@/modules/auth/api";
import { assertSameOrigin, AuthError } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { reviewPhotoSchema } from "@/modules/gallery/schemas";
import { removePhoto, reviewPhoto } from "@/modules/gallery/service";
export const runtime = "nodejs";
export async function PATCH(request: Request, { params }: { params: Promise<{ weddingId: string; photoId: string }> }) { try { assertSameOrigin(request); const user = await getCurrentUser(); if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to continue.", 401); const { weddingId, photoId } = await params; return success(await reviewPhoto(user.id, weddingId, photoId, reviewPhotoSchema.parse(await readJson(request)))); } catch (error) { return errorResponse(error); } }
export async function DELETE(request: Request, { params }: { params: Promise<{ weddingId: string; photoId: string }> }) { try { assertSameOrigin(request); const user = await getCurrentUser(); if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to continue.", 401); const { weddingId, photoId } = await params; return success(await removePhoto(user.id, weddingId, photoId)); } catch (error) { return errorResponse(error); } }
