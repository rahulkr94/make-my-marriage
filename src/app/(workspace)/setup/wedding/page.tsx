import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Brand } from "@/components/marketing/brand";
import { WeddingSetupForm } from "@/components/weddings/wedding-setup-form";
import { WorkspaceIcon } from "@/components/weddings/workspace-icon";
import { getCurrentUser } from "@/modules/auth/session";
import { getWorkspaceForUser } from "@/modules/weddings/service";

export const metadata: Metadata = { title: "Set up your wedding | Make My Marriage" };

export default async function WeddingSetupPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getWorkspaceForUser(user.id);
  if (workspace) redirect("/welcome");

  const initial = (user.name || user.email).trim().charAt(0).toUpperCase();

  return (
    <main className="min-h-svh bg-surface">
      <header className="border-b border-outline-variant/35 bg-surface/95">
        <div className="mx-auto flex min-h-20 max-w-[1360px] items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-5">
            <Brand />
            <span className="hidden border-l border-outline-variant/60 pl-5 text-label-sm uppercase tracking-[0.16em] text-on-surface-variant lg:block">Workspace initialization</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-body-sm font-semibold text-on-primary">{initial}</span>
            <span className="hidden text-right sm:block"><span className="block text-body-sm font-medium">{user.email}</span><span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant">New host</span></span>
            <span className="hidden h-4 w-px bg-outline-variant/70 sm:block" />
            <LogoutButton compact />
          </div>
        </div>
      </header>

      <div className="border-b border-outline-variant/30 bg-surface-container-low/60">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between px-5 py-3 sm:px-8">
          <p className="flex items-center gap-2 text-label-sm font-semibold uppercase tracking-[0.13em] text-tertiary"><WorkspaceIcon name="sparkle" className="text-base" /> Wedding setup</p>
          <p className="text-label-sm font-semibold text-secondary">Step 1 of 1 · Workspace details</p>
        </div>
      </div>

      <section className="mx-auto grid max-w-[1240px] gap-10 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16 lg:py-16">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <p className="text-label-sm font-semibold uppercase tracking-[0.18em] text-tertiary">Wedding setup · Chapter I</p>
          <h1 className="mt-4 font-serif text-display-mobile leading-tight sm:text-display">Let’s give your wedding <span className="italic">a home.</span></h1>
          <p className="mt-5 max-w-xl text-body-lg leading-8 text-on-surface-variant">These foundational details anchor your events, guest experience, and shared family plans. You can refine them as your celebration takes shape.</p>

          <div className="mt-8 rounded-xl bg-surface-container-low p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-label-sm font-semibold uppercase tracking-[0.12em] text-secondary"><WorkspaceIcon name="sparkle" className="text-base" /> Quiet guarantee</p>
              <span className="rounded bg-surface-container px-2.5 py-1 text-label-sm text-tertiary">Step 1 of 1</span>
            </div>
            <ul className="mt-5 space-y-4 text-body-sm leading-6">
              <SetupPromise icon="shield" title="Member access">Your planning space is available only after account sign-in.</SetupPromise>
              <SetupPromise icon="calendar" title="A living canvas">Refine dates, venue details, and your welcome note as plans evolve.</SetupPromise>
              <SetupPromise icon="users" title="Built for your people">Future invitations and roles will keep family collaboration intentional.</SetupPromise>
            </ul>
          </div>

          <div className="relative mt-6 hidden h-44 overflow-hidden rounded-xl shadow-sm lg:block">
            <Image src="/images/home/venue.jpg" alt="An elegant wedding venue courtyard" fill sizes="440px" className="object-cover" />
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-inverse-surface/90 via-inverse-surface/20 to-transparent p-5 text-inverse-on-surface">
              <p className="font-serif text-headline-sm italic">“The beginning of every celebration.”</p>
              <p className="mt-1 text-label-sm uppercase tracking-[0.15em] text-inverse-on-surface/80">Your wedding monograph</p>
            </div>
          </div>
          <p className="mt-6 hidden text-label-sm uppercase tracking-[0.18em] text-outline lg:block">Make My Marriage · Wedding atelier</p>
        </aside>

        <WeddingSetupForm />
      </section>
    </main>
  );
}

function SetupPromise({ icon, title, children }: { icon: "shield" | "calendar" | "users"; title: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <WorkspaceIcon name={icon} className="mt-1 text-lg text-secondary" />
      <span><strong>{title}:</strong> {children}</span>
    </li>
  );
}
