import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getCurrentUser } from "@/modules/auth/session";
import { getSafeNextPath } from "@/modules/auth/navigation";

export const metadata: Metadata = { title: "Create account | Make My Marriage" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string; email?: string }> }) {
  const [user, { next, email }] = await Promise.all([getCurrentUser(), searchParams]);
  const nextPath = getSafeNextPath(next);
  if (user) redirect(nextPath);
  const loginUrl = `/login?next=${encodeURIComponent(nextPath)}${email ? `&email=${encodeURIComponent(email)}` : ""}`;

  return (
    <AuthShell
      eyebrow="Begin your celebration"
      title="Create your account"
      description="Start with your own details. We’ll set up the shared wedding workspace together in the next step."
      footer={<>Already have an account? <Link href={loginUrl} className="font-semibold text-primary hover:underline">Log in</Link></>}
    >
      <AuthForm variant="signup" nextPath={nextPath} initialEmail={email ?? ""} />
    </AuthShell>
  );
}
