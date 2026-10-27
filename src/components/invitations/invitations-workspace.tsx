"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { WorkspaceIcon } from "@/components/weddings/workspace-icon";
import { GUEST_INVITATION_STATUS_LABELS, type GuestInvitationStatus } from "@/modules/invitations/constants";
import type { GuestInvitationListView } from "@/modules/invitations/service";
import { useModalA11y } from "@/shared/use-modal-a11y";

type Row = GuestInvitationListView["invitations"][number];
type Issuance = { invitationUrl: string; qrDataUrl?: string; fileName?: string; delivered?: boolean };

export function InvitationsWorkspace({ weddingId, initialRows }: { weddingId: string; initialRows: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [issuance, setIssuance] = useState<(Issuance & { guestName: string; message: string }) | null>(null);
  const [confirm, setConfirm] = useState<{ action: "send" | "revoke"; row: Row } | null>(null);

  async function act(row: Row, action: "link" | "send" | "qr" | "revoke") {
    setPending(`${row.guest.id}:${action}`); setError("");
    const base = `/api/v1/weddings/${weddingId}/guests/${row.guest.id}/invitation`;
    const url = action === "send" ? `${base}/send` : action === "qr" ? `${base}/rotate-and-qr` : base;
    try {
      const response = await fetch(url, { method: action === "revoke" ? "DELETE" : "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "The invitation could not be updated.");
      setRows((current) => current.map((item) => item.guest.id === row.guest.id ? { ...item, invitation: payload.data.invitation } : item));
      if (action !== "revoke") {
        const delivered = payload.data.delivered as boolean | undefined;
        setIssuance({
          guestName: row.guest.name,
          invitationUrl: payload.data.invitationUrl,
          qrDataUrl: payload.data.qrDataUrl,
          fileName: payload.data.fileName,
          delivered,
          message: action === "send"
            ? delivered ? "The email was accepted for delivery. The newly issued private link is shown once below." : "We couldn’t deliver this invitation by email. The newly issued private link remains active and can be copied below."
            : action === "qr" ? "A new private link and QR code were generated. The previous link and QR code no longer work."
              : "A new private invitation link was generated. The previous link no longer works.",
        });
      }
      setConfirm(null);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The invitation could not be updated.");
    } finally {
      setPending(null);
    }
  }

  if (!rows.length) return <section className="mt-8 flex flex-col items-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-5 py-14 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-primary"><WorkspaceIcon name="mail" className="text-2xl" /></span><h2 className="mt-4 font-serif text-headline-sm">No invitations match these filters</h2><p className="mt-2 max-w-lg text-body-sm leading-6 text-on-surface-variant">Clear the filters or add guests before creating private invitations.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><Link href="/guests/invitations" className="rounded-lg bg-surface px-5 py-3 text-body-sm font-semibold text-primary">Clear filters</Link><Link href="/guests/new" className="rounded-lg bg-primary px-5 py-3 text-body-sm font-semibold text-on-primary">Add guest</Link></div></section>;

  return <>
    {error && <p role="alert" className="mt-5 rounded-lg bg-error-container px-4 py-3 text-body-sm text-on-error-container">{error}</p>}
    <section className="mt-6 overflow-hidden rounded-xl bg-surface-container-low shadow-sm" aria-label="Guest invitations">
      <div className="hidden overflow-x-auto md:block"><table className="w-full border-collapse text-left"><thead className="text-label-sm font-semibold uppercase tracking-[0.08em] text-on-surface-variant"><tr><th className="px-5 py-4">Guest</th><th className="px-5 py-4">Contact</th><th className="px-5 py-4">Assigned events</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Last activity</th><th className="px-5 py-4"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-outline-variant/25">{rows.map((row) => <InvitationRow key={row.guest.id} row={row} pending={pending} onAction={(action) => action === "send" || action === "revoke" ? setConfirm({ action, row }) : act(row, action)} />)}</tbody></table></div>
      <div className="space-y-3 p-3 md:hidden">{rows.map((row) => <InvitationCard key={row.guest.id} row={row} pending={pending} onAction={(action) => action === "send" || action === "revoke" ? setConfirm({ action, row }) : act(row, action)} />)}</div>
    </section>
    {issuance && <IssuanceDialog issuance={issuance} onClose={() => setIssuance(null)} />}
    {confirm && <ConfirmDialog action={confirm.action} row={confirm.row} pending={Boolean(pending)} onCancel={() => setConfirm(null)} onConfirm={() => act(confirm.row, confirm.action)} />}
  </>;
}

function InvitationRow({ row, pending, onAction }: { row: Row; pending: string | null; onAction: (action: "link" | "send" | "qr" | "revoke") => void }) {
  return <tr className="bg-surface/20 align-top transition-colors hover:bg-surface/70"><td className="px-5 py-5"><div className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-fixed text-primary"><WorkspaceIcon name="mail" className="text-xl" /></span><div><Link href={`/guests/${row.guest.id}/invitation`} className="font-semibold hover:text-primary hover:underline">{row.guest.name}</Link><p className="mt-1 text-label-sm text-on-surface-variant">{row.guest.relationshipLabel} · {row.guest.sideLabel}</p></div></div></td><td className="px-5 py-5 text-body-sm text-on-surface-variant"><p>{row.guest.email || "No email"}</p><p className="mt-1">{row.guest.phone || "No phone"}</p></td><td className="px-5 py-5 text-body-sm">{row.guest.assignedEventCount} event{row.guest.assignedEventCount === 1 ? "" : "s"}</td><td className="px-5 py-5"><StatusBadge status={row.invitation.status} /></td><td className="px-5 py-5 text-body-sm text-on-surface-variant">{activity(row)}</td><td className="px-5 py-5"><Actions row={row} pending={pending} onAction={onAction} /></td></tr>;
}
function InvitationCard({ row, pending, onAction }: { row: Row; pending: string | null; onAction: (action: "link" | "send" | "qr" | "revoke") => void }) {
  return <article className="rounded-xl bg-surface/70 p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-fixed text-primary"><WorkspaceIcon name="mail" className="text-xl" /></span><div><Link href={`/guests/${row.guest.id}/invitation`} className="text-title-md font-semibold hover:text-primary">{row.guest.name}</Link><p className="mt-1 text-label-sm text-on-surface-variant">{row.guest.relationshipLabel} · {row.guest.sideLabel}</p></div></div><StatusBadge status={row.invitation.status} /></div><div className="mt-4 grid gap-2 rounded-lg bg-surface-container-low p-3 text-body-sm text-on-surface-variant"><span>{row.guest.email || "No email added"}</span><span>{row.guest.assignedEventCount} assigned event{row.guest.assignedEventCount === 1 ? "" : "s"}</span><span>Last activity: {activity(row)}</span></div><div className="mt-4"><Actions row={row} pending={pending} onAction={onAction} /></div></article>;
}
function Actions({ row, pending, onAction }: { row: Row; pending: string | null; onAction: (action: "link" | "send" | "qr" | "revoke") => void }) {
  const busy = pending?.startsWith(`${row.guest.id}:`) ?? false;
  return <div className="grid min-w-44 grid-cols-2 gap-1.5 md:flex md:flex-col md:items-stretch"><Link href={`/guests/${row.guest.id}/invitation`} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-surface-container px-3 py-2 text-center text-label-md font-semibold text-primary hover:bg-surface-container-high"><WorkspaceIcon name="external" />View</Link><button disabled={busy} onClick={() => onAction("link")} className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-label-md font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-50"><WorkspaceIcon name="copy" />{row.invitation.status === "NOT_CREATED" ? "Create link" : "New link"}</button><button disabled={busy || !row.guest.email} onClick={() => onAction("send")} className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-label-md font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-40"><WorkspaceIcon name="mail" />{row.invitation.status === "SENT" ? "Resend" : "Send email"}</button><button disabled={busy} onClick={() => onAction("qr")} className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-label-md font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-50"><WorkspaceIcon name="download" />New QR</button>{row.invitation.status !== "NOT_CREATED" && row.invitation.status !== "REVOKED" && <button disabled={busy} onClick={() => onAction("revoke")} className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-label-md font-semibold text-error hover:bg-error-container disabled:opacity-50"><WorkspaceIcon name="close" />Revoke</button>}</div>;
}
function StatusBadge({ status }: { status: GuestInvitationStatus }) { const styles = status === "SENT" ? "bg-secondary-container text-on-secondary-container" : status === "DELIVERY_FAILED" ? "bg-error-container text-on-error-container" : status === "READY" ? "bg-tertiary-fixed text-on-tertiary-fixed" : status === "REVOKED" ? "bg-surface-container-highest text-on-surface-variant" : "bg-surface-container text-on-surface-variant"; return <span className={`inline-flex rounded-full px-2.5 py-1 text-label-sm font-semibold ${styles}`}>{GUEST_INVITATION_STATUS_LABELS[status]}</span>; }
function activity(row: Row) { const value = row.invitation.lastSentAt ?? row.invitation.updatedAt; return value ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "—"; }

function IssuanceDialog({ issuance, onClose }: { issuance: Issuance & { guestName: string; message: string }; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const dialogRef = useModalA11y(onClose);
  async function copy() { await navigator.clipboard.writeText(issuance.invitationUrl); setCopied(true); }
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-inverse-surface/45 p-0 backdrop-blur-sm sm:items-center sm:p-5"><section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="issued-title" className="max-h-[92svh] w-full overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-2xl sm:max-w-xl sm:rounded-xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-label-sm font-semibold uppercase tracking-[0.13em] text-primary">Private invitation issued</p><h2 id="issued-title" className="mt-1 font-serif text-headline-sm">Invitation for {issuance.guestName}</h2></div><button onClick={onClose} aria-label="Close" className="rounded-lg p-2 hover:bg-surface-container"><WorkspaceIcon name="close" className="text-xl" /></button></div><p className={`mt-4 rounded-lg p-3 text-body-sm leading-6 ${issuance.delivered === false ? "bg-error-container text-on-error-container" : "bg-surface-container text-on-surface-variant"}`}>{issuance.message}</p>{issuance.qrDataUrl && <div className="mt-5 flex justify-center rounded-xl bg-surface-container-lowest p-5"><Image unoptimized src={issuance.qrDataUrl} width={208} height={208} alt={`QR code for ${issuance.guestName}’s private invitation`} className="h-52 w-52" /></div>}<label className="mt-5 block text-label-sm font-semibold uppercase tracking-[0.08em] text-on-surface-variant">Private link<input readOnly value={issuance.invitationUrl} className="mt-2 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-3 text-body-sm" /></label><p className="mt-3 text-label-sm leading-5 text-on-surface-variant">This URL is an access credential. It is only shown in this response and cannot be recovered later.</p><div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end"><button onClick={copy} className="inline-flex items-center justify-center gap-2 rounded-lg bg-surface-container px-4 py-2.5 text-body-sm font-semibold"><WorkspaceIcon name="copy" />{copied ? "Copied" : "Copy private link"}</button>{issuance.qrDataUrl && <a href={issuance.qrDataUrl} download={issuance.fileName ?? "wedding-invitation.png"} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-body-sm font-semibold text-on-primary">Download QR code</a>}</div></section></div>;
}
function ConfirmDialog({ action, row, pending, onCancel, onConfirm }: { action: "send" | "revoke"; row: Row; pending: boolean; onCancel: () => void; onConfirm: () => void }) { const revoke = action === "revoke"; const dialogRef = useModalA11y(onCancel); return <div className="fixed inset-0 z-[65] flex items-center justify-center bg-inverse-surface/45 p-5 backdrop-blur-sm"><section ref={dialogRef} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby="invitation-confirm-title" className="w-full max-w-md rounded-xl bg-surface p-6 shadow-2xl sm:p-8"><h2 id="invitation-confirm-title" className="font-serif text-headline-sm">{revoke ? "Revoke this invitation?" : row.invitation.status === "SENT" ? "Resend this invitation?" : "Send this invitation?"}</h2><p className="mt-3 text-body-sm leading-6 text-on-surface-variant">{revoke ? `${row.guest.name} will no longer be able to open the current private invitation.` : `A new private link will be emailed to ${row.guest.email}. Any earlier link or QR code will stop working.`}</p><div className="mt-6 flex justify-end gap-3"><button onClick={onCancel} disabled={pending} className="rounded-lg bg-surface-container px-4 py-2.5 text-body-sm font-semibold disabled:opacity-50">Cancel</button><button onClick={onConfirm} disabled={pending} className={`rounded-lg px-4 py-2.5 text-body-sm font-semibold text-on-primary disabled:opacity-50 ${revoke ? "bg-error" : "bg-primary"}`}>{pending ? "Working…" : revoke ? "Revoke invitation" : "Send invitation"}</button></div></section></div>; }
