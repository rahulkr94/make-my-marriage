import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EventForm } from "@/components/events/event-form";
import { EventWorkspaceShell } from "@/components/events/event-workspace-shell";
import { canManageEvents } from "@/modules/events/constants";
import { getCurrentUser } from "@/modules/auth/session";
import { getWorkspaceForUser } from "@/modules/weddings/service";

export const metadata: Metadata = { title: "Create an event | Make My Marriage" };
export default async function NewEventPage() { const user = await getCurrentUser(); if (!user) redirect("/login?next=/events/new"); const workspace = await getWorkspaceForUser(user.id); if (!workspace) redirect("/setup/wedding"); if (!canManageEvents(workspace.membership.role)) redirect("/events"); return <EventWorkspaceShell user={user} wedding={workspace.wedding} role={workspace.membership.role}><main className="mx-auto max-w-[1180px] px-5 pb-16 pt-8 sm:px-8 xl:px-12"><Link href="/events" className="text-body-sm font-semibold text-primary hover:underline">← Back to all ceremonies</Link><p className="mt-7 text-label-sm font-semibold uppercase tracking-[0.15em] text-tertiary">New ceremony</p><h1 className="mt-2 font-serif text-headline-lg-mobile sm:text-headline-lg">Create an event</h1><p className="mb-8 mt-2 max-w-2xl text-body-md leading-7 text-on-surface-variant">Shape the date, timing, venue, and visibility for one meaningful moment.</p><EventForm weddingId={workspace.wedding.id} weddingDate={workspace.wedding.weddingDate} timeZone={workspace.wedding.timeZone} mainVenueName={workspace.wedding.mainVenueName} mainAddress={workspace.wedding.mainAddress} /></main></EventWorkspaceShell>; }
