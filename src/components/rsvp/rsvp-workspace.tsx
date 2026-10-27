"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { WorkspaceIcon } from "@/components/weddings/workspace-icon";
import { RSVP_RESPONSE_LABELS } from "@/modules/rsvp/constants";
import type { RsvpListView } from "@/modules/rsvp/service";
import { useModalA11y } from "@/shared/use-modal-a11y";

export function RsvpWorkspace({ weddingId, data }: { weddingId: string; data: RsvpListView }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<RsvpListView["eventSummaries"][number] | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function updateWindow(event: RsvpListView["eventSummaries"][number]) {
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/v1/weddings/${weddingId}/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rsvpClosedAt: event.rsvpClosed ? null : new Date().toISOString() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "The RSVP window could not be updated.");
      setConfirm(null); router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The RSVP window could not be updated.");
    } finally { setPending(false); }
  }

  return <>
    {error && <p role="alert" className="mt-5 rounded-lg bg-error-container px-4 py-3 text-body-sm text-on-error-container">{error}</p>}
    <section className="mt-8" aria-labelledby="ceremony-response-title"><div className="flex items-end justify-between gap-3"><div><p className="text-label-sm font-semibold uppercase tracking-[0.12em] text-primary">Ceremony breakdown</p><h2 id="ceremony-response-title" className="mt-1 font-serif text-headline-sm">Responses by event</h2></div><span className="text-body-sm text-on-surface-variant">{data.eventSummaries.length} published event{data.eventSummaries.length === 1 ? "" : "s"}</span></div>
      {data.eventSummaries.length ? <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{data.eventSummaries.map((event) => <article key={event.id} className="rounded-xl border-b-4 border-outline-variant bg-surface-container-low p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-label-sm font-semibold uppercase tracking-[0.08em] text-on-surface-variant">{formatDate(event.localDate)}</p><h3 className="mt-1 font-serif text-title-lg">{event.name}</h3></div><span className={`rounded-full px-2.5 py-1 text-label-sm font-semibold ${event.rsvpClosed ? "bg-surface-container-high text-on-surface-variant" : "bg-secondary-container text-on-secondary-container"}`}>{event.rsvpClosed ? "Closed" : "Open"}</span></div><dl className="mt-5 grid grid-cols-2 gap-3 text-body-sm"><Count label="Accepted" value={event.accepted} /><Count label="Declined" value={event.declined} /><Count label="Awaiting" value={event.pending} /><Count label="Expected" value={event.expectedAttendees} /></dl><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-container"><div className="h-full bg-secondary" style={{ width: `${event.responseRate}%` }} /></div><button type="button" onClick={() => setConfirm(event)} className="mt-5 w-full rounded-lg bg-surface-container px-3 py-2.5 text-body-sm font-semibold text-primary hover:bg-surface-container-high">{event.rsvpClosed ? "Reopen RSVP" : "Close RSVP"}</button></article>)}</div> : <Empty />}
    </section>

    <section className="mt-8 overflow-hidden rounded-xl bg-surface-container-low shadow-sm" aria-label="Guest RSVP records">
      {data.rows.length ? <><div className="hidden overflow-x-auto md:block"><table className="w-full border-collapse text-left"><thead className="text-label-sm font-semibold uppercase tracking-[0.08em] text-on-surface-variant"><tr><th className="px-5 py-4">Guest</th><th className="px-5 py-4">Ceremony</th><th className="px-5 py-4">Response</th><th className="px-5 py-4">Attendees</th><th className="px-5 py-4">Responded</th><th className="px-5 py-4">Invitation</th></tr></thead><tbody className="divide-y divide-outline-variant/25">{data.rows.map((row) => <tr key={row.id} className="bg-surface/20 align-top transition-colors hover:bg-surface/70"><td className="px-5 py-5"><Link href={`/guests/${row.guest.id}/invitation`} className="font-semibold hover:text-primary hover:underline">{row.guest.name}</Link><p className="mt-1 text-label-sm text-on-surface-variant">{row.guest.sideLabel}{row.guest.email ? ` · ${row.guest.email}` : ""}</p></td><td className="px-5 py-5"><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-tertiary-fixed text-tertiary"><WorkspaceIcon name="calendar" className="text-lg" /></span><div><p className="font-semibold">{row.event.name}</p><p className="mt-1 text-label-sm text-on-surface-variant">{formatDate(row.event.localDate)}</p></div></div></td><td className="px-5 py-5"><ResponseBadge response={row.rsvp?.response ?? "PENDING"} /></td><td className="px-5 py-5 text-body-sm">{row.rsvp?.response === "YES" ? row.rsvp.attendeeCount : "—"}</td><td className="px-5 py-5 text-body-sm text-on-surface-variant">{row.rsvp ? formatTimestamp(row.rsvp.respondedAt) : "Awaiting reply"}</td><td className="px-5 py-5 text-body-sm text-on-surface-variant">{invitationLabel(row.invitationStatus)}</td></tr>)}</tbody></table></div><div className="space-y-3 p-3 md:hidden">{data.rows.map((row) => <article key={row.id} className="rounded-xl bg-surface/70 p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><Link href={`/guests/${row.guest.id}/invitation`} className="font-semibold hover:text-primary">{row.guest.name}</Link><p className="mt-1 text-label-sm text-on-surface-variant">{row.guest.sideLabel}</p></div><ResponseBadge response={row.rsvp?.response ?? "PENDING"} /></div><div className="mt-4 rounded-lg bg-surface-container-low p-3 text-body-sm"><p className="font-semibold">{row.event.name}</p><p className="mt-1 text-on-surface-variant">{formatDate(row.event.localDate)} · {row.rsvp?.response === "YES" ? `${row.rsvp.attendeeCount} attending` : row.rsvp?.response === "NO" ? "Not attending" : "No response yet"}</p></div></article>)}</div></> : <Empty filtered />}
    </section>
    {confirm && <ConfirmDialog event={confirm} pending={pending} onCancel={() => setConfirm(null)} onConfirm={() => updateWindow(confirm)} />}
  </>;
}

function Count({ label, value }: { label: string; value: number }) { return <div className="rounded-lg bg-surface-container-low p-3"><dt className="text-label-sm text-on-surface-variant">{label}</dt><dd className="mt-1 font-serif text-title-lg">{value}</dd></div>; }
function ResponseBadge({ response }: { response: "YES" | "NO" | "PENDING" }) { const styles = response === "YES" ? "bg-secondary-container text-on-secondary-container" : response === "NO" ? "bg-error-container text-on-error-container" : "bg-tertiary-fixed text-on-tertiary-fixed"; return <span className={`inline-flex rounded-full px-2.5 py-1 text-label-sm font-semibold ${styles}`}>{RSVP_RESPONSE_LABELS[response]}</span>; }
function Empty({ filtered = false }: { filtered?: boolean }) { return <div className="flex min-h-48 flex-col items-center justify-center px-5 py-10 text-center"><WorkspaceIcon name="check" className="text-3xl text-tertiary" /><h3 className="mt-3 font-serif text-headline-sm">{filtered ? "No responses match these filters" : "No published ceremony assignments yet"}</h3><p className="mt-2 max-w-lg text-body-sm text-on-surface-variant">{filtered ? "Clear or change the filters to see other guest assignments." : "Publish events and assign guests before collecting responses."}</p></div>; }
function ConfirmDialog({ event, pending, onCancel, onConfirm }: { event: RsvpListView["eventSummaries"][number]; pending: boolean; onCancel: () => void; onConfirm: () => void }) { const dialogRef = useModalA11y(onCancel); return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-inverse-surface/45 p-0 backdrop-blur-sm sm:items-center sm:p-5"><section ref={dialogRef} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby="rsvp-window-title" className="w-full max-w-lg rounded-t-2xl bg-surface p-6 shadow-2xl sm:rounded-xl sm:p-8"><p className="text-label-sm font-semibold uppercase tracking-[0.12em] text-primary">Ceremony responses</p><h2 id="rsvp-window-title" className="mt-2 font-serif text-headline-sm">{event.rsvpClosed ? `Reopen responses for ${event.name}?` : `Close responses for ${event.name}?`}</h2><p className="mt-3 text-body-sm leading-6 text-on-surface-variant">{event.rsvpClosed ? "Assigned guests with active private links will be able to submit or update responses again." : `Guests will still see their saved response but cannot submit changes. ${event.pending} assigned guest ${event.pending === 1 ? "record is" : "records are"} still awaiting a response. You can reopen RSVP later.`}</p><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button onClick={onCancel} disabled={pending} className="rounded-lg bg-surface-container px-4 py-2.5 text-body-sm font-semibold disabled:opacity-50">Cancel</button><button onClick={onConfirm} disabled={pending} className="rounded-lg bg-primary px-4 py-2.5 text-body-sm font-semibold text-on-primary disabled:opacity-50">{pending ? "Saving…" : event.rsvpClosed ? "Reopen RSVP" : "Close RSVP"}</button></div></section></div>; }
function invitationLabel(value: string) { return value === "SENT" ? "Email delivered" : value === "READY" ? "Private link ready" : value === "DELIVERY_FAILED" ? "Delivery failed" : value === "REVOKED" ? "Link unavailable" : "Not created"; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }
function formatTimestamp(value: string) { return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)); }
