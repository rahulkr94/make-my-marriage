export const PHOTO_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PHOTO_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const PHOTO_UPLOAD_TTL_MS = 10 * 60 * 1000;
export const PHOTO_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
