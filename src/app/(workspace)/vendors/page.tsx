import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AddVendorButton, VendorWorkspace } from "@/components/finance/vendor-workspace";
import { WorkspaceIcon } from "@/components/weddings/workspace-icon";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getCurrentUser } from "@/modules/auth/session";
import { listDocuments } from "@/modules/documents/service";
import {
  canManageFinances,
  VENDOR_CATEGORY_LABELS,
  VENDOR_PAYMENT_STATUS_LABELS,
} from "@/modules/finance/constants";
import { vendorListQuerySchema } from "@/modules/finance/vendor-schemas";
import { getVendor, listVendors } from "@/modules/finance/vendor-service";
import { getWorkspaceForUser } from "@/modules/weddings/service";

export const metadata: Metadata = { title: "Wedding vendors | Make My Marriage" };
type RawSearch = Record<string, string | string[] | undefined>;

export default async function VendorsPage({ searchParams }: { searchParams: Promise<RawSearch> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/vendors");
  const workspace = await getWorkspaceForUser(user.id);
  if (!workspace) redirect("/setup/wedding");
  if (!canManageFinances(workspace.membership.role)) redirect("/dashboard");

  const raw = await searchParams;
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const values = Object.fromEntries(["q", "category", "eventId", "paymentStatus", "sort", "page"].flatMap((key) => {
    const value = first(raw[key]);
    return value ? [[key, value]] : [];
  }));
  const parsed = vendorListQuerySchema.safeParse(values);
  const query = parsed.success ? parsed.data : vendorListQuerySchema.parse({});
  const requestedVendorId = first(raw.vendorId);
  const openCreate = first(raw.create) === "1";
  const [data, selectedVendor] = await Promise.all([
    listVendors(user.id, workspace.wedding.id, query),
    requestedVendorId ? getVendor(user.id, workspace.wedding.id, requestedVendorId) : Promise.resolve(null),
  ]);
  const attachments = selectedVendor ? await listDocuments(user.id, workspace.wedding.id, {
    associationType: "VENDOR", associationId: selectedVendor.id, q: "",
  }) : { documents: [], total: 0 };
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return <WorkspaceShell user={user} wedding={workspace.wedding} role={workspace.membership.role} active="vendors" title="Wedding vendors">
    <main className="mx-auto max-w-[1320px] px-5 pb-24 pt-8 sm:px-8 xl:px-12">
      {selectedVendor ? <>
        <Link href="/vendors" className="inline-flex items-center gap-2 text-body-sm font-semibold text-primary"><WorkspaceIcon name="arrowLeft" />Back to vendors</Link>
        <VendorWorkspace weddingId={workspace.wedding.id} data={data} selectedVendor={selectedVendor} attachments={attachments.documents} openCreate={false} />
      </> : <>
        <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-label-sm font-semibold uppercase tracking-[0.15em] text-primary">Finances · Wedding partners</p><h1 className="mt-2 font-serif text-headline-lg-mobile tracking-tight sm:text-headline-lg">Wedding vendors</h1><p className="mt-2 max-w-2xl text-body-md leading-7 text-on-surface-variant">Keep contact details, ceremony assignments, quotes, and payments organized in one place.</p></div><AddVendorButton /></section>

        <section aria-label="Vendor summary" className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Total vendors" value={String(data.summary.count)} icon="users" />
          <Metric label="Total quoted" value={formatMoney(data.summary.quotedMinor)} icon="payments" />
          <Metric label="Total paid" value={formatMoney(data.summary.paidMinor)} icon="check" tone="success" />
          <Metric label="Amount pending" value={formatMoney(data.summary.pendingMinor)} icon="clock" tone={data.summary.pendingMinor === "0" ? "success" : "warning"} />
        </section>
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-surface-container-low p-4 text-body-sm leading-6 text-on-surface-variant"><WorkspaceIcon name="payments" className="mt-0.5 text-primary" />Pending amounts are derived from manually entered quoted and paid values. Linked expenses remain independent.</p>

        <form action="/vendors" method="get" className="mt-7 rounded-xl bg-surface-container-low p-4 shadow-sm"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><label className="relative sm:col-span-2"><span className="sr-only">Search vendors</span><WorkspaceIcon name="search" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" /><input name="q" defaultValue={query.q} placeholder="Search vendor, contact, or notes" className="w-full rounded-lg border border-transparent bg-surface px-10 py-3 text-body-sm outline-none focus:border-primary" /></label><Select name="category" label="All categories" value={query.category ?? ""} options={Object.entries(VENDOR_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))} /><Select name="eventId" label="All ceremonies" value={query.eventId ?? ""} options={data.eventOptions.map((event) => ({ value: event.id, label: event.name }))} /><Select name="paymentStatus" label="All payment statuses" value={query.paymentStatus ?? ""} options={Object.entries(VENDOR_PAYMENT_STATUS_LABELS).map(([value, label]) => ({ value, label }))} /><Select name="sort" label="Sort vendors" value={query.sort} options={[{ value: "RECENT", label: "Recently added" }, { value: "NAME", label: "Vendor name" }, { value: "PENDING", label: "Highest pending" }]} /><button className="rounded-lg bg-primary px-5 py-3 text-body-sm font-semibold text-on-primary sm:col-span-2 xl:col-span-2">Apply filters</button></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-label-sm text-on-surface-variant"><span>{data.total} matching vendor{data.total === 1 ? "" : "s"}</span>{Object.keys(values).length > 0 && <Link href="/vendors" className="font-semibold text-primary hover:underline">Clear filters</Link>}</div></form>

        <VendorWorkspace key={`${data.total}-${openCreate ? "create" : "list"}`} weddingId={workspace.wedding.id} data={data} selectedVendor={null} attachments={[]} openCreate={openCreate} />
        {pages > 1 && <nav aria-label="Vendor pages" className="mt-8 flex items-center justify-between"><PageLink raw={raw} page={query.page - 1} disabled={query.page === 1}>Previous</PageLink><span className="text-body-sm text-on-surface-variant">Page {query.page} of {pages}</span><PageLink raw={raw} page={query.page + 1} disabled={query.page === pages}>Next</PageLink></nav>}
      </>}
    </main>
  </WorkspaceShell>;
}

function Metric({ label, value, icon, tone = "default" }: { label: string; value: string; icon: Parameters<typeof WorkspaceIcon>[0]["name"]; tone?: "default" | "success" | "warning" }) { return <article className={`rounded-xl p-4 shadow-sm ${tone === "success" ? "bg-secondary-container" : tone === "warning" ? "bg-tertiary-fixed" : "bg-surface-container-low"}`}><div className="flex items-center justify-between gap-3"><p className="text-label-sm font-semibold uppercase tracking-[0.08em] text-on-surface-variant">{label}</p><WorkspaceIcon name={icon} className={tone === "success" ? "text-secondary" : "text-tertiary"} /></div><p className="mt-3 font-serif text-headline-sm sm:text-headline-md">{value}</p></article>; }
function Select({ name, label, value, options }: { name: string; label: string; value: string; options: Array<{ value: string; label: string }> }) { return <label><span className="sr-only">{label}</span><select name={name} defaultValue={value} className={inputClass}>{name !== "sort" && <option value="">{label}</option>}{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
function PageLink({ raw, page, disabled, children }: { raw: RawSearch; page: number; disabled: boolean; children: string }) { if (disabled) return <span className="rounded-lg px-4 py-2 text-body-sm text-outline">{children}</span>; const params = new URLSearchParams(); for (const [key, value] of Object.entries(raw)) { const item = Array.isArray(value) ? value[0] : value; if (item && key !== "page" && key !== "vendorId") params.set(key, item); } params.set("page", String(page)); return <Link href={`/vendors?${params}`} className="rounded-lg bg-surface-container px-4 py-2 text-body-sm font-semibold">{children}</Link>; }
function formatMoney(value: string) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) / 100); }
const inputClass = "w-full rounded-lg border border-transparent bg-surface px-3 py-3 text-body-sm outline-none focus:border-primary";
