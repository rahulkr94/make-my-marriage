import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GalleryWorkspace } from "@/components/gallery/gallery-workspace";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getCurrentUser } from "@/modules/auth/session";
import { listGallery } from "@/modules/gallery/service";
import { getWorkspaceForUser } from "@/modules/weddings/service";
export const metadata: Metadata = { title: "Wedding gallery | Make My Marriage" };
export default async function GalleryPage() { const user = await getCurrentUser(); if (!user) redirect("/login?next=/gallery"); const workspace = await getWorkspaceForUser(user.id); if (!workspace) redirect("/setup/wedding"); const data = await listGallery(user.id, workspace.wedding.id); return <WorkspaceShell user={user} wedding={workspace.wedding} role={workspace.membership.role} active="gallery" title="Gallery"><GalleryWorkspace weddingId={workspace.wedding.id} weddingName={`${workspace.wedding.brideName} & ${workspace.wedding.groomName}`} initial={data} /></WorkspaceShell>; }
