export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export const TASK_DUE_FILTERS = ["OVERDUE", "THIS_WEEK", "UPCOMING", "NO_DUE_DATE"] as const;

export const TASK_PRIORITY_LABELS: Record<(typeof TASK_PRIORITIES)[number], string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const TASK_STATUS_LABELS: Record<(typeof TASK_STATUSES)[number], string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const TASKS_PAGE_SIZE = 50;

export function canManageTasks(role: string) {
  return role === "ADMIN" || role === "MANAGER";
}
