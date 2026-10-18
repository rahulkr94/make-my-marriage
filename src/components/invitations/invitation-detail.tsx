"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { WorkspaceIcon } from "@/components/weddings/workspace-icon";
import { GUEST_INVITATION_STATUS_LABELS, type GuestInvitationStatus } from "@/modules/invitations/constants";
import type { GuestInvitationDetailView } from "@/modules/invitations/service";

type Action = "link" | "send" | "qr" | "revoke";
type Issued = { invitationUrl: string; qrDataUrl?: string; fileName?: string; delivered?: boolean };

export function InvitationDetail({ weddingId, detail }: { weddingId: string; detail: GuestInvitationDetailView }) {
  const router = useRouter();
  const [invitation, setInvitation] = useState(detail.invitation);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [pending, setPending] = useState<Action | null>(null);
  const [confirm, setConfirm] = useState<Action | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const base = `/api/v1/weddings/${weddingId}/guests/${detail.guest.id}/invitation`;

  async function run(action: Action) {
    setPending(action); setError(""); setCopied(false);
    const url = action === "send" ? `${base}/send` : action === "qr" ? `${base}/rotate-and-qr` : base;
    try {
      const response = await fetch(url, { method: action === "revoke" ? "DELETE" : "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "The invitation could not be updated.");
      setInvitation(payload.data.invitation);
      setIssued(action === "revoke" ? null : { invitationUrl: payload.data.invitationUrl, qrDataUrl: payload.data.qrDataUrl, fileName: payload.data.fileName, delivered: payload.data.delivered });
      setConfirm(null);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The invitation could not be updated.");
    } finally { setPending(null); }
  }
  async function copy() { if (!issued) return; await navigator.clipboard.writeText(issued.invitationUrl); setCopied(true); }
  const active = invitation.status !== "NOT_CREATED" && invitation.status !== "REVOKED";

  return <>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-6">
        <section className="rounded-xl bg-surface-container-lowest p-5 shadow-sm sm:p-7"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-label-sm font-semibold uppercase tracking-[0.12em] text-primary">Guest record</p><h2 className="mt-2 font-serif text-headline-md">{detail.guest.name}</h2><p className="mt-1 text-body-sm text-on-surface-variant">{detail.guest.relationshipLabel} · {detail.guest.sideLabel}</p></div><StatusBadge status={invitation.status} /></div><dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Item label="Email" value={detail.guest.email || "Not provided"} /><Item label="Phone" value={detail.guest.phone || "Not provided"} /><Item label="Assigned events" value={String(detail.assignedEvents.length)} /><Item label="Link expiry" value={invitation.expiresAt ? formatDate(invitation.expiresAt) : "Not created"} /></dl></section>

        <section className="rounded-xl bg-surface-container-lowest p-5 shadow-sm sm:p-7"><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-fixed text-primary"><WorkspaceIcon name="lock" className="text-xl" /></span><div><h2 className="font-serif text-headline-sm">Private invitation link</h2><p className="mt-1 text-body-sm leading-6 text-on-surface-variant">For security, an existing raw link cannot be retrieved. Generate a new one whenever you need to copy it again.</p></div></div>
          {issued ? <div className="mt-5"><label className="text-label-sm font-semibold uppercase tracking-[0.08em] text-on-surface-variant">Newly issued link<input readOnly value={issued.invitationUrl} className="mt-2 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-3 text-body-sm" /></label><div className="mt-3 flex flex-wrap gap-2"><button onClick={copy} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-body-sm font-semibold text-on-primary"><WorkspaceIcon name="copy" />{copied ? "Copied" : "Copy link"}</button><a href={issued.invitationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-surface-container px-4 py-2.5 text-body-sm font-semibold text-primary"><WorkspaceIcon name="external" />Open preview</a></div>{issued.delivered === false && <p role="alert" className="mt-4 rounded-lg bg-error-container p-3 text-body-sm text-on-error-container">We couldn’t deliver this invitation by email. The newly issued link remains active; copy it and share it privately.</p>}{issued.delivered === true && <p className="mt-4 rounded-lg bg-secondary-container p-3 text-body-sm text-on-secondary-container">The invitation email was accepted for delivery.</p>}</div> : <div className="mt-5 rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-5 text-center"><p className="text-body-sm text-on-surface-variant">{active ? "Generate a new link to reveal it once and invalidate the previous credential." : "No active private link is available for this guest."}</p></div>}
          {error && <p role="alert" className="mt-4 rounded-lg bg-error-container p-3 text-body-sm text-on-error-container">{error}</p>}
          <div className="mt-5 flex flex-wrap gap-2"><button disabled={Boolean(pending)} onClick={() => active ? setConfirm("link") : run("link")} className="rounded-lg bg-primary px-4 py-2.5 text-body-sm font-semibold text-on-primary disabled:opacity-50">{pending === "link" ? "Generating…" : active ? "Regenerate private link" : "Create private link"}</button><button disabled={Boolean(pending) || !detail.guest.email} onClick={() => setConfirm("send")} className="rounded-lg bg-surface-container px-4 py-2.5 text-body-sm font-semibold text-primary disabled:opacity-40">{pending === "send" ? "Sending…" : invitation.status === "SENT" ? "Resend invitation" : "Send invitation"}</button></div>
        </section>

        <section className="rounded-xl bg-surface-container-lowest p-5 shadow-sm sm:p-7"><div className="flex items-start justify-between gap-4"><div><h2 className="font-serif text-headline-sm">Assigned ceremonies</h2><p className="mt-1 text-body-sm leading-6 text-on-surface-variant">The public invitation always resolves the guest’s current published assignments.</p></div><Link href={`/guests/${detail.guest.id}/edit`} className="shrink-0 text-label-md font-semibold text-primary hover:underline">Edit assignments</Link></div>{detail.assignedEvents.length ? <div className="mt-5 space-y-3">{detail.assignedEvents.map((event) => <article key={event.id} className="rounded-lg bg-surface-container-low p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-semibold">{event.name}</h3><p className="mt-1 text-body-sm text-on-surface-variant">{formatEventDate(event.localDate, event.startLocalTime)} · {event.venueName}</p><p className="mt-1 text-label-sm text-on-surface-variant">{event.address}</p></div><span className="rounded-full bg-secondary-container px-2.5 py-1 text-label-sm font-semibold text-on-secondary-container">Published</span></div></article>)}</div> : <p className="mt-5 rounded-lg bg-surface-container-low p-4 text-body-sm text-on-surface-variant">No published events are assigned. The invitation will remain private but will not show an itinerary until assignments are added.</p>}</section>
      </div>

      <aside className="space-y-6"><section className="rounded-xl bg-surface-container-lowest p-5 shadow-sm"><h2 className="font-serif text-headline-sm">Digital QR pass</h2><p className="mt-2 text-body-sm leading-6 text-on-surface-variant">Generating a QR creates a fresh private link and disables every earlier link and QR.</p>{issued?.qrDataUrl ? <div className="mt-5"><div className="rounded-xl bg-surface-container-low p-4"><Image unoptimized src={issued.qrDataUrl} width={240} height={240} alt={`QR code for ${detail.guest.name}’s private invitation`} className="mx-auto h-auto w-full max-w-56" /></div><a href={issued.qrDataUrl} download={issued.fileName ?? "wedding-invitation.png"} className="mt-3 flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-body-sm font-semibold text-on-primary">Download QR code</a></div> : <div className="mt-5 flex aspect-square items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low"><WorkspaceIcon name="lock" className="text-4xl text-outline" /></div>}<button disabled={Boolean(pending)} onClick={() => active ? setConfirm("qr") : run("qr")} className="mt-3 w-full rounded-lg bg-surface-container px-4 py-2.5 text-body-sm font-semibold text-primary disabled:opacity-50">{pending === "qr" ? "Generating…" : "Generate new link & QR"}</button></section>
        <section className="rounded-xl border border-outline-variant/50 bg-surface-container-low p-5"><h2 className="font-serif text-title-lg">Invitation security</h2><ul className="mt-3 space-y-3 text-body-sm leading-6 text-on-surface-variant"><li className="flex gap-2"><WorkspaceIcon name="shield" className="mt-1 shrink-0 text-primary" />Only assigned, published events are shown.</li><li className="flex gap-2"><WorkspaceIcon name="refresh" className="mt-1 shrink-0 text-primary" />New credentials replace earlier links immediately.</li><li className="flex gap-2"><WorkspaceIcon name="lock" className="mt-1 shrink-0 text-primary" />Treat the URL and QR code as private access credentials.</li></ul>{active && <button disabled={Boolean(pending)} onClick={() => setConfirm("revoke")} className="mt-5 w-full rounded-lg border border-error/30 px-4 py-2.5 text-body-sm font-semibold text-error hover:bg-error-container disabled:opacity-50">{pending === "revoke" ? "Revoking…" : "Revoke invitation"}</button>}</section></aside>
    </div>
    {confirm && <Confirm action={confirm} guestName={detail.guest.name} email={detail.guest.email} pending={Boolean(pending)} onCancel={() => setConfirm(null)} onConfirm={() => run(confirm)} />}
  </>;
}

function StatusBadge({ status }: { status: GuestInvitationStatus }) { const styles = status === "SENT" ? "bg-secondary-container text-on-secondary-container" : status === "DELIVERY_FAILED" ? "bg-error-container text-on-error-container" : status === "READY" ? "bg-tertiary-fixed text-on-tertiary-fixed" : "bg-surface-container text-on-surface-variant"; return <span className={`inline-flex rounded-full px-3 py-1 text-label-sm font-semibold ${styles}`}>{GUEST_INVITATION_STATUS_LABELS[status]}</span>; }
function Item({ label, value }: { label: string; value: string }) { return <div><dt className="text-label-sm font-semibold uppercase tracking-[0.08em] text-on-surface-variant">{label}</dt><dd className="mt-1 break-words text-body-sm font-semibold">{value}</dd></div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)); }
function formatEventDate(date: string, time: string) { return `${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`))}, ${new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" }).format(new Date(`2000-01-01T${time}:00Z`))}`; }
function Confirm({ action, guestName, email, pending, onCancel, onConfirm }: { action: Action; guestName: string; email: string; pending: boolean; onCancel: () => void; onConfirm: () => void }) { const revoke = action === "revoke"; const send = action === "send"; return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-inverse-surface/45 p-5 backdrop-blur-sm"><section role="alertdialog" aria-modal="true" aria-labelledby="invitation-action-title" className="w-full max-w-md rounded-xl bg-surface p-6 shadow-2xl sm:p-8"><h2 id="invitation-action-title" className="font-serif text-headline-sm">{revoke ? "Revoke this invitation?" : send ? "Send a new private invitation?" : action === "qr" ? "Generate a new link and QR?" : "Create a new private link?"}</h2><p className="mt-3 text-body-sm leading-6 text-on-surface-variant">{revoke ? `${guestName} will no longer be able to open the current invitation.` : send ? `A new link will be sent to ${email}. The existing link and QR code will stop working.` : "The existing private link and any downloaded QR code will stop working immediately."}</p><div className="mt-6 flex justify-end gap-3"><button onClick={onCancel} disabled={pending} className="rounded-lg bg-surface-container px-4 py-2.5 text-body-sm font-semibold disabled:opacity-50">Cancel</button><button onClick={onConfirm} disabled={pending} className={`rounded-lg px-4 py-2.5 text-body-sm font-semibold text-on-primary disabled:opacity-50 ${revoke ? "bg-error" : "bg-primary"}`}>{pending ? "Working…" : revoke ? "Revoke invitation" : send ? "Send invitation" : action === "qr" ? "Generate link & QR" : "Regenerate link"}</button></div></section></div>; }
