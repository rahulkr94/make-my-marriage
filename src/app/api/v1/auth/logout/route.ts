import type { NextRequest } from "next/server";
import { errorResponse } from "@/modules/auth/api";
import { SESSION_COOKIE } from "@/modules/auth/constants";
import { assertSameOrigin } from "@/modules/auth/request-security";
import { clearSessionCookie, revokeSessionToken } from "@/modules/auth/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await revokeSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
    await clearSessionCookie();
    return new Response(null, { status: 204, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
