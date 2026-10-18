import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GuestForm, type GuestFormValues } from "@/components/guests/guest-form";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getCurrentUser } from "@/modules/auth/session";
import { canManageGuests } from "@/modules/guests/constants";
import { getAssignableEvents, getGuest } from "@/modules/guests/service";
import { getWorkspaceForUser } from "@/modules/weddings/service";

export const metadata: Metadata = { title: "Edit guest | Make My Marriage" };

export default async function EditGuestPage({ params }: { params: Promise<{ guestId: string }> }) {
  const user = await getCurrentUser(); if (!user) redirect("/login?next=/guests");
  const workspace = await getWorkspaceForUser(user.id); if (!workspace) redirect("/setup/wedding");
  if (!canManageGuests(workspace.membership.role)) redirect("/dashboard");
  const { guestId } = await params;
  const [guest, events] = await Promise.all([getGuest(user.id, workspace.wedding.id, guestId), getAssignableEvents(user.id, workspace.wedding.id)]);
  if (!guest) notFound();
  const initialValues: GuestFormValues = { name: guest.name, email: guest.email, phone: guest.phone, side: guest.side, relationship: guest.relationship, notes: guest.notes, eventIds: guest.assignedEvents.map((event) => event.id) };
  return <WorkspaceShell user={user} wedding={workspace.wedding} role={workspace.membership.role} active="guests" title="Guests"><main className="mx-auto max-w-[1120px] px-5 pb-16 pt-8 sm:px-8 xl:px-12"><Link href="/guests" className="text-body-sm font-semibold text-primary hover:underline">← Back to guests</Link><p className="mt-7 text-label-sm font-semibold uppercase tracking-[0.15em] text-tertiary">Guest details</p><h1 className="mt-2 font-serif text-headline-lg-mobile sm:text-headline-lg">Edit guest</h1><p className="mb-8 mt-2 max-w-2xl text-body-md leading-7 text-on-surface-variant">Update {guest.name}&apos;s details, wedding connection, and ceremony assignments.</p><GuestForm mode="edit" guestId={guest.id} initialValues={initialValues} weddingId={workspace.wedding.id} events={events} /></main></WorkspaceShell>;
}
