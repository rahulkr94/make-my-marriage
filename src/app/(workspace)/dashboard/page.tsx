import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { WorkspaceIcon } from "@/components/weddings/workspace-icon";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getCurrentUser } from "@/modules/auth/session";
import { canManageEvents } from "@/modules/events/constants";
import { getUpcomingEvents, type EventView } from "@/modules/events/service";
import { getGuestSummary } from "@/modules/guests/service";
import { canManageFinances } from "@/modules/finance/constants";
import { getExpenseDashboardSummary } from "@/modules/finance/service";
import { getGalleryDashboardSummary } from "@/modules/gallery/service";
import { getWeddingMemberSummary } from "@/modules/members/service";
import { getRsvpDashboardSummary } from "@/modules/rsvp/service";
import { getTaskDashboardSummary } from "@/modules/tasks/service";
import { getWorkspaceForUser } from "@/modules/weddings/service";

export const metadata: Metadata = { title: "Dashboard | Make My Marriage" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  const workspace = await getWorkspaceForUser(user.id);
  if (!workspace) redirect("/setup/wedding");

  const { wedding, membership } = workspace;
  const eventManager = canManageEvents(membership.role);
  const financeManager = canManageFinances(membership.role);
  const [memberSummary, upcomingEvents, guestSummary, rsvpSummary, taskSummary, expenseSummary, gallerySummary] = await Promise.all([
    getWeddingMemberSummary(user.id, wedding.id),
    getUpcomingEvents(user.id, wedding.id),
    eventManager ? getGuestSummary(user.id, wedding.id) : Promise.resolve(null),
    eventManager ? getRsvpDashboardSummary(user.id, wedding.id) : Promise.resolve(null),
    getTaskDashboardSummary(user.id, wedding.id),
    financeManager ? getExpenseDashboardSummary(user.id, wedding.id) : Promise.resolve(null),
    getGalleryDashboardSummary(user.id, wedding.id),
  ]);
  const daysToGo = getDaysToGo(wedding.weddingDate);
  const firstName = user.name.trim().split(/\s+/)[0] || user.name;
  const pendingCopy = memberSummary.pendingInvitations === null
    ? "Visible to wedding admins"
    : `${memberSummary.pendingInvitations} pending invitation${memberSummary.pendingInvitations === 1 ? "" : "s"}`;

  return (
    <WorkspaceShell user={user} wedding={wedding} role={membership.role} active="dashboard" title="Overview">
      <main className="mx-auto flex max-w-[1360px] flex-col gap-10 px-5 py-8 sm:px-8 sm:py-10 xl:px-12">
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
            {eventManager && <DashboardAction href="/tasks?create=1" icon="check">Add task</DashboardAction>}
            {financeManager && <DashboardAction href="/expenses?create=1" icon="payments">Add expense</DashboardAction>}
          </div>
        </section>

        <section aria-labelledby="attention-title">
          <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-label-sm font-semibold uppercase tracking-[0.12em] text-tertiary">Planning pulse</p><h2 id="attention-title" className="mt-1 font-serif text-headline-sm">What needs attention</h2></div><span className="text-body-sm text-on-surface-variant">Live ceremony, guest, RSVP, and task priorities</span></div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AttentionCard icon="calendar" tone="event" label="Ceremony schedule" title={upcomingEvents[0]?.name ?? (eventManager ? "Add your first event" : "No published events yet")} description={upcomingEvents[0] ? `${formatEventDate(upcomingEvents[0])} · ${upcomingEvents[0].venueName}` : "Dates, times, venues, and directions now live in Events & ceremonies."} href={upcomingEvents[0] ? `/events/${upcomingEvents[0].id}` : eventManager ? "/events/new" : "/events"} action={upcomingEvents[0] ? "View next event" : eventManager ? "Create event" : "View schedule"} />
            <AttentionCard icon="clock" tone={taskSummary.overdue ? "warning" : "task"} label="Planning tasks" title={taskSummary.overdue ? `${taskSummary.overdue} overdue task${taskSummary.overdue === 1 ? "" : "s"}` : `${taskSummary.open + taskSummary.inProgress} active task${taskSummary.open + taskSummary.inProgress === 1 ? "" : "s"}`} description={taskSummary.overdue ? "These deadlines need attention from the wedding team." : `${taskSummary.completionRate}% of active wedding tasks completed.`} href="/tasks" action="Open task plan" />
            <AttentionCard icon="mail" tone="guest" label="Wedding guestbook" title={guestSummary ? `${guestSummary.activeGuests} active guest${guestSummary.activeGuests === 1 ? "" : "s"}` : "Managed by the planning team"} description={guestSummary ? "Add guests and assign the published ceremonies they are invited to." : "Admins and Managers organise private guest records and ceremony assignments."} href={guestSummary ? "/guests" : undefined} action="Open guestbook" />
            {rsvpSummary ? <AttentionCard icon="check" tone={rsvpSummary.pending ? "warning" : "success"} label="RSVP responses" title={`${rsvpSummary.pending} awaiting response`} description={`${rsvpSummary.expectedAttendees} expected attendees across current ceremony assignments.`} href="/rsvps" action="Review responses" /> : <AttentionCard icon="users" tone="neutral" label="Wedding team" title={`${memberSummary.activeMembers} active member${memberSummary.activeMembers === 1 ? "" : "s"}`} description={pendingCopy} href={membership.role === "ADMIN" ? "/members" : undefined} action="View wedding team" />}
          </div>
        </section>

        <section aria-label="Wedding metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard icon="users" tone="neutral" label="Wedding team" value={String(memberSummary.activeMembers)} detail="Active members" href={membership.role === "ADMIN" ? "/members" : undefined} />
          <MetricCard icon="mail" tone="guest" label="Wedding guests" value={guestSummary ? String(guestSummary.activeGuests) : "—"} detail={guestSummary ? "Active guest records" : "Visible to planners"} href={guestSummary ? "/guests" : undefined} />
          <MetricCard icon="check" tone="success" label="RSVP progress" value={rsvpSummary ? `${rsvpSummary.responseRate}%` : "—"} detail={rsvpSummary ? `${rsvpSummary.accepted} accepted · ${rsvpSummary.pending} pending` : "Visible to planners"} href={rsvpSummary ? "/rsvps" : undefined} />
          <MetricCard icon="clock" tone={taskSummary.overdue ? "warning" : "task"} label="Task progress" value={`${taskSummary.completionRate}%`} detail={`${taskSummary.overdue} overdue · ${taskSummary.open + taskSummary.inProgress} active`} href="/tasks" />
          <MetricCard icon="payments" tone={expenseSummary && BigInt(expenseSummary.outstandingMinor) > BigInt(0) ? "warning" : "recorded"} label="Expenses logged" value={expenseSummary ? formatMoney(expenseSummary.totalMinor) : "—"} detail={expenseSummary ? `${formatMoney(expenseSummary.outstandingMinor)} outstanding` : "Visible to planners"} href={expenseSummary ? "/expenses" : undefined} />
          <MetricCard icon="gallery" tone="gallery" label="Shared photos" value={String(gallerySummary.approved)} detail={gallerySummary.pending === null ? "Approved gallery moments" : `${gallerySummary.pending} awaiting review`} href="/gallery" />
        </section>

        {rsvpSummary && <section className="rounded-xl bg-surface-container-low p-5 shadow-sm sm:p-7" aria-labelledby="dashboard-rsvp-title"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-label-sm font-semibold uppercase tracking-[0.12em] text-tertiary">Guest attendance</p><h2 id="dashboard-rsvp-title" className="mt-1 font-serif text-headline-md">RSVP progress</h2><p className="mt-2 text-body-sm text-on-surface-variant">{rsvpSummary.accepted + rsvpSummary.declined} of {rsvpSummary.invitedGuestRecords} assigned guest records have replied.</p></div><Link href="/rsvps" className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-body-sm font-semibold text-on-primary">View all responses<WorkspaceIcon name="arrow" /></Link></div><div className="mt-6 h-2.5 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-secondary" style={{ width: `${rsvpSummary.responseRate}%` }} /></div><div className="mt-5 grid gap-3 sm:grid-cols-4"><Detail label="Accepted">{rsvpSummary.accepted}</Detail><Detail label="Declined">{rsvpSummary.declined}</Detail><Detail label="Awaiting">{rsvpSummary.pending}</Detail><Detail label="Expected attendees">{rsvpSummary.expectedAttendees}</Detail></div>{rsvpSummary.events.length > 0 && <div className="mt-5 grid gap-3 md:grid-cols-3">{rsvpSummary.events.map((event) => <Link key={event.id} href={`/rsvps?eventId=${event.id}`} className="rounded-lg bg-surface-container-lowest p-4 hover:bg-surface"><p className="font-semibold">{event.name}</p><p className="mt-1 text-label-sm text-on-surface-variant">{event.accepted} accepted · {event.pending} awaiting</p></Link>)}</div>}</section>}

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
              <ProgressItem complete title="RSVP collection">Per-event responses and current attendance totals are live.</ProgressItem>
              <ProgressItem complete title="Tasks and timeline">Assignments, deadlines, status tracking, and the combined wedding timeline are ready.</ProgressItem>
              {financeManager && <ProgressItem complete title="Expense ledger">Actual costs, payment history, balances, and ceremony totals are ready.</ProgressItem>}
              {financeManager && <ProgressItem complete title="Vendor directory">Contacts, ceremony assignments, quotes, payments, and linked expenses are ready.</ProgressItem>}
              <ProgressItem complete title="Wedding gallery">Private uploads, moderation, guest contributions, and approved sharing are ready.</ProgressItem>
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
            <div className="mt-5 space-y-4"><Activity icon="check" title="Wedding workspace created">Your foundational wedding information is saved.</Activity><Activity icon="users" title={`${memberSummary.activeMembers} member${memberSummary.activeMembers === 1 ? "" : "s"} can access this wedding`}>Access follows each person&apos;s workspace role.</Activity><Activity icon="sparkle" title="Dashboard is ready">Live planning data stays connected across your wedding workspace.</Activity></div>
          </article>
        </section>

        <footer className="flex flex-col items-center justify-between gap-3 border-t border-outline-variant/30 pt-6 text-center text-body-sm text-on-surface-variant sm:flex-row sm:text-left"><Link href="/" className="font-semibold text-tertiary hover:text-primary">← Public homepage</Link><p>Make My Marriage · A quiet place to plan together.</p></footer>
      </main>
    </WorkspaceShell>
  );
}

function DashboardAction({ href, icon, children }: { href?: string; icon: Parameters<typeof WorkspaceIcon>[0]["name"]; children: ReactNode }) {
  const classes = `inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-body-sm font-semibold shadow-sm ${href ? "bg-surface-container text-on-surface hover:bg-surface-container-high" : "cursor-default bg-surface-container-low text-outline"}`;
  const content = <><WorkspaceIcon name={icon} className="text-lg" />{children}{!href && <span className="text-[9px] uppercase tracking-[0.1em]">Soon</span>}</>;
  return href ? <Link href={href} className={classes}>{content}</Link> : <span aria-disabled="true" className={classes}>{content}</span>;
}

type DashboardCardTone = "neutral" | "event" | "task" | "guest" | "success" | "warning" | "recorded" | "gallery";
const DASHBOARD_CARD_STYLES: Record<DashboardCardTone, { card: string; icon: string; value: string }> = {
  neutral: { card: "border-outline-variant", icon: "bg-surface-container-high text-tertiary", value: "text-on-surface" },
  event: { card: "border-outline-variant", icon: "bg-primary-fixed/65 text-primary", value: "text-on-surface" },
  task: { card: "border-primary", icon: "bg-primary-fixed/65 text-primary", value: "text-on-surface" },
  guest: { card: "border-tertiary-container", icon: "bg-tertiary-fixed/45 text-tertiary", value: "text-on-surface" },
  success: { card: "border-secondary", icon: "bg-secondary-fixed text-secondary", value: "text-on-surface" },
  warning: { card: "border-primary", icon: "bg-tertiary-fixed text-primary", value: "text-primary" },
  recorded: { card: "border-outline-variant", icon: "bg-surface-container-high text-primary", value: "text-on-surface" },
  gallery: { card: "border-tertiary-container", icon: "bg-primary-fixed/60 text-primary", value: "text-on-surface" },
};

function AttentionCard({ icon, tone, label, title, description, href, action }: { icon: Parameters<typeof WorkspaceIcon>[0]["name"]; tone: DashboardCardTone; label: string; title: string; description: string; href?: string; action?: string }) {
  const styles = DASHBOARD_CARD_STYLES[tone];
  return <article className={`flex min-h-56 flex-col justify-between rounded-xl border-b-4 bg-surface-container-low p-5 shadow-sm ${styles.card}`}><div><div className="flex items-start justify-between gap-3"><p className="pt-1 text-label-sm font-semibold uppercase tracking-[0.1em] text-on-surface-variant">{label}</p><span className={`grid size-10 shrink-0 place-items-center rounded-lg text-lg ${styles.icon}`}><WorkspaceIcon name={icon} /></span></div><h3 className={`mt-4 text-title-lg font-semibold ${styles.value}`}>{title}</h3><p className="mt-2 text-body-sm leading-6 text-on-surface-variant">{description}</p></div>{href && action ? <Link href={href} className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-surface-container-lowest px-3 py-2 text-body-sm font-semibold text-primary hover:bg-surface-container-high">{action}<WorkspaceIcon name="arrow" /></Link> : <span className="mt-5 inline-flex w-fit rounded bg-surface-container-high px-2 py-1 text-label-sm font-semibold text-on-surface-variant">Future feature</span>}</article>;
}

function MetricCard({ icon, tone, label, value, detail, href }: { icon: Parameters<typeof WorkspaceIcon>[0]["name"]; tone: DashboardCardTone; label: string; value: string; detail: string; href?: string }) {
  const styles = DASHBOARD_CARD_STYLES[tone];
  const body = <><div className="flex items-start justify-between gap-2"><span className="pt-1 text-label-sm font-semibold uppercase tracking-[0.1em] text-on-surface-variant">{label}</span><span className={`grid size-9 shrink-0 place-items-center rounded-lg ${styles.icon}`}><WorkspaceIcon name={icon} /></span></div><p className={`mt-5 font-serif text-headline-md ${styles.value}`}>{value}</p><p className="mt-1 text-body-sm text-on-surface-variant">{detail}</p></>;
  const classes = `rounded-xl border-b-4 bg-surface-container-low p-5 shadow-sm ${styles.card}`;
  return href ? <Link href={href} className={`${classes} transition-shadow hover:shadow-md`}>{body}</Link> : <article className={classes}>{body}</article>;
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

function formatMoney(value: string) {
  const minor = BigInt(value);
  const whole = minor / BigInt(100);
  const fraction = String(minor % BigInt(100)).padStart(2, "0");
  return `₹${new Intl.NumberFormat("en-IN").format(whole)}${fraction === "00" ? "" : `.${fraction}`}`;
}
