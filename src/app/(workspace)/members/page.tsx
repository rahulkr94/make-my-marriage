import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MembersWorkspace } from "@/components/members/members-workspace";
import { getCurrentUser } from "@/modules/auth/session";
import { listWeddingMembers } from "@/modules/members/service";
import { getWorkspaceForUser } from "@/modules/weddings/service";

export const metadata: Metadata = { title: "Members | Make My Marriage" };

export default async function MembersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/members");
  const workspace = await getWorkspaceForUser(user.id);
  if (!workspace) redirect("/setup/wedding");
  if (workspace.membership.role !== "ADMIN") redirect("/welcome");

  const data = await listWeddingMembers(user.id, workspace.wedding.id);
  return <MembersWorkspace user={user} wedding={workspace.wedding} members={data.members} invitations={data.invitations} />;
}
