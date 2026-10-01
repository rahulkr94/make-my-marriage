import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { Brand } from "@/components/marketing/brand";
import { WeddingSettingsForm } from "@/components/weddings/wedding-settings-form";
import { WorkspaceIcon } from "@/components/weddings/workspace-icon";
import { getCurrentUser } from "@/modules/auth/session";
import { getWorkspaceForUser } from "@/modules/weddings/service";

export const metadata: Metadata = { title: "Wedding settings | Make My Marriage" };

export default async function WeddingSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getWorkspaceForUser(user.id);
  if (!workspace) redirect("/setup/wedding");
  if (workspace.membership.role !== "ADMIN") redirect("/welcome");

  const { wedding } = workspace;
  const accountInitial = (user.name || user.email).trim().charAt(0).toUpperCase();

  return (
    <main className="min-h-svh bg-surface">
      <header className="border-b border-outline-variant/35 bg-surface/95">
        <div className="mx-auto flex min-h-20 max-w-[1240px] items-center justify-between gap-5 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-8">
            <Brand />
            <nav aria-label="Workspace sections" className="hidden items-center gap-5 xl:flex">
              <Link href="/welcome" className="py-7 text-body-sm text-on-surface-variant transition-colors hover:text-on-surface">Overview</Link>
              <span className="py-7 text-body-sm text-on-surface-variant">Itinerary &amp; rituals</span>
              <span className="py-7 text-body-sm text-on-surface-variant">Guest curation</span>
              <span className="py-7 text-body-sm text-on-surface-variant">Trousseau &amp; treasury</span>
              <span className="border-b-2 border-primary py-7 text-body-sm font-semibold text-on-surface">Settings</span>
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-body-sm font-semibold text-on-primary">{accountInitial}</span>
            <span className="hidden text-right md:block"><span className="block text-body-sm font-medium">{user.email}</span><span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Host &amp; admin</span></span>
            <span className="hidden h-4 w-px bg-outline-variant/70 sm:block" />
            <LogoutButton compact />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1240px] px-5 pb-16 pt-8 sm:px-8 sm:pt-12">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-label-sm font-semibold uppercase tracking-[0.1em] text-on-surface-variant"><Link href="/welcome" className="hover:text-primary">Wedding workspace</Link><span className="text-outline-variant">/</span><span>Settings</span><span className="text-outline-variant">/</span><span className="text-primary">Wedding details</span></nav>

        <div className="mt-4 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-2xl"><p className="flex items-center gap-2 text-label-sm font-semibold uppercase tracking-[0.14em] text-tertiary"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Wedding settings · Foundational details</p><h1 className="mt-2 font-serif text-headline-lg-mobile tracking-tight sm:text-headline-lg">Refine your wedding details.</h1><p className="mt-3 text-body-lg leading-8 text-on-surface-variant">Keep the date, destination, and story at the heart of your workspace up to date as plans evolve.</p></div>
          <div className="flex flex-wrap items-center gap-3"><span className="inline-flex items-center gap-2 rounded-full bg-secondary-container px-3 py-1 text-label-sm font-semibold uppercase tracking-[0.1em] text-on-secondary-container"><span className="h-1.5 w-1.5 rounded-full bg-secondary" /> {wedding.status}</span><span className="inline-flex items-center gap-2 rounded-full bg-surface-container px-3 py-1 text-label-sm font-semibold text-on-surface-variant"><WorkspaceIcon name="lock" className="text-tertiary" /> Admin access only</span></div>
        </div>

        <div className="mt-9">
          <WeddingSettingsForm weddingId={wedding.id} initialValues={{ brideName: wedding.brideName, groomName: wedding.groomName, weddingDate: wedding.weddingDate, timeZone: wedding.timeZone, mainVenueName: wedding.mainVenueName, mainAddress: wedding.mainAddress, description: wedding.description }} />
        </div>
      </section>

      <footer className="border-t border-outline-variant/25 bg-surface-container-low px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-4 text-center text-body-sm text-on-surface-variant sm:flex-row sm:text-left"><div><p className="font-serif text-headline-sm text-tertiary">Make My Marriage</p><p className="mt-1 text-label-sm uppercase tracking-[0.12em]">A quiet place to plan together</p></div><Link href="/welcome" className="font-semibold hover:text-primary">Return to workspace</Link></div>
      </footer>
    </main>
  );
}
