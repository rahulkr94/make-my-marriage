import { describe, expect, it } from "vitest";
import { createOpaqueToken, hashPassword, hashToken, verifyPassword } from "@/modules/auth/crypto";

describe("authentication crypto", () => {
  it("hashes passwords with Argon2id and verifies only the original password", async () => {
    const hash = await hashPassword("WeddingPlan-2026");

    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(hash, "WeddingPlan-2026")).resolves.toBe(true);
    await expect(verifyPassword(hash, "WrongPassword-2026")).resolves.toBe(false);
  });

  it("creates high-entropy opaque tokens and stores stable digests", () => {
    const token = createOpaqueToken();
    const anotherToken = createOpaqueToken();

    expect(token).toHaveLength(43);
    expect(token).not.toBe(anotherToken);
    expect(hashToken(token)).toHaveLength(64);
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toContain(token);
  });
});
