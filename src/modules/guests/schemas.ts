import { z } from "zod";
import { GUEST_RELATIONSHIPS, GUEST_SIDES } from "./constants";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Choose a valid event.");
const email = z.union([z.string().trim().email("Enter a valid email address.").max(320), z.literal("")]).transform((value) => value.toLowerCase());
const phone = z.string().trim().max(30, "Use no more than 30 characters.").refine((value) => !value || (/^[+\d][\d\s()-]{5,29}$/.test(value) && /\d{6}/.test(value.replace(/\D/g, ""))), "Enter a valid phone number.");
const fields = {
  name: z.string().trim().min(2, "Enter the guest’s name.").max(120, "Use no more than 120 characters."),
  email,
  phone,
  side: z.enum(GUEST_SIDES, { message: "Choose the guest’s wedding side." }),
  relationship: z.enum(GUEST_RELATIONSHIPS, { message: "Choose a relationship." }),
  notes: z.string().trim().max(1000, "Use no more than 1,000 characters."),
  eventIds: z.array(objectId).max(100, "Assign no more than 100 events.").refine((items) => new Set(items).size === items.length, "Choose each event only once."),
};
export const createGuestSchema = z.object({
  ...fields,
  email: fields.email.optional().default(""),
  phone: fields.phone.optional().default(""),
  notes: fields.notes.optional().default(""),
  eventIds: fields.eventIds.optional().default([]),
}).strict();
export type CreateGuestInput = z.infer<typeof createGuestSchema>;
export const updateGuestSchema = z.object(fields).partial().strict().refine((value) => Object.keys(value).length > 0, { message: "Include at least one guest detail to update." });
export type UpdateGuestInput = z.infer<typeof updateGuestSchema>;
export const guestListQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  side: z.enum(GUEST_SIDES).optional(),
  relationship: z.enum(GUEST_RELATIONSHIPS).optional(),
  eventId: objectId.optional(),
  page: z.coerce.number().int().min(1).max(10000).optional().default(1),
}).strict();
export type GuestListQuery = z.infer<typeof guestListQuerySchema>;
