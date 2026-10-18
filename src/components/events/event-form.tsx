"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { EVENT_TYPE_LABELS, EVENT_TYPES } from "@/modules/events/constants";
import { WorkspaceIcon } from "@/components/weddings/workspace-icon";

export type EventFormValues = { name: string; type: (typeof EVENT_TYPES)[number]; localDate: string; startLocalTime: string; endLocalTime: string; endsNextDay: boolean; venueName: string; address: string; mapUrl: string; liveStreamUrl: string; description: string; status: "DRAFT" | "PUBLISHED" };
type ApiPayload = { data?: { event?: { id: string } }; error?: { message?: string; details?: Array<{ path: string; message: string }> } };

export function EventForm({ weddingId, weddingDate, timeZone, mainVenueName, mainAddress, mode = "create", eventId, initialValues, restoringCancelled = false }: { weddingId: string; weddingDate: string; timeZone: string; mainVenueName: string; mainAddress: string; mode?: "create" | "edit"; eventId?: string; initialValues?: EventFormValues; restoringCancelled?: boolean }) {
  const router = useRouter();
  const [values, setValues] = useState<EventFormValues>(initialValues ?? { name: "", type: "SANGEET", localDate: weddingDate, startLocalTime: "18:00", endLocalTime: "", endsNextDay: false, venueName: "", address: "", mapUrl: "", liveStreamUrl: "", description: "", status: "DRAFT" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const summaryDate = useMemo(() => formatDate(values.localDate), [values.localDate]);

  function update<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) { setValues((current) => ({ ...current, [key]: value })); setError(""); setFieldErrors((current) => { if (!current[key]) return current; const next = { ...current }; delete next[key]; return next; }); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setError(""); setFieldErrors({});
    try {
      const response = await fetch(mode === "edit" ? `/api/v1/weddings/${weddingId}/events/${eventId}` : `/api/v1/weddings/${weddingId}/events`, { method: mode === "edit" ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const payload = await response.json() as ApiPayload;
      if (!response.ok || !payload.data?.event) { setError(payload.error?.message ?? "We couldn’t save this event."); setFieldErrors(group(payload.error?.details)); return; }
      router.replace(`/events/${payload.data.event.id}`); router.refresh();
    } catch { setError("We couldn’t reach the server. Your event details are still here."); }
    finally { setPending(false); }
  }

  return <form onSubmit={submit} noValidate className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_22rem]">
    <div className="space-y-6">
      {restoringCancelled && <div role="note" className="rounded-xl bg-tertiary-fixed p-4 text-body-sm leading-6 text-on-tertiary-fixed"><strong className="block">This event is cancelled</strong>Saving these changes will restore it as a private draft. You can review it before publishing it again.</div>}
      <FormSection eyebrow="01 · Ceremony identity" title="Name the moment">
        <Field label="Event name" name="name" value={values.name} onChange={(value) => update("name", value)} placeholder="e.g. Sangeet under the stars" error={fieldErrors.name?.[0]} />
        <fieldset className="mt-5"><legend className="text-body-sm font-semibold">Ceremony type</legend><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{EVENT_TYPES.map((type) => <label key={type} className={`cursor-pointer rounded-xl border p-3 text-center text-body-sm font-semibold transition ${values.type === type ? "border-primary bg-primary-fixed/45 text-primary" : "border-transparent bg-surface hover:bg-surface-container"}`}><input className="sr-only" type="radio" name="type" checked={values.type === type} onChange={() => update("type", type)} />{EVENT_TYPE_LABELS[type]}</label>)}</div></fieldset>
        <label className="mt-5 block text-body-sm font-semibold" htmlFor="description"><span className="flex justify-between gap-3"><span>Description <span className="font-normal text-on-surface-variant">(optional)</span></span><span className="font-normal text-on-surface-variant">{values.description.length} / 2,000</span></span><textarea id="description" rows={4} maxLength={2000} value={values.description} onChange={(event) => update("description", event.currentTarget.value)} placeholder="Share the meaning, dress code, or planning notes…" className={`${inputClasses} resize-y`} />{fieldErrors.description?.[0] && <FieldError>{fieldErrors.description[0]}</FieldError>}</label>
      </FormSection>

      <FormSection eyebrow="02 · Schedule" title="Set the date and time">
        <div className="grid gap-5 sm:grid-cols-3"><Field label="Date" name="localDate" type="date" value={values.localDate} onChange={(value) => update("localDate", value)} error={fieldErrors.localDate?.[0]} /><Field label="Start time" name="startLocalTime" type="time" value={values.startLocalTime} onChange={(value) => update("startLocalTime", value)} error={fieldErrors.startLocalTime?.[0]} /><Field label="End time (optional)" name="endLocalTime" type="time" value={values.endLocalTime} onChange={(value) => update("endLocalTime", value)} error={fieldErrors.endLocalTime?.[0]} /></div>
        <label className="mt-5 flex items-start gap-3 rounded-xl bg-surface p-4"><input type="checkbox" checked={values.endsNextDay} onChange={(event) => update("endsNextDay", event.currentTarget.checked)} className="mt-1 accent-primary" /><span className="text-body-sm"><strong className="block">Ends the next day</strong><span className="mt-1 block text-on-surface-variant">Use this for celebrations that continue after midnight.</span></span></label>
        <p className="mt-4 flex items-center gap-2 text-label-sm text-on-surface-variant"><WorkspaceIcon name="clock" className="text-tertiary" /> Times use {timeZone.replaceAll("_", " ")}.</p>
      </FormSection>

      <FormSection eyebrow="03 · Venue and directions" title="Guide everyone there" action={<button type="button" onClick={() => setValues((current) => ({ ...current, venueName: mainVenueName, address: mainAddress }))} className="rounded-lg bg-surface px-3 py-2 text-label-md font-semibold text-primary hover:bg-surface-container"><WorkspaceIcon name="location" className="mr-1 inline text-lg" />Use wedding venue</button>}>
        <div className="grid gap-5 sm:grid-cols-2"><Field label="Venue name" name="venueName" value={values.venueName} onChange={(value) => update("venueName", value)} placeholder="Venue or palace name" error={fieldErrors.venueName?.[0]} /><Field label="Full address" name="address" value={values.address} onChange={(value) => update("address", value)} placeholder="Street, city, state" error={fieldErrors.address?.[0]} /></div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2"><Field label="Map link (optional)" name="mapUrl" type="url" value={values.mapUrl} onChange={(value) => update("mapUrl", value)} placeholder="https://maps.google.com/…" error={fieldErrors.mapUrl?.[0]} hint="Without one, directions search the address." /><Field label="Live-stream link (optional)" name="liveStreamUrl" type="url" value={values.liveStreamUrl} onChange={(value) => update("liveStreamUrl", value)} placeholder="https://youtube.com/…" error={fieldErrors.liveStreamUrl?.[0]} hint="Use a complete HTTPS link for YouTube, Zoom, Meet, or another provider." /></div>
      </FormSection>

      <FormSection eyebrow="04 · Visibility" title="Choose who can see it">
        <div className="grid gap-3 sm:grid-cols-2"><Visibility value="DRAFT" selected={values.status} onChange={(value) => update("status", value)} title="Save as draft">Visible to Admins and Managers while you refine it.</Visibility><Visibility value="PUBLISHED" selected={values.status} onChange={(value) => update("status", value)} title="Publish event">Visible to every wedding workspace member.</Visibility></div>
      </FormSection>
      {error && <p role="alert" className="rounded-xl bg-error-container p-4 text-body-sm text-on-error-container">{error}</p>}
      <div className="sticky bottom-0 z-20 flex flex-col-reverse gap-2 border-t border-outline-variant/30 bg-surface/95 py-4 backdrop-blur sm:flex-row sm:justify-end"><Link href={mode === "edit" && eventId ? `/events/${eventId}` : "/events"} className="rounded-lg border border-outline-variant px-5 py-3 text-center text-body-sm font-semibold">Cancel</Link><button type="submit" disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-body-sm font-semibold text-on-primary disabled:opacity-50">{pending ? "Saving event…" : mode === "edit" ? "Save changes" : values.status === "DRAFT" ? "Save draft" : "Publish event"}<WorkspaceIcon name={pending ? "clock" : mode === "edit" ? "check" : "arrow"} /></button></div>
    </div>
    <aside className="rounded-xl bg-surface-container p-5 shadow-sm lg:sticky lg:top-24"><p className="text-label-sm font-semibold uppercase tracking-[0.13em] text-tertiary">Ceremony summary</p><span className="mt-5 inline-flex rounded-full bg-primary-fixed px-3 py-1 text-label-sm font-semibold text-primary">{EVENT_TYPE_LABELS[values.type]}</span><h2 className="mt-3 font-serif text-headline-sm">{values.name || "Untitled ceremony"}</h2><dl className="mt-5 space-y-4 text-body-sm"><Summary icon="calendar" label="Date" value={summaryDate} /><Summary icon="clock" label="Time" value={`${formatTime(values.startLocalTime)}${values.endLocalTime ? ` – ${formatTime(values.endLocalTime)}${values.endsNextDay ? " next day" : ""}` : ""}`} /><Summary icon="location" label="Venue" value={values.venueName || "Location not specified"} /></dl><p className={`mt-5 rounded-lg px-3 py-2 text-body-sm font-semibold ${values.status === "PUBLISHED" ? "bg-secondary-container text-on-secondary-container" : "bg-tertiary-fixed text-on-tertiary-fixed"}`}>{values.status === "PUBLISHED" ? "Published to the wedding team" : "Draft · Internal planning only"}</p></aside>
  </form>;
}

const inputClasses = "mt-2 w-full rounded-lg border border-transparent bg-surface px-4 py-3 text-body-md font-normal shadow-sm outline-none transition placeholder:text-outline focus:border-primary focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary aria-[invalid=true]:border-error";
function FormSection({ eyebrow, title, action, children }: { eyebrow: string; title: string; action?: React.ReactNode; children: React.ReactNode }) { return <section className="rounded-xl bg-surface-container-low p-5 shadow-sm sm:p-7"><div className="mb-5 flex flex-col gap-3 border-b border-outline-variant/25 pb-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-label-sm font-semibold uppercase tracking-[0.13em] text-tertiary">{eyebrow}</p><h2 className="mt-1 font-serif text-headline-sm">{title}</h2></div>{action}</div>{children}</section>; }
function Field({ label, name, value, onChange, type = "text", placeholder, error, hint }: { label: string; name: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; error?: string; hint?: string }) { return <label className="block text-body-sm font-semibold" htmlFor={name}>{label}<input id={name} type={type} value={value} onChange={(event) => onChange(event.currentTarget.value)} placeholder={placeholder} aria-invalid={Boolean(error)} className={inputClasses} />{error ? <FieldError>{error}</FieldError> : hint && <span className="mt-2 block text-label-sm font-normal leading-5 text-on-surface-variant">{hint}</span>}</label>; }
function FieldError({ children }: { children: string }) { return <span className="mt-2 block text-label-sm font-normal text-error">{children}</span>; }
function Visibility({ value, selected, onChange, title, children }: { value: "DRAFT" | "PUBLISHED"; selected: string; onChange: (value: "DRAFT" | "PUBLISHED") => void; title: string; children: string }) { return <label className={`cursor-pointer rounded-xl border p-4 ${selected === value ? "border-primary bg-primary-fixed/40" : "border-transparent bg-surface"}`}><input className="mr-3 accent-primary" type="radio" checked={selected === value} onChange={() => onChange(value)} /><strong>{title}</strong><span className="mt-2 block pl-7 text-body-sm leading-5 text-on-surface-variant">{children}</span></label>; }
function Summary({ icon, label, value }: { icon: "calendar" | "clock" | "location"; label: string; value: string }) { return <div className="flex gap-3"><WorkspaceIcon name={icon} className="mt-0.5 text-lg text-tertiary" /><div><dt className="text-label-sm font-semibold uppercase tracking-[0.1em] text-on-surface-variant">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div></div>; }
function group(details?: Array<{ path: string; message: string }>) { return (details ?? []).reduce<Record<string, string[]>>((result, detail) => { (result[detail.path] ??= []).push(detail.message); return result; }, {}); }
function formatDate(value: string) { if (!value) return "Date not set"; const date = new Date(`${value}T00:00:00Z`); const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]; const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]; return `${weekdays[date.getUTCDay()]}, ${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`; }
function formatTime(value: string) { if (!value) return "Time not set"; const [hour, minute] = value.split(":").map(Number); return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "pm" : "am"}`; }
