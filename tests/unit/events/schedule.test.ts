import { describe, expect, it } from "vitest";
import { getDirectionsUrl, resolveEventSchedule } from "@/modules/events/schedule";

describe("event schedule resolution", () => {
  it("stores an overnight event as ordered UTC instants", () => { const result = resolveEventSchedule({ localDate: "2027-02-19", startLocalTime: "22:00", endLocalTime: "01:00", endsNextDay: true }, "Asia/Kolkata"); expect(result.startsAtUtc.toISOString()).toBe("2027-02-19T16:30:00.000Z"); expect(result.endsAtUtc?.toISOString()).toBe("2027-02-19T19:30:00.000Z"); });
  it.each(["2026-03-08T02:30", "2026-11-01T01:30"])("rejects skipped or repeated local clock time %s", (value) => { const [localDate, startLocalTime] = value.split("T"); try { resolveEventSchedule({ localDate, startLocalTime }, "America/New_York"); throw new Error("Expected schedule resolution to fail"); } catch (error) { expect(error).toMatchObject({ code: "VALIDATION_ERROR", details: [{ path: "startLocalTime", message: expect.stringContaining("clock change") }] }); } });
  it("prefers a supplied map link and otherwise encodes an address search", () => { expect(getDirectionsUrl("Palace Road", "https://maps.example/pin")).toBe("https://maps.example/pin"); expect(getDirectionsUrl("12 Palace Road, Jaipur")).toBe("https://www.google.com/maps/search/?api=1&query=12%20Palace%20Road%2C%20Jaipur"); });
});
