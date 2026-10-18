import { describe, expect, it } from "vitest";
import { createGuestInvitationUrl } from "@/modules/invitations/email";

describe("guest invitation URLs", () => {
  it("builds a token-scoped public URL from the request origin", () => {
    const previous = process.env.APP_URL;
    delete process.env.APP_URL;
    expect(createGuestInvitationUrl("private_token", "https://wedding.example")).toBe("https://wedding.example/i/private_token");
    if (previous) process.env.APP_URL = previous;
  });
});
