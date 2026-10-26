import { describe, expect, it } from "vitest";
import { createPhotoUploadIntentSchema, guestPhotoUploadIntentSchema, reviewPhotoSchema } from "@/modules/gallery/schemas";
import { matchesImageSignature } from "@/modules/gallery/service";

describe("gallery validation", () => {
  it("accepts supported raster photos and optional member Other classification", () => {
    expect(createPhotoUploadIntentSchema.parse({ fileName: "moment.webp", contentType: "image/webp", sizeBytes: 2048, caption: "Dance floor" })).toMatchObject({ eventId: null, caption: "Dance floor" });
  });
  it("requires a ceremony for guest uploads", () => {
    expect(() => guestPhotoUploadIntentSchema.parse({ fileName: "moment.jpg", contentType: "image/jpeg", sizeBytes: 2048 })).toThrow();
  });
  it("rejects executable and oversized files", () => {
    expect(() => createPhotoUploadIntentSchema.parse({ fileName: "photo.svg", contentType: "image/svg+xml", sizeBytes: 10 })).toThrow();
    expect(() => createPhotoUploadIntentSchema.parse({ fileName: "photo.jpg", contentType: "image/jpeg", sizeBytes: 10 * 1024 * 1024 + 1 })).toThrow();
  });
  it("allows final moderation states and recognizes real image signatures", () => {
    expect(reviewPhotoSchema.parse({ status: "APPROVED" })).toEqual({ status: "APPROVED" });
    expect(matchesImageSignature("image/jpeg", new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(matchesImageSignature("image/png", new Uint8Array([0xff, 0xd8, 0xff]))).toBe(false);
  });
});
