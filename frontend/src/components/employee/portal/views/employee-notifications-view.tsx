"use client";

import { useState } from "react";
import {
  Bell,
  CheckCircle2,
  AlertOctagon,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  Filter,
} from "lucide-react";

interface EmployeeNotificationsViewProps {
  portalData: any;
  onNavigateTab: (tab: string, context?: any) => void;
  onRefresh: () => void;
}

export function EmployeeNotificationsView({
  portalData,
  onNavigateTab,
  onRefresh,
}: EmployeeNotificationsViewProps) {
  const { notifications = [] } = portalData;
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const filteredNotifications = notifications.filter((n: any) => {
    if (categoryFilter === "ALL") return true;
    return n.category === categoryFilter;
  });

  const handleAction = (item: any) => {
    if (item.actionUrl?.includes("MESSAGES") || item.actionUrl?.includes("thread=")) {
      const threadMatch = item.actionUrl.match(/thread=([^&]+)/);
      onNavigateTab("MESSAGES", { threadId: threadMatch ? threadMatch[1] : null });
    } else if (item.actionUrl?.includes("SUBMISSIONS")) {
      onNavigateTab("SUBMISSIONS");
    } else {
      onNavigateTab("MY_WORK");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--bos-border)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[var(--bos-text-primary)]">Notifications & Signals</h1>
            <span className="px-2 py-0.5 rounded-full bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs font-mono font-bold text-[var(--bos-accent)]">
              {notifications.length}
            </span>
          </div>
          <p className="text-xs font-mono text-[var(--bos-text-tertiary)] mt-1">
            Real Events Only · No Synthetic or Artificial Activity
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-[var(--bos-surface)] p-1 rounded-2xl border border-[var(--bos-border)] font-mono text-xs">
          {[
            { key: "ALL", label: "All Signals", count: notifications.length },
            { key: "NEEDS_ACTION", label: "Action Required", count: notifications.filter((n: any) => n.category === "NEEDS_ACTION").length },
            { key: "MILESTONE", label: "Milestones", count: notifications.filter((n: any) => n.category === "MILESTONE").length },
            { key: "INFORMATION", label: "Info", count: notifications.filter((n: any) => n.category === "INFORMATION").length },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setCategoryFilter(item.key)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-medium ${
                categoryFilter === item.key
                  ? "bg-[var(--bos-accent)] text-white font-bold"
                  : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
              }`}
            >
              <span>{item.label}</span>
              <span className="text-[10px] ml-1.5 opacity-75">({item.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-center space-y-2 font-mono">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <div className="text-sm font-bold text-[var(--bos-text-primary)]">No notifications</div>
          <p className="text-xs text-[var(--bos-text-tertiary)] max-w-sm mx-auto">
            You're completely caught up. All project events and messages have been acknowledged.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((item: any) => {
            const isAction = item.category === "NEEDS_ACTION";
            const isMilestone = item.category === "MILESTONE";

            return (
              <div
                key={item.id}
                className={`p-5 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isAction
                    ? "bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40"
                    : isMilestone
                    ? "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40"
                    : "bg-[var(--bos-surface-panel)] border-[var(--bos-border)] hover:border-[var(--bos-border-strong)]"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                      isAction
                        ? "bg-rose-500/10 text-rose-400"
                        : isMilestone
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-[var(--bos-accent)]/10 text-[var(--bos-accent)]"
                    }`}
                  >
                    {isAction ? (
                      <AlertOctagon className="w-4 h-4" />
                    ) : isMilestone ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <MessageSquare className="w-4 h-4" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[var(--bos-text-primary)]">{item.title}</span>
                      <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--bos-text-secondary)] leading-relaxed">
                      {item.whatChanged}
                    </p>

                    {item.whyItMatters && (
                      <div className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                        Context: {item.whyItMatters}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end shrink-0 font-mono text-xs">
                  <button
                    onClick={() => handleAction(item)}
                    className="px-4 py-2 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-primary)] font-bold hover:bg-[var(--bos-accent)] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>View</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
