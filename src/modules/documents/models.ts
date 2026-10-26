import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { DOCUMENT_ASSOCIATION_TYPES, DOCUMENT_CATEGORIES, DOCUMENT_CONTENT_TYPES } from "./constants";

const FILE_CONTENT_TYPES = [...DOCUMENT_CONTENT_TYPES, "image/jpeg", "image/png", "image/webp"] as const;

const fileSchema = new Schema({
  weddingId: { type: Schema.Types.ObjectId, required: true },
  kind: { type: String, enum: ["PHOTO", "DOCUMENT", "COVER"], required: true, default: "DOCUMENT" },
  objectKey: { type: String, required: true, unique: true, select: false },
  originalName: { type: String, required: true, trim: true, maxlength: 240 },
  declaredContentType: { type: String, enum: FILE_CONTENT_TYPES, required: true },
  verifiedContentType: { type: String, enum: FILE_CONTENT_TYPES, default: null },
  declaredSize: { type: Number, required: true },
  verifiedSize: { type: Number, default: null },
  checksum: { type: String, default: null, select: false },
  status: { type: String, enum: ["PENDING", "READY", "FAILED", "DELETED"], required: true, default: "PENDING" },
  uploadExpiresAt: { type: Date, required: true },
  createdByType: { type: String, enum: ["MEMBER", "GUEST"], required: true, default: "MEMBER" },
  createdById: { type: Schema.Types.ObjectId, required: true },
  pendingAssociationType: { type: String, enum: DOCUMENT_ASSOCIATION_TYPES },
  pendingAssociationId: { type: Schema.Types.ObjectId },
  pendingCategory: { type: String, enum: DOCUMENT_CATEGORIES },
  pendingDisplayName: { type: String, trim: true, maxlength: 160 },
  pendingNote: { type: String, default: "", trim: true, maxlength: 500 },
  pendingEventId: { type: Schema.Types.ObjectId, default: null },
  pendingCaption: { type: String, default: "", trim: true, maxlength: 300 },
  pendingInvitationVersion: { type: Number, min: 0, default: null },
  failureReason: { type: String, default: null, maxlength: 160 },
}, { timestamps: true, strict: "throw" });

fileSchema.index({ status: 1, uploadExpiresAt: 1 }, { name: "pending_file_cleanup" });

const documentSchema = new Schema({
  weddingId: { type: Schema.Types.ObjectId, required: true },
  fileId: { type: Schema.Types.ObjectId, required: true, unique: true },
  category: { type: String, enum: DOCUMENT_CATEGORIES, required: true },
  associationType: { type: String, enum: DOCUMENT_ASSOCIATION_TYPES, required: true },
  associationId: { type: Schema.Types.ObjectId, required: true },
  displayName: { type: String, required: true, trim: true, maxlength: 160 },
  note: { type: String, default: "", trim: true, maxlength: 500 },
  uploadedBy: { type: Schema.Types.ObjectId, required: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true, strict: "throw" });

documentSchema.index(
  { weddingId: 1, associationType: 1, associationId: 1, deletedAt: 1, createdAt: -1 },
  { name: "association_documents" },
);

export type StoredFile = InferSchemaType<typeof fileSchema>;
export type WeddingDocument = InferSchemaType<typeof documentSchema>;
export const FileModel = (models.StoredFile as Model<StoredFile> | undefined)
  ?? model<StoredFile>("StoredFile", fileSchema, "files");
export const DocumentModel = (models.WeddingDocument as Model<WeddingDocument> | undefined)
  ?? model<WeddingDocument>("WeddingDocument", documentSchema, "documents");
