import { describe, expect, it } from "vitest";
import { createVendorSchema, updateVendorSchema, vendorListQuerySchema } from "@/modules/finance/vendor-schemas";
import { deriveVendorPaymentStatus, summarizeVendors } from "@/modules/finance/vendor-service";

const eventId = "507f1f77bcf86cd799439011";

describe("vendor validation and derived finance state", () => {
  it("normalizes an optional vendor record", () => {
    expect(createVendorSchema.parse({ name: "  Lens & Light Studio  ", category: "PHOTOGRAPHY", email: "Studio@Example.com", eventIds: [eventId], quotedAmountMinor: "28000000", paidAmountMinor: "18000000" })).toMatchObject({
      name: "Lens & Light Studio",
      email: "Studio@Example.com",
      eventIds: [eventId],
      quotedAmountMinor: "28000000",
      paidAmountMinor: "18000000",
      contactName: "",
    });
  });

  it("rejects duplicate or invalid ceremony assignments", () => {
    expect(createVendorSchema.safeParse({ name: "Vendor", category: "DECOR", eventIds: [eventId, eventId] }).success).toBe(false);
    expect(createVendorSchema.safeParse({ name: "Vendor", category: "DECOR", eventIds: ["wrong"] }).success).toBe(false);
  });

  it("accepts focused partial updates and rejects empty updates", () => {
    expect(updateVendorSchema.parse({ paidAmountMinor: "500000" })).toEqual({ paidAmountMinor: "500000" });
    expect(updateVendorSchema.safeParse({}).success).toBe(false);
  });

  it("derives every supported payment state including overpayment", () => {
    expect(deriveVendorPaymentStatus(null, "0")).toBe("NO_QUOTE");
    expect(deriveVendorPaymentStatus("100", "0")).toBe("UNPAID");
    expect(deriveVendorPaymentStatus("100", "50")).toBe("PARTIAL");
    expect(deriveVendorPaymentStatus("100", "100")).toBe("PAID");
    expect(deriveVendorPaymentStatus("100", "120")).toBe("OVERPAID");
  });

  it("summarizes quotes, payments, pending balances, and overpayments", () => {
    expect(summarizeVendors([
      { quotedAmountMinor: "1000", paidAmountMinor: "400" },
      { quotedAmountMinor: "500", paidAmountMinor: "700" },
      { quotedAmountMinor: null, paidAmountMinor: "50" },
    ])).toMatchObject({ count: 3, quotedMinor: "1500", paidMinor: "1150", pendingMinor: "600", overpaidMinor: "200", statusCounts: { PARTIAL: 1, OVERPAID: 1, NO_QUOTE: 1 } });
  });

  it("parses directory filters and defaults", () => {
    expect(vendorListQuerySchema.parse({})).toEqual({ q: "", sort: "RECENT", page: 1 });
    expect(vendorListQuerySchema.parse({ paymentStatus: "OVERPAID", sort: "PENDING", page: "2" })).toMatchObject({ paymentStatus: "OVERPAID", sort: "PENDING", page: 2 });
  });
});
