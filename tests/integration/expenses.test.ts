import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/modules/auth/models";
import { EventModel } from "@/modules/events/models";
import { createEvent } from "@/modules/events/service";
import { ExpenseModel } from "@/modules/finance/models";
import { createExpense, listExpenses, recordExpensePayment, removeExpense, updateExpense } from "@/modules/finance/service";
import { WeddingMemberModel, WeddingModel } from "@/modules/weddings/models";
import { createWedding } from "@/modules/weddings/service";

describe.skipIf(process.env.MMM_RUN_DB_TESTS !== "1")("wedding expenses with MongoDB", () => {
  const databaseName = `mmm_expenses_test_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
  beforeAll(async () => {
    loadEnvConfig(process.cwd());
    process.env.MONGODB_DB = databaseName;
    await connectToDatabase();
    await Promise.all([UserModel.syncIndexes(), WeddingModel.syncIndexes(), WeddingMemberModel.syncIndexes(), EventModel.syncIndexes(), ExpenseModel.syncIndexes()]);
  }, 60_000);
  afterAll(async () => { try { if (mongoose.connection.db?.databaseName === databaseName) await mongoose.connection.db.dropDatabase(); } finally { await mongoose.disconnect(); } }, 30_000);

  async function user(name: string) {
    const id = new Types.ObjectId();
    const email = `${name.toLowerCase().replaceAll(" ", ".")}@example.test`;
    await UserModel.create({ _id: id, name, emailNormalized: email, emailDisplay: email, passwordHash: "test", status: "ACTIVE" });
    return String(id);
  }

  async function fixture() {
    const adminId = await user(`Admin ${randomUUID().slice(0, 6)}`);
    const managerId = await user(`Manager ${randomUUID().slice(0, 6)}`);
    const memberId = await user(`Member ${randomUUID().slice(0, 6)}`);
    const wedding = await createWedding(adminId, { brideName: "Aanya", groomName: "Rohan", weddingDate: "2027-02-14", timeZone: "Asia/Kolkata", mainVenueName: "Rosewood Palace", mainAddress: "Jaipur, Rajasthan", description: "Expense test" });
    await WeddingMemberModel.create({ weddingId: wedding.id, userId: managerId, role: "MANAGER", status: "ACTIVE", joinedAt: new Date(), grants: [] });
    await WeddingMemberModel.create({ weddingId: wedding.id, userId: memberId, role: "MEMBER", status: "ACTIVE", joinedAt: new Date(), grants: [] });
    const event = await createEvent(adminId, wedding.id, { name: "Wedding Ceremony", type: "WEDDING", localDate: "2027-02-14", startLocalTime: "18:00", endLocalTime: "21:00", endsNextDay: false, venueName: "Royal Lawn", address: "Rosewood Palace, Jaipur", mapUrl: "", liveStreamUrl: "", description: "The ceremony", status: "PUBLISHED" });
    return { adminId, managerId, memberId, wedding, event };
  }

  function input(eventId: string) {
    return { title: "Royal Orchid Palace", amountMinor: "60000000", category: "VENUE" as const, eventId, expenseDate: "2027-01-10", dueDate: "2027-01-15", paidBy: "Joint wedding fund", vendorId: null, vendorName: "Royal Orchid Heritage Ltd.", notes: "Mandap and courtyard", initialPaidAmountMinor: "30000000", initialPaymentMethod: "BANK_TRANSFER" as const, initialPaymentReference: "HDFC990142" };
  }

  it("lets planners record actual expenses while hiding finances from Members", async () => {
    const data = await fixture();
    const created = await createExpense(data.adminId, data.wedding.id, input(data.event.id));
    expect(created.expense).toMatchObject({ amountMinor: "60000000", paidAmountMinor: "30000000", balanceMinor: "30000000", paymentStatus: "PARTIAL", eventId: data.event.id });
    const listing = await listExpenses(data.managerId, data.wedding.id, { q: "", page: 1 });
    expect(listing.summary).toMatchObject({ count: 1, totalMinor: "60000000", paidMinor: "30000000", outstandingMinor: "30000000" });
    await expect(listExpenses(data.memberId, data.wedding.id, { q: "", page: 1 })).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });

  it("records payments, derives status, and rejects overpayment", async () => {
    const data = await fixture();
    const created = await createExpense(data.adminId, data.wedding.id, input(data.event.id));
    const updated = await recordExpensePayment(data.managerId, data.wedding.id, created.expense.id, { amountMinor: "30000000", paymentDate: "2027-01-12", paidBy: "Aarav", method: "UPI", reference: "UPI-882190", note: "Final venue payment" });
    expect(updated.expense).toMatchObject({ paidAmountMinor: "60000000", balanceMinor: "0", paymentStatus: "PAID" });
    expect(updated.expense.payments).toHaveLength(2);
    await expect(recordExpensePayment(data.adminId, data.wedding.id, created.expense.id, { amountMinor: "1", paymentDate: "2027-01-13", paidBy: "Aarav", method: "CASH", reference: "", note: "" })).rejects.toMatchObject({ code: "PAYMENT_EXCEEDS_BALANCE" });
  });

  it("rejects cross-wedding references and totals below recorded payments", async () => {
    const first = await fixture();
    const second = await fixture();
    await expect(createExpense(first.adminId, first.wedding.id, input(second.event.id))).rejects.toMatchObject({ code: "INVALID_EVENT" });
    const created = await createExpense(first.adminId, first.wedding.id, input(first.event.id));
    await expect(updateExpense(first.managerId, first.wedding.id, created.expense.id, { amountMinor: "20000000" })).rejects.toMatchObject({ code: "AMOUNT_BELOW_PAID" });
    await expect(removeExpense(first.adminId, first.wedding.id, created.expense.id)).resolves.toEqual({ id: created.expense.id, removed: true });
    expect(await ExpenseModel.findById(created.expense.id).lean()).toMatchObject({ deletedAt: expect.any(Date) });
  });
});
