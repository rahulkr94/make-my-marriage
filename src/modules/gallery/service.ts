import { isValidObjectId, Types } from "mongoose";
import QRCode from "qrcode";
import { connectToDatabase } from "@/lib/mongodb";
import { createPrivateDownloadUrl, createPrivateUploadUrl, deletePrivateObject, inspectPrivateObject } from "@/lib/storage/r2";
import { createOpaqueToken, hashToken } from "@/modules/auth/crypto";
import { AuthError } from "@/modules/auth/request-security";
import { FileModel } from "@/modules/documents/models";
import { EventModel } from "@/modules/events/models";
import { EventGuestModel, GuestModel } from "@/modules/guests/models";
import { GuestInvitationModel } from "@/modules/invitations/models";
import { WeddingMemberModel, WeddingModel } from "@/modules/weddings/models";
import { PHOTO_MAX_SIZE_BYTES, PHOTO_UPLOAD_TTL_MS } from "./constants";
import { PhotoModel, type WeddingPhoto } from "./models";
import type { CreatePhotoUploadIntentInput, GalleryListQuery, GuestPhotoUploadIntentInput, ReviewPhotoInput } from "./schemas";

type Membership = { _id: unknown; role: "ADMIN" | "MANAGER" | "MEMBER"; grants: string[] };

export async function createMemberPhotoUploadIntent(userId: string, weddingId: string, input: CreatePhotoUploadIntentInput) {
  await connectToDatabase();
  const membership = await requireMembership(userId, weddingId);
  if (input.eventId) await requireEvent(weddingId, input.eventId);
  return createPhotoIntent(weddingId, "MEMBER", new Types.ObjectId(String(membership._id)), input, null);
}

export async function createGuestPhotoUploadIntent(rawToken: string, input: GuestPhotoUploadIntentInput) {
  await connectToDatabase();
  const access = await requireGuestAccess(rawToken, input.eventId);
  return createPhotoIntent(String(access.invitation.weddingId), "GUEST", access.invitation.guestId, input, access.invitation.tokenVersion);
}

async function createPhotoIntent(weddingId: string, actorType: "MEMBER" | "GUEST", actorId: Types.ObjectId, input: CreatePhotoUploadIntentInput, invitationVersion: number | null) {
  const fileId = new Types.ObjectId();
  const objectKey = `weddings/${weddingId}/photos/${fileId}/original`;
  const expiresAt = new Date(Date.now() + PHOTO_UPLOAD_TTL_MS);
  await FileModel.create({
    _id: fileId, weddingId, kind: "PHOTO", objectKey, originalName: normalizeFileName(input.fileName),
    declaredContentType: input.contentType, declaredSize: input.sizeBytes, uploadExpiresAt: expiresAt,
    createdByType: actorType, createdById: actorId, pendingEventId: input.eventId || null,
    pendingCaption: input.caption, pendingInvitationVersion: invitationVersion,
  });
  try {
    return { fileId: String(fileId), uploadUrl: await createPrivateUploadUrl(objectKey, input.contentType), method: "PUT" as const, requiredHeaders: { "Content-Type": input.contentType }, expiresAt: expiresAt.toISOString() };
  } catch (error) {
    await FileModel.deleteOne({ _id: fileId, status: "PENDING" });
    throw error;
  }
}

export async function completeMemberPhotoUpload(userId: string, weddingId: string, fileId: string) {
  await connectToDatabase();
  const membership = await requireMembership(userId, weddingId);
  return completePhotoUpload(weddingId, fileId, "MEMBER", new Types.ObjectId(String(membership._id)));
}

export async function completeGuestPhotoUpload(rawToken: string, fileId: string) {
  await connectToDatabase();
  const access = await requireGuestAccess(rawToken);
  return completePhotoUpload(String(access.invitation.weddingId), fileId, "GUEST", access.invitation.guestId, access.invitation.tokenVersion);
}

async function completePhotoUpload(weddingId: string, fileId: string, actorType: "MEMBER" | "GUEST", actorId: Types.ObjectId, invitationVersion?: number) {
  assertObjectId(fileId, "Upload not found.");
  const existing = await PhotoModel.findOne({ weddingId, fileId }).lean();
  if (existing) return { photo: await serializePhoto(existing) };
  const file = await FileModel.findOne({ _id: fileId, weddingId, kind: "PHOTO" }).select("+objectKey +checksum");
  if (!file || file.createdByType !== actorType || String(file.createdById) !== String(actorId)) throw new AuthError("NOT_FOUND", "Upload not found.", 404);
  if (actorType === "GUEST" && file.pendingInvitationVersion !== invitationVersion) throw new AuthError("INVITATION_UNAVAILABLE", "This invitation link has changed. Choose the photo again.", 410);
  if (file.status === "FAILED" || file.status === "DELETED") throw new AuthError("UPLOAD_UNAVAILABLE", "This upload is no longer available.", 409);
  if (file.uploadExpiresAt <= new Date()) throw new AuthError("UPLOAD_EXPIRED", "This upload expired. Choose the photo again.", 410);
  if (file.pendingEventId) {
    if (actorType === "GUEST") await requireGuestAccessByInvitation(weddingId, actorId, String(file.pendingEventId));
    else await requireEvent(weddingId, String(file.pendingEventId));
  }
  let object: Awaited<ReturnType<typeof inspectPrivateObject>>;
  try { object = await inspectPrivateObject(file.objectKey); }
  catch { throw new AuthError("UPLOAD_NOT_FOUND", "The photo upload has not finished yet.", 409); }
  const type = object.contentType.split(";")[0].trim().toLowerCase();
  const valid = object.size === file.declaredSize && object.size <= PHOTO_MAX_SIZE_BYTES && type === file.declaredContentType && matchesImageSignature(type, object.bytes);
  if (!valid) {
    file.status = "FAILED"; file.failureReason = "Photo size, type, or content did not match the upload request."; await file.save();
    await deletePrivateObject(file.objectKey).catch(() => undefined);
    throw new AuthError("UPLOAD_REJECTED", "The uploaded photo did not pass validation.", 409);
  }
  const photo = await PhotoModel.create({ weddingId, fileId: file._id, eventId: file.pendingEventId ?? null, uploadedByType: actorType, uploadedById: actorId, invitationVersion: actorType === "GUEST" ? invitationVersion : null, caption: file.pendingCaption ?? "", status: "PENDING" });
  file.status = "READY"; file.verifiedContentType = type as typeof file.verifiedContentType; file.verifiedSize = object.size; file.checksum = object.checksum; await file.save();
  return { photo: await serializePhoto(photo) };
}

export async function listGallery(userId: string, weddingId: string, query: GalleryListQuery = {}) {
  await connectToDatabase();
  const membership = await requireMembership(userId, weddingId);
  const canModerate = mayModerate(membership);
  const filter: Record<string, unknown> = { weddingId, ...(canModerate && query.status ? { status: query.status } : canModerate ? {} : { status: "APPROVED" }) };
  if (query.eventId === "other") filter.eventId = null;
  else if (query.eventId) { assertObjectId(query.eventId, "Event not found."); filter.eventId = query.eventId; }
  const [photos, events, counts] = await Promise.all([
    PhotoModel.find(filter).sort({ createdAt: -1, _id: -1 }).limit(240).lean(),
    EventModel.find({ weddingId, deletedAt: null, status: { $ne: "CANCELLED" } }).sort({ startsAtUtc: 1 }).select("name localDate").lean(),
    PhotoModel.aggregate<{ _id: string; count: number }>([{ $match: { weddingId: new Types.ObjectId(weddingId) } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);
  const count = Object.fromEntries(counts.map((item) => [item._id, item.count]));
  return {
    photos: await Promise.all(photos.map((photo) => serializePhoto(photo))),
    events: events.map((event) => ({ id: String(event._id), name: event.name, localDate: event.localDate })),
    summary: { total: (count.PENDING ?? 0) + (count.APPROVED ?? 0) + (count.REJECTED ?? 0), pending: count.PENDING ?? 0, approved: count.APPROVED ?? 0, rejected: count.REJECTED ?? 0 },
    canModerate, canShare: membership.role === "ADMIN", role: membership.role,
  };
}

export async function getGalleryDashboardSummary(userId: string, weddingId: string) {
  await connectToDatabase();
  const membership = await requireMembership(userId, weddingId);
  const [approved, pending] = await Promise.all([
    PhotoModel.countDocuments({ weddingId, status: "APPROVED" }),
    mayModerate(membership) ? PhotoModel.countDocuments({ weddingId, status: "PENDING" }) : Promise.resolve(null),
  ]);
  return { approved, pending, canModerate: mayModerate(membership) };
}

export async function reviewPhoto(userId: string, weddingId: string, photoId: string, input: ReviewPhotoInput) {
  await connectToDatabase();
  const membership = await requireMembership(userId, weddingId);
  if (!mayModerate(membership)) throw new AuthError("FORBIDDEN", "Gallery moderation access is required.", 403);
  assertObjectId(photoId, "Photo not found.");
  const photo = await PhotoModel.findOneAndUpdate({ _id: photoId, weddingId }, { $set: { status: input.status, reviewedBy: userId, reviewedAt: new Date() } }, { new: true, runValidators: true });
  if (!photo) throw new AuthError("NOT_FOUND", "Photo not found.", 404);
  return { photo: await serializePhoto(photo) };
}

export async function removePhoto(userId: string, weddingId: string, photoId: string) {
  await connectToDatabase();
  await requireAdmin(userId, weddingId);
  assertObjectId(photoId, "Photo not found.");
  const photo = await PhotoModel.findOneAndDelete({ _id: photoId, weddingId });
  if (!photo) throw new AuthError("NOT_FOUND", "Photo not found.", 404);
  const file = await FileModel.findOneAndUpdate(
    { _id: photo.fileId, weddingId, kind: "PHOTO", status: "READY" },
    { $set: { status: "DELETED" } },
    { new: true },
  ).select("+objectKey");
  if (file) {
    await deletePrivateObject(file.objectKey).catch((error: unknown) => {
      console.error("Private photo cleanup failed", {
        fileId: String(file._id),
        error: error instanceof Error ? error.message : "Unknown storage error",
      });
    });
  }
  return { id: String(photo._id), removed: true as const };
}

export async function getGalleryLinkStatus(userId: string, weddingId: string) {
  await connectToDatabase();
  await requireAdmin(userId, weddingId);
  const wedding = await WeddingModel.findById(weddingId).select("+galleryTokenHash galleryTokenVersion galleryTokenRotatedAt").lean();
  if (!wedding) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  return { active: Boolean(wedding.galleryTokenHash), version: wedding.galleryTokenVersion, rotatedAt: wedding.galleryTokenRotatedAt?.toISOString() ?? null, approvedPhotos: await PhotoModel.countDocuments({ weddingId, status: "APPROVED" }) };
}

export async function rotateGalleryLink(userId: string, weddingId: string, requestOrigin?: string, withQr = false) {
  await connectToDatabase();
  await requireAdmin(userId, weddingId);
  const rawToken = createOpaqueToken(32);
  const galleryUrl = createGalleryUrl(rawToken, requestOrigin);
  if (!galleryUrl) throw new AuthError("GALLERY_URL_UNAVAILABLE", "Configure the application URL before sharing the gallery.", 503);
  const wedding = await WeddingModel.findOneAndUpdate({ _id: weddingId }, { $set: { galleryTokenHash: hashToken(rawToken), galleryTokenRotatedAt: new Date() }, $inc: { galleryTokenVersion: 1 } }, { new: true });
  if (!wedding) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  return { galleryUrl, version: wedding.galleryTokenVersion, rotatedAt: wedding.galleryTokenRotatedAt?.toISOString() ?? null, ...(withQr ? { qrDataUrl: await QRCode.toDataURL(galleryUrl, { width: 800, margin: 2, color: { dark: "#1d1b18", light: "#fff8f3" } }) } : {}) };
}

export async function revokeGalleryLink(userId: string, weddingId: string) {
  await connectToDatabase();
  await requireAdmin(userId, weddingId);
  const wedding = await WeddingModel.findOneAndUpdate({ _id: weddingId }, { $unset: { galleryTokenHash: 1 }, $set: { galleryTokenRotatedAt: new Date() }, $inc: { galleryTokenVersion: 1 } }, { new: true });
  if (!wedding) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  return { active: false, version: wedding.galleryTokenVersion };
}

export async function getPublicGallery(rawToken: string) {
  await connectToDatabase();
  const wedding = await resolveGalleryWedding(rawToken);
  if (!wedding) return null;
  const [photos, events] = await Promise.all([
    PhotoModel.find({ weddingId: wedding._id, status: "APPROVED" }).sort({ createdAt: -1 }).limit(500).lean(),
    EventModel.find({ weddingId: wedding._id, deletedAt: null }).select("name localDate").lean(),
  ]);
  return { wedding: { brideName: wedding.brideName, groomName: wedding.groomName, weddingDate: wedding.weddingDate }, photos: await Promise.all(photos.map((photo) => serializePhoto(photo))), events: events.map((event) => ({ id: String(event._id), name: event.name, localDate: event.localDate })) };
}

export async function createPublicPhotoDownload(rawToken: string, photoId: string) {
  await connectToDatabase();
  const wedding = await resolveGalleryWedding(rawToken);
  if (!wedding || !isValidObjectId(photoId)) throw new AuthError("NOT_FOUND", "Photo not found.", 404);
  const photo = await PhotoModel.findOne({ _id: photoId, weddingId: wedding._id, status: "APPROVED" }).lean();
  if (!photo) throw new AuthError("NOT_FOUND", "Photo not found.", 404);
  const file = await FileModel.findOne({ _id: photo.fileId, weddingId: wedding._id, kind: "PHOTO", status: "READY" }).select("+objectKey").lean();
  if (!file) throw new AuthError("NOT_FOUND", "Photo not found.", 404);
  return { url: await createPrivateDownloadUrl(file.objectKey, file.originalName, false), expiresInSeconds: 300 };
}

async function resolveGalleryWedding(rawToken: string) {
  if (!/^[A-Za-z0-9_-]{32,200}$/.test(rawToken)) return null;
  return WeddingModel.findOne({ galleryTokenHash: hashToken(rawToken), status: { $ne: "ARCHIVED" } }).select("+galleryTokenHash").lean();
}

async function serializePhoto(photo: WeddingPhoto & { _id: unknown; createdAt: Date; updatedAt: Date }) {
  const [file, event] = await Promise.all([
    FileModel.findOne({ _id: photo.fileId, status: "READY", kind: "PHOTO" }).select("+objectKey").lean(),
    photo.eventId ? EventModel.findById(photo.eventId).select("name").lean() : Promise.resolve(null),
  ]);
  if (!file) throw new AuthError("NOT_FOUND", "Photo file not found.", 404);
  return { id: String(photo._id), fileId: String(photo.fileId), eventId: photo.eventId ? String(photo.eventId) : null, eventName: event?.name ?? "Other moments", uploadedByType: photo.uploadedByType, status: photo.status, caption: photo.caption ?? "", fileName: file.originalName, contentType: file.verifiedContentType ?? file.declaredContentType, sizeBytes: file.verifiedSize ?? file.declaredSize, createdAt: photo.createdAt.toISOString(), url: await createPrivateDownloadUrl(file.objectKey, file.originalName, true) };
}

async function requireMembership(userId: string, weddingId: string): Promise<Membership> {
  if (!isValidObjectId(weddingId)) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  const membership = await WeddingMemberModel.findOne({ userId, weddingId, status: "ACTIVE" }).lean();
  if (!membership) throw new AuthError("NOT_FOUND", "Wedding workspace not found.", 404);
  return membership as Membership;
}
async function requireAdmin(userId: string, weddingId: string) { const membership = await requireMembership(userId, weddingId); if (membership.role !== "ADMIN") throw new AuthError("FORBIDDEN", "Only Admins can manage this gallery.", 403); return membership; }
function mayModerate(membership: Membership) { return membership.role === "ADMIN" || (membership.role === "MANAGER" && membership.grants.includes("CAN_MODERATE_GALLERY")); }
async function requireEvent(weddingId: string, eventId: string) { assertObjectId(eventId, "Event not found."); const event = await EventModel.exists({ _id: eventId, weddingId, deletedAt: null, status: { $ne: "CANCELLED" } }); if (!event) throw new AuthError("INVALID_EVENT", "Choose an active ceremony from this wedding.", 409); }
async function requireGuestAccess(rawToken: string, eventId?: string) {
  if (!/^[A-Za-z0-9_-]{32,200}$/.test(rawToken)) throw new AuthError("INVITATION_UNAVAILABLE", "This invitation is unavailable.", 404);
  const invitation = await GuestInvitationModel.findOne({ tokenHash: hashToken(rawToken), status: "ACTIVE", expiresAt: { $gt: new Date() } }).select("+tokenHash").lean();
  if (!invitation || !await GuestModel.exists({ _id: invitation.guestId, weddingId: invitation.weddingId, status: "ACTIVE" })) throw new AuthError("INVITATION_UNAVAILABLE", "This invitation is unavailable.", 404);
  if (eventId) await requireGuestAccessByInvitation(String(invitation.weddingId), invitation.guestId, eventId);
  return { invitation };
}
async function requireGuestAccessByInvitation(weddingId: string, guestId: Types.ObjectId, eventId: string) { assertObjectId(eventId, "Ceremony not available."); const [assignment, event] = await Promise.all([EventGuestModel.exists({ weddingId, guestId, eventId, status: "ACTIVE" }), EventModel.exists({ _id: eventId, weddingId, status: "PUBLISHED", deletedAt: null })]); if (!assignment || !event) throw new AuthError("EVENT_NOT_ASSIGNED", "Choose a ceremony included in this invitation.", 403); }
export function matchesImageSignature(type: string, bytes: Uint8Array) { if (type === "image/jpeg") return starts(bytes, [0xff, 0xd8, 0xff]); if (type === "image/png") return starts(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); if (type === "image/webp") return starts(bytes, [0x52, 0x49, 0x46, 0x46]) && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"; return false; }
function starts(bytes: Uint8Array, signature: number[]) { return signature.every((value, index) => bytes[index] === value); }
function normalizeFileName(value: string) { return value.replace(/[\\/\0]/g, "_").trim().slice(0, 240) || "photo"; }
function assertObjectId(value: string, message: string) { if (!isValidObjectId(value)) throw new AuthError("NOT_FOUND", message, 404); }
function createGalleryUrl(token: string, requestOrigin?: string) { const base = process.env.APP_URL || requestOrigin; return base ? new URL(`/g/${encodeURIComponent(token)}`, base).toString() : null; }

export type GalleryView = Awaited<ReturnType<typeof listGallery>>;
export type PublicGalleryView = NonNullable<Awaited<ReturnType<typeof getPublicGallery>>>;
