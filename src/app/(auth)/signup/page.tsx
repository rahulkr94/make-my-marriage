import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getCurrentUser } from "@/modules/auth/session";

export const metadata: Metadata = { title: "Create account | Make My Marriage" };

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/welcome");

  return (
    <AuthShell
      eyebrow="Begin your celebration"
      title="Create your account"
      description="Start with your own details. We’ll set up the shared wedding workspace together in the next step."
      footer={<>Already have an account? <Link href="/login" className="font-semibold text-primary hover:underline">Log in</Link></>}
    >
      <AuthForm variant="signup" />
    </AuthShell>
  );
}
