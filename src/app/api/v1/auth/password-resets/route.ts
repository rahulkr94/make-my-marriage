import { errorResponse, readJson, success } from "@/modules/auth/api";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { assertSameOrigin, getClientKey } from "@/modules/auth/request-security";
import { passwordResetSchema } from "@/modules/auth/schemas";
import { resetPassword } from "@/modules/auth/service";
import { clearSessionCookie } from "@/modules/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit(getClientKey(request, "password-reset"), 8, 30 * 60 * 1000);
    const input = passwordResetSchema.parse(await readJson(request));
    await resetPassword(input);
    await clearSessionCookie();
    return success({ message: "Your password has been updated. Sign in with your new password." });
  } catch (error) {
    return errorResponse(error);
  }
}
