import { describe, expect, it } from "vitest";
import { createWeddingSchema } from "@/modules/weddings/schemas";
import { isValidTimeZone } from "@/modules/weddings/time-zones";

const validWedding = {
  brideName: "Priya",
  groomName: "Rahul",
  weddingDate: "2027-02-20",
  timeZone: "Asia/Kolkata",
  mainVenueName: "Celebration Hall",
  mainAddress: "Bengaluru, Karnataka",
  description: "A weekend with family and friends.",
};

describe("wedding setup schema", () => {
  it("accepts and trims a complete setup", () => {
    const result = createWeddingSchema.parse({ ...validWedding, brideName: "  Priya  " });
    expect(result.brideName).toBe("Priya");
  });

  it("rejects impossible dates, unknown fields, and invalid time zones", () => {
    expect(createWeddingSchema.safeParse({ ...validWedding, weddingDate: "2027-02-31" }).success).toBe(false);
    expect(createWeddingSchema.safeParse({ ...validWedding, timeZone: "India/Somewhere" }).success).toBe(false);
    expect(createWeddingSchema.safeParse({ ...validWedding, createdBy: "client-controlled" }).success).toBe(false);
  });

  it("recognizes IANA time zones", () => {
    expect(isValidTimeZone("Asia/Kolkata")).toBe(true);
    expect(isValidTimeZone("not-a-time-zone")).toBe(false);
  });
});
