import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/storage/r2", () => ({
  createPrivateUploadUrl: vi.fn(async () => "https://storage.example.test/upload"),
  inspectPrivateObject: vi.fn(async () => ({ size: 1024, contentType: "application/pdf", checksum: "checksum", bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]) })),
  createPrivateDownloadUrl: vi.fn(async () => "https://storage.example.test/download"),
  deletePrivateObject: vi.fn(async () => undefined),
}));

import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/modules/auth/models";
import { DocumentModel, FileModel } from "@/modules/documents/models";
import { completeDocumentUpload, createDocumentDownload, createDocumentUploadIntent, listDocuments, removeDocument, updateDocument } from "@/modules/documents/service";
import { EventModel } from "@/modules/events/models";
import { createEvent } from "@/modules/events/service";
import { ExpenseModel, VendorModel } from "@/modules/finance/models";
import { createExpense } from "@/modules/finance/service";
import { createVendor } from "@/modules/finance/vendor-service";
import { WeddingMemberModel, WeddingModel } from "@/modules/weddings/models";
import { createWedding } from "@/modules/weddings/service";

describe.skipIf(process.env.MMM_RUN_DB_TESTS !== "1")("private finance documents with MongoDB", () => {
  const databaseName = `mmm_documents_test_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
  beforeAll(async () => {
    loadEnvConfig(process.cwd()); process.env.MONGODB_DB = databaseName; await connectToDatabase();
    await Promise.all([UserModel.syncIndexes(), WeddingModel.syncIndexes(), WeddingMemberModel.syncIndexes(), EventModel.syncIndexes(), ExpenseModel.syncIndexes(), VendorModel.syncIndexes(), FileModel.syncIndexes(), DocumentModel.syncIndexes()]);
  }, 60_000);
  afterAll(async () => { try { if (mongoose.connection.db?.databaseName === databaseName) await mongoose.connection.db.dropDatabase(); } finally { await mongoose.disconnect(); } }, 30_000);

  async function user(label: string) { const id = new Types.ObjectId(); const email = `${label}.${randomUUID().slice(0, 6)}@example.test`.toLowerCase(); await UserModel.create({ _id: id, name: label, emailNormalized: email, emailDisplay: email, passwordHash: "test", status: "ACTIVE" }); return String(id); }
  async function fixture() {
    const adminId = await user("Attachment Admin"); const managerId = await user("Attachment Manager"); const memberId = await user("Attachment Member");
    const wedding = await createWedding(adminId, { brideName: "Aanya", groomName: "Rohan", weddingDate: "2027-02-14", timeZone: "Asia/Kolkata", mainVenueName: "Rosewood Palace", mainAddress: "Jaipur", description: "Attachments" });
    await WeddingMemberModel.create({ weddingId: wedding.id, userId: managerId, role: "MANAGER", status: "ACTIVE", joinedAt: new Date(), grants: [] });
    await WeddingMemberModel.create({ weddingId: wedding.id, userId: memberId, role: "MEMBER", status: "ACTIVE", joinedAt: new Date(), grants: [] });
    const event = await createEvent(adminId, wedding.id, { name: "Wedding", type: "WEDDING", localDate: "2027-02-14", startLocalTime: "18:00", endLocalTime: "21:00", endsNextDay: false, venueName: "Lawn", address: "Jaipur", mapUrl: "", liveStreamUrl: "", description: "", status: "PUBLISHED" });
    const expense = (await createExpense(adminId, wedding.id, { title: "Photo advance", amountMinor: "7500000", category: "PHOTOGRAPHY", eventId: event.id, expenseDate: "2026-10-18", dueDate: null, paidBy: "Aanya", vendorId: null, vendorName: "", notes: "", initialPaidAmountMinor: "7500000", initialPaymentMethod: "BANK_TRANSFER", initialPaymentReference: "HDFC" })).expense;
    const vendor = (await createVendor(adminId, wedding.id, { name: "Lens Studio", category: "PHOTOGRAPHY", contactName: "Dev", email: "", phone: "", address: "", eventIds: [event.id], quotedAmountMinor: "28000000", paidAmountMinor: "7500000", notes: "" })).vendor;
    return { adminId, managerId, memberId, wedding, expense, vendor };
  }

  it("uploads, finalizes, lists, renames, downloads, and removes a private receipt", async () => {
    const data = await fixture();
    const intent = await createDocumentUploadIntent(data.managerId, data.wedding.id, { associationType: "EXPENSE", associationId: data.expense.id, category: "RECEIPT", fileName: "receipt.pdf", contentType: "application/pdf", sizeBytes: 1024, displayName: "Advance receipt", note: "Paid in full" });
    expect(intent.uploadUrl).toContain("storage.example.test");
    const completed = await completeDocumentUpload(data.managerId, data.wedding.id, intent.fileId);
    expect(completed.document).toMatchObject({ displayName: "Advance receipt", category: "RECEIPT", uploadedByName: "Attachment Manager" });
    expect((await completeDocumentUpload(data.managerId, data.wedding.id, intent.fileId)).document.id).toBe(completed.document.id);
    expect((await listDocuments(data.adminId, data.wedding.id, { associationType: "EXPENSE", associationId: data.expense.id, q: "" })).documents).toHaveLength(1);
    expect((await updateDocument(data.adminId, data.wedding.id, completed.document.id, { displayName: "GST receipt" })).document.displayName).toBe("GST receipt");
    expect(await createDocumentDownload(data.managerId, data.wedding.id, completed.document.id, true)).toMatchObject({ url: expect.stringContaining("download"), preview: true });
    await expect(listDocuments(data.memberId, data.wedding.id, { associationType: "EXPENSE", associationId: data.expense.id, q: "" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(removeDocument(data.adminId, data.wedding.id, completed.document.id)).resolves.toEqual({ id: completed.document.id, removed: true });
    expect(await DocumentModel.findById(completed.document.id).lean()).toMatchObject({ deletedAt: expect.any(Date) });
    expect(await FileModel.findById(intent.fileId).lean()).toMatchObject({ status: "DELETED" });
  });

  it("enforces association ownership and category purpose", async () => {
    const first = await fixture(); const second = await fixture();
    await expect(createDocumentUploadIntent(first.adminId, first.wedding.id, { associationType: "VENDOR", associationId: second.vendor.id, category: "CONTRACT", fileName: "contract.pdf", contentType: "application/pdf", sizeBytes: 1024, note: "" })).rejects.toMatchObject({ code: "INVALID_ASSOCIATION" });
    await expect(createDocumentUploadIntent(first.adminId, first.wedding.id, { associationType: "VENDOR", associationId: first.vendor.id, category: "RECEIPT", fileName: "receipt.pdf", contentType: "application/pdf", sizeBytes: 1024, note: "" })).rejects.toMatchObject({ code: "INVALID_DOCUMENT_CATEGORY" });
  });
});
