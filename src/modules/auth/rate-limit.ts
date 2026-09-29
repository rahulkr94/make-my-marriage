import { connectToDatabase } from "@/lib/mongodb";
import { RateLimitModel } from "./models";
import { AuthError } from "./request-security";

export async function enforceRateLimit(keyHash: string, limit: number, windowMs: number) {
  await connectToDatabase();
  const now = new Date();
  const existing = await RateLimitModel.findOne({ keyHash });

  if (!existing || existing.expiresAt <= now) {
    await RateLimitModel.findOneAndUpdate(
      { keyHash },
      { $set: { count: 1, windowStartedAt: now, expiresAt: new Date(now.getTime() + windowMs) } },
      { upsert: true },
    );
    return;
  }

  if (existing.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((existing.expiresAt.getTime() - now.getTime()) / 1000));
    throw new AuthError("RATE_LIMITED", "Please wait before trying again.", 429, [{ path: "retryAfter", message: String(retryAfter) }]);
  }

  await RateLimitModel.updateOne({ _id: existing._id, count: existing.count }, { $inc: { count: 1 } });
}
