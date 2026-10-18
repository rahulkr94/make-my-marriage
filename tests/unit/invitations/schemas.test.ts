import { describe, expect, it } from "vitest";
import { guestInvitationListQuerySchema } from "@/modules/invitations/schemas";

describe("guest invitation schemas", () => {
  it("applies bounded listing defaults", () => {
    expect(guestInvitationListQuerySchema.parse({})).toEqual({ q: "", page: 1 });
    expect(guestInvitationListQuerySchema.parse({ q: " Meera ", page: "2", status: "SENT", side: "BRIDE" })).toEqual({ q: "Meera", page: 2, status: "SENT", side: "BRIDE" });
  });

  it("rejects unknown filters and statuses", () => {
    expect(guestInvitationListQuerySchema.safeParse({ status: "OPENED" }).success).toBe(false);
    expect(guestInvitationListQuerySchema.safeParse({ extra: "value" }).success).toBe(false);
  });
});
