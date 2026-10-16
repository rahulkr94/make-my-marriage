"use client";

import { useEffect, useRef, useState } from "react";

type Role = "ADMIN" | "MANAGER" | "MEMBER";

export function MemberAccessDialog({ member, mode, isSelf, pending, error, onClose, onConfirm }: {
  member: { name: string; email: string; role: Role };
  mode: "role" | "remove";
  isSelf: boolean;
  pending: boolean;
  error: string;
  onClose: () => void;
  onConfirm: (role: Role | null) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [role, setRole] = useState<Role>(member.role);
  const removing = mode === "remove";

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  return (
    <dialog ref={dialogRef} aria-labelledby="member-access-title" aria-describedby="member-access-description" onCancel={(event) => { event.preventDefault(); if (!pending) onClose(); }} className="fixed inset-0 m-auto max-h-[90svh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-surface p-6 text-on-surface shadow-2xl backdrop:bg-inverse-surface/45 backdrop:backdrop-blur-sm sm:p-8">
      <p className="text-label-sm font-semibold uppercase tracking-[0.12em] text-tertiary">Wedding team</p>
      <h2 id="member-access-title" className="mt-2 font-serif text-headline-sm">{removing ? "Remove wedding access?" : "Change member role"}</h2>
      <p id="member-access-description" className="mt-3 break-words text-body-sm leading-6 text-on-surface-variant">
        <strong className="text-on-surface">{member.name}</strong><span className="block break-all">{member.email}</span>
        {removing ? "Access to this wedding will end. Their account and historical records will stay, and an Admin can invite them again later." : "Choose the access this person should have in your wedding workspace."}
      </p>
      <form onSubmit={(event) => { event.preventDefault(); if (!pending) onConfirm(removing ? null : role); }} className="mt-5 space-y-5">
        {!removing && <label className="block text-body-sm font-semibold" htmlFor="member-role">Workspace role
          <select id="member-role" value={role} disabled={pending} onChange={(event) => setRole(event.target.value as Role)} className="mt-2 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-3 focus:outline-primary">
            <option value="ADMIN">Admin</option><option value="MANAGER">Manager</option><option value="MEMBER">Member</option>
          </select>
        </label>}
        {!removing && role === "ADMIN" && <p className="rounded-lg bg-primary-fixed/50 p-4 text-body-sm leading-6 text-on-primary-fixed">An Admin can edit wedding settings, invite and remove members, and change roles. Grant this access only to someone you trust.</p>}
        {!removing && role === "MANAGER" && <p className="text-body-sm leading-6 text-on-surface-variant">Managers coordinate planning features as they become available. They cannot change wedding settings or manage member access.</p>}
        {!removing && role === "MEMBER" && <p className="text-body-sm leading-6 text-on-surface-variant">Members can view shared wedding details. They cannot change wedding settings or manage member access.</p>}
        {isSelf && (removing || role !== "ADMIN") && <p className="rounded-lg bg-error-container/40 p-4 text-body-sm leading-6 text-on-error-container">{removing ? "You are removing your own access. You will leave this wedding workspace." : "You are giving up your Admin access. You will return to the dashboard and another Admin will need to restore your role."}</p>}
        {error && <p role="alert" className="rounded-lg bg-error-container p-3 text-body-sm text-on-error-container">{error}</p>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button autoFocus type="button" onClick={onClose} disabled={pending} className="rounded-lg bg-surface-container px-4 py-3 text-body-sm font-semibold disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={pending || (!removing && role === member.role)} className={`rounded-lg px-4 py-3 text-body-sm font-semibold disabled:opacity-50 ${removing ? "bg-error text-on-error" : "bg-primary text-on-primary"}`}>{pending ? "Saving…" : removing ? "Remove access" : role === "ADMIN" ? "Grant Admin access" : "Save role"}</button>
        </div>
      </form>
    </dialog>
  );
}
