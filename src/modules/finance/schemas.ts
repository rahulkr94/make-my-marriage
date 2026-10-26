import { Temporal } from "@js-temporal/polyfill";
import { z } from "zod";
import { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_STATUSES, PAYMENT_METHODS } from "./constants";

function validDate(value: string) { try { Temporal.PlainDate.from(value); return true; } catch { return false; } }

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Choose a valid option.");
const optionalObjectId = z.union([objectId, z.literal(""), z.null()]).transform((value) => value || null);
const localDate = z.string().regex(/^(19|20|21)\d{2}-\d{2}-\d{2}$/, "Choose a valid date.").refine(validDate, "Choose a valid calendar date.");
const optionalDate = z.union([localDate, z.literal(""), z.null()]).transform((value) => value || null);
const moneyMinor = z.string().regex(/^\d+$/, "Enter an amount in paise using digits only.")
  .refine((value) => /^\d+$/.test(value) && BigInt(value) > BigInt(0), "Amount must be greater than zero.")
  .refine((value) => /^\d+$/.test(value) && BigInt(value) <= BigInt("9000000000000000"), "Amount is too large.");
const optionalMoneyMinor = z.union([moneyMinor, z.literal("0"), z.literal(""), z.null()]).transform((value) => value || "0");

const expenseFields = {
  title: z.string().trim().min(2, "Enter an expense title.").max(160, "Use no more than 160 characters."),
  amountMinor: moneyMinor,
  category: z.enum(EXPENSE_CATEGORIES),
  eventId: optionalObjectId,
  expenseDate: localDate,
  dueDate: optionalDate,
  paidBy: z.string().trim().min(2, "Enter who is responsible for this expense.").max(120),
  vendorId: optionalObjectId,
  vendorName: z.string().trim().max(160),
  notes: z.string().trim().max(2000),
};

function validateDueDate(value: { expenseDate?: string; dueDate?: string | null }, ctx: z.RefinementCtx) {
  if (value.expenseDate && value.dueDate && value.dueDate < value.expenseDate) {
    ctx.addIssue({ code: "custom", path: ["dueDate"], message: "Due date cannot be before the expense date." });
  }
}

export const createExpenseSchema = z.object({
  ...expenseFields,
  eventId: expenseFields.eventId.optional().default(null),
  dueDate: expenseFields.dueDate.optional().default(null),
  vendorId: expenseFields.vendorId.optional().default(null),
  vendorName: expenseFields.vendorName.optional().default(""),
  notes: expenseFields.notes.optional().default(""),
  initialPaidAmountMinor: optionalMoneyMinor.optional().default("0"),
  initialPaymentMethod: z.enum(PAYMENT_METHODS).optional().default("BANK_TRANSFER"),
  initialPaymentReference: z.string().trim().max(160).optional().default(""),
}).strict().superRefine((value, ctx) => {
  validateDueDate(value, ctx);
  if (/^\d+$/.test(value.initialPaidAmountMinor) && /^\d+$/.test(value.amountMinor) && BigInt(value.initialPaidAmountMinor) > BigInt(value.amountMinor)) {
    ctx.addIssue({ code: "custom", path: ["initialPaidAmountMinor"], message: "Paid amount cannot exceed the total amount." });
  }
});

export const updateExpenseSchema = z.object(expenseFields).partial().strict()
  .refine((value) => Object.keys(value).length > 0, { message: "Include at least one expense detail to update." })
  .superRefine(validateDueDate);

export const recordExpensePaymentSchema = z.object({
  amountMinor: moneyMinor,
  paymentDate: localDate,
  paidBy: z.string().trim().min(2, "Enter who made this payment.").max(120),
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().trim().max(160).optional().default(""),
  note: z.string().trim().max(500).optional().default(""),
}).strict();

export const expenseListQuerySchema = z.object({
  q: z.string().trim().max(100).default(""),
  paymentStatus: z.enum(EXPENSE_PAYMENT_STATUSES).optional(),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  eventId: objectId.optional(),
  dateFrom: localDate.optional(),
  dateTo: localDate.optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
}).strict().refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, {
  path: ["dateTo"], message: "End date must be on or after the start date.",
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type RecordExpensePaymentInput = z.infer<typeof recordExpensePaymentSchema>;
export type ExpenseListQuery = z.infer<typeof expenseListQuerySchema>;
