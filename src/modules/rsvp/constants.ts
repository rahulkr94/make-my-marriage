export const RSVP_RESPONSES = ["YES", "NO"] as const;
export type RsvpResponse = (typeof RSVP_RESPONSES)[number];

export const RSVP_FILTER_RESPONSES = [...RSVP_RESPONSES, "PENDING"] as const;
export type RsvpFilterResponse = (typeof RSVP_FILTER_RESPONSES)[number];

export const RSVP_RESPONSE_LABELS: Record<RsvpFilterResponse, string> = {
  YES: "Accepted",
  NO: "Declined",
  PENDING: "Awaiting response",
};

export const RSVP_PAGE_SIZE = 25;

export function getRsvpMaxAttendees() {
  const configured = Number.parseInt(process.env.RSVP_MAX_ATTENDEES ?? "20", 10);
  return Number.isInteger(configured) && configured >= 1 && configured <= 100 ? configured : 20;
}
