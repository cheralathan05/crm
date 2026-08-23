"use client";

/**
 * Status message for auth flows.
 * Displays success/error/info states with subtle animation.
 */
export function AuthStatus({
  type,
  message,
}: {
  type: "success" | "error" | "info";
  message: string;
}) {
  const colors = {
    success: "var(--bos-success)",
    error: "var(--bos-error)",
    info: "var(--bos-text-secondary)",
  };

  return (
    <div
      className="flex items-start gap-2.5 px-3 py-2.5 rounded-sm text-xs leading-relaxed"
      style={{
        background: `color-mix(in srgb, ${colors[type]} 6%, transparent)`,
        color: colors[type],
      }}
      role="status"
    >
      <span className="mt-0.5 shrink-0">
        {type === "success" && "✓"}
        {type === "error" && "!"}
        {type === "info" && "i"}
      </span>
      <span>{message}</span>
    </div>
  );
}