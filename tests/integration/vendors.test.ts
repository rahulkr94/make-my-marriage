import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/modules/auth/models";
import { EventModel } from "@/modules/events/models";
import { createEvent } from "@/modules/events/service";
import { ExpenseModel, VendorModel } from "@/modules/finance/models";
import { createExpense, getExpense } from "@/modules/finance/service";
import { archiveVendor, createVendor, getVendor, listVendors, updateVendor } from "@/modules/finance/vendor-service";
import { WeddingMemberModel, WeddingModel } from "@/modules/weddings/models";
import { createWedding } from "@/modules/weddings/service";

describe.skipIf(process.env.MMM_RUN_DB_TESTS !== "1")("wedding vendors with MongoDB", () => {
  const databaseName = `mmm_vendors_test_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
  beforeAll(async () => {
    loadEnvConfig(process.cwd());
    process.env.MONGODB_DB = databaseName;
    await connectToDatabase();
    await Promise.all([UserModel.syncIndexes(), WeddingModel.syncIndexes(), WeddingMemberModel.syncIndexes(), EventModel.syncIndexes(), ExpenseModel.syncIndexes(), VendorModel.syncIndexes()]);
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
    const wedding = await createWedding(adminId, { brideName: "Aanya", groomName: "Rohan", weddingDate: "2027-02-14", timeZone: "Asia/Kolkata", mainVenueName: "Rosewood Palace", mainAddress: "Jaipur, Rajasthan", description: "Vendor test" });
    await WeddingMemberModel.create({ weddingId: wedding.id, userId: managerId, role: "MANAGER", status: "ACTIVE", joinedAt: new Date(), grants: [] });
    await WeddingMemberModel.create({ weddingId: wedding.id, userId: memberId, role: "MEMBER", status: "ACTIVE", joinedAt: new Date(), grants: [] });
    const event = await createEvent(adminId, wedding.id, { name: "Wedding Ceremony", type: "WEDDING", localDate: "2027-02-14", startLocalTime: "18:00", endLocalTime: "21:00", endsNextDay: false, venueName: "Royal Lawn", address: "Rosewood Palace, Jaipur", mapUrl: "", liveStreamUrl: "", description: "The ceremony", status: "PUBLISHED" });
    return { adminId, managerId, memberId, wedding, event };
  }

  function input(eventId: string) {
    return { name: "Lens & Light Studio", category: "PHOTOGRAPHY" as const, contactName: "Devansh Kapoor", email: "contact@lens.test", phone: "+91 98112 40980", address: "Shahpur Jat, New Delhi", eventIds: [eventId], quotedAmountMinor: "28000000", paidAmountMinor: "18000000", notes: "Candid and traditional coverage" };
  }

  it("lets planners manage vendors while hiding finance records from Members", async () => {
    const data = await fixture();
    const created = await createVendor(data.adminId, data.wedding.id, input(data.event.id));
    expect(created.vendor).toMatchObject({ name: "Lens & Light Studio", pendingAmountMinor: "10000000", paymentStatus: "PARTIAL", eventIds: [data.event.id] });
    const listing = await listVendors(data.managerId, data.wedding.id, { q: "", sort: "RECENT", page: 1 });
    expect(listing.summary).toMatchObject({ count: 1, quotedMinor: "28000000", paidMinor: "18000000", pendingMinor: "10000000" });
    await expect(listVendors(data.memberId, data.wedding.id, { q: "", sort: "RECENT", page: 1 })).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });

  it("derives overpayment and rejects cross-wedding ceremony assignments", async () => {
    const first = await fixture();
    const second = await fixture();
    await expect(createVendor(first.adminId, first.wedding.id, input(second.event.id))).rejects.toMatchObject({ code: "INVALID_EVENTS" });
    const created = await createVendor(first.adminId, first.wedding.id, input(first.event.id));
    const updated = await updateVendor(first.managerId, first.wedding.id, created.vendor.id, { paidAmountMinor: "30000000" });
    expect(updated.vendor).toMatchObject({ paymentStatus: "OVERPAID", overpaidAmountMinor: "2000000", pendingAmountMinor: "0" });
  });

  it("links expenses, keeps vendor payments independent, and preserves history after archive", async () => {
    const data = await fixture();
    const created = await createVendor(data.adminId, data.wedding.id, input(data.event.id));
    const expense = await createExpense(data.adminId, data.wedding.id, { title: "Photography advance", amountMinor: "10000000", category: "PHOTOGRAPHY", eventId: data.event.id, expenseDate: "2027-01-10", dueDate: null, paidBy: "Joint wedding fund", vendorId: created.vendor.id, vendorName: "", notes: "Advance token", initialPaidAmountMinor: "10000000", initialPaymentMethod: "BANK_TRANSFER", initialPaymentReference: "UTR-100" });
    const detail = await getVendor(data.managerId, data.wedding.id, created.vendor.id);
    expect(detail).toMatchObject({ paidAmountMinor: "18000000", linkedExpenseTotalMinor: "10000000" });
    expect(detail?.expenses).toHaveLength(1);
    await updateVendor(data.adminId, data.wedding.id, created.vendor.id, { name: "Lens & Light Collective" });
    expect(await getExpense(data.adminId, data.wedding.id, expense.expense.id)).toMatchObject({ vendorId: created.vendor.id, vendorName: "Lens & Light Collective" });
    await expect(archiveVendor(data.adminId, data.wedding.id, created.vendor.id)).resolves.toEqual({ id: created.vendor.id, archived: true });
    expect(await getVendor(data.adminId, data.wedding.id, created.vendor.id)).toBeNull();
    expect(await getExpense(data.adminId, data.wedding.id, expense.expense.id)).toMatchObject({ vendorId: created.vendor.id, vendorName: "Lens & Light Collective" });
  });
});
