"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ClipboardList,
  FileStack,
  FileText,
  FolderKanban,
  MessageSquare,
  Settings,
  SquareCheck,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EventKind =
  | "activity" | "requirement" | "proposal" | "project"
  | "task" | "message" | "payment" | "document" | "system" | "client";

type TimelineEvent = {
  id: string;
  label: string;
  group: string;
  actor: string;
  kind: EventKind;
  atLabel: string;
};

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "client", label: "Client" },
  { key: "requirements", label: "Requirements" },
  { key: "proposals", label: "Proposals" },
  { key: "projects", label: "Projects" },
  { key: "tasks", label: "Tasks" },
  { key: "messages", label: "Messages" },
  { key: "payments", label: "Payments" },
  { key: "documents", label: "Documents" },
  { key: "system", label: "System" },
];

const KIND_ICON: Record<EventKind, React.ReactNode> = {
  client: <MessageSquare className="w-3.5 h-3.5" />,
  activity: <Activity className="w-3.5 h-3.5" />,
  requirement: <ClipboardList className="w-3.5 h-3.5" />,
  proposal: <FileText className="w-3.5 h-3.5" />,
  project: <FolderKanban className="w-3.5 h-3.5" />,
  task: <SquareCheck className="w-3.5 h-3.5" />,
  message: <MessageSquare className="w-3.5 h-3.5" />,
  payment: <Wallet className="w-3.5 h-3.5" />,
  document: <FileStack className="w-3.5 h-3.5" />,
  system: <Settings className="w-3.5 h-3.5" />,
};

export function Timeline({ clientId, initial, refreshKey = 0 }: { clientId: string; initial: TimelineEvent[]; refreshKey?: number }) {
  const [filter, setFilter] = useState("all");
  const [events, setEvents] = useState<TimelineEvent[]>(initial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/clients/${clientId}/timeline?filter=${filter}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.ok) setEvents(data.events);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, filter, refreshKey]);

  return (
    <div>
      {/* Filter chips */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "shrink-0 px-2 py-0.5 rounded-sm text-[10px] border transition-colors duration-150",
              filter === f.key
                ? "border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] font-medium"
                : "border-transparent text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)]",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Events */}
      <div className="relative mt-3">
        <span className="absolute left-[7px] top-1 bottom-1 w-px bg-[var(--bos-line)]" aria-hidden="true" />
        <ul className="space-y-0">
          {loading && events.length === 0 && (
            <li className="text-[11px] text-[var(--bos-text-tertiary)] pl-7 py-1">Loading timeline…</li>
          )}
          {!loading && events.length === 0 && (
            <li className="text-[11px] text-[var(--bos-text-tertiary)] pl-7 py-1">
              No events in this view yet.
            </li>
          )}
          {events.map((ev) => (
            <li key={ev.id} className="relative flex items-start gap-3 py-1.5 group">
              <span
                className={cn(
                  "relative z-10 flex items-center justify-center w-[15px] h-[15px] rounded-full border shrink-0 mt-0.5",
                  "border-[var(--bos-line)] bg-[var(--bos-bg)] text-[var(--bos-text-tertiary)]",
                  "group-hover:border-[var(--bos-border-strong)] group-hover:text-[var(--bos-text-secondary)] transition-colors duration-150",
                )}
              >
                {KIND_ICON[ev.kind]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[12px] text-[var(--bos-text-primary)] truncate">{ev.label}</span>
                  <span className="shrink-0 text-[10px] text-[var(--bos-text-tertiary)] tabular-nums">{ev.atLabel}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[var(--bos-text-tertiary)]">
                  <span className="font-mono uppercase tracking-[0.1em]">{ev.group}</span>
                  <span aria-hidden="true">·</span>
                  <span>{ev.actor}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
