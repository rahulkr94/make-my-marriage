import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Choose a new password | Make My Marriage" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell
      eyebrow="Secure your account"
      title="Choose a new password"
      description="Create a strong password you haven’t used for this account before."
      footer={<Link href="/login" className="font-semibold text-primary hover:underline">Return to login</Link>}
    >
      {token ? <AuthForm variant="reset" token={token} /> : <div role="alert" className="rounded border border-error/25 bg-error-container px-4 py-4 text-body-sm text-on-error-container">This reset link is incomplete. Request a new link to continue.</div>}
    </AuthShell>
  );
}
