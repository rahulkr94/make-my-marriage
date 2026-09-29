import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "@/components/marketing/brand";

export function AuthShell({ eyebrow, title, description, children, footer }: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="auth-page min-h-svh lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(30rem,0.82fr)]">
      <section className="relative hidden min-h-svh overflow-hidden bg-primary text-on-primary lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="auth-orbit auth-orbit-one" aria-hidden="true" />
        <div className="auth-orbit auth-orbit-two" aria-hidden="true" />
        <Link href="/" className="relative z-10 w-fit font-serif text-2xl">Make My Marriage</Link>
        <div className="relative z-10 max-w-xl pb-10">
          <p className="text-label-sm uppercase tracking-[0.18em] text-on-primary/70">One thoughtful place</p>
          <p className="mt-6 font-serif text-[clamp(2.5rem,4vw,4.75rem)] leading-[1.08] tracking-[-0.025em]">
            Plan the celebration. Keep the joy.
          </p>
          <p className="mt-7 max-w-md text-body-lg leading-8 text-on-primary/75">
            Bring your people, plans, and precious details together as your wedding takes shape.
          </p>
        </div>
        <p className="relative z-10 text-body-sm text-on-primary/60">Designed for celebrations shared with family.</p>
      </section>

      <section className="flex min-h-svh flex-col bg-surface px-5 py-6 sm:px-10 lg:px-14 xl:px-20">
        <div className="flex items-center justify-between lg:hidden">
          <Brand />
          <Link href="/" className="text-body-sm text-on-surface-variant hover:text-primary">Home</Link>
        </div>
        <div className="mx-auto flex w-full max-w-[31rem] flex-1 flex-col justify-center py-12 sm:py-16">
          <p className="text-label-sm uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
          <h1 className="mt-4 font-serif text-headline-lg sm:text-[2.8rem] sm:leading-[1.15]">{title}</h1>
          <p className="mt-4 text-body-md leading-7 text-on-surface-variant">{description}</p>
          <div className="mt-9">{children}</div>
          <div className="mt-8 text-center text-body-sm text-on-surface-variant">{footer}</div>
        </div>
      </section>
    </main>
  );
}
