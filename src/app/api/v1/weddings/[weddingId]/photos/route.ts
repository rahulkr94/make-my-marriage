import { errorResponse, success } from "@/modules/auth/api";
import { AuthError } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { listGallery } from "@/modules/gallery/service";
import { galleryListQuerySchema } from "@/modules/gallery/schemas";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ weddingId: string }> }) { try { const user = await getCurrentUser(); if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to continue.", 401); const { weddingId } = await params; const url = new URL(request.url); const input = galleryListQuerySchema.parse(Object.fromEntries([...url.searchParams.entries()].filter(([, value]) => value))); return success(await listGallery(user.id, weddingId, input)); } catch (error) { return errorResponse(error); } }
