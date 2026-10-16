import { describe, expect, it } from "vitest";
import { acceptMemberInvitationSchema, createMemberInvitationSchema, updateMemberRoleSchema } from "@/modules/members/schemas";

describe("member invitation schemas", () => {
  it("normalizes a valid email and accepts supported roles", () => {
    expect(createMemberInvitationSchema.parse({ email: "  Family@Example.COM ", role: "MANAGER" })).toEqual({
      email: "Family@Example.COM",
      role: "MANAGER",
    });
    expect(createMemberInvitationSchema.parse({ email: "partner@example.com", role: "ADMIN" })).toEqual({
      email: "partner@example.com",
      role: "ADMIN",
    });
  });

  it("rejects unknown fields and short acceptance tokens", () => {
    expect(createMemberInvitationSchema.safeParse({ email: "family@example.com", role: "MEMBER", weddingId: "client-value" }).success).toBe(false);
    expect(acceptMemberInvitationSchema.safeParse({ token: "too-short" }).success).toBe(false);
    expect(acceptMemberInvitationSchema.safeParse({ token: "a".repeat(43) }).success).toBe(true);
  });
});

describe("member role changes", () => {
  it("accepts each supported role", () => {
    for (const role of ["ADMIN", "MANAGER", "MEMBER"]) {
      expect(updateMemberRoleSchema.parse({ role })).toEqual({ role });
    }
  });

  it("rejects empty, unsupported, and client-controlled access fields", () => {
    for (const input of [{}, { role: "OWNER" }, { role: "MEMBER", status: "ACTIVE" }, { role: "ADMIN", weddingId: "other" }, { role: "MANAGER", grants: ["CAN_MODERATE_GALLERY"] }]) {
      expect(updateMemberRoleSchema.safeParse(input).success).toBe(false);
    }
  });
});
