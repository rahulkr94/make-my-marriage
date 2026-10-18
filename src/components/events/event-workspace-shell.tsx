import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

type User = { name: string; email: string };
type Wedding = { brideName: string; groomName: string; weddingDate: string };

export function EventWorkspaceShell({ user, wedding, role, children }: { user: User; wedding: Wedding; role: string; children: ReactNode }) {
  return <WorkspaceShell user={user} wedding={wedding} role={role} active="events" title="Events & ceremonies">{children}</WorkspaceShell>;
}
