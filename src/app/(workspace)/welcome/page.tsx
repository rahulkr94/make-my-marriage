import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Brand } from "@/components/marketing/brand";
import { WorkspaceIcon } from "@/components/weddings/workspace-icon";
import { getCurrentUser } from "@/modules/auth/session";
import { WEDDING_TIME_ZONES } from "@/modules/weddings/time-zones";
import { getWorkspaceForUser } from "@/modules/weddings/service";

export const metadata: Metadata = { title: "Wedding workspace | Make My Marriage" };

export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getWorkspaceForUser(user.id);
  if (!workspace) redirect("/setup/wedding");

  const { wedding, membership } = workspace;
  const accountInitial = (user.name || user.email).trim().charAt(0).toUpperCase();
  const monogram = `${wedding.brideName.trim().charAt(0).toUpperCase()} & ${wedding.groomName.trim().charAt(0).toUpperCase()}`;
  const daysToGo = getDaysToGo(wedding.weddingDate);
  const role = membership.role.charAt(0) + membership.role.slice(1).toLowerCase();
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${wedding.mainVenueName}, ${wedding.mainAddress}`)}`;

  return (
    <main className="min-h-svh bg-surface">
      <header className="border-b border-outline-variant/35 bg-surface/95">
        <div className="mx-auto flex min-h-20 max-w-[1360px] items-center justify-between gap-5 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-8">
            <Brand />
            <nav aria-label="Workspace sections" className="hidden items-center gap-5 xl:flex">
              <span className="border-b-2 border-primary py-7 text-body-sm font-semibold text-on-surface">Overview</span>
              <span className="py-7 text-body-sm text-on-surface-variant">Itinerary &amp; rituals</span>
              <span className="py-7 text-body-sm text-on-surface-variant">Guest curation</span>
              <span className="py-7 text-body-sm text-on-surface-variant">Trousseau &amp; treasury</span>
              {membership.role === "ADMIN" && <Link href="/members" className="py-7 text-body-sm text-on-surface-variant transition-colors hover:text-on-surface">Members</Link>}
              <Link href="/settings/wedding" className="py-7 text-body-sm text-on-surface-variant transition-colors hover:text-on-surface">Settings</Link>
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/settings/wedding" aria-label="Wedding settings" className="rounded p-2 text-on-surface-variant transition-colors hover:text-primary xl:hidden"><WorkspaceIcon name="settings" className="text-xl" /></Link>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-body-sm font-semibold text-on-primary">{accountInitial}</span>
            <span className="hidden text-right md:block"><span className="block text-body-sm font-medium">{user.email}</span><span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Host &amp; {role}</span></span>
            <span className="hidden h-4 w-px bg-outline-variant/70 sm:block" />
            <LogoutButton compact />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1240px] px-5 pb-12 pt-10 sm:px-8 sm:pb-16 sm:pt-14">
        <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
          <div className="order-2 text-center md:order-1 md:text-left">
            <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <p className="text-label-sm font-semibold uppercase tracking-[0.18em] text-tertiary">Wedding workspace</p>
              <span className="rounded-full bg-secondary-fixed px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-on-secondary-fixed-variant">{wedding.status}</span>
            </div>
            <h1 className="mt-4 font-serif text-display-mobile leading-tight sm:text-display">Welcome to {wedding.brideName} &amp; {wedding.groomName}.</h1>
            <p className="mx-auto mt-5 max-w-2xl text-body-lg leading-8 text-on-surface-variant md:mx-0">Your shared planning space is ready. Continue one calm step at a time as the celebration takes shape.</p>
          </div>
          <div className="order-1 mx-auto flex h-40 w-40 flex-col items-center justify-center rounded-t-full rounded-b-xl border border-outline-variant/45 bg-surface-container-low text-center shadow-sm md:order-2 md:h-44 md:w-44">
            <WorkspaceIcon name="sparkle" className="text-xl text-tertiary" />
            <p className="mt-3 font-serif text-headline-md">{monogram}</p>
            <p className="mt-2 max-w-28 text-[9px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">Wedding atelier</p>
          </div>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.36fr_0.94fr]">
          <div className="space-y-5">
            <article className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-[0_4px_20px_rgba(28,26,23,0.05)] sm:p-8">
              <WorkspaceIcon name="sparkle" className="pointer-events-none absolute -bottom-12 -right-12 text-[12rem] text-on-surface/[0.025]" />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-label-sm font-semibold uppercase tracking-[0.14em] text-tertiary">Celebration overview</p>
                {membership.role === "ADMIN" && <Link href="/settings/wedding" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-label-md font-semibold text-tertiary transition-colors hover:bg-surface-container-low hover:text-primary"><WorkspaceIcon name="settings" className="text-lg" /> Edit wedding details</Link>}
              </div>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 pb-5 pt-4">
                <h2 className="font-serif text-headline-lg tracking-tight">{formatWeddingDate(wedding.weddingDate)}</h2>
                {daysToGo !== null && <span className="inline-flex items-center gap-2 rounded-full bg-surface-container px-3 py-1 text-label-md text-tertiary"><WorkspaceIcon name="clock" /> {daysToGo === 0 ? "Today" : `${daysToGo} days to go`}</span>}
              </div>

              <div className="grid gap-4 border-t border-outline-variant/30 pt-5 sm:grid-cols-2">
                <div className="rounded-lg bg-surface-container-low/70 p-4">
                  <p className="flex items-center gap-2 text-label-sm font-semibold uppercase tracking-[0.1em] text-tertiary"><WorkspaceIcon name="location" className="text-lg" /> Primary venue</p>
                  <h3 className="mt-2 text-title-md font-semibold">{wedding.mainVenueName}</h3>
                  <p className="mt-1 text-body-sm leading-6 text-on-surface-variant">{wedding.mainAddress}</p>
                  <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-label-md font-semibold text-primary hover:underline" aria-label={`View ${wedding.mainVenueName} on Google Maps (opens in a new tab)`}>View location details <span aria-hidden="true">↗</span></a>
                </div>
                <div className="rounded-lg bg-surface-container-low/70 p-4">
                  <p className="flex items-center gap-2 text-label-sm font-semibold uppercase tracking-[0.1em] text-tertiary"><WorkspaceIcon name="clock" className="text-lg" /> Ceremonial time zone</p>
                  <h3 className="mt-2 text-title-md font-semibold">{getTimeZoneLabel(wedding.timeZone)}</h3>
                  <p className="mt-1 text-body-sm text-on-surface-variant">{wedding.timeZone.replace("_", " ")}</p>
                  <p className="mt-3 flex items-center gap-2 text-label-sm text-on-surface-variant"><span className="h-1.5 w-1.5 rounded-full bg-secondary" /> Future schedules will use this zone</p>
                </div>
              </div>

              {wedding.description && (
                <div className="relative mt-5 rounded-lg bg-surface-container-low py-5 pl-7 pr-5 before:absolute before:bottom-4 before:left-3 before:top-4 before:w-[3px] before:rounded-full before:bg-tertiary">
                  <p className="font-serif text-headline-sm italic leading-relaxed">“{wedding.description}”</p>
                  <p className="mt-3 text-label-sm font-semibold uppercase tracking-[0.1em] text-tertiary">Wedding workspace note</p>
                </div>
              )}
            </article>

            <div className="flex flex-col gap-4 rounded-xl bg-surface-container-low p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-highest text-tertiary"><WorkspaceIcon name="shield" className="text-xl" /></span>
                <div><p className="text-label-sm font-semibold uppercase tracking-[0.1em] text-tertiary">Your access · <span className="normal-case tracking-normal text-on-surface">Workspace {role}</span></p><p className="mt-1 text-body-sm leading-6 text-on-surface-variant">You created this workspace and can manage its settings and future members.</p></div>
              </div>
              <div className="shrink-0 text-body-sm text-on-surface-variant sm:text-right"><p className="flex items-center gap-1.5 sm:justify-end"><WorkspaceIcon name="lock" className="text-secondary" /> Member-only access</p><p className="mt-1 text-label-sm text-tertiary">1 active wedding</p></div>
            </div>
          </div>

          <aside>
            <p className="text-label-sm font-semibold uppercase tracking-[0.14em] text-tertiary">Foundational roadmap</p>
            <h2 className="mt-2 font-serif text-headline-sm">Build your celebration, one step at a time.</h2>
            <p className="mt-2 text-body-sm leading-6 text-on-surface-variant">A calm sequence that keeps each planning stage focused and usable.</p>

            <ol className="relative mt-6 space-y-4 pl-5 before:absolute before:bottom-6 before:left-[11px] before:top-6 before:w-px before:bg-outline-variant">
              <RoadmapCard state="complete" title="Wedding details" badge="Complete">
                Your foundational celebration information and primary date are saved.
              </RoadmapCard>
              <RoadmapCard state="complete" title="Invite your people" badge="Complete">
                Bring your partner and family coordinators into the workspace with clear invitation roles.
                {membership.role === "ADMIN" && <Link href="/members" className="mt-3 inline-flex items-center gap-1 text-label-md font-semibold text-primary hover:underline">Manage wedding members <span aria-hidden="true">→</span></Link>}
              </RoadmapCard>
              <RoadmapCard state="next" title="Events & multi-day itinerary" badge="Next step">
                Add rituals, dates, timings, venues, directions, and dress notes for every gathering.
                <div className="mt-3 flex flex-wrap gap-1.5">{["Haldi", "Mehendi", "Sangeet", "Pheras", "Reception"].map((event) => <span key={event} className="rounded bg-surface-container px-2 py-1 text-[10px] font-semibold text-tertiary">{event}</span>)}</div>
                <p className="mt-4 rounded-lg bg-primary/8 px-4 py-3 text-center text-label-md font-semibold text-primary">Events will be the next feature</p>
              </RoadmapCard>
            </ol>
          </aside>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 rounded-xl bg-surface-container-low/60 p-4 text-center text-body-sm text-on-surface-variant sm:flex-row sm:text-left">
          <p className="flex items-center gap-2 text-tertiary"><WorkspaceIcon name="sparkle" className="text-lg" /> Make My Marriage · Wedding atelier</p>
          <p className="flex items-center gap-2 text-label-sm font-semibold uppercase tracking-[0.1em] text-secondary"><span className="h-1.5 w-1.5 rounded-full bg-secondary" /> Saved to your workspace</p>
        </div>
      </section>

      <footer className="border-t border-outline-variant/25 bg-surface-container-low px-5 py-6 sm:px-8">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-3 text-body-sm text-on-surface-variant sm:flex-row"><Link href="/" className="hover:text-primary">← Return to public homepage</Link><p>Make My Marriage · A quiet place to plan together.</p></div>
      </footer>
    </main>
  );
}

function RoadmapCard({ state, title, badge, children }: { state: "complete" | "next" | "later"; title: string; badge: string; children: ReactNode }) {
  const styles = state === "later" ? "bg-surface-container-low/80" : "bg-surface-container-lowest shadow-[0_4px_18px_rgba(28,26,23,0.05)]";
  const node = state === "complete" ? "bg-secondary-fixed text-on-secondary-fixed" : state === "next" ? "bg-primary text-on-primary" : "bg-surface-container-highest text-outline";
  const badgeStyle = state === "complete" ? "bg-secondary-fixed text-on-secondary-fixed-variant" : state === "next" ? "bg-primary-fixed text-on-primary-fixed-variant" : "bg-surface-container-highest text-outline";
  return (
    <li className={`relative rounded-xl p-5 ${styles}`}>
      <span className={`absolute -left-[21px] top-5 flex h-6 w-6 items-center justify-center rounded-full ${node}`}>{state === "complete" ? <WorkspaceIcon name="check" className="text-sm" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}</span>
      <div className="flex items-start justify-between gap-3"><h3 className="text-title-md font-semibold">{title}</h3><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${badgeStyle}`}>{badge}</span></div>
      <div className="mt-2 text-body-sm leading-6 text-on-surface-variant">{children}</div>
    </li>
  );
}

function formatWeddingDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function getDaysToGo(value: string) {
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const weddingUtc = new Date(`${value}T00:00:00Z`).getTime();
  const days = Math.ceil((weddingUtc - todayUtc) / 86_400_000);
  return days >= 0 ? days : null;
}

function getTimeZoneLabel(value: string) {
  return WEDDING_TIME_ZONES.find((zone) => zone.value === value)?.label.replace(/ \([^)]*\)$/, "") ?? value;
}
