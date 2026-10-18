export const GUEST_SIDES = ["BRIDE", "GROOM", "COMMON"] as const;
export const GUEST_SIDE_LABELS: Record<(typeof GUEST_SIDES)[number], string> = { BRIDE: "Bride’s side", GROOM: "Groom’s side", COMMON: "Common" };
export const GUEST_RELATIONSHIPS = ["FAMILY", "RELATIVE", "FRIEND", "COLLEAGUE", "OTHER"] as const;
export const GUEST_RELATIONSHIP_LABELS: Record<(typeof GUEST_RELATIONSHIPS)[number], string> = { FAMILY: "Family", RELATIVE: "Relative", FRIEND: "Friend", COLLEAGUE: "Colleague", OTHER: "Other" };
export const GUESTS_PAGE_SIZE = 30;
export function canManageGuests(role: string) { return role === "ADMIN" || role === "MANAGER"; }
