import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";
import { findItemByHref } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/**
 * Placeholder page for Business OS modules that are not built yet.
 * Driven entirely by the navigation config — the icon, title, description
 * and view chips come from the same source of truth as the sidebar.
 */
export function ModulePlaceholder({
  href,
  view,
  newRecord = false,
}: {
  href: string;
  view?: string | null;
  newRecord?: boolean;
}) {
  const item = findItemByHref(href);
  if (!item) return null;

  const Icon = item.icon;
  const activeChild = item.children?.find((c) => c.view === view);
  const sectionName = href.split("/")[1] ?? "";

  return (
    <div className="px-5 sm:px-8 py-6 max-w-3xl">
      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] transition-colors duration-150"
      >
        <ArrowLeft className="w-3 h-3" aria-hidden="true" />
        Overview
      </Link>

      {/* Module header */}
      <div className="mt-6 flex items-start gap-4">
        <span className="flex items-center justify-center w-11 h-11 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)] text-[var(--bos-accent)] shrink-0">
          <Icon className="w-5 h-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="section-number">
            <span className="opacity-30">—</span> MODULE · {sectionName.toUpperCase()}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--bos-text-primary)] mt-1">
            {item.label}
          </h1>
          <p className="text-[13px] text-[var(--bos-text-secondary)] mt-1 leading-relaxed">
            {item.description}
          </p>
        </div>
      </div>

      {/* Under construction */}
      <div className="mt-8 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/60 p-5">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-secondary)]">
          <Construction className="w-3.5 h-3.5 text-[var(--bos-warning)]" aria-hidden="true" />
          {newRecord ? "Creating a new record" : "Module under construction"}
        </div>
        <p className="text-[13px] text-[var(--bos-text-secondary)] mt-3 leading-relaxed">
          {newRecord ? (
            <>
              The <span className="text-[var(--bos-text-primary)]">{item.label.toLowerCase()}</span>{" "}
              creation interface opens here. The module is being built — this page connects to it
              as it ships.
            </>
          ) : (
            <>
              The {item.label.toLowerCase()} module is being built. This workspace is ready for it —
              the navigation and routes are live, and the module will connect to this page as it
              ships.
            </>
          )}
        </p>

        {/* Planned views */}
        {item.children && item.children.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[var(--bos-line)]">
            <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)] mb-2">
              Views
            </div>
            <div className="flex flex-wrap gap-1.5">
              {item.children.map((child) => {
                const childHref = child.view ? `${href}?view=${child.view}` : href;
                const isActive = activeChild === child;
                return (
                  <Link
                    key={child.label}
                    href={childHref}
                    className={cn(
                      "px-2.5 py-1 rounded-sm text-[11px] border transition-colors duration-150",
                      isActive
                        ? "border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] font-medium"
                        : "border-[var(--bos-line)] text-[var(--bos-text-tertiary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-secondary)]",
                    )}
                  >
                    {child.label}
                  </Link>
                );
              })}
            </div>
            {view && activeChild && (
              <div className="mt-3 text-[11px] text-[var(--bos-text-tertiary)]">
                Currently viewing <span className="text-[var(--bos-text-secondary)]">{activeChild.label}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
