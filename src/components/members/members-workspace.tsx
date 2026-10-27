"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { MemberAccessDialog } from "@/components/members/member-access-dialog";
import { WorkspaceIcon } from "@/components/weddings/workspace-icon";
import { SummaryMetric } from "@/components/workspace/summary-metric";
import { useModalA11y } from "@/shared/use-modal-a11y";

type Role = "ADMIN" | "MANAGER" | "MEMBER";
type InvitationRole = "ADMIN" | "MANAGER" | "MEMBER";
type Member = { id: string; userId: string; name: string; email: string; role: Role; grants: Array<"CAN_MODERATE_GALLERY">; joinedAt: string };
type Invitation = {
  id: string;
  email: string;
  role: InvitationRole;
  status: string;
  deliveryStatus: "PENDING" | "SENT" | "FAILED";
  expiresAt: string;
  sentAt: string | null;
  createdAt: string;
};
type Wedding = { id: string; brideName: string; groomName: string; weddingDate: string; mainVenueName: string };
type User = { id: string; name: string; email: string };
type ApiError = { error?: { message?: string; details?: Array<{ path: string; message: string }> } };
type InvitationResponse = { data?: { invitation: Invitation; invitationUrl: string | null } };

export function MembersWorkspace({ user, wedding, members, invitations }: { user: User; wedding: Wedding; members: Member[]; invitations: Invitation[] }) {
  const router = useRouter();
  const [visibleInvitations, setVisibleInvitations] = useState(invitations);
  const [visibleMembers, setVisibleMembers] = useState(members);
  const [previousMembers, setPreviousMembers] = useState(members);
  const [previousInvitations, setPreviousInvitations] = useState(invitations);
  const [accessTarget, setAccessTarget] = useState<{ member: Member; mode: "role" | "remove" } | null>(null);
  const [accessError, setAccessError] = useState("");
  // Reconcile refreshed server data while keeping successful mutations visible immediately.
  if (previousMembers !== members) {
    setPreviousMembers(members);
    setVisibleMembers(members);
  }
  if (previousInvitations !== invitations) {
    setPreviousInvitations(invitations);
    setVisibleInvitations(invitations);
  }
  const [inviteOpen, setInviteOpen] = useState(false);
  const [adminInviteTarget, setAdminInviteTarget] = useState<{ email: string; role: "ADMIN" } | null>(null);
  const [inviteDraft, setInviteDraft] = useState<{ email: string; role: InvitationRole } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<Invitation | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [toast, setToast] = useState("");
  const [freshLinks, setFreshLinks] = useState<Record<string, string>>({});
  const admins = visibleMembers.filter((member) => member.role === "ADMIN").length;

  useEffect(() => {
    if (!inviteOpen && !revokeTarget && !adminInviteTarget) return;
    function close(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setInviteOpen(false);
        setRevokeTarget(null);
        setAdminInviteTarget(null);
      }
    }
    document.addEventListener("keydown", close);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", close);
      document.body.style.overflow = "";
    };
  }, [inviteOpen, revokeTarget, adminInviteTarget]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function sendInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const email = String(form.get("email") ?? "");
    const role = String(form.get("role") ?? "") as InvitationRole;
    if (role === "ADMIN") {
      setInviteDraft({ email, role });
      setAdminInviteTarget({ email, role });
      setInviteOpen(false);
      return;
    }
    if (await createInvitation({ email, role })) formElement.reset();
  }

  async function createInvitation(input: { email: string; role: InvitationRole }) {
    setPendingAction("create");
    setError("");
    setFieldErrors({});
    try {
      const response = await fetch(`/api/v1/weddings/${wedding.id}/member-invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = await response.json() as ApiError & InvitationResponse;
      if (!response.ok || !payload.data) {
        setError(payload.error?.message ?? "We couldn’t create this invitation.");
        setFieldErrors(groupErrors(payload.error?.details));
        return false;
      }
      setVisibleInvitations((current) => [payload.data!.invitation, ...current.filter((invitation) => invitation.id !== payload.data!.invitation.id)]);
      if (payload.data.invitationUrl) setFreshLinks((current) => ({ ...current, [payload.data!.invitation.id]: payload.data!.invitationUrl! }));
      setInviteOpen(false);
      setInviteDraft(null);
      setToast(payload.data.invitation.deliveryStatus === "SENT" ? "Invitation sent." : "Invitation created, but Resend rejected delivery. Verify a sender domain, then resend.");
      router.refresh();
      return true;
    } catch {
      setError("We couldn’t reach the server. Please try again.");
      return false;
    } finally {
      setPendingAction(null);
    }
  }

  async function confirmAdministratorInvitation() {
    if (!adminInviteTarget) return;
    const sent = await createInvitation(adminInviteTarget);
    if (sent) setAdminInviteTarget(null);
  }

  function openInvitationDialog() {
    setError("");
    setFieldErrors({});
    setInviteDraft(null);
    setInviteOpen(true);
  }

  async function resend(invitation: Invitation) {
    setPendingAction(`resend:${invitation.id}`);
    setError("");
    try {
      const response = await fetch(`/api/v1/weddings/${wedding.id}/member-invitations/${invitation.id}/resend`, { method: "POST" });
      const payload = await response.json() as ApiError & InvitationResponse;
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "We couldn’t resend this invitation.");
      setVisibleInvitations((current) => current.map((item) => item.id === invitation.id ? payload.data!.invitation : item));
      if (payload.data.invitationUrl) setFreshLinks((current) => ({ ...current, [invitation.id]: payload.data!.invitationUrl! }));
      setToast(payload.data.invitation.deliveryStatus === "SENT" ? `Invitation resent to ${invitation.email}.` : "Resend rejected delivery. Verify a sender domain; the new private link is ready to copy.");
      router.refresh();
    } catch (reason) {
      setToast(reason instanceof Error ? reason.message : "We couldn’t resend this invitation.");
    } finally {
      setPendingAction(null);
    }
  }

  async function revoke() {
    if (!revokeTarget) return;
    setPendingAction(`revoke:${revokeTarget.id}`);
    try {
      const response = await fetch(`/api/v1/weddings/${wedding.id}/member-invitations/${revokeTarget.id}`, { method: "DELETE" });
      const payload = await response.json() as ApiError;
      if (!response.ok) throw new Error(payload.error?.message ?? "We couldn’t revoke this invitation.");
      setVisibleInvitations((current) => current.filter((invitation) => invitation.id !== revokeTarget.id));
      setFreshLinks((current) => {
        const next = { ...current };
        delete next[revokeTarget.id];
        return next;
      });
      setToast(`Invitation for ${revokeTarget.email} revoked.`);
      setRevokeTarget(null);
      router.refresh();
    } catch (reason) {
      setToast(reason instanceof Error ? reason.message : "We couldn’t revoke this invitation.");
    } finally {
      setPendingAction(null);
    }
  }

  async function changeMemberAccess(role: Role | null) {
    if (!accessTarget || pendingAction) return;
    const target = accessTarget.member;
    setPendingAction(`access:${target.id}`);
    setAccessError("");
    try {
      const response = await fetch(`/api/v1/weddings/${wedding.id}/members/${target.id}`, {
        method: role === null ? "DELETE" : "PATCH",
        headers: role === null ? undefined : { "Content-Type": "application/json" },
        body: role === null ? undefined : JSON.stringify({ role }),
      });
      const payload = await response.json() as ApiError & { data?: { id: string; role: Role; status: "ACTIVE" | "REMOVED" } };
      if (!response.ok || !payload.data) {
        if (response.status === 401 || response.status === 403 || response.status === 404) router.refresh();
        throw new Error(payload.error?.message ?? "We couldn’t update this member. Please try again.");
      }
      const updated = payload.data;
      if (target.userId === user.id && (updated.status === "REMOVED" || updated.role !== "ADMIN")) {
        window.location.replace(updated.status === "REMOVED" ? "/setup/wedding" : "/dashboard");
        return;
      }
      setVisibleMembers((current) => updated.status === "REMOVED"
        ? current.filter((member) => member.id !== target.id)
        : current.map((member) => member.id === target.id ? { ...member, role: updated.role } : member));
      setAccessTarget(null);
      setToast(updated.status === "REMOVED" ? `${target.name} no longer has wedding access.` : `${target.name}’s role updated.`);
      router.refresh();
    } catch (reason) {
      setAccessError(reason instanceof Error ? reason.message : "We couldn’t update this member. Please try again.");
    } finally {
      setPendingAction(null);
    }
  }

  async function toggleGalleryModeration(member: Member) {
    if (pendingAction) return;
    const enabled = member.grants.includes("CAN_MODERATE_GALLERY");
    setPendingAction(`gallery:${member.id}`);
    try {
      const response = await fetch(`/api/v1/weddings/${wedding.id}/members/${member.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "MANAGER", grants: enabled ? [] : ["CAN_MODERATE_GALLERY"] }) });
      const payload = await response.json() as ApiError & { data?: { grants: Array<"CAN_MODERATE_GALLERY"> } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "We couldn’t update gallery access.");
      setVisibleMembers((current) => current.map((item) => item.id === member.id ? { ...item, grants: payload.data!.grants } : item));
      setToast(enabled ? `${member.name} no longer moderates the gallery.` : `${member.name} can now moderate the gallery.`);
      router.refresh();
    } catch (reason) { setToast(reason instanceof Error ? reason.message : "We couldn’t update gallery access."); }
    finally { setPendingAction(null); }
  }

  async function copyLink(invitation: Invitation) {
    const url = freshLinks[invitation.id];
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setToast("Private invitation link copied.");
    } catch {
      setToast("Your browser couldn’t copy the link. Try resending the invitation.");
    }
  }

  return (
    <>
      <main className="mx-auto max-w-[1320px] px-5 pb-16 pt-8 sm:px-8 xl:px-12">
          <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-label-sm font-semibold uppercase tracking-[0.15em] text-primary">Wedding workspace · {wedding.mainVenueName}</p>
              <h1 className="mt-2 font-serif text-headline-lg-mobile tracking-tight sm:text-headline-lg">Members</h1>
              <p className="mt-2 text-body-md leading-7 text-on-surface-variant">Invite family and trusted collaborators to curate your celebration with role-based permissions and peace of mind.</p>
            </div>
            <button type="button" onClick={openInvitationDialog} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-body-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-hover">
              <WorkspaceIcon name="userPlus" className="text-xl" /> Invite member
            </button>
          </section>

          <section aria-label="Membership summary" className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-3">
            <SummaryMetric label="Active collaborators" value={visibleMembers.length} note="Family & core planners" icon="users" />
            <SummaryMetric label="Pending invitations" value={visibleInvitations.length} note="Single-use secure links" icon="mail" tone="primary" />
            <SummaryMetric label="Workspace admins" value={admins} note="Wedding admins" icon="shield" tone="secondary" />
          </section>

          <section className="mt-10">
            <SectionHeading title="Wedding team" description="People who currently have access to this wedding workspace." count={`${visibleMembers.length} total access ${visibleMembers.length === 1 ? "grant" : "grants"}`} />
            <div className="mt-4 divide-y divide-outline-variant/25 overflow-hidden rounded-xl bg-surface-container-low shadow-sm">
              {visibleMembers.map((member) => <MemberRow key={member.id} member={member} currentUserId={user.id} lastAdmin={member.role === "ADMIN" && admins <= 1} busy={pendingAction !== null} onToggleModeration={() => toggleGalleryModeration(member)} onChangeRole={() => { setAccessError(""); setAccessTarget({ member, mode: "role" }); }} onRemove={() => { setAccessError(""); setAccessTarget({ member, mode: "remove" }); }} />)}
            </div>
          </section>

          <section className="mt-10">
            <SectionHeading title="Pending invitations" description="Invitations that have not been accepted yet." count={`${visibleInvitations.length} outstanding ${visibleInvitations.length === 1 ? "invite" : "invites"}`} />
            {visibleInvitations.length ? (
              <div className="mt-4 space-y-3 sm:divide-y sm:divide-outline-variant/25 sm:overflow-hidden sm:rounded-xl sm:bg-surface-container-low sm:shadow-sm sm:space-y-0">
                {visibleInvitations.map((invitation) => (
                  <InvitationRow key={invitation.id} invitation={invitation} freshLink={freshLinks[invitation.id]} busy={pendingAction?.endsWith(invitation.id) ?? false} onResend={() => resend(invitation)} onCopy={() => copyLink(invitation)} onRevoke={() => setRevokeTarget(invitation)} />
                ))}
              </div>
            ) : <EmptyInvitations onInvite={openInvitationDialog} />}
          </section>

          <section className="mt-8 rounded-xl bg-surface-container p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-title-md font-semibold"><WorkspaceIcon name="shield" className="text-xl text-tertiary" /> Roles &amp; permissions guide</h2>
            <p className="mt-2 max-w-4xl text-body-sm leading-6 text-on-surface-variant"><strong className="text-on-surface">Admins</strong> manage the wedding and its members. <strong className="text-on-surface">Managers</strong> coordinate events, guests, tasks, vendors, and expenses. <strong className="text-on-surface">Members</strong> view shared wedding details and update tasks assigned to them.</p>
          </section>

          <footer className="mt-9 flex flex-col gap-3 border-t border-outline-variant/30 pt-6 text-label-sm text-on-surface-variant sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2"><WorkspaceIcon name="lock" className="text-secondary" /> Member data stays inside this wedding workspace.</p>
            <Link href="/dashboard" className="font-semibold text-primary hover:underline">Return to dashboard</Link>
          </footer>
      </main>

      {inviteOpen && <InviteDialog initialEmail={inviteDraft?.email} initialRole={inviteDraft?.role} pending={pendingAction === "create"} error={error} fieldErrors={fieldErrors} onClose={() => { setInviteOpen(false); setInviteDraft(null); }} onSubmit={sendInvitation} />}
      {adminInviteTarget && <ConfirmAdministratorInvite email={adminInviteTarget.email} pending={pendingAction === "create"} error={error} onCancel={() => { setError(""); setAdminInviteTarget(null); setInviteOpen(true); }} onConfirm={confirmAdministratorInvitation} />}
      {revokeTarget && <ConfirmRevoke invitation={revokeTarget} pending={pendingAction === `revoke:${revokeTarget.id}`} onCancel={() => setRevokeTarget(null)} onConfirm={revoke} />}
      {accessTarget && <MemberAccessDialog member={accessTarget.member} mode={accessTarget.mode} isSelf={accessTarget.member.userId === user.id} pending={pendingAction !== null} error={accessError} onClose={() => setAccessTarget(null)} onConfirm={changeMemberAccess} />}
      {toast && <div role="status" className="fixed bottom-5 left-1/2 z-[70] w-[min(92vw,34rem)] -translate-x-1/2 rounded-xl bg-inverse-surface px-5 py-3 text-center text-body-sm font-medium text-inverse-on-surface shadow-xl">{toast}</div>}
    </>
  );
}

function SectionHeading({ title, description, count }: { title: string; description: string; count: string }) {
  return <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-serif text-headline-sm">{title}</h2><p className="mt-1 text-body-sm text-on-surface-variant">{description}</p></div><p className="text-label-sm font-semibold uppercase tracking-[0.1em] text-on-surface-variant">{count}</p></div>;
}

function MemberRow({ member, currentUserId, lastAdmin, busy, onToggleModeration, onChangeRole, onRemove }: { member: Member; currentUserId: string; lastAdmin: boolean; busy: boolean; onToggleModeration: () => void; onChangeRole: () => void; onRemove: () => void }) {
  return <article className="flex flex-col gap-4 bg-surface/20 p-4 transition-colors hover:bg-surface/70 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex min-w-0 items-center gap-4">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-serif text-headline-sm ${member.role === "ADMIN" ? "bg-primary-fixed/60 text-primary" : member.role === "MANAGER" ? "bg-tertiary-fixed/60 text-tertiary" : "bg-secondary-fixed text-secondary"}`}>{initials(member.name)}</span>
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-title-md font-semibold">{member.name}</h3>{member.userId === currentUserId && <span className="rounded-full bg-surface-container px-2 py-0.5 text-label-sm font-semibold text-on-surface-variant">You</span>}</div><p className="mt-1 truncate text-body-sm text-on-surface-variant">{member.email}</p><p className="mt-1 text-label-sm text-outline">Joined {formatDateTime(member.joinedAt)}</p></div>
    </div>
    <div className="space-y-2 lg:text-right">
      <div className="flex flex-wrap items-center gap-2 lg:justify-end"><RoleBadge role={member.role} />
        {member.role === "MANAGER" && <button type="button" onClick={onToggleModeration} disabled={busy} className={`rounded-lg px-3 py-2.5 text-label-md font-semibold disabled:opacity-50 ${member.grants.includes("CAN_MODERATE_GALLERY") ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container text-on-surface-variant"}`}>{member.grants.includes("CAN_MODERATE_GALLERY") ? "Gallery moderator" : "Grant gallery moderation"}</button>}
        <button type="button" onClick={onChangeRole} disabled={lastAdmin || busy} aria-label={`Change role for ${member.name}`} aria-describedby={lastAdmin ? `last-admin-${member.id}` : undefined} className="rounded-lg bg-surface-container px-3 py-2.5 text-label-md font-semibold hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50">Change role</button>
        <button type="button" onClick={onRemove} disabled={lastAdmin || busy} aria-label={`Remove access for ${member.name}`} aria-describedby={lastAdmin ? `last-admin-${member.id}` : undefined} className="rounded-lg px-3 py-2.5 text-label-md font-semibold text-error hover:bg-error-container/40 disabled:cursor-not-allowed disabled:opacity-50">Remove access</button>
      </div>
      {lastAdmin && <p id={`last-admin-${member.id}`} className="max-w-sm text-label-sm text-on-surface-variant">Last Admin — make another member an Admin before changing this access.</p>}
    </div>
  </article>;
}

function InvitationRow({ invitation, freshLink, busy, onResend, onCopy, onRevoke }: { invitation: Invitation; freshLink?: string; busy: boolean; onResend: () => void; onCopy: () => void; onRevoke: () => void }) {
  const failed = invitation.deliveryStatus === "FAILED";
  return <article className="rounded-xl bg-surface-container-low p-4 shadow-sm transition-colors hover:bg-surface/70 sm:rounded-none sm:bg-surface/20 sm:p-5 sm:shadow-none"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex min-w-0 items-center gap-4"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${failed ? "bg-error-container text-error" : "bg-primary-fixed text-primary"}`}><WorkspaceIcon name="mail" className="text-xl" /></span><div className="min-w-0"><h3 className="truncate text-title-md font-semibold">{displayNameFromEmail(invitation.email)}</h3><p className="mt-1 truncate text-body-sm text-on-surface-variant">{invitation.email}</p><p className="mt-1 text-label-sm text-outline">{expiryLabel(invitation.expiresAt)}</p></div></div><div className="flex flex-wrap items-center gap-2 pl-[3.75rem] lg:justify-end lg:pl-0"><RoleBadge role={invitation.role} /><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-label-sm font-semibold ${failed ? "bg-error-container text-on-error-container" : "bg-surface-container text-on-surface-variant"}`}>{failed ? "Delivery failed" : "Sent"}</span><button disabled={busy} type="button" onClick={onResend} className="rounded-lg bg-surface-container px-3 py-2 text-label-md font-semibold hover:bg-surface-container-high disabled:opacity-50">{busy ? "Working…" : "Resend"}</button>{freshLink && <button disabled={busy} type="button" onClick={onCopy} className="rounded-lg bg-primary-fixed px-3 py-2 text-label-md font-semibold text-on-primary-fixed hover:bg-primary-fixed-dim">Copy link</button>}<button disabled={busy} type="button" onClick={onRevoke} className="rounded-lg px-3 py-2 text-label-md font-semibold text-on-surface-variant hover:bg-error-container/40 hover:text-error disabled:opacity-50">Revoke</button></div></div>{failed && <div className="mt-4 flex items-start gap-2 rounded-lg bg-error-container/25 p-3 text-body-sm text-on-surface-variant lg:ml-15"><span className="font-bold text-error">!</span><p>Resend rejected this delivery because the sender is not ready for this recipient. Verify a sender domain in Resend, update <code className="font-semibold">RESEND_FROM_EMAIL</code>, then resend to rotate the private link.</p></div>}</article>;
}

function RoleBadge({ role }: { role: Role }) {
  const label = role === "ADMIN" ? "Admin" : role === "MANAGER" ? "Manager" : "Member";
  const styles = role === "ADMIN" ? "bg-primary-fixed/60 text-primary" : role === "MANAGER" ? "bg-tertiary-fixed/60 text-tertiary" : "bg-secondary-fixed text-on-secondary-fixed-variant";
  return <span className={`inline-flex w-max rounded-full px-3 py-1 text-label-sm font-semibold ${styles}`}>{label}</span>;
}

function EmptyInvitations({ onInvite }: { onInvite: () => void }) {
  return <div className="mt-4 flex flex-col items-center rounded-xl bg-surface-container-lowest px-5 py-10 text-center shadow-sm"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container text-primary"><WorkspaceIcon name="mail" className="text-2xl" /></span><h3 className="mt-4 font-serif text-headline-sm">No pending invitations</h3><p className="mt-2 max-w-md text-body-sm leading-6 text-on-surface-variant">Everyone you invited has joined, or you haven’t sent any invitations yet.</p><button type="button" onClick={onInvite} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-surface-container px-5 py-3 text-body-sm font-semibold text-primary hover:bg-surface-container-high"><WorkspaceIcon name="userPlus" className="text-lg" /> Invite someone</button></div>;
}

function InviteDialog({ initialEmail = "", initialRole = "MANAGER", pending, error, fieldErrors, onClose, onSubmit }: { initialEmail?: string; initialRole?: InvitationRole; pending: boolean; error: string; fieldErrors: Record<string, string[]>; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const [role, setRole] = useState<InvitationRole>(initialRole);
  const dialogRef = useModalA11y(onClose);
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-inverse-surface/40 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="invite-title" className="max-h-[92svh] w-full overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-2xl sm:max-w-lg sm:rounded-xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-label-sm font-semibold uppercase tracking-[0.15em] text-primary">Wedding collaboration</p><h2 id="invite-title" className="mt-1 font-serif text-headline-md">Invite someone to your wedding</h2><p className="mt-2 text-body-sm leading-6 text-on-surface-variant">They’ll receive a secure invitation link by email to join your celebration workspace.</p></div><button type="button" aria-label="Close invitation form" onClick={onClose} className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container"><WorkspaceIcon name="close" className="text-xl" /></button></div><form onSubmit={onSubmit} noValidate className="mt-6 space-y-5"><label className="block text-body-sm font-semibold" htmlFor="invite-email">Email address<input autoFocus defaultValue={initialEmail} id="invite-email" name="email" type="email" autoComplete="email" placeholder="name@example.com" required aria-invalid={Boolean(fieldErrors.email)} className="mt-2 w-full rounded-lg border border-transparent bg-surface-container-low px-4 py-3.5 font-normal outline-none focus:border-primary focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary" />{fieldErrors.email?.[0] && <span className="mt-2 block text-label-sm font-normal text-error">{fieldErrors.email[0]}</span>}</label><fieldset><legend className="text-body-sm font-semibold">Select workspace role</legend><div className="mt-3 space-y-3"><RoleOption value="ADMIN" title="Admin" selected={role} onChange={setRole}>Full access to wedding settings, member invitations, and workspace roles.</RoleOption><RoleOption value="MANAGER" title="Manager" badge="Recommended" selected={role} onChange={setRole}>Can manage events, guests, invitations, tasks, vendors, and expenses.</RoleOption><RoleOption value="MEMBER" title="Member" selected={role} onChange={setRole}>Can view wedding information and update tasks assigned to them.</RoleOption></div>{fieldErrors.role?.[0] && <span className="mt-2 block text-label-sm text-error">{fieldErrors.role[0]}</span>}</fieldset>{role === "ADMIN" && <div role="note" className="flex items-start gap-2.5 rounded-lg bg-primary-fixed/60 p-3 text-body-sm leading-5 text-on-primary-fixed-variant"><WorkspaceIcon name="shield" className="mt-0.5 text-lg" /><span><strong className="block text-on-primary-fixed">Admin access</strong>This person can edit wedding details, invite or remove members, and manage workspace roles.</span></div>}<div className="flex items-start gap-2.5 rounded-lg bg-surface-container p-3 text-body-sm leading-5 text-on-surface-variant"><WorkspaceIcon name="lock" className="mt-0.5 text-lg text-tertiary" />Invitation links are single use and expire automatically after seven days.</div>{error && <p role="alert" className="rounded-lg bg-error-container p-3 text-body-sm text-on-error-container">{error}</p>}<div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={pending} className="rounded-lg bg-surface-container px-5 py-3 text-body-sm font-semibold hover:bg-surface-container-high disabled:opacity-50">Cancel</button><button type="submit" disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-body-sm font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-55"><WorkspaceIcon name="mail" className="text-lg" />{pending ? "Sending invitation…" : role === "ADMIN" ? "Review admin invite" : "Send invitation"}</button></div></form></section></div>;
}

function RoleOption({ value, title, badge, selected, onChange, children }: { value: InvitationRole; title: string; badge?: string; selected: InvitationRole; onChange: (role: InvitationRole) => void; children: string }) {
  return <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${selected === value ? "border-primary/40 bg-primary-fixed/35" : "border-transparent bg-surface-container-low hover:bg-surface-container"}`}><input checked={selected === value} onChange={() => onChange(value)} type="radio" name="role" value={value} className="mt-1 accent-primary" /><span><span className="flex flex-wrap items-center gap-2"><strong className="text-title-md">{title}</strong>{badge && <span className="rounded-full bg-secondary-container px-2 py-0.5 text-label-sm font-semibold text-on-secondary-container">{badge}</span>}</span><span className="mt-1 block text-body-sm leading-5 text-on-surface-variant">{children}</span></span></label>;
}

function ConfirmAdministratorInvite({ email, pending, error, onCancel, onConfirm }: { email: string; pending: boolean; error: string; onCancel: () => void; onConfirm: () => void }) {
  const dialogRef = useModalA11y(onCancel);
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-inverse-surface/45 p-5 backdrop-blur-sm"><section ref={dialogRef} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby="admin-invite-title" className="w-full max-w-md rounded-xl bg-surface p-6 shadow-2xl sm:p-8"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-primary"><WorkspaceIcon name="shield" className="text-2xl" /></span><p className="mt-5 text-label-sm font-semibold uppercase tracking-[0.12em] text-primary">Full workspace access</p><h2 id="admin-invite-title" className="mt-1 font-serif text-headline-sm">Invite as an admin?</h2><p className="mt-3 text-body-sm leading-6 text-on-surface-variant"><strong className="break-all text-on-surface">{email}</strong> will be able to edit wedding details, invite and remove members, and manage workspace roles after accepting.</p><p className="mt-4 rounded-lg bg-surface-container p-3 text-body-sm leading-5 text-on-surface-variant">Only grant this role to your partner or another person you trust with the entire wedding workspace.</p>{error && <p role="alert" className="mt-4 rounded-lg bg-error-container p-3 text-body-sm text-on-error-container">{error}</p>}<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onCancel} disabled={pending} className="rounded-lg bg-surface-container px-4 py-2.5 text-body-sm font-semibold disabled:opacity-50">Go back</button><button type="button" onClick={onConfirm} disabled={pending} className="rounded-lg bg-primary px-4 py-2.5 text-body-sm font-semibold text-on-primary disabled:opacity-50">{pending ? "Sending invitation…" : "Invite as admin"}</button></div></section></div>;
}

function ConfirmRevoke({ invitation, pending, onCancel, onConfirm }: { invitation: Invitation; pending: boolean; onCancel: () => void; onConfirm: () => void }) {
  const dialogRef = useModalA11y(onCancel);
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-inverse-surface/45 p-5 backdrop-blur-sm"><section ref={dialogRef} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby="revoke-title" className="w-full max-w-md rounded-xl bg-surface p-6 shadow-2xl"><h2 id="revoke-title" className="font-serif text-headline-sm">Revoke this invitation?</h2><p className="mt-3 text-body-sm leading-6 text-on-surface-variant">The invitation for <strong className="text-on-surface">{invitation.email}</strong> will stop working immediately.</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onCancel} disabled={pending} className="rounded-lg bg-surface-container px-4 py-2.5 text-body-sm font-semibold disabled:opacity-50">Keep invitation</button><button type="button" onClick={onConfirm} disabled={pending} className="rounded-lg bg-error px-4 py-2.5 text-body-sm font-semibold text-on-error disabled:opacity-50">{pending ? "Revoking…" : "Revoke invitation"}</button></div></section></div>;
}

function groupErrors(details?: Array<{ path: string; message: string }>) { return (details ?? []).reduce<Record<string, string[]>>((result, detail) => { (result[detail.path] ??= []).push(detail.message); return result; }, {}); }
function initials(value: string) { return value.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("") || "?"; }
function displayNameFromEmail(email: string) { return email.split("@")[0].split(/[._-]/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ") || email; }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)); }
function expiryLabel(value: string) { const days = Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000)); return days === 0 ? "Expires today" : `Expires in ${days} ${days === 1 ? "day" : "days"}`; }
