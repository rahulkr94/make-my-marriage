import { describe, expect, it } from "vitest";
import { loginSchema, normalizeEmail, passwordResetSchema, signupSchema } from "@/modules/auth/schemas";

describe("authentication input schemas", () => {
  it("normalizes email addresses for identity lookup", () => {
    expect(normalizeEmail("  Partner@Example.COM ")).toBe("partner@example.com");
  });

  it("accepts a complete signup and rejects mismatched passwords", () => {
    expect(signupSchema.safeParse({
      name: "Ananya Rao",
      email: "ananya@example.com",
      password: "Celebration-2026",
      confirmPassword: "Celebration-2026",
    }).success).toBe(true);

    const result = signupSchema.safeParse({
      name: "Ananya Rao",
      email: "ananya@example.com",
      password: "Celebration-2026",
      confirmPassword: "Different-2026",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["confirmPassword"]);
  });

  it("rejects weak passwords and unknown request fields", () => {
    expect(passwordResetSchema.safeParse({ token: "a".repeat(32), password: "too-short", confirmPassword: "too-short" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "person@example.com", password: "secret", role: "ADMIN" }).success).toBe(false);
  });
});
