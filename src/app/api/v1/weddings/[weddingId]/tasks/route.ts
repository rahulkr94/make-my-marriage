import { errorResponse, readJson, success } from "@/modules/auth/api";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { assertSameOrigin, AuthError, getClientKey } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { createTaskSchema, taskListQuerySchema } from "@/modules/tasks/schemas";
import { createTask, listTasks } from "@/modules/tasks/service";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ weddingId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to view wedding tasks.", 401);
    const { weddingId } = await params;
    const query = taskListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return success(await listTasks(user.id, weddingId, query));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ weddingId: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to create a task.", 401);
    await enforceRateLimit(getClientKey(request, `task-create:${user.id}`), 80, 60 * 60 * 1000);
    const { weddingId } = await params;
    const input = createTaskSchema.parse(await readJson(request));
    return success(await createTask(user.id, weddingId, input), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
