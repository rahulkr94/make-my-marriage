import { describe, expect, it } from "vitest";
import { acceptMemberInvitationSchema, createMemberInvitationSchema } from "@/modules/members/schemas";

describe("member invitation schemas", () => {
  it("normalizes a valid email and accepts supported roles", () => {
    expect(createMemberInvitationSchema.parse({ email: "  Family@Example.COM ", role: "MANAGER" })).toEqual({
      email: "Family@Example.COM",
      role: "MANAGER",
    });
    expect(createMemberInvitationSchema.safeParse({ email: "family@example.com", role: "ADMIN" }).success).toBe(false);
  });

  it("rejects unknown fields and short acceptance tokens", () => {
    expect(createMemberInvitationSchema.safeParse({ email: "family@example.com", role: "MEMBER", weddingId: "client-value" }).success).toBe(false);
    expect(acceptMemberInvitationSchema.safeParse({ token: "too-short" }).success).toBe(false);
    expect(acceptMemberInvitationSchema.safeParse({ token: "a".repeat(43) }).success).toBe(true);
  });
});
