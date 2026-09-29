"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { WEDDING_TIME_ZONES } from "@/modules/weddings/time-zones";
import { WorkspaceIcon } from "./workspace-icon";

type ApiError = { error?: { message?: string; details?: Array<{ path: string; message: string }> } };

export function WeddingSetupForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [descriptionLength, setDescriptionLength] = useState(0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));

    try {
      const response = await fetch("/api/v1/weddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as ApiError;

      if (!response.ok) {
        const errors = (payload.error?.details ?? []).reduce<Record<string, string[]>>((result, detail) => {
          (result[detail.path] ??= []).push(detail.message);
          return result;
        }, {});
        setFieldErrors(errors);
        setError(payload.error?.message ?? "We could not create your wedding workspace. Please try again.");
        return;
      }

      router.replace("/welcome");
      router.refresh();
    } catch {
      setError("We could not reach the server. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-busy={pending} className="relative space-y-8 rounded-xl bg-surface-container-lowest p-5 shadow-[0_16px_48px_rgba(68,52,37,0.08)] sm:p-9 lg:p-11">
      {pending && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-surface/90 px-8 text-center backdrop-blur-sm" role="status">
          <span className="flex h-14 w-14 animate-pulse items-center justify-center rounded-full bg-surface-container-high text-primary"><WorkspaceIcon name="sparkle" className="text-2xl" /></span>
          <h2 className="mt-5 font-serif text-headline-sm">Creating your wedding workspace…</h2>
          <p className="mt-2 max-w-sm text-body-sm leading-6 text-on-surface-variant">Saving the details that will anchor your celebration.</p>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-label-sm font-semibold uppercase tracking-[0.16em] text-tertiary">Monograph setup</p>
          <h2 className="mt-1 font-serif text-headline-sm">Workspace details</h2>
        </div>
        <span className="rounded bg-surface-container-low px-3 py-1 text-label-sm font-semibold uppercase tracking-[0.1em] text-secondary">Draft mode</span>
      </div>

      <fieldset>
        <legend className="font-serif text-headline-sm">The two of you</legend>
        <p className="mt-1 text-body-sm leading-6 text-on-surface-variant">Use the names you’d like family and guests to see across your wedding workspace.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label="Bride’s name" name="brideName" autoComplete="name" placeholder="e.g. Priya" meta="Given name" error={fieldErrors.brideName?.[0]} />
          <Field label="Groom’s name" name="groomName" autoComplete="name" placeholder="e.g. Rahul" meta="Given name" error={fieldErrors.groomName?.[0]} />
        </div>
      </fieldset>

      <div className="flex items-center text-tertiary-container/60" aria-hidden="true">
        <span className="h-px flex-1 bg-surface-container-high" />
        <span className="px-4 font-serif text-headline-sm">❦</span>
        <span className="h-px flex-1 bg-surface-container-high" />
      </div>

      <fieldset>
        <legend className="font-serif text-headline-sm">The celebration</legend>
        <p className="mt-1 text-body-sm leading-6 text-on-surface-variant">The primary date and destination set the foundation for future events and schedules.</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Primary wedding date" name="weddingDate" type="date" autoComplete="off" hint="Usually the main ceremony or pheras date." error={fieldErrors.weddingDate?.[0]} />
          <label className="block text-body-sm font-semibold" htmlFor="timeZone">
            Time zone
            <span className="relative mt-2 block">
              <WorkspaceIcon name="clock" className="pointer-events-none absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-lg text-on-surface-variant" />
              <select id="timeZone" name="timeZone" defaultValue="Asia/Kolkata" required aria-invalid={Boolean(fieldErrors.timeZone)} aria-describedby={fieldErrors.timeZone ? "timeZone-error" : "timeZone-hint"} className={`${inputClasses} mt-0 appearance-none pl-11 pr-9`}>
                {WEDDING_TIME_ZONES.map((zone) => <option key={zone.value} value={zone.value}>{zone.label}</option>)}
              </select>
              <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant">⌄</span>
            </span>
            {fieldErrors.timeZone ? <FieldError id="timeZone-error">{fieldErrors.timeZone[0]}</FieldError> : <span id="timeZone-hint" className="mt-2 block text-label-sm font-normal leading-5 text-on-surface-variant">Dates and countdowns use this time zone.</span>}
          </label>
        </div>
        <div className="mt-5 space-y-5">
          <Field label="Main venue or palace name" name="mainVenueName" autoComplete="organization" placeholder="e.g. The Leela Palace Jaipur" icon="location" error={fieldErrors.mainVenueName?.[0]} />
          <Field label="Full venue address and destination" name="mainAddress" autoComplete="street-address" placeholder="Complete address for guest navigation" icon="location" error={fieldErrors.mainAddress?.[0]} />
          <label className="block text-body-sm font-semibold" htmlFor="description">
            <span className="flex items-center justify-between gap-3">
              <span>Optional welcome note and story</span>
              <span className="text-label-sm font-normal text-on-surface-variant">{descriptionLength} / 1,000</span>
            </span>
            <textarea id="description" name="description" rows={4} maxLength={1000} onChange={(event) => setDescriptionLength(event.currentTarget.value.length)} placeholder="A joyful weekend celebrating with the people who shaped our story…" aria-invalid={Boolean(fieldErrors.description)} aria-describedby={fieldErrors.description ? "description-error" : "description-hint"} className={`${inputClasses} resize-y`} />
            {fieldErrors.description ? <FieldError id="description-error">{fieldErrors.description[0]}</FieldError> : <span id="description-hint" className="mt-2 block text-label-sm font-normal leading-5 text-on-surface-variant">You can refine this note later in wedding settings.</span>}
          </label>
        </div>
      </fieldset>

      {error && <p role="alert" className="rounded-lg border border-error/25 bg-error-container px-4 py-3 text-body-sm text-on-error-container">{error}</p>}

      <div className="flex items-start gap-4 rounded-xl bg-surface-container-low p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-highest text-tertiary"><WorkspaceIcon name="shield" className="text-xl" /></span>
        <div>
          <h3 className="text-body-sm font-semibold">Workspace custodianship</h3>
          <p className="mt-1 text-body-sm leading-6 text-on-surface-variant">You’ll become the first administrator. Each account can belong to one active wedding workspace in this version.</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="order-2 flex items-center gap-2 text-body-sm text-on-surface-variant sm:order-1"><WorkspaceIcon name="lock" className="text-secondary" /> Member-only workspace · One active wedding</p>
        <button disabled={pending} type="submit" className="order-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-title-md font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-55 sm:order-2 sm:w-auto">
          Create wedding workspace <WorkspaceIcon name="arrow" className="text-lg" />
        </button>
      </div>
    </form>
  );
}

const inputClasses = "mt-2 w-full rounded-lg border border-transparent bg-surface-container-low px-4 py-3 text-body-md font-normal text-on-surface shadow-inner placeholder:text-outline transition-colors focus:border-primary focus:bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary aria-[invalid=true]:border-error aria-[invalid=true]:bg-error-container/20";

function Field({ label, name, type = "text", autoComplete, placeholder, meta, hint, icon, error }: {
  label: string;
  name: string;
  type?: string;
  autoComplete: string;
  placeholder?: string;
  meta?: string;
  hint?: string;
  icon?: "location";
  error?: string;
}) {
  return (
    <label className="block text-body-sm font-semibold" htmlFor={name}>
      <span className="flex items-center justify-between gap-3"><span>{label}</span>{meta && <span className="text-label-sm font-normal text-outline">{meta}</span>}</span>
      <span className="relative block">
        {icon && <WorkspaceIcon name={icon} className="pointer-events-none absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-lg text-on-surface-variant" />}
        <input id={name} name={name} type={type} autoComplete={autoComplete} placeholder={placeholder} required aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined} className={`${inputClasses} ${icon ? "pl-11" : ""}`} />
      </span>
      {error ? <FieldError id={`${name}-error`}>{error}</FieldError> : hint && <span id={`${name}-hint`} className="mt-2 block text-label-sm font-normal leading-5 text-on-surface-variant">{hint}</span>}
    </label>
  );
}

function FieldError({ id, children }: { id: string; children: string }) {
  return <span id={id} className="mt-2 block text-label-sm font-normal text-error">{children}</span>;
}
