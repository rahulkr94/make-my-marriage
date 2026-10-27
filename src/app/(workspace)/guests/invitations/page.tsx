import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { InvitationsWorkspace } from "@/components/invitations/invitations-workspace";
import { SummaryMetric } from "@/components/workspace/summary-metric";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { WorkspaceIcon } from "@/components/weddings/workspace-icon";
import { getCurrentUser } from "@/modules/auth/session";
import { canManageGuests, GUEST_SIDE_LABELS, GUEST_SIDES } from "@/modules/guests/constants";
import { GUEST_INVITATION_STATUS_LABELS, GUEST_INVITATION_STATUSES } from "@/modules/invitations/constants";
import { guestInvitationListQuerySchema } from "@/modules/invitations/schemas";
import { listGuestInvitations } from "@/modules/invitations/service";
import { getWorkspaceForUser } from "@/modules/weddings/service";

export const metadata: Metadata = { title: "Guest invitations | Make My Marriage" };
type RawSearch = Record<string, string | string[] | undefined>;

export default async function GuestInvitationsPage({ searchParams }: { searchParams: Promise<RawSearch> }) {
  const user = await getCurrentUser(); if (!user) redirect("/login?next=/guests/invitations");
  const workspace = await getWorkspaceForUser(user.id); if (!workspace) redirect("/setup/wedding");
  if (!canManageGuests(workspace.membership.role)) redirect("/dashboard");
  const raw = await searchParams;
  const parsed = guestInvitationListQuerySchema.safeParse(Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]).filter(([, value]) => value !== undefined && value !== "")));
  const query = parsed.success ? parsed.data : guestInvitationListQuerySchema.parse({});
  const data = await listGuestInvitations(user.id, workspace.wedding.id, query);
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  return <WorkspaceShell user={user} wedding={workspace.wedding} role={workspace.membership.role} active="invitations" title="Guest invitations"><main className="mx-auto max-w-[1320px] px-5 pb-16 pt-8 sm:px-8 xl:px-12">
    <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-label-sm font-semibold uppercase tracking-[0.15em] text-primary">Private ceremony access</p><h1 className="mt-2 font-serif text-headline-lg-mobile tracking-tight sm:text-headline-lg">Guest invitations</h1><p className="mt-2 max-w-2xl text-body-md leading-7 text-on-surface-variant">Create, deliver, and revoke guest-specific invitations containing only the ceremonies assigned to each person.</p></div><div className="flex flex-col gap-2 sm:flex-row"><Link href="/guests" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-surface-container px-5 py-3 text-body-sm font-semibold text-primary"><WorkspaceIcon name="arrowLeft" />Back to guests</Link><Link href="/guests/invitations?status=NOT_CREATED" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-body-sm font-semibold text-on-primary"><WorkspaceIcon name="mail" />Create invitations</Link></div></section>
    <section aria-label="Invitation summary" className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4"><SummaryMetric label="Invited guests" value={data.summary.totalGuests} icon="users" /><SummaryMetric label="Links ready" value={data.summary.ready} icon="lock" tone="tertiary" /><SummaryMetric label="Emails delivered" value={data.summary.delivered} icon="mail" tone="secondary" /><SummaryMetric label="Needs attention" value={data.summary.attention} icon="bell" tone={data.summary.attention > 0 ? "error" : "primary"} /></section>
    <form action="/guests/invitations" method="get" className="mt-8 rounded-xl bg-surface-container-low p-4 shadow-sm sm:p-5"><div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_repeat(2,minmax(10rem,.5fr))_auto]"><label className="relative"><span className="sr-only">Search invitations</span><WorkspaceIcon name="search" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" /><input name="q" defaultValue={query.q} placeholder="Search by guest, email, or phone" className="w-full rounded-lg border border-transparent bg-surface px-10 py-3 text-body-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" /></label><Select name="status" label="All statuses" value={query.status ?? ""} options={GUEST_INVITATION_STATUSES.map((status) => ({ value: status, label: GUEST_INVITATION_STATUS_LABELS[status] }))} /><Select name="side" label="Both sides" value={query.side ?? ""} options={GUEST_SIDES.map((side) => ({ value: side, label: GUEST_SIDE_LABELS[side] }))} /><button type="submit" className="rounded-lg bg-primary px-5 py-3 text-body-sm font-semibold text-on-primary">Apply filters</button></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-label-sm text-on-surface-variant"><span>Showing {data.total} matching guest{data.total === 1 ? "" : "s"}</span>{(query.q || query.status || query.side) && <Link href="/guests/invitations" className="font-semibold text-primary hover:underline">Clear filters</Link>}</div></form>
    <InvitationsWorkspace weddingId={workspace.wedding.id} initialRows={data.invitations} />
    {pages > 1 && <nav aria-label="Invitation pages" className="mt-8 flex items-center justify-between"><PageLink raw={raw} page={query.page - 1} disabled={query.page === 1}>Previous</PageLink><span className="text-body-sm text-on-surface-variant">Page {query.page} of {pages}</span><PageLink raw={raw} page={query.page + 1} disabled={query.page === pages}>Next</PageLink></nav>}
    <aside className="mt-8 flex items-start gap-3 rounded-xl border border-outline-variant/45 bg-surface-container-low p-4 text-body-sm leading-6 text-on-surface-variant"><WorkspaceIcon name="lock" className="mt-0.5 text-xl text-primary" /><p><strong className="text-on-surface">Private-link security:</strong> Anyone holding a guest invitation link can open that guest’s invitation. Generating a new link or QR code immediately disables the previous one.</p></aside>
  </main></WorkspaceShell>;
}
function Select({ name, label, value, options }: { name: string; label: string; value: string; options: Array<{ value: string; label: string }> }) { return <label><span className="sr-only">{label}</span><select name={name} defaultValue={value} className="w-full rounded-lg border border-transparent bg-surface px-3 py-3 text-body-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"><option value="">{label}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
function PageLink({ raw, page, disabled, children }: { raw: RawSearch; page: number; disabled: boolean; children: string }) { if (disabled) return <span className="rounded-lg px-4 py-2 text-body-sm text-outline">{children}</span>; const params = new URLSearchParams(); for (const [key, value] of Object.entries(raw)) { const item = Array.isArray(value) ? value[0] : value; if (item && key !== "page") params.set(key, item); } params.set("page", String(page)); return <Link href={`/guests/invitations?${params}`} className="rounded-lg bg-surface-container px-4 py-2 text-body-sm font-semibold">{children}</Link>; }
