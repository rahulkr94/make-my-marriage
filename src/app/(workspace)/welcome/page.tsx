import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { Brand } from "@/components/marketing/brand";
import { getCurrentUser } from "@/modules/auth/session";

export const metadata: Metadata = { title: "Welcome | Make My Marriage" };

export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="min-h-svh bg-surface">
      <header className="border-b border-outline-variant/35">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Brand />
          <LogoutButton />
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="max-w-3xl">
          <p className="text-label-sm uppercase tracking-[0.18em] text-primary">Account ready</p>
          <h1 className="mt-5 font-serif text-display-mobile sm:text-display">Welcome, {user.name}.</h1>
          <p className="mt-6 max-w-2xl text-body-lg leading-8 text-on-surface-variant">
            Your Make My Marriage account is secure and ready. Creating your wedding workspace is the next feature in our plan.
          </p>
          <div className="mt-10 rounded-lg border border-outline-variant/60 bg-surface-container-low p-6 sm:p-8">
            <p className="text-label-sm uppercase tracking-widest text-secondary">Next step</p>
            <h2 className="mt-3 font-serif text-headline-sm">A shared home for your wedding</h2>
            <p className="mt-3 text-body-md leading-7 text-on-surface-variant">Wedding setup, partner and family invitations, and permissions will arrive in the Wedding workspace milestone.</p>
          </div>
          <Link href="/" className="mt-8 inline-flex text-body-sm font-semibold text-primary hover:underline">Explore the homepage</Link>
        </div>
      </section>
    </main>
  );
}
