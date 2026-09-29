import { accepted, errorResponse, readJson } from "@/modules/auth/api";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { assertSameOrigin, getClientKey } from "@/modules/auth/request-security";
import { passwordResetRequestSchema } from "@/modules/auth/schemas";
import { requestPasswordReset } from "@/modules/auth/service";

export const runtime = "nodejs";

const genericMessage = "If an account exists for that email, a password reset link will be sent.";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit(getClientKey(request, "password-reset-request"), 5, 30 * 60 * 1000);
    const input = passwordResetRequestSchema.parse(await readJson(request));
    await requestPasswordReset(input.email);
    return accepted(genericMessage);
  } catch (error) {
    return errorResponse(error);
  }
}
