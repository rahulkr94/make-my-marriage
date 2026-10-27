"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { WorkspaceIcon } from "@/components/weddings/workspace-icon";
import { useModalA11y } from "@/shared/use-modal-a11y";

type EventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED";
type ConfirmAction = "cancel" | "remove" | null;
type ApiPayload = { error?: { message?: string } };

export function EventLifecycleActions({ weddingId, eventId, status, returnToEvents = false, compact = false }: {
  weddingId: string;
  eventId: string;
  status: EventStatus;
  returnToEvents?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState<ConfirmAction>(null);
  const [pending, setPending] = useState<"cancel" | "restore" | "remove" | null>(null);
  const [error, setError] = useState("");
  const size = compact ? "h-10 px-3 text-label-md" : "min-h-11 px-4 py-2.5 text-body-sm";

  async function change(action: "cancel" | "restore" | "remove") {
    if (pending) return;
    setPending(action);
    setError("");
    try {
      const response = await fetch(`/api/v1/weddings/${weddingId}/events/${eventId}`, {
        method: action === "remove" ? "DELETE" : "PATCH",
        headers: action === "remove" ? undefined : { "Content-Type": "application/json" },
        body: action === "remove" ? undefined : JSON.stringify({ status: action === "cancel" ? "CANCELLED" : "DRAFT" }),
      });
      const payload = await response.json() as ApiPayload;
      if (!response.ok) throw new Error(payload.error?.message ?? `We couldn’t ${action} this event.`);
      setConfirmation(null);
      if (action === "remove" && returnToEvents) router.replace("/events");
      else router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `We couldn’t ${action} this event.`);
    } finally {
      setPending(null);
    }
  }

  return <>
    <span className="inline-flex self-start flex-col items-stretch gap-1">
      <span className="inline-flex flex-wrap items-start gap-2">
        {status === "PUBLISHED" && <button type="button" onClick={() => { setError(""); setConfirmation("cancel"); }} className={`inline-flex items-center justify-center gap-2 rounded-lg bg-tertiary-fixed font-semibold text-on-tertiary-fixed hover:brightness-95 ${size}`}><WorkspaceIcon name="close" />Cancel event</button>}
        {status === "CANCELLED" && <button type="button" onClick={() => change("restore")} disabled={pending !== null} className={`inline-flex items-center justify-center gap-2 rounded-lg bg-secondary-container font-semibold text-on-secondary-container hover:bg-secondary-fixed disabled:opacity-50 ${size}`}><WorkspaceIcon name={pending === "restore" ? "clock" : "undo"} />{pending === "restore" ? "Restoring…" : "Restore to draft"}</button>}
        <button type="button" onClick={() => { setError(""); setConfirmation("remove"); }} className={`inline-flex items-center justify-center gap-2 rounded-lg bg-error-container font-semibold text-on-error-container hover:brightness-95 ${size}`}><WorkspaceIcon name="trash" />Remove</button>
      </span>
      {error && !confirmation && <span role="alert" className="max-w-72 text-label-sm text-error">{error}</span>}
    </span>
    {confirmation && <ConfirmationDialog action={confirmation} pending={pending === confirmation} error={error} onClose={() => { if (!pending) { setConfirmation(null); setError(""); } }} onConfirm={() => change(confirmation)} />}
  </>;
}

function ConfirmationDialog({ action, pending, error, onClose, onConfirm }: { action: Exclude<ConfirmAction, null>; pending: boolean; error: string; onClose: () => void; onConfirm: () => void }) {
  const removing = action === "remove";
  const dialogRef = useModalA11y(onClose);
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-inverse-surface/45 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby={`event-${action}-title`} className="w-full max-w-md rounded-t-2xl bg-surface p-6 shadow-2xl sm:rounded-xl sm:p-8">
      <span className={`flex h-12 w-12 items-center justify-center rounded-full ${removing ? "bg-error-container text-on-error-container" : "bg-tertiary-fixed text-on-tertiary-fixed"}`}><WorkspaceIcon name={removing ? "trash" : "close"} className="text-2xl" /></span>
      <p className="mt-5 text-label-sm font-semibold uppercase tracking-[0.12em] text-tertiary">Ceremony lifecycle</p>
      <h2 id={`event-${action}-title`} className="mt-1 font-serif text-headline-sm">{removing ? "Remove this event?" : "Cancel this event?"}</h2>
      <p className="mt-3 text-body-sm leading-6 text-on-surface-variant">{removing ? "The event will disappear from the workspace and all shared schedules. Its record will be retained for planning history, but it cannot be restored from the current interface." : "The event will stay in the planning timeline with a Cancelled label. Members and future guest invitations will no longer show it."}</p>
      {error && <p role="alert" className="mt-4 rounded-lg bg-error-container p-3 text-body-sm text-on-error-container">{error}</p>}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={pending} className="rounded-lg bg-surface-container px-4 py-2.5 text-body-sm font-semibold disabled:opacity-50">{removing ? "Keep event" : "Keep published"}</button><button type="button" onClick={onConfirm} disabled={pending} className={`rounded-lg px-4 py-2.5 text-body-sm font-semibold disabled:opacity-50 ${removing ? "bg-error text-on-error" : "bg-primary text-on-primary"}`}>{pending ? removing ? "Removing…" : "Cancelling…" : removing ? "Remove event" : "Cancel event"}</button></div>
    </section>
  </div>;
}
