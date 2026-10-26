import { z } from "zod";
import { VENDOR_CATEGORIES, VENDOR_PAYMENT_STATUSES, VENDOR_SORTS } from "./constants";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Choose a valid option.");
const contact = (max: number) => z.string().trim().max(max);
const nonNegativeMoney = z.string().regex(/^\d+$/, "Enter an amount in paise using digits only.")
  .refine((value) => BigInt(value) <= BigInt("9000000000000000"), "Amount is too large.");
const optionalQuote = z.union([nonNegativeMoney, z.literal(""), z.null()])
  .transform((value) => value === "" || value === null ? null : value);

const vendorFields = {
  name: z.string().trim().min(2, "Enter a vendor name.").max(160, "Use no more than 160 characters."),
  category: z.enum(VENDOR_CATEGORIES),
  contactName: contact(120),
  email: z.union([z.email("Enter a valid email address."), z.literal("")]),
  phone: contact(40),
  address: contact(500),
  eventIds: z.array(objectId).max(50, "Choose no more than 50 ceremonies.").refine((items) => new Set(items).size === items.length, "Choose each ceremony once."),
  quotedAmountMinor: optionalQuote,
  paidAmountMinor: nonNegativeMoney,
  notes: contact(3000),
};

export const createVendorSchema = z.object({
  ...vendorFields,
  contactName: vendorFields.contactName.optional().default(""),
  email: vendorFields.email.optional().default(""),
  phone: vendorFields.phone.optional().default(""),
  address: vendorFields.address.optional().default(""),
  eventIds: vendorFields.eventIds.optional().default([]),
  quotedAmountMinor: vendorFields.quotedAmountMinor.optional().default(null),
  paidAmountMinor: vendorFields.paidAmountMinor.optional().default("0"),
  notes: vendorFields.notes.optional().default(""),
}).strict();
export const updateVendorSchema = z.object(vendorFields).partial().strict()
  .refine((value) => Object.keys(value).length > 0, "Include at least one vendor detail to update.");

export const vendorListQuerySchema = z.object({
  q: z.string().trim().max(100).default(""),
  category: z.enum(VENDOR_CATEGORIES).optional(),
  eventId: objectId.optional(),
  paymentStatus: z.enum(VENDOR_PAYMENT_STATUSES).optional(),
  sort: z.enum(VENDOR_SORTS).default("RECENT"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
}).strict();

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
export type VendorListQuery = z.infer<typeof vendorListQuerySchema>;
