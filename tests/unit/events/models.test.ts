import { describe, expect, it } from "vitest";
import { EventModel } from "@/modules/events/models";

describe("event indexes", () => {
  it("supports published chronological wedding queries", () => { const index = EventModel.schema.indexes().find(([keys]) => keys.weddingId === 1 && keys.status === 1 && keys.startsAtUtc === 1); expect(index).toBeDefined(); });
});
