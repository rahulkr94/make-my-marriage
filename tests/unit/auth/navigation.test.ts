import { describe, expect, it } from "vitest";
import { getSafeNextPath } from "@/modules/auth/navigation";

describe("safe authentication redirects", () => {
  it("keeps internal invitation paths", () => {
    expect(getSafeNextPath("/join/private-token")).toBe("/join/private-token");
  });

  it("rejects external and malformed destinations", () => {
    expect(getSafeNextPath("https://example.com")).toBe("/welcome");
    expect(getSafeNextPath("//example.com/path")).toBe("/welcome");
    expect(getSafeNextPath("/\\example.com")).toBe("/welcome");
  });
});
