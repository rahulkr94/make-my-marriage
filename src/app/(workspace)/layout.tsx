import type { ReactNode } from "react";
import { WorkspaceSessionSync } from "@/components/auth/workspace-session-sync";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <WorkspaceSessionSync />
      {children}
    </>
  );
}
