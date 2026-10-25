import { errorResponse, readJson, success } from "@/modules/auth/api";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { assertSameOrigin, AuthError, getClientKey } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { updateTaskSchema } from "@/modules/tasks/schemas";
import { getTask, removeTask, updateTask } from "@/modules/tasks/service";

export const runtime = "nodejs";
type Context = { params: Promise<{ weddingId: string; taskId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to view this task.", 401);
    const { weddingId, taskId } = await params;
    const task = await getTask(user.id, weddingId, taskId);
    if (!task) throw new AuthError("NOT_FOUND", "Task not found.", 404);
    return success({ task });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to update this task.", 401);
    await enforceRateLimit(getClientKey(request, `task-update:${user.id}`), 180, 60 * 60 * 1000);
    const { weddingId, taskId } = await params;
    const input = updateTaskSchema.parse(await readJson(request));
    return success(await updateTask(user.id, weddingId, taskId, input));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to remove this task.", 401);
    await enforceRateLimit(getClientKey(request, `task-remove:${user.id}`), 60, 60 * 60 * 1000);
    const { weddingId, taskId } = await params;
    return success(await removeTask(user.id, weddingId, taskId));
  } catch (error) {
    return errorResponse(error);
  }
}
