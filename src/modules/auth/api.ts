import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import { AuthError } from "./request-security";

const noStoreHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export function success(data: unknown, status = 200) {
  return Response.json({ data }, { status, headers: noStoreHeaders });
}

export function accepted(message: string) {
  return Response.json({ data: { message } }, { status: 202, headers: noStoreHeaders });
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new AuthError("VALIDATION_ERROR", "Check the highlighted fields.", 400, [{ path: "body", message: "Send a valid JSON body." }]);
  }
}

export function errorResponse(error: unknown) {
  const requestId = randomUUID();
  if (error instanceof ZodError) {
    return Response.json({ error: { code: "VALIDATION_ERROR", message: "Check the highlighted fields.", details: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })), requestId } }, { status: 400, headers: noStoreHeaders });
  }
  if (error instanceof AuthError) {
    const headers: Record<string, string> = { ...noStoreHeaders };
    if (error.code === "RATE_LIMITED") headers["Retry-After"] = error.details?.find((item) => item.path === "retryAfter")?.message ?? "60";
    return Response.json({ error: { code: error.code, message: error.message, details: error.details?.filter((item) => item.path !== "retryAfter"), requestId } }, { status: error.status, headers });
  }
  console.error("Authentication request failed", { requestId, error });
  return Response.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again.", requestId } }, { status: 500, headers: noStoreHeaders });
}
