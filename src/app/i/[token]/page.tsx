import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { Brand } from "@/components/marketing/brand";
import { PublicInvitationQr } from "@/components/invitations/public-invitation-qr";
import { PublicEventRsvp } from "@/components/rsvp/public-event-rsvp";
import { GuestPhotoUpload } from "@/components/gallery/guest-photo-upload";
import { WorkspaceIcon } from "@/components/weddings/workspace-icon";
import { hashToken } from "@/modules/auth/crypto";
import { enforceRateLimit } from "@/modules/auth/rate-limit";
import { getPublicGuestInvitation, type PublicGuestInvitationView } from "@/modules/invitations/service";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Private wedding invitation | Make My Marriage",
  description: "A private wedding invitation.",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
  referrer: "no-referrer",
};

export default async function PublicInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let invitation: PublicGuestInvitationView | null = null;
  try {
    const requestHeaders = await headers();
    const address = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
    await enforceRateLimit(hashToken(`public-guest-invitation-page:${address}`), 120, 15 * 60 * 1000);
    invitation = await getPublicGuestInvitation(token);
  } catch {
    invitation = null;
  }
  if (!invitation) return <UnavailableInvitation />;
  const coupleName = `${invitation.wedding.brideName} & ${invitation.wedding.groomName}`;

  return <div className="min-h-svh bg-[#fbf5ef] text-on-surface">
    <header className="border-b border-outline-variant/30 bg-surface/90 px-5 py-4"><div className="mx-auto flex max-w-6xl items-center justify-between"><Brand /><span className="hidden text-label-sm font-semibold uppercase tracking-[0.14em] text-on-surface-variant sm:inline">Private invitation</span></div></header>
    <main className="pb-16">
      <section className="relative overflow-hidden border-b border-outline-variant/25 px-5 py-14 text-center sm:py-20"><DecorativeBloom className="-left-16 top-4" /><DecorativeBloom className="-right-20 bottom-0 rotate-180" /><div className="relative mx-auto max-w-3xl"><p className="text-label-sm font-semibold uppercase tracking-[0.25em] text-primary">Together with their families</p><h1 className="mt-5 font-serif text-[2.75rem] leading-tight tracking-tight sm:text-[4.5rem]">{coupleName}</h1><p className="mt-5 text-label-md font-semibold uppercase tracking-[0.2em] text-on-surface-variant">{formatWeddingDate(invitation.wedding.weddingDate)}</p><div className="mx-auto mt-8 h-px w-28 bg-primary/35" /><p className="mt-8 font-serif text-headline-sm italic">Joyfully invite you to celebrate their wedding</p></div></section>

      <section className="mx-auto grid max-w-5xl gap-6 px-5 py-10 sm:px-8 lg:grid-cols-[1.1fr_.9fr] lg:py-14"><div className="rounded-xl bg-surface-container-lowest p-6 shadow-sm sm:p-9"><p className="text-label-sm font-semibold uppercase tracking-[0.16em] text-primary">A personal note</p><h2 className="mt-3 font-serif text-headline-md">Dear {invitation.guest.name},</h2><p className="mt-4 text-body-md leading-8 text-on-surface-variant">{invitation.wedding.description || "We would be honoured to have you join us as we begin this new chapter together. Your presence will make our celebration even more meaningful."}</p><p className="mt-6 font-serif text-title-lg italic">With warmth,<br />{coupleName}</p></div><div className="grid grid-cols-2 gap-3"><Image src="/images/home/venue.jpg" width={600} height={720} alt="" className="h-full min-h-48 w-full rounded-xl object-cover" priority /><div className="grid gap-3"><Image src="/images/home/mehendi.jpg" width={600} height={350} alt="" className="h-full min-h-24 w-full rounded-xl object-cover" /><Image src="/images/home/sangeet.jpg" width={600} height={350} alt="" className="h-full min-h-24 w-full rounded-xl object-cover" /></div></div></section>

      <section className="mx-auto max-w-5xl px-5 sm:px-8"><div className="text-center"><p className="text-label-sm font-semibold uppercase tracking-[0.18em] text-primary">Your celebration itinerary</p><h2 className="mt-2 font-serif text-headline-lg-mobile sm:text-headline-lg">Invitation &amp; RSVP</h2><p className="mx-auto mt-3 max-w-2xl text-body-md leading-7 text-on-surface-variant">Respond separately to each ceremony reserved for you. You can update a saved response while that ceremony remains open.</p></div>
        {invitation.events.length ? <div className="mx-auto mt-9 max-w-3xl space-y-5">{invitation.events.map((event, index) => <CeremonyCard key={event.id} event={event} index={index} token={token} maximum={invitation.rsvpMaxAttendees} />)}</div> : <div className="mx-auto mt-9 max-w-2xl rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-7 text-center"><h3 className="font-serif text-headline-sm">Your itinerary is being prepared</h3><p className="mt-2 text-body-sm leading-6 text-on-surface-variant">Please check this private invitation again after the couple finishes assigning your ceremonies.</p></div>}
      </section>

      <GuestPhotoUpload token={token} coupleName={coupleName} events={invitation.events.map((event) => ({ id: event.id, name: event.name }))} />
      <section className="mx-auto mt-12 max-w-3xl px-5 text-center sm:px-8"><div className="rounded-xl bg-primary px-6 py-8 text-on-primary sm:px-10"><p className="text-label-sm font-semibold uppercase tracking-[0.18em] text-primary-fixed">Celebration date</p><p className="mt-3 font-serif text-headline-md">{formatWeddingDate(invitation.wedding.weddingDate)}</p><p className="mt-2 text-body-sm text-on-primary-container">{invitation.wedding.mainVenueName} · {invitation.wedding.mainAddress}</p></div></section>
      <PublicInvitationQr guestName={invitation.guest.name} />
      <blockquote className="mx-auto mt-12 max-w-2xl px-6 text-center font-serif text-headline-sm italic leading-9 text-on-surface-variant">“The warmth of your presence would make our celebration complete.”</blockquote>
    </main>
    <footer className="border-t border-outline-variant/25 px-5 py-7 text-center text-label-sm text-on-surface-variant"><span className="font-serif italic text-on-surface">Make My Marriage</span> · Private wedding invitation</footer>
  </div>;
}

function CeremonyCard({ event, index, token, maximum }: { event: PublicGuestInvitationView["events"][number]; index: number; token: string; maximum: number }) {
  return <article className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm sm:p-7"><span className="absolute inset-y-0 left-0 w-1 bg-primary/70" /><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="text-label-sm font-semibold uppercase tracking-[0.13em] text-primary">Celebration {String(index + 1).padStart(2, "0")}</p><span className={`rounded-full px-2.5 py-1 text-label-sm font-semibold ${event.rsvpClosed ? "bg-surface-container text-on-surface-variant" : "bg-secondary-container text-on-secondary-container"}`}>{event.rsvpClosed ? "RSVP closed" : "RSVP open"}</span></div><h3 className="mt-2 font-serif text-headline-sm">{event.name}</h3><p className="mt-3 flex items-center gap-2 text-body-sm font-semibold"><WorkspaceIcon name="calendar" className="text-primary" />{formatEventDate(event.localDate, event.startLocalTime, event.endLocalTime)}</p><p className="mt-2 flex items-start gap-2 text-body-sm text-on-surface-variant"><WorkspaceIcon name="location" className="mt-0.5 text-primary" /><span><strong className="block text-on-surface">{event.venueName}</strong>{event.address}</span></p>{event.description && <p className="mt-4 max-w-xl text-body-sm leading-6 text-on-surface-variant">{event.description}</p>}</div><div className="flex shrink-0 flex-col gap-2 sm:min-w-36"><a href={event.directionsUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-body-sm font-semibold text-on-primary"><WorkspaceIcon name="location" />Directions</a>{event.liveStreamUrl && <a href={event.liveStreamUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-surface-container px-4 py-2.5 text-body-sm font-semibold text-primary"><WorkspaceIcon name="video" />Livestream</a>}</div></div><PublicEventRsvp token={token} eventId={event.id} initialRsvp={event.rsvp} closed={event.rsvpClosed} maximum={maximum} /></article>;
}

function UnavailableInvitation() { return <div className="flex min-h-svh items-center justify-center bg-[#fbf5ef] p-5"><main className="w-full max-w-xl rounded-xl bg-surface-container-lowest p-7 text-center shadow-sm sm:p-12"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-fixed text-primary"><WorkspaceIcon name="lock" className="text-2xl" /></span><p className="mt-6 text-label-sm font-semibold uppercase tracking-[0.18em] text-primary">Private invitation archive</p><h1 className="mt-3 font-serif text-headline-md">This invitation link is no longer available</h1><div className="mx-auto mt-5 h-px w-20 bg-primary/35" /><p className="mx-auto mt-5 max-w-md text-body-sm leading-7 text-on-surface-variant">The couple may have updated their ceremony arrangements or created a refreshed private link. Please contact them directly to receive the current invitation.</p><Link href="/" className="mt-7 inline-flex rounded-lg bg-primary px-5 py-3 text-body-sm font-semibold text-on-primary">General information</Link><p className="mt-8 font-serif italic text-on-surface-variant">Make My Marriage · Private ceremonies</p></main></div>; }
function DecorativeBloom({ className }: { className: string }) { return <div aria-hidden="true" className={`absolute h-64 w-64 rounded-full border border-primary/10 ${className}`}><span className="absolute inset-10 rounded-full border border-primary/10" /><span className="absolute inset-20 rounded-full bg-primary-fixed/20" /></div>; }
function formatWeddingDate(value: string) { return new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }
function formatEventDate(date: string, start: string, end: string) { const day = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`)); const time = (value: string) => new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" }).format(new Date(`2000-01-01T${value}:00Z`)); return `${day} · ${time(start)}${end ? `–${time(end)}` : ""}`; }
