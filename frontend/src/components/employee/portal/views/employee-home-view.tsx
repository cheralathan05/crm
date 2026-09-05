"use client";

import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  MessageSquare,
  Users,
  ShieldCheck,
  AlertOctagon,
  FileCheck2,
  CheckCircle,
  ExternalLink,
} from "lucide-react";

interface EmployeeHomeViewProps {
  portalData: any;
  onNavigateTab: (tab: string, context?: any) => void;
  onOpenSmartContact: (person: any, task: any) => void;
  onOpenBlockerModal: (task: any) => void;
}

export function EmployeeHomeView({
  portalData,
  onNavigateTab,
  onOpenSmartContact,
  onOpenBlockerModal,
}: EmployeeHomeViewProps) {
  const { employee, currentProject, myWorkToday, attentionItems = [], metrics, productContext } = portalData;

  const currentWork = myWorkToday?.currentWork;
  const dependency = currentWork?.dependency;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── 1. PRODUCT CONTEXT BEFORE WORK (Section 12 Master Spec) ──── */}
      <section className="relative overflow-hidden rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--bos-accent)]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-8">
          {/* Header Title & Role Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--bos-border)]">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)]">
                YOUR PROJECT
              </span>
              <h1 className="text-2xl font-bold text-[var(--bos-text-primary)]">
                {productContext?.projectName || currentProject?.name || "Client Delivery Platform"}
              </h1>
              <p className="text-xs font-mono text-[var(--bos-text-secondary)]">
                Client: {productContext?.clientName || currentProject?.clientName || "Approved Client"}
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-1 font-mono text-xs">
              <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase">YOUR ROLE & RESPONSIBILITY</span>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-[var(--bos-accent)]/10 border border-[var(--bos-accent)]/20 text-[var(--bos-accent)] font-bold">
                  {productContext?.yourRole || employee.role || "Developer"}
                </span>
                <span className="px-3 py-1 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-primary)] font-semibold">
                  {productContext?.yourResponsibility || "Product Experience"}
                </span>
              </div>
            </div>
          </div>

          {/* WHAT ARE WE BUILDING? */}
          <div className="p-6 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-2">
            <span className="text-[10px] font-mono uppercase font-bold text-[var(--bos-accent)] tracking-wider block">
              WHAT ARE WE BUILDING?
            </span>
            <p className="text-sm font-sans text-[var(--bos-text-primary)] leading-relaxed font-medium">
              {productContext?.whatAreWeBuilding || currentProject?.description || "Building approved client software platform."}
            </p>
          </div>

          {/* SCOPE & RESPONSIBILITIES BREAKDOWN */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
            {/* WHAT THE CLIENT APPROVED */}
            <div className="p-5 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3">
              <span className="text-[10px] uppercase font-bold text-[var(--bos-text-tertiary)] tracking-wider block">
                WHAT THE CLIENT APPROVED (MVP SCOPE)
              </span>
              <ul className="space-y-2">
                {(productContext?.whatClientApproved || ["Pages & content", "Contact forms", "Blog / news", "SEO"]).map(
                  (area: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-2 text-[var(--bos-text-primary)]">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-semibold">{area}</span>
                    </li>
                  ),
                )}
              </ul>
            </div>

            {/* WHAT YOU OWN */}
            <div className="p-5 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3">
              <span className="text-[10px] uppercase font-bold text-[var(--bos-accent)] tracking-wider block">
                WHAT YOU OWN ({employee.discipline})
              </span>
              {productContext?.whatYouOwn && productContext.whatYouOwn.length > 0 ? (
                <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {productContext.whatYouOwn.slice(0, 4).map((own: any, idx: number) => (
                    <li key={idx} className="space-y-0.5 border-b border-[var(--bos-border)]/50 pb-1.5 last:border-0">
                      <span className="text-[10px] text-[var(--bos-accent)] block uppercase font-bold">
                        {own.productArea}
                      </span>
                      <span className="text-xs text-[var(--bos-text-primary)] block font-medium truncate">
                        {own.title}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[var(--bos-text-tertiary)] italic">Awaiting technical allocations.</p>
              )}
            </div>

            {/* WHAT YOU DEPEND ON */}
            <div className="p-5 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
                WHAT YOU DEPEND ON
              </span>
              {productContext?.whatYouDependOn && productContext.whatYouDependOn.length > 0 ? (
                <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {productContext.whatYouDependOn.slice(0, 3).map((dep: any, idx: number) => (
                    <li key={idx} className="space-y-0.5 border-b border-[var(--bos-border)]/50 pb-1.5 last:border-0">
                      <span className="text-[10px] text-[var(--bos-text-secondary)] block truncate font-bold">
                        {dep.dependencyTitle}
                      </span>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-[var(--bos-text-tertiary)]">Owner: {dep.owner}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${dep.isReady ? "text-emerald-400" : "text-amber-400"}`}>
                          {dep.isReady ? "READY" : "IN PROGRESS"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[var(--bos-text-tertiary)] italic">No blocking dependencies.</p>
              )}
            </div>
          </div>

          {/* CURRENT PRODUCT POSITION & NEXT WORK */}
          <div className="p-6 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-accent)]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono">
            <div className="space-y-1">
              <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase font-bold block">
                CURRENT PRODUCT POSITION
              </span>
              <p className="text-sm font-bold text-[var(--bos-text-primary)]">
                {productContext?.currentProductPosition || "Active MVP Development"}
              </p>
              {currentWork && (
                <p className="text-xs text-[var(--bos-accent)] font-semibold">
                  YOUR NEXT WORK: {currentWork.code}: {currentWork.title}
                </p>
              )}
            </div>

            <button
              onClick={() => onNavigateTab("MY_WORK", { highlightTaskId: currentWork?.id })}
              className="px-6 py-3 rounded-2xl bg-[var(--bos-accent)] text-white text-xs font-mono font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[var(--bos-accent)]/20 shrink-0"
            >
              <span>[ START WORK ]</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── 2. HIGH SIGNAL ATTENTION ITEMS ──────────────────────── */}
      {attentionItems.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-[var(--bos-text-primary)]">
              High-Signal Attention ({attentionItems.length})
            </h3>
            <span className="text-xs font-mono text-[var(--bos-text-tertiary)]">Action Required</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {attentionItems.map((item: any) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] hover:border-[var(--bos-accent)]/40 transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    item.type === "BLOCKER"
                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      : item.type === "CHANGES_REQUESTED"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  }`}>
                    {item.type}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-[var(--bos-text-primary)] font-mono">{item.title}</h4>
                  <p className="text-xs text-[var(--bos-text-secondary)] mt-1 line-clamp-2">{item.description}</p>
                </div>

                <button
                  onClick={() => onNavigateTab(item.actionTab)}
                  className="text-xs font-mono text-[var(--bos-accent)] hover:underline font-bold flex items-center gap-1 cursor-pointer pt-1"
                >
                  <span>{item.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
