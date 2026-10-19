import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RsvpWorkspace } from "@/components/rsvp/rsvp-workspace";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { WorkspaceIcon } from "@/components/weddings/workspace-icon";
import { getCurrentUser } from "@/modules/auth/session";
import { GUEST_SIDE_LABELS, GUEST_SIDES, canManageGuests } from "@/modules/guests/constants";
import { RSVP_FILTER_RESPONSES, RSVP_RESPONSE_LABELS } from "@/modules/rsvp/constants";
import { rsvpListQuerySchema } from "@/modules/rsvp/schemas";
import { listRsvps } from "@/modules/rsvp/service";
import { getWorkspaceForUser } from "@/modules/weddings/service";

export const metadata: Metadata = { title: "RSVP responses | Make My Marriage" };
type RawSearch = Record<string, string | string[] | undefined>;

export default async function RsvpPage({ searchParams }: { searchParams: Promise<RawSearch> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/rsvps");
  const workspace = await getWorkspaceForUser(user.id);
  if (!workspace) redirect("/setup/wedding");
  if (!canManageGuests(workspace.membership.role)) redirect("/dashboard");
  const raw = await searchParams;
  const values = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]).filter(([, value]) => value !== undefined && value !== ""));
  const parsed = rsvpListQuerySchema.safeParse(values);
  const query = parsed.success ? parsed.data : rsvpListQuerySchema.parse({});
  const data = await listRsvps(user.id, workspace.wedding.id, query);
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return <WorkspaceShell user={user} wedding={workspace.wedding} role={workspace.membership.role} active="rsvps" title="RSVP responses"><main className="mx-auto max-w-[1320px] px-5 pb-16 pt-8 sm:px-8 xl:px-12">
    <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-label-sm font-semibold uppercase tracking-[0.15em] text-primary">Guest responses</p><h1 className="mt-2 font-serif text-headline-lg-mobile tracking-tight sm:text-headline-lg">RSVP overview</h1><p className="mt-2 max-w-2xl text-body-md leading-7 text-on-surface-variant">Track current ceremony assignments, responses, and expected attendance. Removed assignments remain historical and do not count here.</p></div><Link href="/guests/invitations" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-body-sm font-semibold text-on-primary"><WorkspaceIcon name="mail" />Manage invitations</Link></section>

    <section aria-label="RSVP summary" className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Invited records" value={data.summary.invitedGuestRecords} icon="users" /><Metric label="Accepted" value={data.summary.accepted} icon="check" /><Metric label="Declined" value={data.summary.declined} icon="close" /><Metric label="Awaiting" value={data.summary.pending} icon="clock" /><Metric label="Expected guests" value={data.summary.expectedAttendees} icon="badge" /></section>
    <section className="mt-5 rounded-xl bg-surface-container-low p-5 shadow-sm" aria-label="Response progress"><div className="flex items-center justify-between gap-3"><div><p className="font-semibold">Response progress</p><p className="mt-1 text-body-sm text-on-surface-variant">{data.summary.accepted + data.summary.declined} of {data.summary.invitedGuestRecords} assigned guest records have replied</p></div><span className="font-serif text-headline-sm">{data.summary.responseRate}%</span></div><div className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-secondary" style={{ width: `${data.summary.responseRate}%` }} /></div></section>

    <form action="/rsvps" method="get" className="mt-8 rounded-xl bg-surface-container-low p-4 shadow-sm sm:p-5"><div className="grid gap-3 lg:grid-cols-[minmax(15rem,1fr)_repeat(3,minmax(9rem,.5fr))_auto]"><label className="relative"><span className="sr-only">Search responses</span><WorkspaceIcon name="search" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" /><input name="q" defaultValue={query.q} placeholder="Search guest name or email" className="w-full rounded-lg border border-transparent bg-surface px-10 py-3 text-body-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" /></label><Select name="eventId" label="All ceremonies" value={query.eventId ?? ""} options={data.eventOptions.map((event) => ({ value: event.id, label: event.name }))} /><Select name="response" label="All responses" value={query.response ?? ""} options={RSVP_FILTER_RESPONSES.map((response) => ({ value: response, label: RSVP_RESPONSE_LABELS[response] }))} /><Select name="side" label="Both sides" value={query.side ?? ""} options={GUEST_SIDES.map((side) => ({ value: side, label: GUEST_SIDE_LABELS[side] }))} /><button type="submit" className="rounded-lg bg-primary px-5 py-3 text-body-sm font-semibold text-on-primary">Apply</button></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-label-sm text-on-surface-variant"><span>Showing {data.total} assignment{data.total === 1 ? "" : "s"}</span>{(query.q || query.eventId || query.response || query.side) && <Link href="/rsvps" className="font-semibold text-primary hover:underline">Clear filters</Link>}</div></form>

    <RsvpWorkspace weddingId={workspace.wedding.id} data={data} />
    {pages > 1 && <nav aria-label="RSVP pages" className="mt-8 flex items-center justify-between"><PageLink raw={raw} page={query.page - 1} disabled={query.page === 1}>Previous</PageLink><span className="text-body-sm text-on-surface-variant">Page {query.page} of {pages}</span><PageLink raw={raw} page={query.page + 1} disabled={query.page === pages}>Next</PageLink></nav>}
  </main></WorkspaceShell>;
}

function Metric({ label, value, icon }: { label: string; value: number; icon: "users" | "check" | "close" | "clock" | "badge" }) { return <article className="rounded-xl bg-surface-container-low p-4 shadow-sm"><div className="flex items-center justify-between"><p className="text-label-sm font-semibold uppercase tracking-[0.08em] text-on-surface-variant">{label}</p><WorkspaceIcon name={icon} className="text-xl text-tertiary" /></div><p className="mt-3 font-serif text-headline-md">{value}</p></article>; }
function Select({ name, label, value, options }: { name: string; label: string; value: string; options: Array<{ value: string; label: string }> }) { return <label><span className="sr-only">{label}</span><select name={name} defaultValue={value} className="w-full rounded-lg border border-transparent bg-surface px-3 py-3 text-body-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"><option value="">{label}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
function PageLink({ raw, page, disabled, children }: { raw: RawSearch; page: number; disabled: boolean; children: string }) { if (disabled) return <span className="rounded-lg px-4 py-2 text-body-sm text-outline">{children}</span>; const params = new URLSearchParams(); for (const [key, value] of Object.entries(raw)) { const item = Array.isArray(value) ? value[0] : value; if (item && key !== "page") params.set(key, item); } params.set("page", String(page)); return <Link href={`/rsvps?${params}`} className="rounded-lg bg-surface-container px-4 py-2 text-body-sm font-semibold">{children}</Link>; }
