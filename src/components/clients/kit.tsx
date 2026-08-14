import { cn } from "@/lib/utils";

/* ── Status chip with semantic color ─────────────────────────── */

const STATUS_TONES: Record<string, { dot: string; text: string; bg: string; label: string }> = {
  HEALTHY: { dot: "bg-[var(--bos-success)]", text: "text-[var(--bos-success)]", bg: "bg-[var(--bos-success)]/8", label: "Healthy" },
  NEEDS_ATTENTION: { dot: "bg-[var(--bos-warning)]", text: "text-[var(--bos-warning)]", bg: "bg-[var(--bos-warning)]/8", label: "Needs Attention" },
  AT_RISK: { dot: "bg-[var(--bos-error)]", text: "text-[var(--bos-error)]", bg: "bg-[var(--bos-error)]/8", label: "At Risk" },
  INACTIVE: { dot: "bg-[var(--bos-text-tertiary)]", text: "text-[var(--bos-text-tertiary)]", bg: "bg-[var(--bos-overlay)]", label: "Inactive" },
  ACTIVE: { dot: "bg-[var(--bos-success)]", text: "text-[var(--bos-success)]", bg: "bg-[var(--bos-success)]/8", label: "Active" },
  LEAD: { dot: "bg-[var(--bos-info)]", text: "text-[var(--bos-info)]", bg: "bg-[var(--bos-info)]/8", label: "Lead" },
  ARCHIVED: { dot: "bg-[var(--bos-text-tertiary)]", text: "text-[var(--bos-text-tertiary)]", bg: "bg-[var(--bos-overlay)]", label: "Archived" },
  ON_TRACK: { dot: "bg-[var(--bos-success)]", text: "text-[var(--bos-success)]", bg: "bg-[var(--bos-success)]/8", label: "On Track" },
  BLOCKED: { dot: "bg-[var(--bos-error)]", text: "text-[var(--bos-error)]", bg: "bg-[var(--bos-error)]/8", label: "Blocked" },

  // Requirement request statuses
  SUBMITTED: { dot: "bg-[var(--bos-warning)]", text: "text-[var(--bos-warning)]", bg: "bg-[var(--bos-warning)]/8", label: "Submitted" },
  REVISION_SUBMITTED: { dot: "bg-[var(--bos-warning)]", text: "text-[var(--bos-warning)]", bg: "bg-[var(--bos-warning)]/8", label: "Resubmitted" },
  CHANGES_REQUESTED: { dot: "bg-[var(--bos-warning)]", text: "text-[var(--bos-warning)]", bg: "bg-[var(--bos-warning)]/8", label: "Changes requested" },
  APPROVED: { dot: "bg-[var(--bos-success)]", text: "text-[var(--bos-success)]", bg: "bg-[var(--bos-success)]/8", label: "Approved" },
  DRAFT: { dot: "bg-[var(--bos-text-tertiary)]", text: "text-[var(--bos-text-tertiary)]", bg: "bg-[var(--bos-overlay)]", label: "Draft" },
  SENT: { dot: "bg-[var(--bos-info)]", text: "text-[var(--bos-info)]", bg: "bg-[var(--bos-info)]/8", label: "Sent" },
  IN_PROGRESS: { dot: "bg-[var(--bos-info)]", text: "text-[var(--bos-info)]", bg: "bg-[var(--bos-info)]/8", label: "In progress" },
  REVOKED: { dot: "bg-[var(--bos-error)]", text: "text-[var(--bos-error)]", bg: "bg-[var(--bos-error)]/8", label: "Revoked" },

  // Proposal statuses
  VIEWED: { dot: "bg-[var(--bos-info)]", text: "text-[var(--bos-info)]", bg: "bg-[var(--bos-info)]/8", label: "Viewed" },
  REJECTED: { dot: "bg-[var(--bos-error)]", text: "text-[var(--bos-error)]", bg: "bg-[var(--bos-error)]/8", label: "Rejected" },
};

export function StatusChip({ status, className }: { status: string; className?: string }) {
  const tone = STATUS_TONES[status] ?? {
    dot: "bg-[var(--bos-text-tertiary)]",
    text: "text-[var(--bos-text-secondary)]",
    bg: "bg-[var(--bos-overlay)]",
    label: status.replace(/_/g, " "),
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] text-[9px] font-mono uppercase tracking-[0.12em]",
        tone.bg,
        tone.text,
        className,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", tone.dot)} aria-hidden="true" />
      {tone.label}
    </span>
  );
}

/* ── Section shell — used across the Command Center ─────────── */

export function Section({
  id,
  title,
  meta,
  action,
  children,
  className,
}: {
  id?: string;
  title: string;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)]/60 scroll-mt-20",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-[var(--bos-line)]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-secondary)] truncate">
            {title}
          </span>
          {meta && <span className="text-[10px] text-[var(--bos-text-tertiary)] shrink-0">{meta}</span>}
        </div>
        {action && <div className="shrink-0 flex items-center gap-1">{action}</div>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

/* ── Key/value row ──────────────────────────────────────────── */

export function KV({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)] mb-0.5">
        {label}
      </div>
      <div className={cn("text-[12px] text-[var(--bos-text-primary)] truncate", mono && "tabular-nums")}>
        {children}
      </div>
    </div>
  );
}

/* ── Micro button ───────────────────────────────────────────── */

export function MicroButton({
  children,
  onClick,
  variant = "default",
  className,
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "accent" | "ghost";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm text-[11px] font-medium transition-colors duration-150",
        variant === "accent" && "bg-[var(--bos-accent)] text-white hover:bg-[var(--bos-accent-hover)]",
        variant === "default" && "border border-[var(--bos-line)] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)]",
        variant === "ghost" && "text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)] hover:text-[var(--bos-text-primary)]",
        disabled && "opacity-40 cursor-not-allowed",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ── Empty state — guides the next action ───────────────────── */

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="py-8 text-center">
      <div className="text-[13px] font-medium text-[var(--bos-text-secondary)]">{title}</div>
      {hint && <div className="text-[11px] text-[var(--bos-text-tertiary)] mt-1">{hint}</div>}
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}

/* ── Progress bar ───────────────────────────────────────────── */

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1 rounded-full bg-[var(--bos-overlay)] overflow-hidden", className)}>
      <div
        className="h-full rounded-full bg-[var(--bos-accent)] transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/* ── Time label helper ──────────────────────────────────────── */

export function TimeAgo({ value }: { value?: string | null }) {
  return <span className="text-[11px] text-[var(--bos-text-tertiary)] tabular-nums">{value ?? "—"}</span>;
}
