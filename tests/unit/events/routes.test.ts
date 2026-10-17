import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/v1/weddings/[weddingId]/events/route";
import { GET as GET_DETAIL, PATCH } from "@/app/api/v1/weddings/[weddingId]/events/[eventId]/route";
import { getCurrentUser } from "@/modules/auth/session";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { createEvent, getEvent, listEvents, updateEvent } from "@/modules/events/service";

vi.mock("@/modules/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/modules/auth/rate-limit", () => ({ enforceRateLimit: vi.fn() }));
vi.mock("@/modules/events/service", () => ({ createEvent: vi.fn(), getEvent: vi.fn(), listEvents: vi.fn(), updateEvent: vi.fn() }));
const listContext = { params: Promise.resolve({ weddingId: "wedding" }) };
const detailContext = { params: Promise.resolve({ weddingId: "wedding", eventId: "event" }) };
const valid = { name: "Sangeet", type: "SANGEET", localDate: "2027-02-19", startLocalTime: "19:00", endLocalTime: "", endsNextDay: false, venueName: "Royal Garden", address: "12 Palace Road, Jaipur", mapUrl: "", description: "", status: "DRAFT" };

beforeEach(() => { vi.resetAllMocks(); vi.mocked(getCurrentUser).mockResolvedValue({ id: "actor", name: "Admin", email: "admin@example.test", status: "ACTIVE" }); vi.mocked(enforceRateLimit).mockResolvedValue(); });

describe("event routes", () => {
  it("rejects a foreign-origin creation before account lookup", async () => { const response = await POST(new Request("https://wedding.test/api/v1/weddings/wedding/events", { method: "POST", headers: { origin: "https://foreign.test", "Content-Type": "application/json" }, body: JSON.stringify(valid) }), listContext); expect(response.status).toBe(403); expect(getCurrentUser).not.toHaveBeenCalled(); });
  it("validates event input before service creation", async () => { const response = await POST(new Request("https://wedding.test/api/v1/weddings/wedding/events", { method: "POST", headers: { origin: "https://wedding.test", "Content-Type": "application/json" }, body: JSON.stringify({ ...valid, mapUrl: "http://unsafe.test" }) }), listContext); expect(response.status).toBe(400); expect(createEvent).not.toHaveBeenCalled(); });
  it("creates through the signed-in actor and returns an uncached response", async () => { vi.mocked(createEvent).mockResolvedValue({ id: "event" } as never); const response = await POST(new Request("https://wedding.test/api/v1/weddings/wedding/events", { method: "POST", headers: { origin: "https://wedding.test", "Content-Type": "application/json" }, body: JSON.stringify(valid) }), listContext); expect(response.status).toBe(201); expect(response.headers.get("Cache-Control")).toContain("no-store"); expect(createEvent).toHaveBeenCalledWith("actor", "wedding", valid); });
  it("parses list pagination and scopes the service by actor", async () => { vi.mocked(listEvents).mockResolvedValue({ events: [], total: 0, published: 0, drafts: 0, page: 2, pageSize: 30 }); const response = await GET(new Request("https://wedding.test/api/v1/weddings/wedding/events?page=2"), listContext); expect(response.status).toBe(200); expect(listEvents).toHaveBeenCalledWith("actor", "wedding", 2); });
  it("returns a private 404 when the scoped event is unavailable", async () => { vi.mocked(getEvent).mockResolvedValue(null); const response = await GET_DETAIL(new Request("https://wedding.test/api/v1/weddings/wedding/events/event"), detailContext); expect(response.status).toBe(404); expect(getEvent).toHaveBeenCalledWith("actor", "wedding", "event"); });
  it("rejects cross-origin and invalid event updates", async () => { const foreign = await PATCH(new Request("https://wedding.test/api/v1/weddings/wedding/events/event", { method: "PATCH", headers: { origin: "https://foreign.test", "Content-Type": "application/json" }, body: JSON.stringify({ status: "PUBLISHED" }) }), detailContext); expect(foreign.status).toBe(403); const invalid = await PATCH(new Request("https://wedding.test/api/v1/weddings/wedding/events/event", { method: "PATCH", headers: { origin: "https://wedding.test", "Content-Type": "application/json" }, body: JSON.stringify({ status: "CANCELLED" }) }), detailContext); expect(invalid.status).toBe(400); expect(updateEvent).not.toHaveBeenCalled(); });
  it("updates through the signed-in actor and returns an uncached response", async () => { vi.mocked(updateEvent).mockResolvedValue({ id: "event", status: "PUBLISHED" } as never); const response = await PATCH(new Request("https://wedding.test/api/v1/weddings/wedding/events/event", { method: "PATCH", headers: { origin: "https://wedding.test", "Content-Type": "application/json" }, body: JSON.stringify({ status: "PUBLISHED" }) }), detailContext); expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toContain("no-store"); expect(updateEvent).toHaveBeenCalledWith("actor", "wedding", "event", { status: "PUBLISHED" }); });
});
