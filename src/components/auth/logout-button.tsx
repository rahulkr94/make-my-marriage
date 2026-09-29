"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { publishLogoutEvent } from "@/modules/auth/client-session";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="flex items-center gap-3">
      {error && <p role="alert" className="text-body-sm text-error">{error}</p>}
      <button
        type="button"
        disabled={pending}
        className="rounded border border-outline-variant px-5 py-3 text-body-sm font-semibold hover:border-primary disabled:opacity-50"
        onClick={async () => {
          setPending(true);
          setError("");
          try {
            const response = await fetch("/api/v1/auth/logout", { method: "POST" });
            if (!response.ok) throw new Error("Logout failed");
            publishLogoutEvent();
            router.replace("/login");
            router.refresh();
          } catch {
            setError("We couldn’t log you out. Please try again.");
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "Logging out…" : "Log out"}
      </button>
    </div>
  );
}
