import { Temporal } from "@js-temporal/polyfill";
import { z } from "zod";
import { EVENT_TYPES } from "./constants";

function validDate(value: string) {
  try { Temporal.PlainDate.from(value); return true; } catch { return false; }
}
function safeHttpsUrl(value: string) {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
}
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time.");
const eventFields = {
  name: z.string().trim().min(2, "Enter an event name.").max(120, "Use no more than 120 characters."),
  type: z.enum(EVENT_TYPES, { message: "Choose a ceremony type." }),
  localDate: z.string().regex(/^(19|20|21)\d{2}-\d{2}-\d{2}$/, "Choose a valid date.").refine(validDate, "Choose a valid calendar date."),
  startLocalTime: time,
  endLocalTime: z.union([time, z.literal("")]),
  endsNextDay: z.boolean(),
  venueName: z.string().trim().min(2, "Enter a venue name.").max(120),
  address: z.string().trim().min(5, "Enter the venue address.").max(300),
  mapUrl: z.string().trim().max(2048).refine(safeHttpsUrl, "Use a full HTTPS map link without login credentials."),
  liveStreamUrl: z.string().trim().max(2048).refine(safeHttpsUrl, "Use a full HTTPS live-stream link without login credentials."),
  description: z.string().trim().max(2000, "Use no more than 2,000 characters."),
};
export const createEventSchema = z.object({
  ...eventFields,
  endLocalTime: eventFields.endLocalTime.optional().default(""),
  endsNextDay: eventFields.endsNextDay.optional().default(false),
  mapUrl: eventFields.mapUrl.optional().default(""),
  liveStreamUrl: eventFields.liveStreamUrl.optional().default(""),
  description: eventFields.description.optional().default(""),
  status: z.enum(["DRAFT", "PUBLISHED"]),
}).strict().superRefine((value, ctx) => {
  if (value.endsNextDay && !value.endLocalTime) ctx.addIssue({ code: "custom", path: ["endLocalTime"], message: "Enter an end time when ending the next day." });
  if (value.endLocalTime && !value.endsNextDay && value.endLocalTime <= value.startLocalTime) ctx.addIssue({ code: "custom", path: ["endLocalTime"], message: "End time must follow the start time. For overnight events, choose Ends the next day." });
});
export type CreateEventInput = z.infer<typeof createEventSchema>;
export const updateEventSchema = z.object({
  ...eventFields,
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED"]),
}).partial().strict().refine((value) => Object.keys(value).length > 0, { message: "Include at least one event detail to update." });
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export const eventListQuerySchema = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1) }).strict();
