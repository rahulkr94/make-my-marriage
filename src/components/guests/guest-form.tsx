"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { WorkspaceIcon } from "@/components/weddings/workspace-icon";
import { GUEST_RELATIONSHIP_LABELS, GUEST_RELATIONSHIPS, GUEST_SIDE_LABELS, GUEST_SIDES } from "@/modules/guests/constants";
import type { EventOption } from "@/modules/guests/service";
import { useModalA11y } from "@/shared/use-modal-a11y";

export type GuestFormValues = { name: string; email: string; phone: string; side: (typeof GUEST_SIDES)[number]; relationship: (typeof GUEST_RELATIONSHIPS)[number]; notes: string; eventIds: string[] };
type ApiPayload = { data?: { guest?: { id: string } }; error?: { message?: string; details?: Array<{ path: string; message: string }> } };

export function GuestForm({ weddingId, events, mode = "create", guestId, initialValues }: { weddingId: string; events: EventOption[]; mode?: "create" | "edit"; guestId?: string; initialValues?: GuestFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState<GuestFormValues>(initialValues ?? { name: "", email: "", phone: "", side: "BRIDE", relationship: "FAMILY", notes: "", eventIds: [] });
  const [pending, setPending] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function update<K extends keyof GuestFormValues>(key: K, value: GuestFormValues[K]) { setValues((current) => ({ ...current, [key]: value })); setError(""); setFieldErrors((current) => { if (!current[key]) return current; const next = { ...current }; delete next[key]; return next; }); }
  function toggleEvent(id: string) { update("eventIds", values.eventIds.includes(id) ? values.eventIds.filter((eventId) => eventId !== id) : [...values.eventIds, id]); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(""); setFieldErrors({});
    try {
      const response = await fetch(mode === "edit" ? `/api/v1/weddings/${weddingId}/guests/${guestId}` : `/api/v1/weddings/${weddingId}/guests`, { method: mode === "edit" ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const payload = await response.json() as ApiPayload;
      if (!response.ok || !payload.data?.guest) { setError(payload.error?.message ?? "We couldn’t save this guest."); setFieldErrors(group(payload.error?.details)); return; }
      router.replace("/guests"); router.refresh();
    } catch { setError("We couldn’t reach the server. Your guest details are still here."); }
    finally { setPending(false); }
  }

  async function remove() {
    if (!guestId || removing) return;
    setRemoving(true); setError("");
    try {
      const response = await fetch(`/api/v1/weddings/${weddingId}/guests/${guestId}`, { method: "DELETE" });
      const payload = await response.json() as ApiPayload;
      if (!response.ok) throw new Error(payload.error?.message ?? "We couldn’t remove this guest.");
      router.replace("/guests"); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "We couldn’t remove this guest."); setConfirmRemove(false); }
    finally { setRemoving(false); }
  }

  return <>
    <form onSubmit={submit} noValidate className="space-y-6">
      <FormSection number="01" title="Guest identity" description="The details you use to recognise and contact this guest.">
        <Field label="Full name" name="name" value={values.name} onChange={(value) => update("name", value)} placeholder="e.g. Priya Sharma" error={fieldErrors.name?.[0]} />
        <div className="mt-5 grid gap-5 sm:grid-cols-2"><Field label="Email address" optional name="email" type="email" value={values.email} onChange={(value) => update("email", value)} placeholder="priya@example.com" error={fieldErrors.email?.[0]} /><Field label="Phone number" optional name="phone" type="tel" value={values.phone} onChange={(value) => update("phone", value)} placeholder="+91 98765 43210" error={fieldErrors.phone?.[0]} /></div>
        <p className="mt-4 text-label-sm leading-5 text-on-surface-variant">Contact details are optional. You can add them later before sending personal invitations.</p>
      </FormSection>

      <FormSection number="02" title="Wedding connection" description="Help the planning team understand how this guest is connected.">
        <fieldset><legend className="text-body-sm font-semibold">Bride, groom, or common</legend><div className="mt-3 grid gap-3 sm:grid-cols-3">{GUEST_SIDES.map((side) => <Choice key={side} name="side" checked={values.side === side} onChange={() => update("side", side)} title={GUEST_SIDE_LABELS[side]}>{side === "BRIDE" ? "Family and friends of the bride" : side === "GROOM" ? "Family and friends of the groom" : "Known to both families"}</Choice>)}</div>{fieldErrors.side?.[0] && <FieldError>{fieldErrors.side[0]}</FieldError>}</fieldset>
        <fieldset className="mt-6"><legend className="text-body-sm font-semibold">Relationship</legend><div className="mt-3 flex flex-wrap gap-2">{GUEST_RELATIONSHIPS.map((relationship) => <label key={relationship} className={`cursor-pointer rounded-full px-4 py-2 text-body-sm font-semibold ${values.relationship === relationship ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}><input className="sr-only" type="radio" name="relationship" checked={values.relationship === relationship} onChange={() => update("relationship", relationship)} />{GUEST_RELATIONSHIP_LABELS[relationship]}</label>)}</div>{fieldErrors.relationship?.[0] && <FieldError>{fieldErrors.relationship[0]}</FieldError>}</fieldset>
      </FormSection>

      <FormSection number="03" title="Ceremony assignments" description="Choose the published events this guest will eventually see on their personal invitation." action={events.length ? <button type="button" onClick={() => update("eventIds", values.eventIds.length === events.length ? [] : events.map((event) => event.id))} className="rounded-lg bg-surface-container px-3 py-2 text-label-md font-semibold text-primary">{values.eventIds.length === events.length ? "Clear all" : "Select all published"}</button> : undefined}>
        {events.length ? <div className="grid gap-3 sm:grid-cols-2">{events.map((event) => <label key={event.id} className={`cursor-pointer rounded-xl border p-4 transition ${values.eventIds.includes(event.id) ? "border-primary bg-primary-fixed/35" : "border-outline-variant/30 bg-surface hover:bg-surface-container"}`}><span className="flex items-start gap-3"><input type="checkbox" checked={values.eventIds.includes(event.id)} onChange={() => toggleEvent(event.id)} className="mt-1 accent-primary" /><span><strong className="block text-body-md">{event.name}</strong><span className="mt-1 block text-body-sm text-on-surface-variant">{formatEventDate(event)} · {formatTime(event.startLocalTime)}</span><span className="mt-1 block text-label-sm text-on-surface-variant">{event.venueName}</span></span></span></label>)}</div> : <div className="rounded-xl border border-dashed border-outline-variant bg-surface p-6 text-center"><WorkspaceIcon name="calendar" className="mx-auto text-3xl text-tertiary" /><h3 className="mt-3 font-serif text-headline-sm">No published events yet</h3><p className="mt-2 text-body-sm text-on-surface-variant">Publish a ceremony before assigning it to guests.</p><Link href="/events" className="mt-4 inline-flex rounded-lg bg-surface-container px-4 py-2 text-body-sm font-semibold text-primary">Manage events</Link></div>}
        {fieldErrors.eventIds?.[0] && <FieldError>{fieldErrors.eventIds[0]}</FieldError>}
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-surface-container p-3 text-body-sm leading-6 text-on-surface-variant"><WorkspaceIcon name="lock" className="mt-1 shrink-0 text-tertiary" />Assignments determine which ceremonies appear on this guest’s personal invitation when invitations are introduced.</p>
      </FormSection>

      <FormSection number="04" title="Private planning notes" description="Capture useful context for the authorised planning team.">
        <label className="block text-body-sm font-semibold" htmlFor="notes"><span className="flex justify-between gap-3"><span>Notes <span className="font-normal text-on-surface-variant">(optional)</span></span><span className="font-normal text-on-surface-variant">{values.notes.length} / 1,000</span></span><textarea id="notes" rows={5} maxLength={1000} value={values.notes} onChange={(event) => update("notes", event.currentTarget.value)} placeholder="Dietary preferences, family context, or helpful planning notes…" className={`${inputClasses} resize-y`} />{fieldErrors.notes?.[0] && <FieldError>{fieldErrors.notes[0]}</FieldError>}</label>
        <p className="mt-4 flex items-center gap-2 text-label-sm text-on-surface-variant"><WorkspaceIcon name="lock" />Visible only to Admins and Managers. These notes never appear on guest invitations.</p>
      </FormSection>

      {mode === "edit" && <section className="rounded-xl border border-error/25 bg-error-container/45 p-5 sm:p-6"><p className="text-label-sm font-semibold uppercase tracking-[0.13em] text-error">Guest access</p><div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-serif text-headline-sm">Remove this guest</h2><p className="mt-1 max-w-2xl text-body-sm leading-6 text-on-surface-variant">Hide the guest from active lists and future invitations while retaining planning history.</p></div><button type="button" onClick={() => setConfirmRemove(true)} className="shrink-0 rounded-lg bg-error px-4 py-2.5 text-body-sm font-semibold text-on-error">Remove guest</button></div></section>}
      {error && <p role="alert" className="rounded-xl bg-error-container p-4 text-body-sm text-on-error-container">{error}</p>}
      <div className="sticky bottom-0 z-20 flex flex-col-reverse gap-2 border-t border-outline-variant/30 bg-surface/95 py-4 backdrop-blur sm:flex-row sm:justify-end"><Link href="/guests" className="rounded-lg border border-outline-variant px-5 py-3 text-center text-body-sm font-semibold">Cancel</Link><button type="submit" disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-body-sm font-semibold text-on-primary disabled:opacity-50"><WorkspaceIcon name={pending ? "clock" : "check"} />{pending ? "Saving guest…" : mode === "edit" ? "Save changes" : "Save guest"}</button></div>
    </form>
    {confirmRemove && <RemoveGuestDialog name={values.name} removing={removing} onClose={() => setConfirmRemove(false)} onConfirm={remove} />}
  </>;
}

function RemoveGuestDialog({ name, removing, onClose, onConfirm }: { name: string; removing: boolean; onClose: () => void; onConfirm: () => void }) {
  const dialogRef = useModalA11y(removing ? undefined : onClose);
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-inverse-surface/45 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !removing) onClose(); }}><section ref={dialogRef} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby="remove-guest-title" className="w-full max-w-md rounded-t-2xl bg-surface p-6 shadow-2xl sm:rounded-xl sm:p-8"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-error-container text-on-error-container"><WorkspaceIcon name="trash" className="text-2xl" /></span><h2 id="remove-guest-title" className="mt-5 font-serif text-headline-sm">Remove {name || "this guest"}?</h2><p className="mt-3 text-body-sm leading-6 text-on-surface-variant">Their active event assignments will be removed immediately. The guest record and prior planning history will be retained.</p><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={removing} className="rounded-lg bg-surface-container px-4 py-2.5 text-body-sm font-semibold">Keep guest</button><button type="button" onClick={onConfirm} disabled={removing} className="rounded-lg bg-error px-4 py-2.5 text-body-sm font-semibold text-on-error disabled:opacity-50">{removing ? "Removing…" : "Remove guest"}</button></div></section></div>;
}

const inputClasses = "mt-2 w-full rounded-lg border border-transparent bg-surface-container-low px-4 py-3.5 font-normal outline-none transition focus:border-primary focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary";
function FormSection({ number, title, description, action, children }: { number: string; title: string; description: string; action?: React.ReactNode; children: React.ReactNode }) { return <section className="rounded-xl bg-surface-container-lowest p-5 shadow-sm sm:p-7"><div className="mb-6 flex flex-col gap-3 border-b border-outline-variant/25 pb-5 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-label-md font-semibold text-primary">{number}</span><div><h2 className="font-serif text-headline-sm">{title}</h2><p className="mt-1 text-body-sm leading-6 text-on-surface-variant">{description}</p></div></div>{action}</div>{children}</section>; }
function Field({ label, optional = false, name, type = "text", value, onChange, placeholder, error }: { label: string; optional?: boolean; name: string; type?: string; value: string; onChange: (value: string) => void; placeholder: string; error?: string }) { return <label className="block text-body-sm font-semibold" htmlFor={name}>{label}{optional && <span className="font-normal text-on-surface-variant"> (optional)</span>}<input id={name} name={name} type={type} value={value} onChange={(event) => onChange(event.currentTarget.value)} placeholder={placeholder} aria-invalid={Boolean(error)} className={inputClasses} />{error && <FieldError>{error}</FieldError>}</label>; }
function Choice({ name, checked, onChange, title, children }: { name: string; checked: boolean; onChange: () => void; title: string; children: React.ReactNode }) { return <label className={`cursor-pointer rounded-xl border p-4 ${checked ? "border-primary bg-primary-fixed/40" : "border-outline-variant/30 bg-surface"}`}><span className="flex items-start gap-3"><input type="radio" name={name} checked={checked} onChange={onChange} className="mt-1 accent-primary" /><span><strong className="block text-body-sm">{title}</strong><span className="mt-1 block text-label-sm leading-5 text-on-surface-variant">{children}</span></span></span></label>; }
function FieldError({ children }: { children: React.ReactNode }) { return <span className="mt-2 block text-label-sm font-normal text-error">{children}</span>; }
function group(details?: Array<{ path: string; message: string }>) { const result: Record<string, string[]> = {}; for (const item of details ?? []) result[item.path] = [...(result[item.path] ?? []), item.message]; return result; }
function formatEventDate(event: EventOption) { return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${event.localDate}T00:00:00Z`)); }
function formatTime(value: string) { const [hour, minute] = value.split(":").map(Number); return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, hour, minute)); }
