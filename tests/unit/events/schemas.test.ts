import { describe, expect, it } from "vitest";
import { createEventSchema, updateEventSchema } from "@/modules/events/schemas";

const validEvent = { name: "Sangeet under the stars", type: "SANGEET", localDate: "2027-02-19", startLocalTime: "19:00", endLocalTime: "23:30", endsNextDay: false, venueName: "Royal Garden", address: "12 Palace Road, Jaipur", mapUrl: "https://maps.google.com/example", description: "Music with both families.", status: "PUBLISHED" };

describe("event creation schema", () => {
  it("accepts and trims a complete event", () => { expect(createEventSchema.parse({ ...validEvent, name: "  Sangeet under the stars  " }).name).toBe("Sangeet under the stars"); });
  it("requires an explicit overnight choice", () => { expect(createEventSchema.safeParse({ ...validEvent, startLocalTime: "22:00", endLocalTime: "01:00" }).success).toBe(false); expect(createEventSchema.safeParse({ ...validEvent, startLocalTime: "22:00", endLocalTime: "01:00", endsNextDay: true }).success).toBe(true); });
  it("rejects invalid dates, unsafe map links, and unknown fields", () => { expect(createEventSchema.safeParse({ ...validEvent, localDate: "2027-02-30" }).success).toBe(false); expect(createEventSchema.safeParse({ ...validEvent, mapUrl: "javascript:alert(1)" }).success).toBe(false); expect(createEventSchema.safeParse({ ...validEvent, weddingId: "client-controlled" }).success).toBe(false); });
  it("accepts strict partial updates while rejecting empty or lifecycle-only values", () => { expect(updateEventSchema.parse({ name: "  New title  " })).toEqual({ name: "New title" }); expect(updateEventSchema.parse({ status: "PUBLISHED" })).toEqual({ status: "PUBLISHED" }); expect(updateEventSchema.safeParse({}).success).toBe(false); expect(updateEventSchema.safeParse({ status: "CANCELLED" }).success).toBe(false); expect(updateEventSchema.safeParse({ weddingId: "other" }).success).toBe(false); });
});
