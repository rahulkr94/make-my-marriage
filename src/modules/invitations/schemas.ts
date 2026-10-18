import { z } from "zod";
import { GUEST_SIDES } from "@/modules/guests/constants";
import { GUEST_INVITATION_STATUSES } from "./constants";

export const guestInvitationListQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  status: z.enum(GUEST_INVITATION_STATUSES).optional(),
  side: z.enum(GUEST_SIDES).optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional().default(1),
}).strict();

export type GuestInvitationListQuery = z.infer<typeof guestInvitationListQuerySchema>;
