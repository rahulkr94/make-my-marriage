import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ReminderSettingsForm } from "@/components/notifications/reminder-settings-form";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getCurrentUser } from "@/modules/auth/session";
import { canManageNotifications } from "@/modules/notifications/constants";
import { getNotificationSettings } from "@/modules/notifications/service";
import { getWorkspaceForUser } from "@/modules/weddings/service";

export const metadata: Metadata = { title: "Reminder settings | Make My Marriage" };

export default async function ReminderSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/notifications/settings");
  const workspace = await getWorkspaceForUser(user.id);
  if (!workspace) redirect("/setup/wedding");
  if (!canManageNotifications(workspace.membership.role)) redirect("/dashboard");
  const settings = await getNotificationSettings(user.id, workspace.wedding.id);
  return <WorkspaceShell user={user} wedding={workspace.wedding} role={workspace.membership.role} active="notifications" title="Reminder settings"><ReminderSettingsForm weddingId={workspace.wedding.id} weddingName={`${workspace.wedding.brideName} & ${workspace.wedding.groomName}`} timeZone={workspace.wedding.timeZone} initial={settings} /></WorkspaceShell>;
}
