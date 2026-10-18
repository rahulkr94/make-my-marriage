import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/v1/weddings/[weddingId]/guests/route";
import { DELETE, GET as GET_DETAIL, PATCH } from "@/app/api/v1/weddings/[weddingId]/guests/[guestId]/route";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { getCurrentUser } from "@/modules/auth/session";
import { createGuest, getGuest, listGuests, removeGuest, updateGuest } from "@/modules/guests/service";

vi.mock("@/modules/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/modules/auth/rate-limit", () => ({ enforceRateLimit: vi.fn() }));
vi.mock("@/modules/guests/service", () => ({ createGuest: vi.fn(), getGuest: vi.fn(), listGuests: vi.fn(), removeGuest: vi.fn(), updateGuest: vi.fn() }));
const listContext = { params: Promise.resolve({ weddingId: "wedding" }) };
const detailContext = { params: Promise.resolve({ weddingId: "wedding", guestId: "guest" }) };
const valid = { name: "Priya Sharma", email: "", phone: "", side: "BRIDE", relationship: "FRIEND", notes: "", eventIds: [] };
const request = (method: string, body?: unknown, origin = "https://wedding.test") => new Request("https://wedding.test/api/v1/weddings/wedding/guests", { method, headers: { origin, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });

beforeEach(() => { vi.resetAllMocks(); vi.mocked(getCurrentUser).mockResolvedValue({ id: "actor", name: "Admin", email: "admin@example.test", status: "ACTIVE" }); vi.mocked(enforceRateLimit).mockResolvedValue(); });

describe("guest routes", () => {
  it("rejects a foreign-origin create before account lookup", async () => { const response = await POST(request("POST", valid, "https://foreign.test"), listContext); expect(response.status).toBe(403); expect(getCurrentUser).not.toHaveBeenCalled(); });
  it("validates guest input before service creation", async () => { const response = await POST(request("POST", { ...valid, email: "invalid" }), listContext); expect(response.status).toBe(400); expect(createGuest).not.toHaveBeenCalled(); });
  it("creates and lists through the signed-in actor", async () => { vi.mocked(createGuest).mockResolvedValue({ id: "guest" } as never); expect((await POST(request("POST", valid), listContext)).status).toBe(201); expect(createGuest).toHaveBeenCalledWith("actor", "wedding", valid); vi.mocked(listGuests).mockResolvedValue({ guests: [], total: 0 } as never); const response = await GET(new Request("https://wedding.test/api/v1/weddings/wedding/guests?q=Priya&page=2"), listContext); expect(response.status).toBe(200); expect(listGuests).toHaveBeenCalledWith("actor", "wedding", expect.objectContaining({ q: "Priya", page: 2 })); });
  it("returns a private 404 for an unavailable guest", async () => { vi.mocked(getGuest).mockResolvedValue(null); expect((await GET_DETAIL(request("GET"), detailContext)).status).toBe(404); });
  it("updates and removes through same-origin requests", async () => { vi.mocked(updateGuest).mockResolvedValue({ id: "guest" } as never); const patch = await PATCH(request("PATCH", { side: "COMMON" }), detailContext); expect(patch.status).toBe(200); expect(updateGuest).toHaveBeenCalledWith("actor", "wedding", "guest", { side: "COMMON" }); vi.mocked(removeGuest).mockResolvedValue({ id: "guest", removed: true }); const removal = await DELETE(request("DELETE"), detailContext); expect(removal.status).toBe(200); expect(removeGuest).toHaveBeenCalledWith("actor", "wedding", "guest"); });
});
