export const WEDDING_TIME_ZONES = [
  { value: "Asia/Kolkata", label: "India Standard Time (Kolkata)" },
  { value: "Asia/Dubai", label: "Gulf Standard Time (Dubai)" },
  { value: "Asia/Singapore", label: "Singapore Time" },
  { value: "Asia/Bangkok", label: "Indochina Time (Bangkok)" },
  { value: "Europe/London", label: "United Kingdom Time (London)" },
  { value: "America/New_York", label: "Eastern Time (New York)" },
  { value: "America/Los_Angeles", label: "Pacific Time (Los Angeles)" },
  { value: "Australia/Sydney", label: "Eastern Australia Time (Sydney)" },
  { value: "UTC", label: "Coordinated Universal Time" },
] as const;

export function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}
