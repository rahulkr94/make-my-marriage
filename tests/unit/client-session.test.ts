import { describe, expect, it } from "vitest";
import { isLogoutEvent } from "@/modules/auth/client-session";

describe("client session events", () => {
  it("recognizes valid logout events", () => {
    expect(isLogoutEvent(JSON.stringify({ type: "logout", occurredAt: 1 }))).toBe(true);
  });

  it("ignores missing, malformed, and unrelated events", () => {
    expect(isLogoutEvent(null)).toBe(false);
    expect(isLogoutEvent("not-json")).toBe(false);
    expect(isLogoutEvent(JSON.stringify({ type: "login", occurredAt: 1 }))).toBe(false);
    expect(isLogoutEvent(JSON.stringify({ type: "logout", occurredAt: "now" }))).toBe(false);
  });
});
