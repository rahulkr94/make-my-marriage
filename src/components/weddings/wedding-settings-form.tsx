"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { WEDDING_TIME_ZONES } from "@/modules/weddings/time-zones";
import { WorkspaceIcon } from "./workspace-icon";

export type WeddingSettingsValues = {
  brideName: string;
  groomName: string;
  weddingDate: string;
  timeZone: string;
  mainVenueName: string;
  mainAddress: string;
  description: string;
};

type ApiError = { error?: { message?: string; details?: Array<{ path: string; message: string }> } };
type ApiSuccess = { data?: { wedding?: WeddingSettingsValues } };

const fieldLabels: Record<keyof WeddingSettingsValues, string> = {
  brideName: "bride’s name",
  groomName: "groom’s name",
  weddingDate: "wedding date",
  timeZone: "time zone",
  mainVenueName: "venue",
  mainAddress: "address",
  description: "welcome note",
};

export function WeddingSettingsForm({ weddingId, initialValues }: { weddingId: string; initialValues: WeddingSettingsValues }) {
  const router = useRouter();
  const [baseline, setBaseline] = useState(initialValues);
  const [values, setValues] = useState(initialValues);
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const changedKeys = useMemo(() => (Object.keys(values) as Array<keyof WeddingSettingsValues>).filter((key) => values[key] !== baseline[key]), [baseline, values]);
  const dirty = changedKeys.length > 0;

  function update<K extends keyof WeddingSettingsValues>(key: K, value: WeddingSettingsValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setSaved(false);
    setError("");
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dirty || pending) return;
    setPending(true);
    setError("");
    setSaved(false);
    setFieldErrors({});

    const body = Object.fromEntries(changedKeys.map((key) => [key, values[key]]));
    try {
      const response = await fetch(`/api/v1/weddings/${weddingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as ApiError & ApiSuccess;
      if (!response.ok) {
        const errors = (payload.error?.details ?? []).reduce<Record<string, string[]>>((result, detail) => {
          (result[detail.path] ??= []).push(detail.message);
          return result;
        }, {});
        setFieldErrors(errors);
        setError(payload.error?.message ?? "We couldn’t save your changes. Please try again.");
        return;
      }

      const updated = payload.data?.wedding ?? values;
      setValues(updated);
      setBaseline(updated);
      setSaved(true);
      router.refresh();
    } catch {
      setError("We couldn’t reach the server. Your changes are still here, so you can try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid items-start gap-7 lg:grid-cols-12 lg:gap-8">
      <aside className="space-y-5 lg:col-span-4 lg:sticky lg:top-6">
        <div className="overflow-hidden rounded-xl bg-surface-container-low shadow-sm">
          <div className="p-5 sm:p-6">
            <p className="text-label-sm font-semibold uppercase tracking-[0.15em] text-on-surface-variant">Your wedding at a glance</p>
            <div className="my-5 flex flex-col items-center text-center">
              <div className="flex h-28 w-20 flex-col items-center justify-center rounded-t-full bg-surface-container p-2 shadow-sm">
                <div className="flex h-full w-full flex-col items-center justify-center rounded-t-full bg-surface-bright">
                  <span className="font-serif text-headline-sm italic text-primary">{initial(values.brideName)} &amp; {initial(values.groomName)}</span>
                  <span className="my-2 h-px w-7 bg-outline-variant" />
                  <WorkspaceIcon name="sparkle" className="text-sm text-tertiary" />
                </div>
              </div>
              <h2 className="mt-4 font-serif text-headline-sm">{values.brideName || "Bride"} &amp; {values.groomName || "Groom"}</h2>
              <p className="mt-2 flex items-center gap-2 text-label-sm font-semibold uppercase tracking-[0.12em] text-secondary"><span className="h-1.5 w-1.5 rounded-full bg-secondary" /> Planning active</p>
            </div>
          </div>
          <dl className="space-y-4 bg-surface-container/70 p-5 sm:p-6">
            <SummaryRow icon="calendar" label="Ceremony date" value={formatWeddingDate(values.weddingDate)} />
            <SummaryRow icon="location" label="Main venue" value={values.mainVenueName || "Venue to be confirmed"} />
            <SummaryRow icon="location" label="Destination" value={values.mainAddress || "Address to be confirmed"} />
          </dl>
        </div>

        <div className="rounded-xl bg-surface-container p-5 shadow-sm sm:p-6">
          <h3 className="flex items-center gap-2 text-label-md font-semibold uppercase tracking-[0.12em]"><WorkspaceIcon name="shield" className="text-lg text-primary" /> What changes here</h3>
          <ol className="mt-4 space-y-3 text-body-sm leading-6 text-on-surface-variant">
            <GuideItem number="01" title="Workspace identity">Names appear across the workspace and future invitations.</GuideItem>
            <GuideItem number="02" title="Celebration timing">The date and time zone control future schedules and countdowns.</GuideItem>
            <GuideItem number="03" title="Venue and story">These details give collaborators and guests the right context.</GuideItem>
          </ol>
          <p className="mt-4 flex items-start gap-2 border-t border-outline-variant/40 pt-4 text-label-sm leading-5 text-on-surface-variant"><WorkspaceIcon name="lock" className="mt-0.5 text-base text-tertiary" /> Changes are saved only when you select Save changes.</p>
        </div>
      </aside>

      <form onSubmit={handleSubmit} noValidate aria-busy={pending} className={`rounded-xl bg-surface-container-lowest p-5 shadow-sm sm:p-8 lg:col-span-8 lg:p-10 ${dirty ? "pb-28 sm:pb-8 lg:pb-10" : ""}`}>
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant/25 pb-6">
          <div><p className="text-label-sm font-semibold uppercase tracking-[0.14em] text-tertiary">Wedding details</p><h2 className="mt-1 font-serif text-headline-md">Foundational information</h2><p className="mt-1 text-body-sm leading-6 text-on-surface-variant">Update the details that anchor your wedding workspace.</p></div>
          <span className="hidden shrink-0 rounded-full bg-surface-container px-3 py-1 text-label-sm font-semibold uppercase tracking-[0.1em] text-on-surface-variant sm:inline">Admin access</span>
        </div>

        {saved && <div role="status" className="mt-6 flex items-start gap-3 rounded-xl bg-secondary-container p-4 text-on-secondary-container"><WorkspaceIcon name="check" className="mt-0.5 text-xl text-secondary" /><div><p className="font-semibold">Wedding details updated successfully.</p><p className="mt-1 text-body-sm">Your workspace now shows the latest information.</p></div></div>}
        {error && <div role="alert" className="mt-6 flex items-start gap-3 rounded-xl bg-error-container p-4 text-on-error-container"><span aria-hidden="true" className="text-lg text-error">!</span><div><p className="font-semibold">We couldn’t save your changes.</p><p className="mt-1 text-body-sm">{error}</p></div></div>}

        <fieldset disabled={pending} className="mt-8 disabled:opacity-65">
          <legend className="font-serif text-title-lg">The two of you</legend>
          <p className="mt-1 text-body-sm text-on-surface-variant">Use the names you would like family and guests to see.</p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <TextField label="Bride’s name" meta="Given name" name="brideName" value={values.brideName} onChange={(value) => update("brideName", value)} error={fieldErrors.brideName?.[0]} autoComplete="name" />
            <TextField label="Groom’s name" meta="Given name" name="groomName" value={values.groomName} onChange={(value) => update("groomName", value)} error={fieldErrors.groomName?.[0]} autoComplete="name" />
          </div>
        </fieldset>

        <div className="my-9 flex items-center text-tertiary" aria-hidden="true"><span className="h-px flex-1 bg-surface-container-highest" /><span className="flex items-center gap-2 px-4 text-label-sm font-semibold uppercase tracking-[0.14em]"><span className="h-1 w-1 rounded-full bg-primary" /> Nuance &amp; schedule <span className="h-1 w-1 rounded-full bg-primary" /></span><span className="h-px flex-1 bg-surface-container-highest" /></div>

        <fieldset disabled={pending} className="disabled:opacity-65">
          <legend className="font-serif text-title-lg">The celebration</legend>
          <p className="mt-1 text-body-sm text-on-surface-variant">Update the primary date and destination used throughout the workspace.</p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <TextField label="Primary wedding date" name="weddingDate" value={values.weddingDate} onChange={(value) => update("weddingDate", value)} error={fieldErrors.weddingDate?.[0]} type="date" autoComplete="off" icon="calendar" hint="Usually the main ceremony or pheras date." />
            <label className="block text-body-sm font-semibold" htmlFor="timeZone">Time zone
              <span className="relative mt-2 block"><WorkspaceIcon name="clock" className="pointer-events-none absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-lg text-tertiary" /><select id="timeZone" value={values.timeZone} onChange={(event) => update("timeZone", event.currentTarget.value)} aria-invalid={Boolean(fieldErrors.timeZone)} aria-describedby={fieldErrors.timeZone ? "timeZone-error" : "timeZone-hint"} className={`${inputClasses} mt-0 appearance-none pl-11 pr-9`}>{WEDDING_TIME_ZONES.map((zone) => <option key={zone.value} value={zone.value}>{zone.label}</option>)}</select><span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant">⌄</span></span>
              {fieldErrors.timeZone ? <FieldError id="timeZone-error">{fieldErrors.timeZone[0]}</FieldError> : <span id="timeZone-hint" className={hintClasses}>Future schedules and countdowns use this time zone.</span>}
            </label>
            <div className="sm:col-span-2"><TextField label="Main venue or palace name" name="mainVenueName" value={values.mainVenueName} onChange={(value) => update("mainVenueName", value)} error={fieldErrors.mainVenueName?.[0]} autoComplete="organization" icon="location" hint="The main celebration venue." /></div>
            <div className="sm:col-span-2"><TextField label="Full venue address and destination" name="mainAddress" value={values.mainAddress} onChange={(value) => update("mainAddress", value)} error={fieldErrors.mainAddress?.[0]} autoComplete="street-address" icon="location" hint="Used for future directions and venue information." /></div>
            <label className="block sm:col-span-2 text-body-sm font-semibold" htmlFor="description"><span className="flex items-center justify-between gap-3"><span>Wedding welcome note</span><span className="text-label-sm font-normal text-on-surface-variant">{values.description.length} / 1,000</span></span><textarea id="description" value={values.description} onChange={(event) => update("description", event.currentTarget.value)} rows={4} maxLength={1000} aria-invalid={Boolean(fieldErrors.description)} aria-describedby={fieldErrors.description ? "description-error" : "description-hint"} className={`${inputClasses} resize-y`} />{fieldErrors.description ? <FieldError id="description-error">{fieldErrors.description[0]}</FieldError> : <span id="description-hint" className={hintClasses}>An optional note for family and future guests.</span>}</label>
          </div>
        </fieldset>

        <div className={`mt-8 flex items-start gap-3 rounded-xl p-4 ${error ? "bg-error-container/60" : dirty ? "bg-primary-fixed/55" : saved ? "bg-secondary-container/70" : "bg-surface-container-low"}`}>
          <WorkspaceIcon name={saved ? "check" : dirty ? "sparkle" : "lock"} className={`mt-0.5 text-lg ${error ? "text-error" : saved ? "text-secondary" : "text-tertiary"}`} />
          <div><p className="text-body-sm font-semibold">{changeSummary(changedKeys, saved, error)}</p>{dirty && !error && <p className="mt-1 text-label-sm text-on-surface-variant">Review the details, then save when you are ready.</p>}</div>
        </div>

        <div className={`mt-7 flex items-center justify-between gap-4 border-t border-outline-variant/30 bg-surface-container-lowest pt-6 ${dirty ? "fixed inset-x-0 bottom-0 z-40 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(28,26,23,0.08)] sm:static sm:p-0 sm:pt-6 sm:shadow-none" : ""}`}>
          <p className="hidden items-center gap-2 text-label-sm text-on-surface-variant sm:flex"><WorkspaceIcon name="lock" className="text-secondary" /> {saved ? "Saved just now" : "Saved to your workspace"}</p>
          <div className="flex w-full gap-3 sm:w-auto">
            <button type="button" onClick={() => router.push("/welcome")} disabled={pending} className="flex-1 rounded-lg border border-outline-variant px-5 py-3 text-body-sm font-semibold transition-colors hover:border-primary disabled:opacity-50 sm:flex-none">Cancel</button>
            <button type="submit" disabled={!dirty || pending} className="inline-flex flex-[1.4] items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-body-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-45 sm:flex-none">{pending ? "Saving changes…" : "Save changes"}<WorkspaceIcon name={pending ? "clock" : "check"} className="text-lg" /></button>
          </div>
        </div>
      </form>
    </div>
  );
}

const inputClasses = "mt-2 w-full rounded-lg border border-transparent bg-surface px-4 py-3 text-body-md font-normal text-on-surface shadow-sm transition-colors focus:border-primary focus:bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary aria-[invalid=true]:border-error aria-[invalid=true]:bg-error-container/20";
const hintClasses = "mt-2 block text-label-sm font-normal leading-5 text-on-surface-variant";

function TextField({ label, name, value, onChange, error, autoComplete, type = "text", meta, hint, icon }: { label: string; name: keyof WeddingSettingsValues; value: string; onChange: (value: string) => void; error?: string; autoComplete: string; type?: string; meta?: string; hint?: string; icon?: "calendar" | "location" }) {
  return <label className="block text-body-sm font-semibold" htmlFor={name}><span className="flex items-center justify-between gap-3"><span>{label}</span>{meta && <span className="text-label-sm font-normal text-tertiary">{meta}</span>}</span><span className="relative block">{icon && <WorkspaceIcon name={icon} className="pointer-events-none absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-lg text-tertiary" />}<input id={name} name={name} value={value} onChange={(event) => onChange(event.currentTarget.value)} type={type} autoComplete={autoComplete} required aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined} className={`${inputClasses} ${icon ? "pl-11" : ""}`} /></span>{error ? <FieldError id={`${name}-error`}>{error}</FieldError> : hint && <span id={`${name}-hint`} className={hintClasses}>{hint}</span>}</label>;
}

function FieldError({ id, children }: { id: string; children: string }) { return <span id={id} className="mt-2 block text-label-sm font-normal text-error">{children}</span>; }

function SummaryRow({ icon, label, value }: { icon: "calendar" | "location"; label: string; value: string }) { return <div className="flex items-start gap-3"><WorkspaceIcon name={icon} className="mt-1 text-lg text-tertiary" /><div><dt className="text-label-sm font-semibold uppercase tracking-[0.1em] text-on-surface-variant">{label}</dt><dd className="mt-0.5 text-body-sm font-semibold">{value}</dd></div></div>; }

function GuideItem({ number, title, children }: { number: string; title: string; children: string }) { return <li className="flex items-start gap-3"><span className="text-label-sm font-semibold text-primary">{number}</span><span><strong className="text-on-surface">{title}:</strong> {children}</span></li>; }

function initial(value: string) { return value.trim().charAt(0).toUpperCase() || "?"; }
function formatWeddingDate(value: string) { const date = new Date(`${value}T00:00:00Z`); return Number.isNaN(date.getTime()) ? "Date to be confirmed" : new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "UTC" }).format(date); }
function changeSummary(keys: Array<keyof WeddingSettingsValues>, saved: boolean, error: string) { if (error) return "Your unsaved changes are still here. Try saving again."; if (saved) return "All changes are saved."; if (!keys.length) return "No unsaved changes."; const labels = keys.map((key) => fieldLabels[key]); return `${keys.length} ${keys.length === 1 ? "change" : "changes"} ready to save: ${new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(labels)}.`; }
