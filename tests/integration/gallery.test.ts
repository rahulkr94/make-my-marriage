import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/storage/r2", () => ({
  createPrivateUploadUrl: vi.fn(async () => "https://storage.example.test/upload"),
  inspectPrivateObject: vi.fn(async () => ({ size: 1024, contentType: "image/jpeg", checksum: "photo-checksum", bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]) })),
  createPrivateDownloadUrl: vi.fn(async () => "https://storage.example.test/private-photo"),
  deletePrivateObject: vi.fn(async () => undefined),
}));

import { connectToDatabase } from "@/lib/mongodb";
import { hashToken } from "@/modules/auth/crypto";
import { UserModel } from "@/modules/auth/models";
import { FileModel } from "@/modules/documents/models";
import { EventModel } from "@/modules/events/models";
import { createEvent } from "@/modules/events/service";
import { PhotoModel } from "@/modules/gallery/models";
import { completeGuestPhotoUpload, completeMemberPhotoUpload, createGuestPhotoUploadIntent, createMemberPhotoUploadIntent, getPublicGallery, removePhoto, reviewPhoto, rotateGalleryLink } from "@/modules/gallery/service";
import { EventGuestModel, GuestModel } from "@/modules/guests/models";
import { GuestInvitationModel } from "@/modules/invitations/models";
import { WeddingMemberModel, WeddingModel } from "@/modules/weddings/models";
import { createWedding } from "@/modules/weddings/service";

describe.skipIf(process.env.MMM_RUN_DB_TESTS !== "1")("gallery with MongoDB", () => {
  const databaseName = `mmm_gallery_test_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
  beforeAll(async () => { loadEnvConfig(process.cwd()); process.env.MONGODB_DB = databaseName; await connectToDatabase(); await Promise.all([UserModel.syncIndexes(), WeddingModel.syncIndexes(), WeddingMemberModel.syncIndexes(), EventModel.syncIndexes(), GuestModel.syncIndexes(), EventGuestModel.syncIndexes(), GuestInvitationModel.syncIndexes(), FileModel.syncIndexes(), PhotoModel.syncIndexes()]); }, 60_000);
  afterAll(async () => { try { if (mongoose.connection.db?.databaseName === databaseName) await mongoose.connection.db.dropDatabase(); } finally { await mongoose.disconnect(); } }, 30_000);
  async function user(name: string) { const id = new Types.ObjectId(); const email = `${name}.${randomUUID().slice(0, 6)}@example.test`.toLowerCase(); await UserModel.create({ _id: id, name, emailNormalized: email, emailDisplay: email, passwordHash: "test", status: "ACTIVE" }); return String(id); }
  async function fixture() { const adminId = await user("GalleryAdmin"); const managerId = await user("GalleryManager"); const memberId = await user("GalleryMember"); const wedding = await createWedding(adminId, { brideName: "Aanya", groomName: "Rohan", weddingDate: "2027-02-14", timeZone: "Asia/Kolkata", mainVenueName: "Rosewood Palace", mainAddress: "Jaipur", description: "Gallery" }); await WeddingMemberModel.create({ weddingId: wedding.id, userId: managerId, role: "MANAGER", status: "ACTIVE", joinedAt: new Date(), grants: [] }); await WeddingMemberModel.create({ weddingId: wedding.id, userId: memberId, role: "MEMBER", status: "ACTIVE", joinedAt: new Date(), grants: [] }); const event = await createEvent(adminId, wedding.id, { name: "Wedding", type: "WEDDING", localDate: "2027-02-14", startLocalTime: "18:00", endLocalTime: "21:00", endsNextDay: false, venueName: "Lawn", address: "Jaipur", mapUrl: "", liveStreamUrl: "", description: "", status: "PUBLISHED" }); return { adminId, managerId, memberId, wedding, event }; }

  it("keeps member uploads pending until an authorized moderator approves them for a rotated public link", async () => { const data = await fixture(); const intent = await createMemberPhotoUploadIntent(data.memberId, data.wedding.id, { fileName: "portrait.jpg", contentType: "image/jpeg", sizeBytes: 1024, eventId: data.event.id, caption: "Wedding portrait" }); const completed = await completeMemberPhotoUpload(data.memberId, data.wedding.id, intent.fileId); expect(completed.photo.status).toBe("PENDING"); await expect(reviewPhoto(data.memberId, data.wedding.id, completed.photo.id, { status: "APPROVED" })).rejects.toMatchObject({ code: "FORBIDDEN" }); await expect(reviewPhoto(data.managerId, data.wedding.id, completed.photo.id, { status: "APPROVED" })).rejects.toMatchObject({ code: "FORBIDDEN" }); await WeddingMemberModel.updateOne({ weddingId: data.wedding.id, userId: data.managerId }, { $set: { grants: ["CAN_MODERATE_GALLERY"] } }); await reviewPhoto(data.managerId, data.wedding.id, completed.photo.id, { status: "APPROVED" }); const issued = await rotateGalleryLink(data.adminId, data.wedding.id, "https://wedding.example.test"); expect(issued.galleryUrl).toContain("/g/"); const token = new URL(issued.galleryUrl).pathname.split("/").pop()!; expect((await getPublicGallery(token))?.photos).toHaveLength(1); await expect(removePhoto(data.managerId, data.wedding.id, completed.photo.id)).rejects.toMatchObject({ code: "FORBIDDEN" }); expect(await removePhoto(data.adminId, data.wedding.id, completed.photo.id)).toEqual({ id: completed.photo.id, removed: true }); expect((await getPublicGallery(token))?.photos).toHaveLength(0); expect(await PhotoModel.exists({ _id: completed.photo.id })).toBeNull(); expect(await FileModel.findById(intent.fileId).select("status").lean()).toMatchObject({ status: "DELETED" }); });

  it("allows a guest token to upload only to a currently assigned ceremony", async () => { const data = await fixture(); const guest = await GuestModel.create({ weddingId: data.wedding.id, name: "Nina", email: "nina@example.test", phone: "", side: "BRIDE", relationship: "FRIEND", notes: "", status: "ACTIVE", createdBy: data.adminId }); await EventGuestModel.create({ weddingId: data.wedding.id, eventId: data.event.id, guestId: guest._id, status: "ACTIVE", assignedAt: new Date(), assignedBy: data.adminId }); const rawToken = "guest_gallery_token_abcdefghijklmnopqrstuvwxyz123456"; await GuestInvitationModel.create({ weddingId: data.wedding.id, guestId: guest._id, tokenHash: hashToken(rawToken), tokenVersion: 2, expiresAt: new Date(Date.now() + 86_400_000), status: "ACTIVE" }); await expect(createGuestPhotoUploadIntent(rawToken, { fileName: "wrong.jpg", contentType: "image/jpeg", sizeBytes: 1024, eventId: String(new Types.ObjectId()), caption: "" })).rejects.toMatchObject({ code: "EVENT_NOT_ASSIGNED" }); const intent = await createGuestPhotoUploadIntent(rawToken, { fileName: "dance.jpg", contentType: "image/jpeg", sizeBytes: 1024, eventId: data.event.id, caption: "Dance" }); expect((await completeGuestPhotoUpload(rawToken, intent.fileId)).photo).toMatchObject({ status: "PENDING", uploadedByType: "GUEST", eventId: data.event.id }); });
});
