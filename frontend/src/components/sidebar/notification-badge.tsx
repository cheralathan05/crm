import { cn } from "@/lib/utils";

/**
 * Notification badge — renders nothing when the count is zero.
 * The count is always real backend data; zero is hidden by design.
 */
export function NotificationBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (!count || count < 1) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-[3px]",
        "bg-[var(--bos-accent)] text-white text-[9px] font-semibold tabular-nums leading-none",
        className,
      )}
      aria-label={`${count} ${count === 1 ? "item" : "items"}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
