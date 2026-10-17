"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { WorkspaceIcon } from "@/components/weddings/workspace-icon";

type ApiPayload = { error?: { message?: string } };

export function EventPublishButton({ weddingId, eventId, compact = false }: { weddingId: string; eventId: string; compact?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function publish() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/weddings/${weddingId}/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PUBLISHED" }),
      });
      const payload = await response.json() as ApiPayload;
      if (!response.ok) throw new Error(payload.error?.message ?? "We couldn’t publish this event.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn’t publish this event.");
    } finally {
      setPending(false);
    }
  }

  return <span className="inline-flex flex-col items-stretch gap-1"><button type="button" onClick={publish} disabled={pending} className={`inline-flex items-center justify-center gap-2 rounded-lg bg-secondary-container font-semibold text-on-secondary-container hover:bg-secondary-fixed disabled:opacity-50 ${compact ? "px-3 py-2 text-label-md" : "px-5 py-3 text-body-sm"}`}><WorkspaceIcon name={pending ? "clock" : "check"} />{pending ? "Publishing…" : "Publish event"}</button>{error && <span role="alert" className="max-w-56 text-label-sm text-error">{error}</span>}</span>;
}
