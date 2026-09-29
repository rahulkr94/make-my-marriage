"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Variant = "signup" | "login" | "forgot" | "reset";
type ApiError = { error?: { message?: string; details?: Array<{ path: string; message: string }> } };

const content = {
  signup: { endpoint: "/api/v1/auth/signup", submit: "Create my account", pending: "Creating your account…" },
  login: { endpoint: "/api/v1/auth/login", submit: "Log in", pending: "Logging you in…" },
  forgot: { endpoint: "/api/v1/auth/password-reset-requests", submit: "Send reset link", pending: "Sending your link…" },
  reset: { endpoint: "/api/v1/auth/password-resets", submit: "Set new password", pending: "Updating your password…" },
} as const;

export function AuthForm({ variant, token }: { variant: Variant; token?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const body: Record<string, string> = {};
    for (const [key, value] of form.entries()) body[key] = String(value);
    if (token) body.token = token;

    try {
      const response = await fetch(content[variant].endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as ApiError & { message?: string };

      if (!response.ok) {
        setError(payload.error?.message ?? "Something went wrong. Please try again.");
        const errors = (payload.error?.details ?? []).reduce<Record<string, string[]>>((result, detail) => {
          (result[detail.path] ??= []).push(detail.message);
          return result;
        }, {});
        setFieldErrors(errors);
        return;
      }

      if (variant === "forgot") {
        setMessage(payload.message ?? "If an account exists for that email, a reset link will be sent.");
        event.currentTarget.reset();
      } else if (variant === "reset") {
        router.push("/login?reset=success");
      } else {
        router.push("/welcome");
        router.refresh();
      }
    } catch {
      setError("We could not reach the server. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  const showName = variant === "signup";
  const showEmail = variant !== "reset";
  const showPassword = variant === "signup" || variant === "login" || variant === "reset";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {showName && <Field label="Your name" name="name" autoComplete="name" placeholder="Aarav Sharma" error={fieldErrors.name?.[0]} />}
      {showEmail && <Field label="Email address" name="email" type="email" autoComplete="email" placeholder="you@example.com" error={fieldErrors.email?.[0]} />}
      {showPassword && (
        <>
          <Field
            label={variant === "reset" ? "New password" : "Password"}
            name="password"
            type="password"
            autoComplete={variant === "login" ? "current-password" : "new-password"}
            hint={variant === "signup" || variant === "reset" ? "Use 12+ characters with uppercase, lowercase, and a number." : undefined}
            error={fieldErrors.password?.[0]}
          />
          {variant !== "login" && <Field label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" error={fieldErrors.confirmPassword?.[0]} />}
        </>
      )}

      {variant === "login" && (
        <div className="-mt-2 text-right"><Link href="/forgot-password" className="text-body-sm font-semibold text-primary hover:underline">Forgot password?</Link></div>
      )}

      {error && <p role="alert" className="rounded border border-error/25 bg-error-container px-4 py-3 text-body-sm text-on-error-container">{error}</p>}
      {message && <p role="status" className="rounded border border-secondary/25 bg-secondary-container px-4 py-3 text-body-sm text-on-secondary-container">{message}</p>}

      <button disabled={pending || (variant === "reset" && !token)} type="submit" className="w-full rounded bg-primary px-5 py-3.5 text-body-md font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-55">
        {pending ? content[variant].pending : content[variant].submit}
      </button>

      {variant === "signup" && <p className="text-center text-label-sm leading-5 text-on-surface-variant">By creating an account, you agree to use Make My Marriage responsibly and keep shared wedding information private.</p>}
    </form>
  );
}

function Field({ label, name, type = "text", autoComplete, placeholder, hint, error }: {
  label: string;
  name: string;
  type?: string;
  autoComplete: string;
  placeholder?: string;
  hint?: string;
  error?: string;
}) {
  const describedBy = [hint ? `${name}-hint` : "", error ? `${name}-error` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <label className="block text-body-sm font-semibold" htmlFor={name}>
      {label}
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className="mt-2 w-full rounded border border-outline-variant bg-surface-container-lowest px-4 py-3.5 text-body-md font-normal text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      {hint && <span id={`${name}-hint`} className="mt-2 block text-label-sm font-normal leading-5 text-on-surface-variant">{hint}</span>}
      {error && <span id={`${name}-error`} className="mt-2 block text-label-sm font-normal text-error">{error}</span>}
    </label>
  );
}
