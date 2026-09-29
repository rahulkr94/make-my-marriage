import { hashToken } from "./crypto";

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  const configuredOrigin = process.env.APP_URL ? new URL(process.env.APP_URL).origin : requestOrigin;

  if (!origin || (origin !== requestOrigin && origin !== configuredOrigin)) {
    throw new AuthError("FORBIDDEN", "This request could not be verified.", 403);
  }
}

export function getClientKey(request: Request, action: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip") || "unknown";
  return hashToken(`${action}:${address}`);
}

export class AuthError extends Error {
  constructor(public code: string, message: string, public status: number, public details?: Array<{ path: string; message: string }>) {
    super(message);
  }
}
