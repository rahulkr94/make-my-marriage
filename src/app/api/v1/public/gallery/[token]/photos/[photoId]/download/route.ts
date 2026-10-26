import { errorResponse, success } from "@/modules/auth/api";
import { createPublicPhotoDownload } from "@/modules/gallery/service";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ token: string; photoId: string }> }) { try { const { token, photoId } = await params; return success(await createPublicPhotoDownload(token, photoId)); } catch (error) { return errorResponse(error); } }
