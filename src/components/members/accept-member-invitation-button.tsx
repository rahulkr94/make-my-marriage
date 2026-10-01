"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { WorkspaceIcon } from "@/components/weddings/workspace-icon";

export function AcceptMemberInvitationButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function accept() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/v1/member-invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) {
        setError(payload.error?.message ?? "We couldn’t accept this invitation.");
        return;
      }
      router.push("/welcome");
      router.refresh();
    } catch {
      setError("We couldn’t reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return <div className="mt-5"><button type="button" onClick={accept} disabled={pending} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3.5 text-body-sm font-semibold text-on-primary hover:bg-primary-container disabled:opacity-55"><WorkspaceIcon name="check" className="text-lg" />{pending ? "Joining wedding…" : "Accept invitation"}</button>{error && <p role="alert" className="mt-3 rounded-lg bg-error-container p-3 text-body-sm text-on-error-container">{error}</p>}</div>;
}
