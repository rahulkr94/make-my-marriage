import { errorResponse, readJson, success } from "@/modules/auth/api";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { assertSameOrigin, AuthError, getClientKey } from "@/modules/auth/request-security";
import { getCurrentUser } from "@/modules/auth/session";
import { recordExpensePaymentSchema } from "@/modules/finance/schemas";
import { recordExpensePayment } from "@/modules/finance/service";

export const runtime = "nodejs";
type Context = { params: Promise<{ weddingId: string; expenseId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AuthError("UNAUTHENTICATED", "Log in to record a payment.", 401);
    await enforceRateLimit(getClientKey(request, `expense-payment:${user.id}`), 120, 60 * 60 * 1000);
    const { weddingId, expenseId } = await params;
    const input = recordExpensePaymentSchema.parse(await readJson(request));
    return success(await recordExpensePayment(user.id, weddingId, expenseId, input), 201);
  } catch (error) { return errorResponse(error); }
}
