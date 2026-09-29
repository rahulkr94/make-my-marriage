"use client";

import { useEffect } from "react";
import { AUTH_SESSION_EVENT_KEY, isLogoutEvent } from "@/modules/auth/client-session";

export function WorkspaceSessionSync() {
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== AUTH_SESSION_EVENT_KEY || !isLogoutEvent(event.newValue)) return;
      window.location.replace("/login");
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return null;
}
