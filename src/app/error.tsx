"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Brand } from "@/components/marketing/brand";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Application route failed", { digest: error.digest }); }, [error]);
  return <main className="flex min-h-svh items-center justify-center bg-surface px-5 py-12 text-on-surface">
    <section className="w-full max-w-2xl rounded-2xl bg-surface-container-lowest p-7 text-center shadow-sm sm:p-12">
      <div className="flex justify-center"><Brand /></div>
      <p className="mt-10 text-label-sm font-semibold uppercase tracking-[0.16em] text-error">A quiet interruption</p>
      <h1 className="mt-3 font-serif text-headline-lg-mobile sm:text-headline-lg">We could not open this page</h1>
      <p className="mx-auto mt-4 max-w-lg text-body-md leading-7 text-on-surface-variant">Your saved wedding information has not been changed. Try loading the page again, or return to your workspace.</p>
      {error.digest && <p className="mt-3 text-label-sm text-on-surface-variant">Reference: {error.digest}</p>}
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/dashboard" className="rounded-lg bg-surface-container px-5 py-3 text-body-sm font-semibold">Return to workspace</Link><button type="button" onClick={reset} className="rounded-lg bg-primary px-5 py-3 text-body-sm font-semibold text-on-primary">Try again</button></div>
    </section>
  </main>;
}
