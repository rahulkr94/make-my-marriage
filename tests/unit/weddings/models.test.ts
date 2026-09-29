import { describe, expect, it } from "vitest";
import { WeddingMemberModel } from "@/modules/weddings/models";

describe("wedding membership indexes", () => {
  it("enforces one active wedding per user with the exact active-status filter", () => {
    const index = WeddingMemberModel.schema.indexes().find(([keys]) => keys.userId === 1 && Object.keys(keys).length === 1);

    expect(index).toBeDefined();
    expect(index?.[1]).toMatchObject({ unique: true, partialFilterExpression: { status: "ACTIVE" } });
  });

  it("keeps one historical membership row per wedding and user", () => {
    const index = WeddingMemberModel.schema.indexes().find(([keys]) => keys.weddingId === 1 && keys.userId === 1);
    expect(index?.[1]).toMatchObject({ unique: true });
  });
});
