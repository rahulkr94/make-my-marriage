import { errorResponse, readJson, success } from "@/modules/auth/api";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { assertSameOrigin, AuthError, getClientKey } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { updateExpenseSchema } from "@/modules/finance/schemas";
import { getExpense, removeExpense, updateExpense } from "@/modules/finance/service";

export const runtime = "nodejs";
type Context = { params: Promise<{ weddingId: string; expenseId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to view this expense.", 401);
    const { weddingId, expenseId } = await params;
    const expense = await getExpense(user.id, weddingId, expenseId);
    if (!expense) throw new AuthError("NOT_FOUND", "Expense not found.", 404);
    return success({ expense });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to update this expense.", 401);
    await enforceRateLimit(getClientKey(request, `expense-update:${user.id}`), 120, 60 * 60 * 1000);
    const { weddingId, expenseId } = await params;
    const input = updateExpenseSchema.parse(await readJson(request));
    return success(await updateExpense(user.id, weddingId, expenseId, input));
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to remove this expense.", 401);
    await enforceRateLimit(getClientKey(request, `expense-remove:${user.id}`), 60, 60 * 60 * 1000);
    const { weddingId, expenseId } = await params;
    return success(await removeExpense(user.id, weddingId, expenseId));
  } catch (error) { return errorResponse(error); }
}
