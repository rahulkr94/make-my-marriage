import { describe, expect, it } from "vitest";
import { createDocumentUploadIntentSchema, documentListQuerySchema, updateDocumentSchema } from "@/modules/documents/schemas";
import { matchesDocumentSignature } from "@/modules/documents/service";

const id = "507f1f77bcf86cd799439011";

describe("private document schemas", () => {
  it("accepts a bounded expense receipt upload", () => {
    expect(createDocumentUploadIntentSchema.parse({
      associationType: "EXPENSE", associationId: id, category: "RECEIPT",
      fileName: "receipt.pdf", contentType: "application/pdf", sizeBytes: 2048, note: "Advance",
    })).toMatchObject({ associationType: "EXPENSE", category: "RECEIPT", sizeBytes: 2048 });
  });

  it("rejects unsupported and oversized files", () => {
    expect(createDocumentUploadIntentSchema.safeParse({ associationType: "EXPENSE", associationId: id, category: "RECEIPT", fileName: "data.exe", contentType: "application/octet-stream", sizeBytes: 20 }).success).toBe(false);
    expect(createDocumentUploadIntentSchema.safeParse({ associationType: "VENDOR", associationId: id, category: "CONTRACT", fileName: "contract.pdf", contentType: "application/pdf", sizeBytes: 10 * 1024 * 1024 + 1 }).success).toBe(false);
  });

  it("requires scoped list queries and meaningful updates", () => {
    expect(documentListQuerySchema.parse({ associationType: "VENDOR", associationId: id })).toEqual({ associationType: "VENDOR", associationId: id, q: "" });
    expect(updateDocumentSchema.safeParse({}).success).toBe(false);
    expect(updateDocumentSchema.parse({ displayName: "Signed contract" })).toEqual({ displayName: "Signed contract" });
  });

  it("checks representative file signatures", () => {
    expect(matchesDocumentSignature("application/pdf", new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe(true);
    expect(matchesDocumentSignature("image/jpeg", new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(matchesDocumentSignature("image/png", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
    expect(matchesDocumentSignature("application/pdf", new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toBe(false);
  });
});
