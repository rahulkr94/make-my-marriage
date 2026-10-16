export const EVENT_TYPES = ["HALDI", "MEHENDI", "SANGEET", "WEDDING", "RECEPTION", "CUSTOM"] as const;
export const EVENT_TYPE_LABELS: Record<(typeof EVENT_TYPES)[number], string> = {
  HALDI: "Haldi", MEHENDI: "Mehendi", SANGEET: "Sangeet", WEDDING: "Wedding", RECEPTION: "Reception", CUSTOM: "Custom",
};
export function canManageEvents(role: string) { return role === "ADMIN" || role === "MANAGER"; }
export const EVENTS_PAGE_SIZE = 30;
