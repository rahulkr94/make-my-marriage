"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { publishLogoutEvent } from "@/modules/auth/client-session";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="flex items-center gap-3">
      {error && <p role="alert" className="text-body-sm text-error">{error}</p>}
      <button
        type="button"
        disabled={pending}
        className={compact
          ? "rounded px-2 py-2 text-label-sm font-semibold uppercase tracking-[0.12em] text-on-surface-variant transition-colors hover:text-primary disabled:opacity-50"
          : "rounded border border-outline-variant px-5 py-3 text-body-sm font-semibold hover:border-primary disabled:opacity-50"}
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
