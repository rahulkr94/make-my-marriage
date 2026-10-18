import { describe, expect, it } from "vitest";
import { createGuestSchema, guestListQuerySchema, updateGuestSchema } from "@/modules/guests/schemas";

const eventId = "507f1f77bcf86cd799439011";
const valid = { name: "Priya Sharma", email: "PRIYA@EXAMPLE.COM", phone: "+91 98765 43210", side: "BRIDE", relationship: "FRIEND", notes: "Vegetarian meal", eventIds: [eventId] };

describe("guest schemas", () => {
  it("normalizes a valid guest", () => { const result = createGuestSchema.parse({ ...valid, name: "  Priya Sharma  " }); expect(result.name).toBe("Priya Sharma"); expect(result.email).toBe("priya@example.com"); });
  it("accepts missing contact details and assignments", () => { expect(createGuestSchema.parse({ name: "Kavita Rao", side: "COMMON", relationship: "FAMILY" })).toMatchObject({ email: "", phone: "", notes: "", eventIds: [] }); });
  it("rejects unsafe fields, duplicate assignments, and invalid contact details", () => { expect(createGuestSchema.safeParse({ ...valid, weddingId: "client-controlled" }).success).toBe(false); expect(createGuestSchema.safeParse({ ...valid, eventIds: [eventId, eventId] }).success).toBe(false); expect(createGuestSchema.safeParse({ ...valid, phone: "call-me" }).success).toBe(false); expect(createGuestSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false); });
  it("accepts strict partial updates and parses list filters", () => { expect(updateGuestSchema.parse({ side: "GROOM", eventIds: [] })).toEqual({ side: "GROOM", eventIds: [] }); expect(updateGuestSchema.safeParse({}).success).toBe(false); expect(guestListQuerySchema.parse({ q: " Priya ", page: "2", side: "BRIDE" })).toMatchObject({ q: "Priya", page: 2, side: "BRIDE" }); });
});
