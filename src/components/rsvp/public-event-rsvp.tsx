"use client";

import { useState } from "react";
import { WorkspaceIcon } from "@/components/weddings/workspace-icon";
import type { PublicGuestInvitationView } from "@/modules/invitations/service";

type EventRsvp = PublicGuestInvitationView["events"][number]["rsvp"];

export function PublicEventRsvp({ token, eventId, initialRsvp, closed, maximum }: {
  token: string;
  eventId: string;
  initialRsvp: EventRsvp;
  closed: boolean;
  maximum: number;
}) {
  const [response, setResponse] = useState<"YES" | "NO" | null>(initialRsvp?.response ?? null);
  const [attendeeCount, setAttendeeCount] = useState(initialRsvp?.attendeeCount || 1);
  const [saved, setSaved] = useState(initialRsvp);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirmationDelivered, setConfirmationDelivered] = useState(false);

  async function submit() {
    if (!response) { setError("Choose whether you can join this ceremony."); return; }
    setPending(true); setError(""); setConfirmationDelivered(false);
    try {
      const request = await fetch(`/api/v1/public/invitations/${encodeURIComponent(token)}/rsvps/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response, attendeeCount: response === "YES" ? attendeeCount : 0 }),
      });
      const payload = await request.json();
      if (!request.ok) throw new Error(payload.error?.message ?? "We couldn’t save this response.");
      setSaved(payload.data);
      setConfirmationDelivered(Boolean(payload.data.confirmationDelivered));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn’t save this response.");
    } finally {
      setPending(false);
    }
  }

  if (closed) {
    return <section className="mt-6 rounded-xl border border-outline-variant/50 bg-surface-container-low p-4" aria-label="RSVP status">
      <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-primary"><WorkspaceIcon name="lock" /></span><div><p className="font-semibold">Responses are closed</p><p className="mt-1 text-body-sm leading-6 text-on-surface-variant">{saved ? saved.response === "YES" ? `Your saved response is attending for ${saved.attendeeCount}.` : "Your saved response is unable to attend." : "The planning team has closed responses for this ceremony."}</p></div></div>
    </section>;
  }

  return <section className="mt-6 border-t border-outline-variant/35 pt-6" aria-label="Respond to this ceremony">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-label-sm font-semibold uppercase tracking-[0.12em] text-primary">Your response</p><h4 className="mt-1 font-serif text-title-lg">Will you be joining us?</h4></div>{saved && <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container px-3 py-1 text-label-sm font-semibold text-on-secondary-container"><WorkspaceIcon name="check" />Response saved</span>}</div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <button type="button" aria-pressed={response === "YES"} onClick={() => { setResponse("YES"); setError(""); }} className={`rounded-xl border p-4 text-left transition-colors ${response === "YES" ? "border-secondary bg-secondary-container/60 text-on-secondary-container" : "border-outline-variant/50 bg-surface hover:border-primary/45"}`}><span className="block font-semibold">Joyfully accepting</span><span className="mt-1 block text-body-sm opacity-80">I’ll celebrate with you</span></button>
      <button type="button" aria-pressed={response === "NO"} onClick={() => { setResponse("NO"); setError(""); }} className={`rounded-xl border p-4 text-left transition-colors ${response === "NO" ? "border-tertiary bg-tertiary-fixed/60 text-on-tertiary-fixed" : "border-outline-variant/50 bg-surface hover:border-primary/45"}`}><span className="block font-semibold">Unable to attend</span><span className="mt-1 block text-body-sm opacity-80">Sending warm wishes</span></button>
    </div>
    {response === "YES" && <div className="mt-4 flex flex-col gap-3 rounded-xl bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between"><div><label htmlFor={`attendees-${eventId}`} className="font-semibold">Number attending</label><p className="mt-1 text-label-sm text-on-surface-variant">Up to {maximum} attendees on this response</p></div><div className="flex items-center gap-3"><button type="button" aria-label="Decrease attendee count" onClick={() => setAttendeeCount((value) => Math.max(1, value - 1))} className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface text-xl font-semibold">−</button><input id={`attendees-${eventId}`} value={attendeeCount} onChange={(event) => setAttendeeCount(Math.min(maximum, Math.max(1, Number.parseInt(event.target.value, 10) || 1)))} inputMode="numeric" className="h-11 w-16 rounded-lg border border-outline-variant bg-surface text-center font-semibold" /><button type="button" aria-label="Increase attendee count" onClick={() => setAttendeeCount((value) => Math.min(maximum, value + 1))} className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface text-xl font-semibold">+</button></div></div>}
    {error && <p role="alert" className="mt-4 rounded-lg bg-error-container px-4 py-3 text-body-sm text-on-error-container">{error}</p>}
    {saved && !error && <p role="status" className="mt-4 text-body-sm text-on-surface-variant">{saved.response === "YES" ? `Saved for ${saved.attendeeCount} ${saved.attendeeCount === 1 ? "attendee" : "attendees"}.` : "Saved as unable to attend."}{confirmationDelivered ? " A confirmation email is on its way." : ""}</p>}
    <button type="button" onClick={submit} disabled={pending || !response} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-body-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"><WorkspaceIcon name={saved ? "refresh" : "check"} />{pending ? "Saving response…" : saved ? "Update response" : "Save response"}</button>
  </section>;
}
