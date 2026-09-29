import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Reset password | Make My Marriage" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Password help"
      title="Find your way back"
      description="Enter the email linked to your account. If it matches an account, we’ll send a secure reset link."
      footer={<Link href="/login" className="font-semibold text-primary hover:underline">Return to login</Link>}
    >
      <AuthForm variant="forgot" />
    </AuthShell>
  );
}
