import { describe, expect, it } from "vitest";
import { createExpenseSchema, expenseListQuerySchema, recordExpensePaymentSchema, updateExpenseSchema } from "@/modules/finance/schemas";

const eventId = "507f1f77bcf86cd799439012";

describe("expense schemas", () => {
  it("normalizes a paise-based expense and supplies safe defaults", () => {
    expect(createExpenseSchema.parse({
      title: "  Royal Orchid Palace  ", amountMinor: "60000000", category: "VENUE", eventId,
      expenseDate: "2027-01-10", paidBy: "Joint wedding fund",
    })).toEqual({
      title: "Royal Orchid Palace", amountMinor: "60000000", category: "VENUE", eventId,
      expenseDate: "2027-01-10", dueDate: null, paidBy: "Joint wedding fund", vendorId: null, vendorName: "", notes: "",
      initialPaidAmountMinor: "0", initialPaymentMethod: "BANK_TRANSFER", initialPaymentReference: "",
    });
  });

  it("rejects invalid money, overpayment, impossible dates, and unknown fields", () => {
    const base = { title: "Venue", amountMinor: "60000000", category: "VENUE", expenseDate: "2027-01-10", paidBy: "Joint fund" };
    expect(createExpenseSchema.safeParse({ ...base, amountMinor: "600000.25" }).success).toBe(false);
    expect(createExpenseSchema.safeParse({ ...base, initialPaidAmountMinor: "70000000" }).success).toBe(false);
    expect(createExpenseSchema.safeParse({ ...base, expenseDate: "2027-02-30" }).success).toBe(false);
    expect(createExpenseSchema.safeParse({ ...base, weddingId: eventId }).success).toBe(false);
  });

  it("accepts strict partial edits and validates a payment entry", () => {
    expect(updateExpenseSchema.parse({ notes: "Second tranche due after tasting." })).toEqual({ notes: "Second tranche due after tasting." });
    expect(updateExpenseSchema.safeParse({}).success).toBe(false);
    expect(recordExpensePaymentSchema.parse({ amountMinor: "10000000", paymentDate: "2027-01-12", paidBy: "Meera", method: "UPI" })).toEqual({
      amountMinor: "10000000", paymentDate: "2027-01-12", paidBy: "Meera", method: "UPI", reference: "", note: "",
    });
  });

  it("bounds and validates expense-list filters", () => {
    expect(expenseListQuerySchema.parse({ q: " venue ", page: "2", paymentStatus: "PARTIAL", category: "VENUE" })).toMatchObject({ q: "venue", page: 2, paymentStatus: "PARTIAL", category: "VENUE" });
    expect(expenseListQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    expect(expenseListQuerySchema.safeParse({ dateFrom: "2027-02-01", dateTo: "2027-01-01" }).success).toBe(false);
  });
});
