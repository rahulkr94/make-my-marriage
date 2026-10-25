export const EXPENSE_CATEGORIES = [
  "VENUE",
  "CATERING",
  "DECOR",
  "PHOTOGRAPHY",
  "ATTIRE",
  "ENTERTAINMENT",
  "INVITATIONS",
  "TRANSPORT",
  "GIFTS",
  "OTHER",
] as const;

export const EXPENSE_CATEGORY_LABELS: Record<(typeof EXPENSE_CATEGORIES)[number], string> = {
  VENUE: "Venue",
  CATERING: "Catering",
  DECOR: "Décor",
  PHOTOGRAPHY: "Photography",
  ATTIRE: "Attire",
  ENTERTAINMENT: "Entertainment",
  INVITATIONS: "Invitations",
  TRANSPORT: "Transport",
  GIFTS: "Gifts",
  OTHER: "Other",
};

export const EXPENSE_PAYMENT_STATUSES = ["UNPAID", "PARTIAL", "PAID"] as const;
export const EXPENSE_PAYMENT_STATUS_LABELS: Record<(typeof EXPENSE_PAYMENT_STATUSES)[number], string> = {
  UNPAID: "Unpaid",
  PARTIAL: "Partially paid",
  PAID: "Paid in full",
};

export const PAYMENT_METHODS = ["CASH", "UPI", "BANK_TRANSFER", "CARD", "CHEQUE", "OTHER"] as const;
export const PAYMENT_METHOD_LABELS: Record<(typeof PAYMENT_METHODS)[number], string> = {
  CASH: "Cash",
  UPI: "UPI / QR",
  BANK_TRANSFER: "Bank transfer",
  CARD: "Card",
  CHEQUE: "Cheque",
  OTHER: "Other",
};

export const EXPENSES_PAGE_SIZE = 25;
export function canManageFinances(role: string) { return role === "ADMIN" || role === "MANAGER"; }
