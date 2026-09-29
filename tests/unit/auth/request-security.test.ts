import { describe, expect, it } from "vitest";
import { assertSameOrigin, AuthError, getClientKey } from "@/modules/auth/request-security";

describe("authentication request security", () => {
  it("accepts same-origin mutations", () => {
    const request = new Request("https://example.com/api/v1/auth/login", { headers: { origin: "https://example.com" } });
    expect(() => assertSameOrigin(request)).not.toThrow();
  });

  it("rejects missing and cross-origin mutation origins", () => {
    const missing = new Request("https://example.com/api/v1/auth/login");
    const crossOrigin = new Request("https://example.com/api/v1/auth/login", { headers: { origin: "https://attacker.example" } });

    expect(() => assertSameOrigin(missing)).toThrow(AuthError);
    expect(() => assertSameOrigin(crossOrigin)).toThrowError("This request could not be verified.");
  });

  it("derives stable, action-scoped client rate-limit keys without exposing the address", () => {
    const request = new Request("https://example.com", { headers: { "x-forwarded-for": "203.0.113.8, 10.0.0.1" } });
    const loginKey = getClientKey(request, "login");

    expect(loginKey).toHaveLength(64);
    expect(loginKey).toBe(getClientKey(request, "login"));
    expect(loginKey).not.toBe(getClientKey(request, "signup"));
    expect(loginKey).not.toContain("203.0.113.8");
  });
});
