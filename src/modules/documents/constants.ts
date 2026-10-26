export const DOCUMENT_ASSOCIATION_TYPES = ["EXPENSE", "VENDOR"] as const;
export const DOCUMENT_CATEGORIES = ["RECEIPT", "BILL", "CONTRACT", "QUOTATION", "OTHER"] as const;

export const DOCUMENT_CATEGORY_LABELS: Record<(typeof DOCUMENT_CATEGORIES)[number], string> = {
  RECEIPT: "Receipt",
  BILL: "Bill",
  CONTRACT: "Contract",
  QUOTATION: "Quotation",
  OTHER: "Other",
};

export const DOCUMENT_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const DOCUMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_UPLOAD_TTL_MS = 10 * 60 * 1000;
