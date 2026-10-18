import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GuestForm } from "@/components/guests/guest-form";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getCurrentUser } from "@/modules/auth/session";
import { canManageGuests } from "@/modules/guests/constants";
import { getAssignableEvents } from "@/modules/guests/service";
import { getWorkspaceForUser } from "@/modules/weddings/service";

export const metadata: Metadata = { title: "Add a guest | Make My Marriage" };

export default async function NewGuestPage() {
  const user = await getCurrentUser(); if (!user) redirect("/login?next=/guests/new");
  const workspace = await getWorkspaceForUser(user.id); if (!workspace) redirect("/setup/wedding");
  if (!canManageGuests(workspace.membership.role)) redirect("/dashboard");
  const events = await getAssignableEvents(user.id, workspace.wedding.id);
  return <WorkspaceShell user={user} wedding={workspace.wedding} role={workspace.membership.role} active="guests" title="Guests"><main className="mx-auto max-w-[1120px] px-5 pb-16 pt-8 sm:px-8 xl:px-12"><Link href="/guests" className="text-body-sm font-semibold text-primary hover:underline">← Back to guests</Link><p className="mt-7 text-label-sm font-semibold uppercase tracking-[0.15em] text-tertiary">Guest details</p><h1 className="mt-2 font-serif text-headline-lg-mobile sm:text-headline-lg">Add a guest</h1><p className="mb-8 mt-2 max-w-2xl text-body-md leading-7 text-on-surface-variant">Create their guestbook record and choose the published ceremonies they are invited to.</p><GuestForm weddingId={workspace.wedding.id} events={events} /></main></WorkspaceShell>;
}
