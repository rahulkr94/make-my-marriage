export const NOTIFICATION_TYPES = [
  "EVENT_REMINDER",
  "RSVP_REMINDER",
  "TASK_DUE_REMINDER",
  "OVERDUE_TASK_DIGEST",
  "PHOTO_SUBMISSION_DIGEST",
] as const;

export const NOTIFICATION_STATUSES = ["QUEUED", "CLAIMED", "SENT", "FAILED", "CANCELLED"] as const;
export const NOTIFICATION_PAGE_SIZE = 20;
export const NOTIFICATION_MAX_ATTEMPTS = 3;
export const NOTIFICATION_BATCH_SIZE = 25;

export const NOTIFICATION_TYPE_LABELS: Record<(typeof NOTIFICATION_TYPES)[number], string> = {
  EVENT_REMINDER: "Event reminder",
  RSVP_REMINDER: "RSVP reminder",
  TASK_DUE_REMINDER: "Task due reminder",
  OVERDUE_TASK_DIGEST: "Overdue task digest",
  PHOTO_SUBMISSION_DIGEST: "Guest photo digest",
};

export function canManageNotifications(role: string) {
  return role === "ADMIN" || role === "MANAGER";
}
