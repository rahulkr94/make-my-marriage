import type { NextRequest } from "next/server";
import { errorResponse, readJson, success } from "@/modules/auth/api";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { assertSameOrigin, getClientKey } from "@/modules/auth/request-security";
import { signupSchema } from "@/modules/auth/schemas";
import { signup } from "@/modules/auth/service";
import { revokeSessionToken, setSessionCookie } from "@/modules/auth/session";
import { SESSION_COOKIE } from "@/modules/auth/constants";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit(getClientKey(request, "signup"), 8, 15 * 60 * 1000);
    const input = signupSchema.parse(await readJson(request));
    const result = await signup(input);
    await revokeSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
    await setSessionCookie(result.session.token, result.session.expiresAt);
    return success({ user: result.user, membership: null, wedding: null }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
