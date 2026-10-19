import { describe, expect, it } from "vitest";
import { publicRsvpSchema, rsvpListQuerySchema } from "@/modules/rsvp/schemas";

describe("RSVP schemas", () => {
  it("accepts valid attendance and decline responses", () => {
    expect(publicRsvpSchema.parse({ response: "YES", attendeeCount: 2 })).toEqual({ response: "YES", attendeeCount: 2 });
    expect(publicRsvpSchema.parse({ response: "NO", attendeeCount: 0 })).toEqual({ response: "NO", attendeeCount: 0 });
  });

  it("rejects invalid attendee counts", () => {
    expect(publicRsvpSchema.safeParse({ response: "YES", attendeeCount: 0 }).success).toBe(false);
    expect(publicRsvpSchema.safeParse({ response: "NO", attendeeCount: 1 }).success).toBe(false);
    expect(publicRsvpSchema.safeParse({ response: "YES", attendeeCount: 101 }).success).toBe(false);
  });

  it("parses planner filters strictly", () => {
    expect(rsvpListQuerySchema.parse({ response: "PENDING", side: "BRIDE", page: "2" })).toMatchObject({ response: "PENDING", side: "BRIDE", page: 2 });
    expect(rsvpListQuerySchema.safeParse({ response: "MAYBE" }).success).toBe(false);
    expect(rsvpListQuerySchema.safeParse({ unexpected: "value" }).success).toBe(false);
  });
});
