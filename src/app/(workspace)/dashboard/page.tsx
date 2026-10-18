import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Brand } from "@/components/marketing/brand";
import { WorkspaceIcon } from "@/components/weddings/workspace-icon";
import { getCurrentUser } from "@/modules/auth/session";
import { canManageEvents } from "@/modules/events/constants";
import { getUpcomingEvents, type EventView } from "@/modules/events/service";
import { getGuestSummary } from "@/modules/guests/service";
import { getWeddingMemberSummary } from "@/modules/members/service";
import { getWorkspaceForUser } from "@/modules/weddings/service";

export const metadata: Metadata = { title: "Dashboard | Make My Marriage" };

const futureSections = [
  { label: "RSVP", icon: "check" as const },
  { label: "Tasks & timeline", icon: "clock" as const },
  { label: "Expenses", icon: "payments" as const },
  { label: "Gallery", icon: "gallery" as const },
];

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  const workspace = await getWorkspaceForUser(user.id);
  if (!workspace) redirect("/setup/wedding");

  const { wedding, membership } = workspace;
  const eventManager = canManageEvents(membership.role);
  const [memberSummary, upcomingEvents, guestSummary] = await Promise.all([getWeddingMemberSummary(user.id, wedding.id), getUpcomingEvents(user.id, wedding.id), eventManager ? getGuestSummary(user.id, wedding.id) : Promise.resolve(null)]);
  const role = titleCase(membership.role);
  const daysToGo = getDaysToGo(wedding.weddingDate);
  const firstName = user.name.trim().split(/\s+/)[0] || user.name;
  const accountInitial = (user.name || user.email).trim().charAt(0).toUpperCase();
  const pendingCopy = memberSummary.pendingInvitations === null
    ? "Visible to wedding admins"
    : `${memberSummary.pendingInvitations} pending invitation${memberSummary.pendingInvitations === 1 ? "" : "s"}`;

  return (
    <main className="min-h-svh bg-surface xl:pl-72">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col justify-between bg-surface-container-low px-4 py-6 shadow-[0_1px_10px_rgba(29,27,24,0.05)] xl:flex">
        <div>
          <div className="px-3"><Brand /></div>
          <div className="mx-3 mt-7 rounded-xl bg-surface-container p-4">
            <p className="font-serif text-headline-sm">{wedding.brideName} &amp; {wedding.groomName}</p>
            <p className="mt-1 text-label-sm font-semibold uppercase tracking-[0.1em] text-on-surface-variant">{formatWeddingDate(wedding.weddingDate)}</p>
          </div>
          <nav aria-label="Workspace sections" className="mt-6 space-y-1">
            <SideLink href="/dashboard" icon="dashboard" active>Overview</SideLink>
            <SideLink href="/events" icon="calendar">Events</SideLink>
            {eventManager && <SideLink href="/guests" icon="users">Guests</SideLink>}
            {futureSections.map((item) => <SideLink key={item.label} icon={item.icon}>{item.label}</SideLink>)}
            {membership.role === "ADMIN" && <SideLink href="/members" icon="users">Members</SideLink>}
            {membership.role === "ADMIN" && <SideLink href="/settings/wedding" icon="settings">Wedding settings</SideLink>}
          </nav>
        </div>
        <div className="rounded-xl bg-surface-container p-4">
          <div className="flex items-center justify-between gap-3 text-label-sm font-semibold uppercase tracking-[0.08em] text-on-surface-variant"><span>Your access</span><span className="text-secondary">{role}</span></div>
          <p className="mt-2 text-body-sm text-on-surface-variant">{memberSummary.activeMembers} active wedding member{memberSummary.activeMembers === 1 ? "" : "s"}</p>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-outline-variant/25 bg-surface/90 px-5 py-3 backdrop-blur-xl sm:px-8 xl:px-6">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-4">
          <div className="min-w-0 xl:hidden"><Brand /></div>
          <div className="hidden min-w-0 items-center gap-2 xl:flex">
            <span className="truncate text-title-md font-semibold">{wedding.brideName} &amp; {wedding.groomName}&apos;s wedding</span>
            {daysToGo !== null && <span className="shrink-0 rounded-lg bg-surface-container px-2.5 py-1 text-label-sm font-semibold text-tertiary">{daysToGo === 0 ? "Wedding day" : `${daysToGo} days to go`}</span>}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {membership.role === "ADMIN" && <Link href="/members" className="hidden rounded-lg bg-surface-container px-3 py-2 text-label-md font-semibold text-primary hover:bg-surface-container-high sm:inline-flex">Manage members</Link>}
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-label-sm font-semibold text-on-primary">{accountInitial}</span>
            <span className="hidden text-right lg:block"><span className="block text-body-sm font-medium">{user.name}</span><span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-on-surface-variant">{role}</span></span>
            <LogoutButton compact />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1360px] flex-col gap-10 px-5 py-8 sm:px-8 sm:py-10 xl:px-12">
        <section className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3"><span className="rounded bg-surface-container px-2.5 py-1 text-label-sm font-semibold uppercase tracking-[0.12em] text-tertiary">Wedding dashboard</span><span className="flex items-center gap-1.5 text-label-sm font-semibold uppercase tracking-[0.08em] text-secondary"><span className="h-1.5 w-1.5 rounded-full bg-secondary" /> {wedding.status}</span></div>
            <h1 className="mt-3 font-serif text-headline-lg-mobile tracking-tight sm:text-headline-lg">Welcome, <span className="italic">{firstName}</span></h1>
            <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">{wedding.mainVenueName} · {formatWeddingDate(wedding.weddingDate)}{daysToGo !== null ? ` · ${daysToGo === 0 ? "Today is the day" : `${daysToGo} days to go`}` : ""}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {membership.role === "ADMIN" && <DashboardAction href="/settings/wedding" icon="settings">Edit wedding</DashboardAction>}
            {membership.role === "ADMIN" && <DashboardAction href="/members" icon="userPlus">Invite family</DashboardAction>}
            {eventManager && <DashboardAction href="/events/new" icon="calendar">Add event</DashboardAction>}
            {eventManager && <DashboardAction href="/guests/new" icon="userPlus">Add guest</DashboardAction>}
            <DashboardAction icon="check">Add task</DashboardAction>
          </div>
        </section>

        <section aria-labelledby="attention-title">
          <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-label-sm font-semibold uppercase tracking-[0.12em] text-tertiary">Planning pulse</p><h2 id="attention-title" className="mt-1 font-serif text-headline-sm">What needs attention</h2></div><span className="text-body-sm text-on-surface-variant">Events and guest records are ready to organise</span></div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AttentionCard icon="calendar" label="Ceremony schedule" title={upcomingEvents[0]?.name ?? (eventManager ? "Add your first event" : "No published events yet")} description={upcomingEvents[0] ? `${formatEventDate(upcomingEvents[0])} · ${upcomingEvents[0].venueName}` : "Dates, times, venues, and directions now live in Events & ceremonies."} href={upcomingEvents[0] ? `/events/${upcomingEvents[0].id}` : eventManager ? "/events/new" : "/events"} action={upcomingEvents[0] ? "View next event" : eventManager ? "Create event" : "View schedule"} />
            <AttentionCard icon="users" label="Wedding team" title={`${memberSummary.activeMembers} active member${memberSummary.activeMembers === 1 ? "" : "s"}`} description={pendingCopy} href={membership.role === "ADMIN" ? "/members" : undefined} action="View wedding team" />
            <AttentionCard icon="mail" label="Wedding guestbook" title={guestSummary ? `${guestSummary.activeGuests} active guest${guestSummary.activeGuests === 1 ? "" : "s"}` : "Managed by the planning team"} description={guestSummary ? "Add guests and assign the published ceremonies they are invited to." : "Admins and Managers organise private guest records and ceremony assignments."} href={guestSummary ? "/guests" : undefined} action="Open guestbook" />
            <AttentionCard icon="check" label="Planning tasks" title="No tasks yet" description="Assignments, due dates, and overdue reminders will appear after task management is available." />
          </div>
        </section>

        <section aria-label="Wedding metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon="users" label="Wedding team" value={String(memberSummary.activeMembers)} detail="Active members" href={membership.role === "ADMIN" ? "/members" : undefined} />
          <MetricCard icon="mail" label="Wedding guests" value={guestSummary ? String(guestSummary.activeGuests) : "—"} detail={guestSummary ? "Active guest records" : "Visible to planners"} href={guestSummary ? "/guests" : undefined} />
          <MetricCard icon="payments" label="Expenses logged" value="₹0" detail="Finance feature not started" />
          <MetricCard icon="gallery" label="Shared photos" value="0" detail="Gallery feature not started" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <article className="rounded-xl bg-surface-container-low p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-label-sm font-semibold uppercase tracking-[0.12em] text-tertiary">Chronicle of ceremonies</p><h2 className="mt-1 font-serif text-headline-md">Upcoming events</h2></div><Link href="/events" className="rounded-full bg-primary-fixed px-3 py-1 text-label-sm font-semibold text-on-primary-fixed-variant hover:bg-primary-fixed-dim">View schedule</Link></div>
            {upcomingEvents.length ? <div className="mt-6 divide-y divide-outline-variant/25 overflow-hidden rounded-xl bg-surface-container-lowest">{upcomingEvents.map((event) => <UpcomingEvent key={event.id} event={event} />)}</div> : <div className="mt-6 flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-10 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container text-tertiary"><WorkspaceIcon name="calendar" className="text-2xl" /></span><h3 className="mt-4 font-serif text-headline-sm">No upcoming published events</h3><p className="mt-2 max-w-lg text-body-sm leading-6 text-on-surface-variant">{eventManager ? "Create a ceremony or publish a saved draft to show it here." : "The planning team has not published the next ceremony yet."}</p>{eventManager && <Link href="/events/new" className="mt-5 rounded-lg bg-primary px-4 py-2.5 text-body-sm font-semibold text-on-primary">Add event</Link>}</div>}
          </article>

          <article className="rounded-xl bg-surface-container-low p-5 shadow-sm sm:p-7">
            <p className="text-label-sm font-semibold uppercase tracking-[0.12em] text-tertiary">Wedding foundation</p>
            <h2 className="mt-1 font-serif text-headline-md">Workspace progress</h2>
            <ol className="mt-6 space-y-4">
              <ProgressItem complete title="Account and security">Your private account and session are active.</ProgressItem>
              <ProgressItem complete title="Wedding details">Date, venue, time zone, and wedding story are saved.</ProgressItem>
              <ProgressItem complete title="Family invitations">Secure member invitations are available.</ProgressItem>
              <ProgressItem complete title="Events and ceremonies">Ceremony scheduling, venues, directions, and publishing are ready.</ProgressItem>
              <ProgressItem complete title="Guestbook foundation">Guest records and ceremony assignments are ready for invitation links.</ProgressItem>
            </ol>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-xl bg-surface-container-lowest p-5 shadow-sm sm:p-7">
            <div className="flex items-center justify-between gap-3"><div><p className="text-label-sm font-semibold uppercase tracking-[0.12em] text-tertiary">Celebration details</p><h2 className="mt-1 font-serif text-headline-sm">{wedding.brideName} &amp; {wedding.groomName}</h2></div>{membership.role === "ADMIN" && <Link href="/settings/wedding" aria-label="Edit wedding details" className="rounded-lg p-2 text-tertiary hover:bg-surface-container"><WorkspaceIcon name="settings" className="text-xl" /></Link>}</div>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2"><Detail label="Wedding date">{formatWeddingDate(wedding.weddingDate)}</Detail><Detail label="Primary venue">{wedding.mainVenueName}</Detail><Detail label="Address">{wedding.mainAddress}</Detail><Detail label="Time zone">{wedding.timeZone.replaceAll("_", " ")}</Detail></dl>
          </article>
          <article className="rounded-xl bg-surface-container-lowest p-5 shadow-sm sm:p-7">
            <p className="text-label-sm font-semibold uppercase tracking-[0.12em] text-tertiary">Recent activity</p><h2 className="mt-1 font-serif text-headline-sm">A calm start</h2>
            <div className="mt-5 space-y-4"><Activity icon="check" title="Wedding workspace created">Your foundational wedding information is saved.</Activity><Activity icon="users" title={`${memberSummary.activeMembers} member${memberSummary.activeMembers === 1 ? "" : "s"} can access this wedding`}>Access follows each person&apos;s workspace role.</Activity><Activity icon="sparkle" title="Dashboard is ready">New modules will replace these empty states as they are built.</Activity></div>
          </article>
        </section>

        <footer className="flex flex-col items-center justify-between gap-3 border-t border-outline-variant/30 pt-6 text-center text-body-sm text-on-surface-variant sm:flex-row sm:text-left"><Link href="/" className="font-semibold text-tertiary hover:text-primary">← Public homepage</Link><p>Make My Marriage · A quiet place to plan together.</p></footer>
      </div>
    </main>
  );
}

function SideLink({ href, icon, active = false, children }: { href?: string; icon: Parameters<typeof WorkspaceIcon>[0]["name"]; active?: boolean; children: ReactNode }) {
  const classes = `flex items-center gap-3 rounded-lg px-3 py-2.5 text-body-md ${active ? "bg-surface-container font-semibold text-primary" : href ? "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface" : "cursor-default text-outline"}`;
  const content = <><WorkspaceIcon name={icon} className="text-xl" /><span>{children}</span>{!href && <span className="ml-auto text-[9px] font-semibold uppercase tracking-[0.1em]">Soon</span>}</>;
  return href ? <Link href={href} aria-current={active ? "page" : undefined} className={classes}>{content}</Link> : <span className={classes}>{content}</span>;
}

function DashboardAction({ href, icon, children }: { href?: string; icon: Parameters<typeof WorkspaceIcon>[0]["name"]; children: ReactNode }) {
  const classes = `inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-body-sm font-semibold shadow-sm ${href ? "bg-surface-container text-on-surface hover:bg-surface-container-high" : "cursor-default bg-surface-container-low text-outline"}`;
  const content = <><WorkspaceIcon name={icon} className="text-lg" />{children}{!href && <span className="text-[9px] uppercase tracking-[0.1em]">Soon</span>}</>;
  return href ? <Link href={href} className={classes}>{content}</Link> : <span aria-disabled="true" className={classes}>{content}</span>;
}

function AttentionCard({ icon, label, title, description, href, action }: { icon: Parameters<typeof WorkspaceIcon>[0]["name"]; label: string; title: string; description: string; href?: string; action?: string }) {
  return <article className="flex min-h-56 flex-col justify-between rounded-xl bg-surface-container p-5 shadow-sm"><div><div className="flex items-center justify-between gap-3"><p className="text-label-sm font-semibold uppercase tracking-[0.1em] text-tertiary">{label}</p><WorkspaceIcon name={icon} className="text-xl text-tertiary" /></div><h3 className="mt-4 text-title-lg font-semibold">{title}</h3><p className="mt-2 text-body-sm leading-6 text-on-surface-variant">{description}</p></div>{href && action ? <Link href={href} className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-surface-container-lowest px-3 py-2 text-body-sm font-semibold text-primary hover:bg-surface-container-high">{action}<WorkspaceIcon name="arrow" /></Link> : <span className="mt-5 inline-flex w-fit rounded bg-surface-container-high px-2 py-1 text-label-sm font-semibold text-on-surface-variant">Future feature</span>}</article>;
}

function MetricCard({ icon, label, value, detail, href }: { icon: Parameters<typeof WorkspaceIcon>[0]["name"]; label: string; value: string; detail: string; href?: string }) {
  const body = <><div className="flex items-center justify-between text-tertiary"><span className="text-label-sm font-semibold uppercase tracking-[0.1em]">{label}</span><WorkspaceIcon name={icon} className="text-xl" /></div><p className="mt-5 font-serif text-headline-lg">{value}</p><p className="mt-1 text-body-sm text-on-surface-variant">{detail}</p></>;
  return href ? <Link href={href} className="rounded-xl bg-surface-container p-5 shadow-sm transition-shadow hover:shadow-md">{body}</Link> : <article className="rounded-xl bg-surface-container p-5 shadow-sm">{body}</article>;
}

function ProgressItem({ complete = false, title, children }: { complete?: boolean; title: string; children: ReactNode }) {
  return <li className="flex gap-3"><span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${complete ? "bg-secondary-container text-secondary" : "bg-primary-fixed text-primary"}`}>{complete ? <WorkspaceIcon name="check" className="text-sm" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}</span><div><h3 className="text-body-sm font-semibold">{title}</h3><p className="mt-1 text-body-sm leading-5 text-on-surface-variant">{children}</p></div></li>;
}

function UpcomingEvent({ event }: { event: EventView }) {
  return <Link href={`/events/${event.id}`} className="flex items-center gap-4 p-4 transition-colors hover:bg-surface-container sm:p-5"><span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-primary-fixed text-primary"><strong className="text-title-md leading-none">{Number(event.localDate.slice(8, 10))}</strong><span className="mt-1 text-[9px] font-semibold uppercase">{new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(new Date(`${event.localDate}T00:00:00Z`))}</span></span><span className="min-w-0 flex-1"><span className="block truncate text-title-md font-semibold">{event.name}</span><span className="mt-1 block truncate text-body-sm text-on-surface-variant">{formatEventDate(event)} · {event.venueName}</span></span><WorkspaceIcon name="arrow" className="text-on-surface-variant" /></Link>;
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return <div className="rounded-lg bg-surface-container-low p-4"><dt className="text-label-sm font-semibold uppercase tracking-[0.1em] text-tertiary">{label}</dt><dd className="mt-2 text-body-sm leading-6 text-on-surface">{children}</dd></div>;
}

function Activity({ icon, title, children }: { icon: Parameters<typeof WorkspaceIcon>[0]["name"]; title: string; children: ReactNode }) {
  return <div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container text-tertiary"><WorkspaceIcon name={icon} /></span><div><p className="text-body-sm font-semibold">{title}</p><p className="mt-1 text-body-sm leading-5 text-on-surface-variant">{children}</p></div></div>;
}

function formatWeddingDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function formatEventDate(event: EventView) {
  const date = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${event.localDate}T00:00:00Z`));
  const [hour, minute] = event.startLocalTime.split(":").map(Number);
  const time = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, hour, minute));
  return `${date} at ${time}`;
}

function getDaysToGo(value: string) {
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const weddingUtc = new Date(`${value}T00:00:00Z`).getTime();
  const days = Math.ceil((weddingUtc - todayUtc) / 86_400_000);
  return days >= 0 ? days : null;
}

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
