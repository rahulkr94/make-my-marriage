export const AUTH_SESSION_EVENT_KEY = "mmm_auth_session_event";

type AuthSessionEvent = {
  type: "logout";
  occurredAt: number;
};

export function publishLogoutEvent() {
  if (typeof window === "undefined") return;

  const event: AuthSessionEvent = { type: "logout", occurredAt: Date.now() };
  try {
    window.localStorage.setItem(AUTH_SESSION_EVENT_KEY, JSON.stringify(event));
  } catch {
    // The server-side logout still succeeded when browser storage is unavailable.
  }
}

export function isLogoutEvent(value: string | null) {
  if (!value) return false;

  try {
    const event = JSON.parse(value) as Partial<AuthSessionEvent>;
    return event.type === "logout" && typeof event.occurredAt === "number";
  } catch {
    return false;
  }
}
