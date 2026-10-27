import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NotificationWorkspace } from "@/components/notifications/notification-workspace";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getCurrentUser } from "@/modules/auth/session";
import { canManageNotifications } from "@/modules/notifications/constants";
import { notificationListQuerySchema } from "@/modules/notifications/schemas";
import { listNotifications } from "@/modules/notifications/service";
import { getWorkspaceForUser } from "@/modules/weddings/service";

export const metadata: Metadata = { title: "Reminders | Make My Marriage" };
type RawSearch = Record<string, string | string[] | undefined>;

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<RawSearch> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/notifications");
  const workspace = await getWorkspaceForUser(user.id);
  if (!workspace) redirect("/setup/wedding");
  if (!canManageNotifications(workspace.membership.role)) redirect("/dashboard");
  const raw = await searchParams;
  const values = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]).filter(([, value]) => value));
  const parsed = notificationListQuerySchema.safeParse(values);
  const query = parsed.success ? parsed.data : notificationListQuerySchema.parse({});
  const data = await listNotifications(user.id, workspace.wedding.id, query);
  return <WorkspaceShell user={user} wedding={workspace.wedding} role={workspace.membership.role} active="notifications" title="Reminders"><NotificationWorkspace weddingId={workspace.wedding.id} weddingName={`${workspace.wedding.brideName} & ${workspace.wedding.groomName}`} initial={data} query={query} /></WorkspaceShell>;
}
