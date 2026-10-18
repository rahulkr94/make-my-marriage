import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { InvitationDetail } from "@/components/invitations/invitation-detail";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { WorkspaceIcon } from "@/components/weddings/workspace-icon";
import { getCurrentUser } from "@/modules/auth/session";
import { canManageGuests } from "@/modules/guests/constants";
import { getGuestInvitationDetail } from "@/modules/invitations/service";
import { getWorkspaceForUser } from "@/modules/weddings/service";

export const metadata: Metadata = { title: "Invitation details | Make My Marriage" };

export default async function InvitationDetailPage({ params }: { params: Promise<{ guestId: string }> }) {
  const { guestId } = await params;
  const user = await getCurrentUser(); if (!user) redirect(`/login?next=/guests/${guestId}/invitation`);
  const workspace = await getWorkspaceForUser(user.id); if (!workspace) redirect("/setup/wedding");
  if (!canManageGuests(workspace.membership.role)) redirect("/dashboard");
  const detail = await getGuestInvitationDetail(user.id, workspace.wedding.id, guestId);
  if (!detail) notFound();
  return <WorkspaceShell user={user} wedding={workspace.wedding} role={workspace.membership.role} active="invitations" title="Invitation details"><main className="mx-auto max-w-[1240px] px-5 pb-16 pt-8 sm:px-8 xl:px-12"><div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><Link href="/guests/invitations" className="inline-flex items-center gap-2 text-label-md font-semibold text-primary hover:underline"><WorkspaceIcon name="arrowLeft" />Guest invitations</Link><h1 className="mt-3 font-serif text-headline-lg-mobile tracking-tight sm:text-headline-lg">Invitation details</h1><p className="mt-2 text-body-md text-on-surface-variant">Issue and deliver private ceremony access for {detail.guest.name}.</p></div><Link href={`/guests/${detail.guest.id}/edit`} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-surface-container px-4 py-2.5 text-body-sm font-semibold text-primary">Edit guest</Link></div><InvitationDetail weddingId={workspace.wedding.id} detail={detail} /></main></WorkspaceShell>;
}
