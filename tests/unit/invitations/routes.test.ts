import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as ISSUE, DELETE as REVOKE } from "@/app/api/v1/weddings/[weddingId]/guests/[guestId]/invitation/route";
import { POST as SEND } from "@/app/api/v1/weddings/[weddingId]/guests/[guestId]/invitation/send/route";
import { POST as QR } from "@/app/api/v1/weddings/[weddingId]/guests/[guestId]/invitation/rotate-and-qr/route";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { getCurrentUser } from "@/modules/auth/session";
import { issueGuestInvitation, issueGuestInvitationQr, revokeGuestInvitation, sendGuestInvitation } from "@/modules/invitations/service";

vi.mock("@/modules/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/modules/auth/rate-limit", () => ({ enforceRateLimit: vi.fn() }));
vi.mock("@/modules/invitations/service", () => ({ issueGuestInvitation: vi.fn(), issueGuestInvitationQr: vi.fn(), revokeGuestInvitation: vi.fn(), sendGuestInvitation: vi.fn() }));

const context = { params: Promise.resolve({ weddingId: "wedding", guestId: "guest" }) };
const request = (method: string, origin = "https://wedding.test") => new Request("https://wedding.test/api/v1/weddings/wedding/guests/guest/invitation", { method, headers: { origin } });

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue({ id: "actor", name: "Admin", email: "admin@example.test", status: "ACTIVE" });
  vi.mocked(enforceRateLimit).mockResolvedValue();
});
describe("guest invitation mutation routes", () => {
  it("rejects foreign-origin issuance before account lookup", async () => {
    expect((await ISSUE(request("POST", "https://foreign.test"), context)).status).toBe(403);
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  it("passes the signed-in actor and request origin to issue, send, and QR services", async () => {
    vi.mocked(issueGuestInvitation).mockResolvedValue({ invitationUrl: "url" } as never);
    vi.mocked(sendGuestInvitation).mockResolvedValue({ invitationUrl: "url", delivered: true } as never);
    vi.mocked(issueGuestInvitationQr).mockResolvedValue({ invitationUrl: "url", qrDataUrl: "data" } as never);
    expect((await ISSUE(request("POST"), context)).status).toBe(201);
    expect(issueGuestInvitation).toHaveBeenCalledWith(expect.objectContaining({ id: "actor" }), "wedding", "guest", "https://wedding.test");
    expect((await SEND(request("POST"), context)).status).toBe(200);
    expect(sendGuestInvitation).toHaveBeenCalledWith(expect.objectContaining({ id: "actor" }), "wedding", "guest", "https://wedding.test");
    expect((await QR(request("POST"), context)).status).toBe(201);
    expect(issueGuestInvitationQr).toHaveBeenCalledWith(expect.objectContaining({ id: "actor" }), "wedding", "guest", "https://wedding.test");
  });

  it("revokes only through a verified mutation", async () => {
    vi.mocked(revokeGuestInvitation).mockResolvedValue({ invitation: { status: "REVOKED" } } as never);
    expect((await REVOKE(request("DELETE"), context)).status).toBe(200);
    expect(revokeGuestInvitation).toHaveBeenCalledWith("actor", "wedding", "guest");
  });
});
