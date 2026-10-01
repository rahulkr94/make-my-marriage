import { z } from "zod";
import { isValidTimeZone } from "./time-zones";

const boundedName = z.string().trim().min(2, "Enter at least 2 characters.").max(80, "Use no more than 80 characters.");

const weddingFields = {
  brideName: boundedName,
  groomName: boundedName,
  weddingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid wedding date.").refine(isCalendarDate, "Choose a valid wedding date."),
  timeZone: z.string().trim().min(1, "Choose a time zone.").max(100).refine(isValidTimeZone, "Choose a valid time zone."),
  mainVenueName: z.string().trim().min(2, "Enter the main venue name.").max(120, "Use no more than 120 characters."),
  mainAddress: z.string().trim().min(5, "Enter the main venue address.").max(300, "Use no more than 300 characters."),
  description: z.string().trim().max(1000, "Use no more than 1,000 characters."),
};

export const createWeddingSchema = z.object({
  ...weddingFields,
  description: weddingFields.description.optional().default(""),
}).strict();

export const updateWeddingSchema = z.object(weddingFields).partial().strict().refine(
  (value) => Object.keys(value).length > 0,
  { message: "Include at least one wedding detail to update." },
);

export type CreateWeddingInput = z.infer<typeof createWeddingSchema>;
export type UpdateWeddingInput = z.infer<typeof updateWeddingSchema>;

function isCalendarDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
