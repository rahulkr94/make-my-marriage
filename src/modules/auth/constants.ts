export const SESSION_COOKIE = "mmm_session";
export const SESSION_ABSOLUTE_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_IDLE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1000;
export const PASSWORD_RESET_AGE_MS = 60 * 60 * 1000;

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  priority: "high" as const,
};
