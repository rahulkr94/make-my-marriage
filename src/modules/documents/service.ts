import { Types, isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { createPrivateDownloadUrl, createPrivateUploadUrl, deletePrivateObject, inspectPrivateObject } from "@/lib/storage/r2";
import { UserModel } from "@/modules/auth/models";
import { AuthError } from "@/modules/auth/request-security";
import { ExpenseModel, VendorModel } from "@/modules/finance/models";
import { requireFinanceAccess } from "@/modules/finance/service";
import { DOCUMENT_MAX_SIZE_BYTES, DOCUMENT_UPLOAD_TTL_MS } from "./constants";
import { DocumentModel, FileModel, type WeddingDocument } from "./models";
import type { CreateDocumentUploadIntentInput, DocumentListQuery, UpdateDocumentInput } from "./schemas";

export async function createDocumentUploadIntent(userId: string, weddingId: string, input: CreateDocumentUploadIntentInput) {
  await connectToDatabase();
  await requireFinanceAccess(userId, weddingId);
  await validateAssociation(weddingId, input.associationType, input.associationId);
  assertCategoryMatchesAssociation(input.associationType, input.category);

  const fileId = new Types.ObjectId();
  const objectKey = `weddings/${weddingId}/documents/${fileId}/original`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + DOCUMENT_UPLOAD_TTL_MS);
  const originalName = normalizeFileName(input.fileName);
  const displayName = input.displayName?.trim() || originalName.slice(0, 160);
  await FileModel.create({
    _id: fileId,
    weddingId,
    objectKey,
    originalName,
    declaredContentType: input.contentType,
    declaredSize: input.sizeBytes,
    uploadExpiresAt: expiresAt,
    createdById: userId,
    pendingAssociationType: input.associationType,
    pendingAssociationId: input.associationId,
    pendingCategory: input.category,
    pendingDisplayName: displayName,
    pendingNote: input.note,
  });

  try {
    const uploadUrl = await createPrivateUploadUrl(objectKey, input.contentType);
    return {
      fileId: String(fileId), uploadUrl, method: "PUT" as const,
      requiredHeaders: { "Content-Type": input.contentType }, expiresAt: expiresAt.toISOString(),
    };
  } catch (error) {
    await FileModel.deleteOne({ _id: fileId, status: "PENDING" });
    throw error;
  }
}

export async function completeDocumentUpload(userId: string, weddingId: string, fileId: string) {
  await connectToDatabase();
  await requireFinanceAccess(userId, weddingId);
  assertObjectId(fileId, "Upload not found.");
  const file = await FileModel.findOne({ _id: fileId, weddingId }).select("+objectKey +checksum");
  if (!file || String(file.createdById) !== userId) throw new AuthError("NOT_FOUND", "Upload not found.", 404);
  const existing = await DocumentModel.findOne({ weddingId, fileId, deletedAt: null }).lean();
  if (existing) return { document: await serializeDocument(existing) };
  if (file.status === "DELETED" || file.status === "FAILED") throw new AuthError("UPLOAD_UNAVAILABLE", "This upload is no longer available.", 409);
  if (file.uploadExpiresAt <= new Date()) throw new AuthError("UPLOAD_EXPIRED", "This upload expired. Choose the file again.", 410);
  if (!file.pendingAssociationType || !file.pendingAssociationId || !file.pendingCategory || !file.pendingDisplayName) throw new AuthError("UPLOAD_UNAVAILABLE", "This document upload is incomplete.", 409);
  await validateAssociation(weddingId, file.pendingAssociationType, String(file.pendingAssociationId));

  let object: Awaited<ReturnType<typeof inspectPrivateObject>>;
  try { object = await inspectPrivateObject(file.objectKey); }
  catch { throw new AuthError("UPLOAD_NOT_FOUND", "The file upload has not finished yet.", 409); }

  const verifiedType = normalizedContentType(object.contentType);
  const valid = object.size === file.declaredSize
    && object.size <= DOCUMENT_MAX_SIZE_BYTES
    && verifiedType === file.declaredContentType
    && matchesDocumentSignature(verifiedType, object.bytes);
  if (!valid) {
    file.status = "FAILED";
    file.failureReason = "File size, type, or content did not match the upload request.";
    await file.save();
    await deletePrivateObject(file.objectKey).catch(() => undefined);
    throw new AuthError("UPLOAD_REJECTED", "The uploaded file did not pass validation.", 409);
  }

  const document = await DocumentModel.create({
    weddingId,
    fileId: file._id,
    category: file.pendingCategory,
    associationType: file.pendingAssociationType,
    associationId: file.pendingAssociationId,
    displayName: file.pendingDisplayName,
    note: file.pendingNote,
    uploadedBy: userId,
  });
  file.status = "READY";
  file.verifiedContentType = verifiedType;
  file.verifiedSize = object.size;
  file.checksum = object.checksum;
  await file.save();
  return { document: await serializeDocument(document) };
}

export async function listDocuments(userId: string, weddingId: string, query: DocumentListQuery) {
  await connectToDatabase();
  await requireFinanceAccess(userId, weddingId);
  await validateAssociation(weddingId, query.associationType, query.associationId);
  const filter: Record<string, unknown> = {
    weddingId, associationType: query.associationType, associationId: query.associationId, deletedAt: null,
  };
  if (query.category) filter.category = query.category;
  if (query.q) filter.$or = [
    { displayName: { $regex: escapeRegex(query.q), $options: "i" } },
    { note: { $regex: escapeRegex(query.q), $options: "i" } },
  ];
  const documents = await DocumentModel.find(filter).sort({ createdAt: -1, _id: -1 }).lean();
  return { documents: await Promise.all(documents.map(serializeDocument)), total: documents.length };
}

export async function updateDocument(userId: string, weddingId: string, documentId: string, input: UpdateDocumentInput) {
  await connectToDatabase();
  await requireFinanceAccess(userId, weddingId);
  assertObjectId(documentId, "Attachment not found.");
  const current = await DocumentModel.findOne({ _id: documentId, weddingId, deletedAt: null });
  if (!current) throw new AuthError("NOT_FOUND", "Attachment not found.", 404);
  if (input.category) assertCategoryMatchesAssociation(current.associationType, input.category);
  current.set(input);
  await current.save();
  return { document: await serializeDocument(current) };
}

export async function createDocumentDownload(userId: string, weddingId: string, documentId: string, preview: boolean) {
  await connectToDatabase();
  await requireFinanceAccess(userId, weddingId);
  assertObjectId(documentId, "Attachment not found.");
  const document = await DocumentModel.findOne({ _id: documentId, weddingId, deletedAt: null }).lean();
  if (!document) throw new AuthError("NOT_FOUND", "Attachment not found.", 404);
  const file = await FileModel.findOne({ _id: document.fileId, weddingId, status: "READY" }).select("+objectKey").lean();
  if (!file) throw new AuthError("NOT_FOUND", "Attachment file not found.", 404);
  const canPreview = file.verifiedContentType === "application/pdf" || Boolean(file.verifiedContentType?.startsWith("image/"));
  const url = await createPrivateDownloadUrl(file.objectKey, file.originalName, preview && canPreview);
  return { url, expiresInSeconds: 300, preview: preview && canPreview, contentType: file.verifiedContentType };
}

export async function removeDocument(userId: string, weddingId: string, documentId: string) {
  await connectToDatabase();
  await requireFinanceAccess(userId, weddingId);
  assertObjectId(documentId, "Attachment not found.");
  const document = await DocumentModel.findOneAndUpdate(
    { _id: documentId, weddingId, deletedAt: null }, { $set: { deletedAt: new Date() } }, { new: true },
  );
  if (!document) throw new AuthError("NOT_FOUND", "Attachment not found.", 404);
  const file = await FileModel.findOneAndUpdate(
    { _id: document.fileId, weddingId, status: "READY" }, { $set: { status: "DELETED" } }, { new: true },
  ).select("+objectKey");
  if (file) await deletePrivateObject(file.objectKey).catch((error) => console.error("Private object cleanup failed", { fileId: String(file._id), error }));
  return { id: documentId, removed: true as const };
}

async function validateAssociation(weddingId: string, type: "EXPENSE" | "VENDOR", id: string) {
  if (!isValidObjectId(id)) throw new AuthError("INVALID_ASSOCIATION", "Choose a valid expense or vendor.", 409);
  const record = type === "EXPENSE"
    ? await ExpenseModel.exists({ _id: id, weddingId, deletedAt: null })
    : await VendorModel.exists({ _id: id, weddingId, deletedAt: null });
  if (!record) throw new AuthError("INVALID_ASSOCIATION", "Choose an active expense or vendor from this wedding.", 409);
}

function assertCategoryMatchesAssociation(type: "EXPENSE" | "VENDOR", category: string) {
  const allowed = type === "EXPENSE" ? ["RECEIPT", "BILL", "OTHER"] : ["CONTRACT", "QUOTATION", "OTHER"];
  if (!allowed.includes(category)) throw new AuthError("INVALID_DOCUMENT_CATEGORY", "Choose a document type that matches this record.", 400);
}

async function serializeDocument(document: WeddingDocument & { _id: unknown; createdAt: Date; updatedAt: Date }) {
  const [file, uploader] = await Promise.all([
    FileModel.findOne({ _id: document.fileId, status: "READY" }).lean(),
    UserModel.findById(document.uploadedBy).select("name").lean(),
  ]);
  if (!file) throw new AuthError("NOT_FOUND", "Attachment file not found.", 404);
  return {
    id: String(document._id), fileId: String(document.fileId), category: document.category,
    associationType: document.associationType, associationId: String(document.associationId),
    displayName: document.displayName, note: document.note ?? "", originalName: file.originalName,
    contentType: file.verifiedContentType ?? file.declaredContentType,
    sizeBytes: file.verifiedSize ?? file.declaredSize,
    uploadedBy: String(document.uploadedBy), uploadedByName: uploader?.name ?? "Wedding planner",
    createdAt: document.createdAt.toISOString(), updatedAt: document.updatedAt.toISOString(),
  };
}

export function matchesDocumentSignature(contentType: string, bytes: Uint8Array) {
  if (contentType === "application/pdf") return startsWith(bytes, [0x25, 0x50, 0x44, 0x46]);
  if (contentType === "image/jpeg") return startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (contentType === "image/png") return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (contentType === "image/webp") return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]);
  return false;
}

function startsWith(bytes: Uint8Array, signature: number[]) { return signature.every((value, index) => bytes[index] === value); }
function normalizedContentType(value: string) { return value.split(";")[0].trim().toLowerCase(); }
function normalizeFileName(value: string) { return value.replace(/[\\/\0]/g, "_").trim().slice(0, 240) || "attachment"; }
function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function assertObjectId(value: string, message: string) { if (!isValidObjectId(value)) throw new AuthError("NOT_FOUND", message, 404); }

export type DocumentView = Awaited<ReturnType<typeof serializeDocument>>;
export type DocumentListView = Awaited<ReturnType<typeof listDocuments>>;
