import { z } from "zod";
import { DOCUMENT_ASSOCIATION_TYPES, DOCUMENT_CATEGORIES, DOCUMENT_CONTENT_TYPES, DOCUMENT_MAX_SIZE_BYTES } from "./constants";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Choose a valid wedding record.");
const displayName = z.string().trim().min(1, "Enter a document name.").max(160);

export const documentListQuerySchema = z.object({
  associationType: z.enum(DOCUMENT_ASSOCIATION_TYPES),
  associationId: objectId,
  category: z.enum(DOCUMENT_CATEGORIES).optional(),
  q: z.string().trim().max(100).default(""),
}).strict();

export const createDocumentUploadIntentSchema = z.object({
  associationType: z.enum(DOCUMENT_ASSOCIATION_TYPES),
  associationId: objectId,
  category: z.enum(DOCUMENT_CATEGORIES),
  fileName: z.string().trim().min(1).max(240),
  contentType: z.enum(DOCUMENT_CONTENT_TYPES),
  sizeBytes: z.number().int().positive().max(DOCUMENT_MAX_SIZE_BYTES, "Files must be 10 MB or smaller."),
  displayName: displayName.optional(),
  note: z.string().trim().max(500).default(""),
}).strict();

export const updateDocumentSchema = z.object({
  displayName: displayName.optional(),
  category: z.enum(DOCUMENT_CATEGORIES).optional(),
  note: z.string().trim().max(500).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Send at least one change.");

export type CreateDocumentUploadIntentInput = z.infer<typeof createDocumentUploadIntentSchema>;
export type DocumentListQuery = z.infer<typeof documentListQuerySchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
