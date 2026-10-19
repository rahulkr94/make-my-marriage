import { z } from "zod";
import { GUEST_SIDES } from "@/modules/guests/constants";
import { RSVP_FILTER_RESPONSES, RSVP_RESPONSES, getRsvpMaxAttendees } from "./constants";

export const publicRsvpSchema = z.object({
  response: z.enum(RSVP_RESPONSES),
  attendeeCount: z.number().int(),
}).strict().superRefine((value, context) => {
  const maximum = getRsvpMaxAttendees();
  if (value.response === "YES" && (value.attendeeCount < 1 || value.attendeeCount > maximum)) {
    context.addIssue({ code: "custom", path: ["attendeeCount"], message: `Choose between 1 and ${maximum} attendees.` });
  }
  if (value.response === "NO" && value.attendeeCount !== 0) {
    context.addIssue({ code: "custom", path: ["attendeeCount"], message: "A declined response must have zero attendees." });
  }
});

export const rsvpListQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  eventId: z.string().regex(/^[a-f\d]{24}$/i, "Choose a valid event.").optional(),
  response: z.enum(RSVP_FILTER_RESPONSES).optional(),
  side: z.enum(GUEST_SIDES).optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional().default(1),
}).strict();

export type PublicRsvpInput = z.infer<typeof publicRsvpSchema>;
export type RsvpListQuery = z.infer<typeof rsvpListQuerySchema>;
