import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH, DELETE } from "@/app/api/v1/weddings/[weddingId]/members/[memberId]/route";
import { getCurrentUser } from "@/modules/auth/session";
import { removeWeddingMember, updateMemberRole } from "@/modules/members/access";
import { AuthError } from "@/modules/auth/request-security";

vi.mock("@/modules/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/modules/members/access", () => ({ removeWeddingMember: vi.fn(), updateMemberRole: vi.fn() }));
const context = { params: Promise.resolve({ weddingId: "wedding", memberId: "member" }) };
function request(method: string, body?: unknown, origin = "https://wedding.test") {
  return new Request("https://wedding.test/api/v1/weddings/wedding/members/member", {
    method, headers: { origin, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue({ id: "actor", name: "Test Admin", email: "admin@example.test", status: "ACTIVE" });
});

describe("member access endpoints", () => {
  it.each([PATCH, DELETE])("rejects a missing session", async (handler) => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    expect((await handler(request("PATCH", { role: "ADMIN" }), context)).status).toBe(401);
    expect(updateMemberRole).not.toHaveBeenCalled();
    expect(removeWeddingMember).not.toHaveBeenCalled();
  });

  it.each([PATCH, DELETE])("rejects foreign origins before accessing account data", async (handler) => {
    expect((await handler(request("PATCH", { role: "ADMIN" }, "https://foreign.test"), context)).status).toBe(403);
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  it("validates the role body before calling the service", async () => {
    expect((await PATCH(request("PATCH", { role: "OWNER" }), context)).status).toBe(400);
    expect(updateMemberRole).not.toHaveBeenCalled();
  });

  it("uses the signed-in actor and returns an uncached updated role", async () => {
    vi.mocked(updateMemberRole).mockResolvedValue({ id: "member", userId: "target", role: "ADMIN", status: "ACTIVE", grants: [] });
    const response = await PATCH(request("PATCH", { role: "ADMIN" }), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(updateMemberRole).toHaveBeenCalledWith("actor", "wedding", "member", { role: "ADMIN" });
    expect(await response.json()).toMatchObject({ data: { role: "ADMIN" } });
  });

  it("returns the last-admin conflict without hiding its actionable message", async () => {
    vi.mocked(removeWeddingMember).mockRejectedValue(new AuthError("LAST_ADMIN", "Keep at least one active Admin.", 409));
    const response = await DELETE(request("DELETE"), context);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: "LAST_ADMIN" } });
  });

  it("removes access through the scoped service", async () => {
    vi.mocked(removeWeddingMember).mockResolvedValue({ id: "member", userId: "target", role: "MEMBER", status: "REMOVED", grants: [] });
    expect((await DELETE(request("DELETE"), context)).status).toBe(200);
    expect(removeWeddingMember).toHaveBeenCalledWith("actor", "wedding", "member");
  });
});
