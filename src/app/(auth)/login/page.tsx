import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getCurrentUser } from "@/modules/auth/session";
import { getSafeNextPath } from "@/modules/auth/navigation";

export const metadata: Metadata = { title: "Log in | Make My Marriage" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string; next?: string; email?: string }> }) {
  const [user, { reset, next, email }] = await Promise.all([getCurrentUser(), searchParams]);
  const nextPath = getSafeNextPath(next);
  if (user) redirect(nextPath);
  const signupUrl = `/signup?next=${encodeURIComponent(nextPath)}${email ? `&email=${encodeURIComponent(email)}` : ""}`;

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Continue planning"
      description="Log in to return to the wedding plans you share with the people closest to you."
      footer={<>New to Make My Marriage? <Link href={signupUrl} className="font-semibold text-primary hover:underline">Create an account</Link></>}
    >
      {reset === "success" && <p role="status" className="mb-5 rounded border border-secondary/25 bg-secondary-container px-4 py-3 text-body-sm text-on-secondary-container">Your password has been updated. Log in with your new password.</p>}
      <AuthForm variant="login" nextPath={nextPath} initialEmail={email ?? ""} />
    </AuthShell>
  );
}
