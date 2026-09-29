import type { NextRequest } from "next/server";
import { errorResponse, readJson, success } from "@/modules/auth/api";
import { SESSION_COOKIE } from "@/modules/auth/constants";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { assertSameOrigin, getClientKey } from "@/modules/auth/request-security";
import { loginSchema } from "@/modules/auth/schemas";
import { login } from "@/modules/auth/service";
import { revokeSessionToken, setSessionCookie } from "@/modules/auth/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit(getClientKey(request, "login"), 10, 15 * 60 * 1000);
    const input = loginSchema.parse(await readJson(request));
    const result = await login(input);
    await revokeSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
    await setSessionCookie(result.session.token, result.session.expiresAt);
    return success({ user: result.user, membership: null, wedding: null });
  } catch (error) {
    return errorResponse(error);
  }
}
