import { timingSafeEqual } from "node:crypto";
import { errorResponse, success } from "@/modules/auth/api";
import { AuthError } from "@/modules/auth/request-security";
import { runNotificationWorker } from "@/modules/notifications/service";

export const runtime = "nodejs";
export const maxDuration = 60;

async function handle(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) throw new AuthError("NOT_CONFIGURED", "The notification worker is not configured.", 503);
    const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    const expectedBuffer = Buffer.from(secret); const suppliedBuffer = Buffer.from(supplied);
    if (expectedBuffer.length !== suppliedBuffer.length || !timingSafeEqual(expectedBuffer, suppliedBuffer)) throw new AuthError("UNAUTHENTICATED", "Invalid scheduler credential.", 401);
    return success(await runNotificationWorker());
  } catch (error) { return errorResponse(error); }
}

export async function GET(request: Request) { return handle(request); }
export async function POST(request: Request) { return handle(request); }
