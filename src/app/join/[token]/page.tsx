import type { Metadata } from "next";
import Link from "next/link";
import { AcceptMemberInvitationButton } from "@/components/members/accept-member-invitation-button";
import { LogoutButton } from "@/components/auth/logout-button";
import { Brand } from "@/components/marketing/brand";
import { WorkspaceIcon } from "@/components/weddings/workspace-icon";
import { getCurrentUser } from "@/modules/auth/session";
import { normalizeEmail } from "@/modules/auth/schemas";
import { getMemberInvitationPreview } from "@/modules/members/service";

export const metadata: Metadata = { title: "Wedding invitation | Make My Marriage" };

export default async function JoinWeddingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [invitation, user] = await Promise.all([getMemberInvitationPreview(token), getCurrentUser()]);

  if (!invitation) return <InvitationUnavailable />;
  const nextPath = `/join/${encodeURIComponent(token)}`;
  const authQuery = `next=${encodeURIComponent(nextPath)}&email=${encodeURIComponent(invitation.email)}`;
  const emailMatches = user ? normalizeEmail(user.email) === invitation.email : false;
  const role = invitation.role === "MANAGER" ? "Manager" : "Member";

  return <main className="min-h-svh bg-surface px-5 py-8 sm:px-8 sm:py-12"><div className="mx-auto max-w-2xl"><div className="flex justify-center"><Brand /></div><section className="mt-8 overflow-hidden rounded-2xl bg-surface-container-lowest shadow-[0_12px_50px_rgba(28,26,23,0.08)]"><div className="bg-primary px-6 py-9 text-center text-on-primary sm:px-10"><WorkspaceIcon name="users" className="mx-auto text-3xl" /><p className="mt-4 text-label-sm font-semibold uppercase tracking-[0.17em] text-primary-fixed">Private wedding workspace</p><h1 className="mt-3 font-serif text-headline-lg">Join {invitation.wedding.brideName} &amp; {invitation.wedding.groomName}</h1><p className="mx-auto mt-3 max-w-lg text-body-md leading-6 text-primary-fixed">You have been invited to help plan this celebration as a {role}.</p></div><div className="p-6 sm:p-10"><div className="grid gap-4 rounded-xl bg-surface-container-low p-5 sm:grid-cols-2"><div><p className="text-label-sm font-semibold uppercase tracking-[0.1em] text-on-surface-variant">Invited email</p><p className="mt-2 break-all text-body-sm font-semibold">{invitation.email}</p></div><div><p className="text-label-sm font-semibold uppercase tracking-[0.1em] text-on-surface-variant">Workspace role</p><p className="mt-2 text-body-sm font-semibold text-primary">{role}</p></div></div>{!user ? <div className="mt-7"><h2 className="font-serif text-headline-sm">Continue with your account</h2><p className="mt-2 text-body-sm leading-6 text-on-surface-variant">Sign in with the invited email, or create an account using that address. You’ll return here to accept the invitation.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><Link href={`/login?${authQuery}`} className="rounded-lg bg-primary px-5 py-3 text-center text-body-sm font-semibold text-on-primary hover:bg-primary-container">Log in to continue</Link><Link href={`/signup?${authQuery}`} className="rounded-lg bg-surface-container px-5 py-3 text-center text-body-sm font-semibold text-primary hover:bg-surface-container-high">Create an account</Link></div></div> : emailMatches ? <div className="mt-7"><h2 className="font-serif text-headline-sm">Welcome, {user.name}</h2><p className="mt-2 text-body-sm leading-6 text-on-surface-variant">Accepting adds your account to this wedding. This private link cannot be used again afterward.</p><AcceptMemberInvitationButton token={token} /></div> : <div className="mt-7 rounded-xl bg-error-container/55 p-5"><h2 className="font-semibold text-on-error-container">Use the invited email</h2><p className="mt-2 text-body-sm leading-6 text-on-error-container">You’re signed in as {user.email}, but this invitation belongs to {invitation.email}.</p><div className="mt-4 flex flex-wrap items-center gap-3"><LogoutButton /><Link href={`/login?${authQuery}`} className="text-body-sm font-semibold text-primary hover:underline">Sign in with another account</Link></div></div>}<p className="mt-7 flex items-start gap-2 border-t border-outline-variant/30 pt-5 text-label-sm leading-5 text-on-surface-variant"><WorkspaceIcon name="lock" className="mt-0.5 text-base text-tertiary" />This invitation is single use and expires {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(invitation.expiresAt))}.</p></div></section></div></main>;
}

function InvitationUnavailable() {
  return <main className="flex min-h-svh items-center justify-center bg-surface px-5 py-10"><section className="w-full max-w-lg rounded-2xl bg-surface-container-lowest p-8 text-center shadow-lg"><Brand /><span className="mx-auto mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-surface-container text-outline"><WorkspaceIcon name="lock" className="text-2xl" /></span><h1 className="mt-5 font-serif text-headline-md">Invitation unavailable</h1><p className="mt-3 text-body-sm leading-6 text-on-surface-variant">This invitation is invalid, expired, revoked, or has already been accepted. Ask the wedding administrator to send a new invitation.</p><Link href="/" className="mt-6 inline-flex rounded-lg bg-primary px-5 py-3 text-body-sm font-semibold text-on-primary">Return to Make My Marriage</Link></section></main>;
}
