import { describe, expect, it } from "vitest";
import { MemberInviteModel } from "@/modules/members/models";

describe("member invitation indexes", () => {
  it("allows only one pending invitation per wedding and email", () => {
    const index = MemberInviteModel.schema.indexes().find(([keys]) => keys.weddingId === 1 && keys.emailNormalized === 1);
    expect(index?.[1]).toMatchObject({ unique: true, partialFilterExpression: { status: "PENDING" } });
  });
});
