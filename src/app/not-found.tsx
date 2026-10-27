import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/marketing/brand";

export const metadata: Metadata = { title: "Page not found | Make My Marriage", robots: { index: false, follow: false } };

export default function NotFound() {
  return <main className="flex min-h-svh items-center justify-center bg-surface px-5 py-12 text-on-surface">
    <section className="w-full max-w-2xl rounded-2xl bg-surface-container-lowest p-7 text-center shadow-sm sm:p-12">
      <div className="flex justify-center"><Brand /></div>
      <p className="mt-10 text-label-sm font-semibold uppercase tracking-[0.16em] text-primary">404 · Lost in the celebration</p>
      <h1 className="mt-3 font-serif text-headline-lg-mobile sm:text-headline-lg">This page could not be found</h1>
      <p className="mx-auto mt-4 max-w-lg text-body-md leading-7 text-on-surface-variant">The link may be outdated, private, or moved. Return to the homepage or open your signed-in wedding workspace.</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/" className="rounded-lg bg-surface-container px-5 py-3 text-body-sm font-semibold">Go to homepage</Link><Link href="/dashboard" className="rounded-lg bg-primary px-5 py-3 text-body-sm font-semibold text-on-primary">Open wedding workspace</Link></div>
    </section>
  </main>;
}
