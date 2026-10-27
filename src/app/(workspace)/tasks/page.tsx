import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateTaskButton, TaskWorkspace } from "@/components/tasks/task-workspace";
import { WorkspaceIcon } from "@/components/weddings/workspace-icon";
import { SummaryMetric } from "@/components/workspace/summary-metric";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getCurrentUser } from "@/modules/auth/session";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/modules/tasks/constants";
import { taskListQuerySchema } from "@/modules/tasks/schemas";
import { getTask, getTaskTimeline, listTasks } from "@/modules/tasks/service";
import { getWorkspaceForUser } from "@/modules/weddings/service";

export const metadata: Metadata = { title: "Tasks & timeline | Make My Marriage" };
type RawSearch = Record<string, string | string[] | undefined>;

export default async function TasksPage({ searchParams }: { searchParams: Promise<RawSearch> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/tasks");
  const workspace = await getWorkspaceForUser(user.id);
  if (!workspace) redirect("/setup/wedding");
  const raw = await searchParams;
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const values = Object.fromEntries(["q", "status", "priority", "assignedMemberId", "eventId", "due", "page"].flatMap((key) => {
    const value = first(raw[key]);
    return value ? [[key, value]] : [];
  }));
  const parsed = taskListQuerySchema.safeParse(values);
  const query = parsed.success ? parsed.data : taskListQuerySchema.parse({});
  const view = first(raw.view) === "timeline" ? "timeline" : "tasks";
  const openCreate = first(raw.create) === "1";
  const requestedTaskId = first(raw.taskId);
  const [data, timeline, selectedTask] = await Promise.all([
    listTasks(user.id, workspace.wedding.id, query),
    view === "timeline" ? getTaskTimeline(user.id, workspace.wedding.id) : Promise.resolve(null),
    requestedTaskId ? getTask(user.id, workspace.wedding.id, requestedTaskId) : Promise.resolve(null),
  ]);
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return <WorkspaceShell user={user} wedding={workspace.wedding} role={workspace.membership.role} active="tasks" title="Tasks & timeline">
    <main className="mx-auto max-w-[1320px] px-5 pb-24 pt-8 sm:px-8 xl:px-12">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-label-sm font-semibold uppercase tracking-[0.15em] text-primary">Wedding orchestration · {workspace.wedding.timeZone.replaceAll("_", " ")}</p><h1 className="mt-2 font-serif text-headline-lg-mobile tracking-tight sm:text-headline-lg">Tasks &amp; timeline</h1><p className="mt-2 max-w-2xl text-body-md leading-7 text-on-surface-variant">Keep every wedding detail moving on schedule with clear ownership, calm priorities, and ceremony context.</p></div>
        {data.canManage && <CreateTaskButton />}
      </section>

      <nav aria-label="Task workspace views" className="mt-7 inline-flex rounded-lg bg-surface-container p-1">
        <Link href="/tasks" aria-current={view === "tasks" ? "page" : undefined} className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-body-sm font-semibold ${view === "tasks" ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant"}`}><WorkspaceIcon name="check" />Tasks</Link>
        <Link href="/tasks?view=timeline" aria-current={view === "timeline" ? "page" : undefined} className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-body-sm font-semibold ${view === "timeline" ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant"}`}><WorkspaceIcon name="clock" />Timeline</Link>
      </nav>

      <section aria-label="Task summary" className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <SummaryMetric label="Open" value={data.summary.open} icon="clock" />
        <SummaryMetric label="In progress" value={data.summary.inProgress} icon="refresh" tone="primary" />
        <SummaryMetric label="Overdue" value={data.summary.overdue} icon="bell" tone={data.summary.overdue > 0 ? "error" : "tertiary"} />
        <SummaryMetric label="Completed" value={data.summary.completed} icon="check" tone="secondary" />
        <SummaryMetric label="Overall completion" value={`${data.summary.completionRate}%`} icon="check" tone="secondary" progress={data.summary.completionRate} className="col-span-2 lg:col-span-1" />
      </section>

      {view === "tasks" && <form action="/tasks" method="get" className="mt-7 rounded-xl bg-surface-container-low p-4 shadow-sm"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1.4fr)_repeat(5,minmax(8rem,.65fr))_auto]"><label className="relative"><span className="sr-only">Search tasks</span><WorkspaceIcon name="search" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" /><input name="q" defaultValue={query.q} placeholder="Search tasks" className="w-full rounded-lg border border-transparent bg-surface px-10 py-3 text-body-sm outline-none focus:border-primary" /></label><Select name="status" label="All statuses" value={query.status ?? ""} options={Object.entries(TASK_STATUS_LABELS).map(([value, label]) => ({ value, label }))} /><Select name="priority" label="All priorities" value={query.priority ?? ""} options={Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => ({ value, label }))} />{data.canManage && <Select name="assignedMemberId" label="All assignees" value={query.assignedMemberId ?? ""} options={data.assigneeOptions.map((member) => ({ value: member.id, label: member.name }))} />}<Select name="eventId" label="All ceremonies" value={query.eventId ?? ""} options={data.eventOptions.map((event) => ({ value: event.id, label: event.name }))} /><Select name="due" label="All due dates" value={query.due ?? ""} options={[{ value: "OVERDUE", label: "Overdue" }, { value: "THIS_WEEK", label: "Due this week" }, { value: "UPCOMING", label: "Upcoming" }, { value: "NO_DUE_DATE", label: "No due date" }]} /><button className="rounded-lg bg-primary px-5 py-3 text-body-sm font-semibold text-on-primary">Apply</button></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-label-sm text-on-surface-variant"><span>{data.total} matching task{data.total === 1 ? "" : "s"}</span>{Object.keys(values).length > 0 && <Link href="/tasks" className="font-semibold text-primary hover:underline">Reset filters</Link>}</div></form>}

      <TaskWorkspace key={selectedTask?.id ?? `${view}-${openCreate}`} weddingId={workspace.wedding.id} timeZone={workspace.wedding.timeZone} data={data} timeline={timeline} view={view} selectedTask={selectedTask} openCreate={openCreate} />
      {view === "tasks" && pages > 1 && <nav aria-label="Task pages" className="mt-8 flex items-center justify-between"><PageLink raw={raw} page={query.page - 1} disabled={query.page === 1}>Previous</PageLink><span className="text-body-sm text-on-surface-variant">Page {query.page} of {pages}</span><PageLink raw={raw} page={query.page + 1} disabled={query.page === pages}>Next</PageLink></nav>}
    </main>
  </WorkspaceShell>;
}

function Select({ name, label, value, options }: { name: string; label: string; value: string; options: Array<{ value: string; label: string }> }) { return <label><span className="sr-only">{label}</span><select name={name} defaultValue={value} className="w-full rounded-lg border border-transparent bg-surface px-3 py-3 text-body-sm outline-none focus:border-primary"><option value="">{label}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
function PageLink({ raw, page, disabled, children }: { raw: RawSearch; page: number; disabled: boolean; children: string }) { if (disabled) return <span className="rounded-lg px-4 py-2 text-body-sm text-outline">{children}</span>; const params = new URLSearchParams(); for (const [key, value] of Object.entries(raw)) { const item = Array.isArray(value) ? value[0] : value; if (item && key !== "page" && key !== "taskId") params.set(key, item); } params.set("page", String(page)); return <Link href={`/tasks?${params}`} className="rounded-lg bg-surface-container px-4 py-2 text-body-sm font-semibold">{children}</Link>; }
