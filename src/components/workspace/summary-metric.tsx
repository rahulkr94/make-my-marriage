import type { ReactNode } from "react";
import { WorkspaceIcon } from "@/components/weddings/workspace-icon";

type Tone = "neutral" | "primary" | "secondary" | "tertiary" | "error";

const toneStyles: Record<Tone, { card: string; icon: string; value: string }> = {
  neutral: {
    card: "border-outline-variant",
    icon: "bg-surface-container-high text-primary",
    value: "text-on-surface",
  },
  primary: {
    card: "border-primary",
    icon: "bg-primary-fixed text-primary",
    value: "text-primary",
  },
  secondary: {
    card: "border-secondary",
    icon: "bg-secondary-fixed text-secondary",
    value: "text-on-surface",
  },
  tertiary: {
    card: "border-tertiary-container",
    icon: "bg-tertiary-fixed text-tertiary",
    value: "text-on-surface",
  },
  error: {
    card: "border-error",
    icon: "bg-error-container text-error",
    value: "text-error",
  },
};

export function SummaryMetric({
  label,
  value,
  icon,
  tone = "neutral",
  note,
  progress,
  className = "",
}: {
  label: string;
  value: ReactNode;
  icon: Parameters<typeof WorkspaceIcon>[0]["name"];
  tone?: Tone;
  note?: ReactNode;
  progress?: number;
  className?: string;
}) {
  const styles = toneStyles[tone];
  const safeProgress = progress === undefined ? undefined : Math.min(100, Math.max(0, progress));

  return (
    <article className={`rounded-xl border-b-4 bg-surface-container-low p-4 shadow-sm sm:p-5 ${styles.card} ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="pt-1 text-label-sm font-semibold uppercase tracking-[0.08em] text-on-surface-variant">{label}</p>
        <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${styles.icon}`}>
          <WorkspaceIcon name={icon} className="text-xl" />
        </span>
      </div>
      <p className={`mt-4 font-serif text-headline-sm sm:text-headline-md ${styles.value}`}>{value}</p>
      {note && <p className="mt-1 text-body-sm leading-5 text-on-surface-variant">{note}</p>}
      {safeProgress !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface/75" aria-hidden="true">
          <div className="h-full rounded-full bg-secondary" style={{ width: `${safeProgress}%` }} />
        </div>
      )}
    </article>
  );
}
