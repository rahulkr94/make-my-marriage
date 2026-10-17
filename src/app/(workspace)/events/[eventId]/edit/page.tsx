import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EventForm, type EventFormValues } from "@/components/events/event-form";
import { EventWorkspaceShell } from "@/components/events/event-workspace-shell";
import { getCurrentUser } from "@/modules/auth/session";
import { canManageEvents } from "@/modules/events/constants";
import { getEvent } from "@/modules/events/service";
import { getWorkspaceForUser } from "@/modules/weddings/service";

export const metadata: Metadata = { title: "Edit event | Make My Marriage" };

export default async function EditEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/events");
  const workspace = await getWorkspaceForUser(user.id);
  if (!workspace) redirect("/setup/wedding");
  const { eventId } = await params;
  if (!canManageEvents(workspace.membership.role)) redirect(`/events/${eventId}`);
  const event = await getEvent(user.id, workspace.wedding.id, eventId);
  if (!event) notFound();
  const initialValues: EventFormValues = {
    name: event.name, type: event.type, localDate: event.localDate, startLocalTime: event.startLocalTime,
    endLocalTime: event.endLocalTime, endsNextDay: event.endsNextDay, venueName: event.venueName,
    address: event.address, mapUrl: event.mapUrl, description: event.description,
    status: event.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
  };
  return <EventWorkspaceShell user={user} wedding={workspace.wedding} role={workspace.membership.role}><main className="mx-auto max-w-[1180px] px-5 pb-16 pt-8 sm:px-8 xl:px-12"><Link href={`/events/${event.id}`} className="text-body-sm font-semibold text-primary hover:underline">← Back to event details</Link><p className="mt-7 text-label-sm font-semibold uppercase tracking-[0.15em] text-tertiary">Ceremony settings</p><h1 className="mt-2 font-serif text-headline-lg-mobile sm:text-headline-lg">Edit event</h1><p className="mb-8 mt-2 max-w-2xl text-body-md leading-7 text-on-surface-variant">Refine this ceremony’s schedule, venue, story, and visibility.</p><EventForm mode="edit" eventId={event.id} initialValues={initialValues} weddingId={workspace.wedding.id} weddingDate={workspace.wedding.weddingDate} timeZone={workspace.wedding.timeZone} mainVenueName={workspace.wedding.mainVenueName} mainAddress={workspace.wedding.mainAddress} /></main></EventWorkspaceShell>;
}
