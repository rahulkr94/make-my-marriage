import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateExpenseButton, ExpenseWorkspace } from "@/components/finance/expense-workspace";
import { WorkspaceIcon } from "@/components/weddings/workspace-icon";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getCurrentUser } from "@/modules/auth/session";
import { listDocuments } from "@/modules/documents/service";
import { canManageFinances, EXPENSE_CATEGORY_LABELS, EXPENSE_PAYMENT_STATUS_LABELS } from "@/modules/finance/constants";
import { expenseListQuerySchema } from "@/modules/finance/schemas";
import { getExpense, listExpenses } from "@/modules/finance/service";
import { getWorkspaceForUser } from "@/modules/weddings/service";

export const metadata: Metadata = { title: "Wedding expenses | Make My Marriage" };
type RawSearch = Record<string, string | string[] | undefined>;

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<RawSearch> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/expenses");
  const workspace = await getWorkspaceForUser(user.id);
  if (!workspace) redirect("/setup/wedding");
  if (!canManageFinances(workspace.membership.role)) redirect("/dashboard");

  const raw = await searchParams;
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const values = Object.fromEntries(["q", "paymentStatus", "category", "eventId", "dateFrom", "dateTo", "page"].flatMap((key) => {
    const value = first(raw[key]);
    return value ? [[key, value]] : [];
  }));
  const parsed = expenseListQuerySchema.safeParse(values);
  const query = parsed.success ? parsed.data : expenseListQuerySchema.parse({});
  const requestedExpenseId = first(raw.expenseId);
  const openCreate = first(raw.create) === "1";
  const initialVendorId = openCreate ? first(raw.vendorId) ?? null : null;
  const [data, selectedExpense] = await Promise.all([
    listExpenses(user.id, workspace.wedding.id, query),
    requestedExpenseId ? getExpense(user.id, workspace.wedding.id, requestedExpenseId) : Promise.resolve(null),
  ]);
  const attachments = selectedExpense ? await listDocuments(user.id, workspace.wedding.id, {
    associationType: "EXPENSE", associationId: selectedExpense.id, q: "",
  }) : { documents: [], total: 0 };
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const maxCategory = data.summary.categoryTotals.reduce((max, item) => Math.max(max, Number(item.amountMinor)), 1);

  return <WorkspaceShell user={user} wedding={workspace.wedding} role={workspace.membership.role} active="expenses" title="Wedding expenses">
    <main className="mx-auto max-w-[1320px] px-5 pb-24 pt-8 sm:px-8 xl:px-12">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-label-sm font-semibold uppercase tracking-[0.15em] text-primary">Financial ledger · INR</p><h1 className="mt-2 font-serif text-headline-lg-mobile tracking-tight sm:text-headline-lg">Wedding expenses</h1><p className="mt-2 max-w-2xl text-body-md leading-7 text-on-surface-variant">Track actual costs, payments, and outstanding balances for your celebration.</p></div>
        <CreateExpenseButton />
      </section>

      <section aria-label="Expense summary" className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Recorded expenses" value={formatMoney(data.summary.totalMinor)} icon="payments" />
        <Metric label="Amount paid" value={formatMoney(data.summary.paidMinor)} icon="check" tone="success" />
        <Metric label="Outstanding" value={formatMoney(data.summary.outstandingMinor)} icon="clock" tone={data.summary.outstandingMinor === "0" ? "success" : "warning"} />
        <Metric label="Expense records" value={String(data.summary.count)} icon="dashboard" />
      </section>

      {data.summary.count > 0 && <section className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
        <article className="rounded-xl bg-surface-container-low p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-title-lg">Payment progress</h2><p className="mt-1 text-body-sm text-on-surface-variant">{formatMoney(data.summary.paidMinor)} paid of {formatMoney(data.summary.totalMinor)}</p></div><span className="rounded-full bg-secondary-container px-3 py-1 text-label-md font-semibold text-on-secondary-container">{percent(data.summary.paidMinor, data.summary.totalMinor)}% settled</span></div><div className="mt-6 h-3 overflow-hidden rounded-full bg-surface-container-highest"><div className="h-full rounded-full bg-secondary" style={{ width: `${percent(data.summary.paidMinor, data.summary.totalMinor)}%` }} /></div><div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-body-sm"><span className="font-semibold text-secondary">Paid {formatMoney(data.summary.paidMinor)}</span><span className="font-semibold text-primary">Due {formatMoney(data.summary.outstandingMinor)}</span></div></article>
        <article className="rounded-xl bg-surface-container-low p-5 shadow-sm sm:p-6"><h2 className="text-title-lg">Category totals</h2><div className="mt-4 space-y-3">{data.summary.categoryTotals.slice(0, 5).map((item) => <div key={item.category}><div className="flex items-center justify-between gap-3 text-body-sm"><span>{EXPENSE_CATEGORY_LABELS[item.category]}</span><strong>{formatMoney(item.amountMinor)}</strong></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-container-highest"><div className="h-full rounded-full bg-tertiary" style={{ width: `${Math.max(5, Math.round(Number(item.amountMinor) / maxCategory * 100))}%` }} /></div></div>)}</div></article>
      </section>}

      <form action="/expenses" method="get" className="mt-7 rounded-xl bg-surface-container-low p-4 shadow-sm"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><label className="relative sm:col-span-2 xl:col-span-1"><span className="sr-only">Search expenses</span><WorkspaceIcon name="search" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" /><input name="q" defaultValue={query.q} placeholder="Search expenses, vendors, notes" className="w-full rounded-lg border border-transparent bg-surface px-10 py-3 text-body-sm outline-none focus:border-primary" /></label><Select name="paymentStatus" label="All payment statuses" value={query.paymentStatus ?? ""} options={Object.entries(EXPENSE_PAYMENT_STATUS_LABELS).map(([value, label]) => ({ value, label }))} /><Select name="category" label="All categories" value={query.category ?? ""} options={Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))} /><Select name="eventId" label="All ceremonies" value={query.eventId ?? ""} options={data.eventOptions.map((event) => ({ value: event.id, label: event.name }))} /><label><span className="sr-only">From date</span><input type="date" name="dateFrom" defaultValue={query.dateFrom ?? ""} className={inputClass} /></label><label><span className="sr-only">To date</span><input type="date" name="dateTo" defaultValue={query.dateTo ?? ""} className={inputClass} /></label><button className="rounded-lg bg-primary px-5 py-3 text-body-sm font-semibold text-on-primary xl:col-span-2">Apply filters</button></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-label-sm text-on-surface-variant"><span>{data.total} matching expense{data.total === 1 ? "" : "s"}</span>{Object.keys(values).length > 0 && <Link href="/expenses" className="font-semibold text-primary hover:underline">Clear filters</Link>}</div></form>

      <ExpenseWorkspace key={selectedExpense?.id ?? `${data.total}-${openCreate ? "create" : "list"}`} weddingId={workspace.wedding.id} data={data} selectedExpense={selectedExpense} attachments={attachments.documents} openCreate={openCreate} initialVendorId={initialVendorId} />
      {pages > 1 && <nav aria-label="Expense pages" className="mt-8 flex items-center justify-between"><PageLink raw={raw} page={query.page - 1} disabled={query.page === 1}>Previous</PageLink><span className="text-body-sm text-on-surface-variant">Page {query.page} of {pages}</span><PageLink raw={raw} page={query.page + 1} disabled={query.page === pages}>Next</PageLink></nav>}
    </main>
  </WorkspaceShell>;
}

function Metric({ label, value, icon, tone = "default" }: { label: string; value: string; icon: Parameters<typeof WorkspaceIcon>[0]["name"]; tone?: "default" | "success" | "warning" }) { return <article className={`rounded-xl p-4 shadow-sm ${tone === "success" ? "bg-secondary-container" : tone === "warning" ? "bg-tertiary-fixed" : "bg-surface-container-low"}`}><div className="flex items-center justify-between gap-3"><p className="text-label-sm font-semibold uppercase tracking-[0.08em] text-on-surface-variant">{label}</p><WorkspaceIcon name={icon} className={tone === "success" ? "text-secondary" : "text-tertiary"} /></div><p className="mt-3 font-serif text-headline-sm sm:text-headline-md">{value}</p></article>; }
function Select({ name, label, value, options }: { name: string; label: string; value: string; options: Array<{ value: string; label: string }> }) { return <label><span className="sr-only">{label}</span><select name={name} defaultValue={value} className={inputClass}><option value="">{label}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
function PageLink({ raw, page, disabled, children }: { raw: RawSearch; page: number; disabled: boolean; children: string }) { if (disabled) return <span className="rounded-lg px-4 py-2 text-body-sm text-outline">{children}</span>; const params = new URLSearchParams(); for (const [key, value] of Object.entries(raw)) { const item = Array.isArray(value) ? value[0] : value; if (item && key !== "page" && key !== "expenseId") params.set(key, item); } params.set("page", String(page)); return <Link href={`/expenses?${params}`} className="rounded-lg bg-surface-container px-4 py-2 text-body-sm font-semibold">{children}</Link>; }
function percent(part: string, total: string) { return Number(total) ? Math.min(100, Math.round(Number(part) / Number(total) * 100)) : 0; }
function formatMoney(value: string) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) / 100); }
const inputClass = "w-full rounded-lg border border-transparent bg-surface px-3 py-3 text-body-sm outline-none focus:border-primary";
