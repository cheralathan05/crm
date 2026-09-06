"use client";

import { useState } from "react";
import {
  Layers,
  ChevronDown,
  ChevronRight,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  Ban,
  Clock,
  Code2,
  ExternalLink,
  Plus,
  Compass,
  FileCheck,
  Check,
  Building2,
  Users,
  Activity,
  Database,
  BarChart3,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  LiveProjectModel,
  ScopeTier,
  UserJourneyData,
  DecisionRecord,
} from "@/lib/discovery/discovery.types";

/* ────────────────────────────────────────────────────────────────────────────
   RIGHT PANEL — LIVE PROJECT MODEL (Rule 34: Live Project Understanding)
   15 Structured Sections:
   - What We're Building & Problem
   - Process Transformation (Today vs Future)
   - User Roles & Responsibilities
   - Customer Journey & Workflows (with inline step editing)
   - Capabilities Map (with REQ-001 Traceability)
   - Information & Records Managed
   - Business Rules & Logic
   - Reporting & Visibility
   - Existing Tools & Systems
   - Scope Radar (Core, Possible, Unknown, Out of Scope)
   - Fact vs Assumption Matrix
   - Open Decisions ("Decide Later" & "Needs Decision")
   - Requirement Changes & Contradictions
   ──────────────────────────────────────────────────────────────────────────── */

interface LiveProjectModelProps {
  model: LiveProjectModel;
  onToggleScope: (scopeItemId: string, targetTier: ScopeTier) => Promise<void>;
  onRecordDecision: (title: string, choice: string) => Promise<void>;
  onEditJourney: (journeyId: string, steps: string[]) => Promise<void>;
}

export function LiveProjectModelView({
  model,
  onToggleScope,
  onRecordDecision,
  onEditJourney,
}: LiveProjectModelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    building: true,
    transformation: true,
    journey: true,
    capabilities: true,
    information: true,
    rules: true,
    reporting: false,
    tools: false,
    scope: true,
    decisions: true,
    assumptions: false,
    contradictions: true,
  });

  const [editingJourneyId, setEditingJourneyId] = useState<string | null>(null);
  const [newStepText, setNewStepText] = useState("");

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const primaryJourney = model.journeys[0];

  return (
    <aside className="w-full h-full flex flex-col border-l border-[var(--bos-line)] bg-[var(--bos-surface)]/30 overflow-hidden select-none">
      {/* Panel Header */}
      <div className="px-4 py-3.5 border-b border-[var(--bos-line)] bg-[var(--bos-surface)]/50 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-primary)] font-semibold">
            Live Project Model
          </span>
        </div>

        <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--bos-accent)] font-medium">
          Synchronized
        </span>
      </div>

      {/* Expandable Model Cards Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* CARD 1: What We're Building */}
        <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection("building")}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-[var(--bos-surface)]/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
              <span className="text-[12px] font-semibold text-[var(--bos-text-primary)]">
                What We&apos;re Building
              </span>
            </div>
            {expandedSections["building"] ? <ChevronDown className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" />}
          </button>

          {expandedSections["building"] && (
            <div className="px-3.5 pb-3.5 pt-1 border-t border-[var(--bos-line)] space-y-2 text-[12px]">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] block">
                  Product Vision
                </span>
                <span className="font-medium text-[var(--bos-text-primary)]">
                  {model.whatWeAreBuilding.businessType || "Defining product vision..."}
                </span>
              </div>

              {model.whatWeAreBuilding.problemStatement && (
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] block">
                    Problem Being Solved
                  </span>
                  <span className="text-[var(--bos-text-secondary)]">
                    {model.whatWeAreBuilding.problemStatement}
                  </span>
                </div>
              )}

              {model.whatWeAreBuilding.coreGoal && (
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] block">
                    Core Objective
                  </span>
                  <span className="text-[var(--bos-text-secondary)]">
                    {model.whatWeAreBuilding.coreGoal}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CARD 2: Process Transformation (Today vs Future) */}
        {(model.processTransformation.todayProcess.length > 0 || model.processTransformation.futureProcess.length > 0) && (
          <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleSection("transformation")}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-[var(--bos-surface)]/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
                <span className="text-[12px] font-semibold text-[var(--bos-text-primary)]">
                  Current vs. Future Process
                </span>
              </div>
              {expandedSections["transformation"] ? <ChevronDown className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" />}
            </button>

            {expandedSections["transformation"] && (
              <div className="px-3.5 pb-3.5 pt-1 border-t border-[var(--bos-line)] grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div className="rounded-xs border border-rose-500/20 bg-rose-500/5 p-2.5 space-y-1">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-rose-600 font-semibold block">
                    Today&apos;s Process (Manual/Slow)
                  </span>
                  <ul className="space-y-1 text-[var(--bos-text-secondary)]">
                    {model.processTransformation.todayProcess.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="text-rose-500 font-bold">•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xs border border-emerald-500/20 bg-emerald-500/5 p-2.5 space-y-1">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-600 font-semibold block">
                    Future Automated Process
                  </span>
                  <ul className="space-y-1 text-[var(--bos-text-primary)]">
                    {model.processTransformation.futureProcess.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="text-emerald-500 font-bold">✓</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CARD 3: Customer Journey Pipeline */}
        {primaryJourney && (
          <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleSection("journey")}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-[var(--bos-surface)]/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Compass className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
                <span className="text-[12px] font-semibold text-[var(--bos-text-primary)]">
                  Customer Journey ({primaryJourney.roleName})
                </span>
              </div>
              {expandedSections["journey"] ? <ChevronDown className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" />}
            </button>

            {expandedSections["journey"] && (
              <div className="px-3.5 pb-3.5 pt-1 border-t border-[var(--bos-line)] space-y-2 text-[12px]">
                <div className="flex items-center justify-between text-[11px] text-[var(--bos-text-tertiary)]">
                  <span>Sequential Workflow Steps</span>
                  <button
                    type="button"
                    onClick={() => setEditingJourneyId(editingJourneyId ? null : primaryJourney.id)}
                    className="text-[var(--bos-accent)] hover:underline"
                  >
                    {editingJourneyId ? "Done editing" : "Edit steps"}
                  </button>
                </div>

                <div className="space-y-1">
                  {primaryJourney.steps.map((step, sIdx) => (
                    <div
                      key={sIdx}
                      className="flex items-center gap-2 p-1.5 rounded-sm bg-[var(--bos-surface)]/60 border border-[var(--bos-line)] text-[11px]"
                    >
                      <span className="w-4 h-4 rounded-full bg-[var(--bos-accent)]/10 text-[var(--bos-accent)] font-mono text-[9px] font-bold flex items-center justify-center shrink-0">
                        {sIdx + 1}
                      </span>
                      <span className="text-[var(--bos-text-primary)] font-medium flex-1">{step}</span>
                      {editingJourneyId && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = primaryJourney.steps.filter((_, idx) => idx !== sIdx);
                            void onEditJourney(primaryJourney.id, updated);
                          }}
                          className="text-[10px] text-rose-500 hover:text-rose-700 font-mono"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {editingJourneyId && (
                  <div className="pt-2 flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newStepText}
                      onChange={(e) => setNewStepText(e.target.value)}
                      placeholder="Add next step..."
                      className="flex-1 h-7 px-2 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[11px] text-[var(--bos-text-primary)] outline-none focus:border-[var(--bos-accent)]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newStepText.trim()) return;
                        const updated = [...primaryJourney.steps, newStepText.trim()];
                        void onEditJourney(primaryJourney.id, updated);
                        setNewStepText("");
                      }}
                      className="h-7 px-2.5 rounded-sm bg-[var(--bos-accent)] text-white text-[10px] font-medium"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* CARD 4: System Capabilities Map (with REQ Traceability) */}
        <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection("capabilities")}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-[var(--bos-surface)]/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
              <span className="text-[12px] font-semibold text-[var(--bos-text-primary)]">
                Capabilities Map ({model.capabilities.length})
              </span>
            </div>
            {expandedSections["capabilities"] ? <ChevronDown className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" />}
          </button>

          {expandedSections["capabilities"] && (
            <div className="px-3.5 pb-3.5 pt-1 border-t border-[var(--bos-line)] text-[12px] space-y-2">
              {model.capabilities.length > 0 ? (
                model.capabilities.map((cap, idx) => (
                  <div
                    key={cap.id}
                    className="p-2 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 flex items-start justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[9px] text-[var(--bos-accent)] font-semibold">
                          REQ-{String(idx + 1).padStart(3, "0")}
                        </span>
                        <span className="font-medium text-[var(--bos-text-primary)]">{cap.title}</span>
                        <span className="text-[9px] font-mono px-1 rounded-xs bg-[var(--bos-surface)] border border-[var(--bos-line)] text-[var(--bos-text-secondary)]">
                          {cap.roleName}
                        </span>
                      </div>
                      {cap.description && (
                        <p className="text-[11px] text-[var(--bos-text-secondary)] mt-0.5">
                          {cap.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[9px] font-mono px-1.5 py-0.5 rounded-sm shrink-0",
                        cap.status === "CONFIRMED"
                          ? "bg-emerald-500/10 text-emerald-600 font-semibold"
                          : "bg-amber-500/10 text-amber-600",
                      )}
                    >
                      {cap.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-[var(--bos-text-tertiary)] italic py-1">
                  Capabilities are discovered as you discuss features.
                </div>
              )}
            </div>
          )}
        </div>

        {/* CARD 5: Information & Records Managed (Rule 14) */}
        {model.informationRecords && model.informationRecords.length > 0 && (
          <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleSection("information")}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-[var(--bos-surface)]/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
                <span className="text-[12px] font-semibold text-[var(--bos-text-primary)]">
                  Information & Records ({model.informationRecords.length})
                </span>
              </div>
              {expandedSections["information"] ? <ChevronDown className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" />}
            </button>

            {expandedSections["information"] && (
              <div className="px-3.5 pb-3.5 pt-1 border-t border-[var(--bos-line)] space-y-1.5 text-[11px]">
                {model.informationRecords.map((info) => (
                  <div key={info.id} className="p-2 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40">
                    <div className="font-medium text-[var(--bos-text-primary)]">{info.name}</div>
                    <div className="text-[10px] text-[var(--bos-text-secondary)] mt-0.5">{info.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CARD 6: Business Rules & Logic (Rule 15) */}
        {model.businessRules.length > 0 && (
          <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleSection("rules")}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-[var(--bos-surface)]/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileCheck className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
                <span className="text-[12px] font-semibold text-[var(--bos-text-primary)]">
                  Business Rules ({model.businessRules.length})
                </span>
              </div>
              {expandedSections["rules"] ? <ChevronDown className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" />}
            </button>

            {expandedSections["rules"] && (
              <div className="px-3.5 pb-3.5 pt-1 border-t border-[var(--bos-line)] space-y-1.5 text-[11px]">
                {model.businessRules.map((br) => (
                  <div key={br.id} className="p-2 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40">
                    <div className="font-medium text-[var(--bos-text-primary)]">{br.rule}</div>
                    {br.condition && (
                      <div className="text-[10px] text-[var(--bos-text-tertiary)] mt-0.5">
                        Condition: {br.condition}
                      </div>
                    )}
                    {br.exceptionHandling && (
                      <div className="text-[10px] text-amber-600 mt-0.5">
                        Fallback: {br.exceptionHandling}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CARD 7: Scope Radar (Core, Possible, Unknown, Out of Scope) */}
        <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection("scope")}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-[var(--bos-surface)]/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
              <span className="text-[12px] font-semibold text-[var(--bos-text-primary)]">
                Scope Radar
              </span>
            </div>
            {expandedSections["scope"] ? <ChevronDown className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" />}
          </button>

          {expandedSections["scope"] && (
            <div className="px-3.5 pb-3.5 pt-1 border-t border-[var(--bos-line)] space-y-3 text-[12px]">
              {/* CORE */}
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-emerald-600 font-semibold">
                  <span>✓ Core Confirmed Scope ({model.scopeRadar.core.length})</span>
                </div>
                <div className="mt-1 space-y-1">
                  {model.scopeRadar.core.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-[11px] text-[var(--bos-text-primary)] py-0.5">
                      <span>• {item.title}</span>
                      <button
                        type="button"
                        onClick={() => void onToggleScope(item.id, "OUT_OF_SCOPE")}
                        className="text-[9px] text-[var(--bos-text-tertiary)] hover:text-rose-600"
                        title="Exclude from project"
                      >
                        Exclude
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* POSSIBLE (AI recommendations) */}
              {model.scopeRadar.possible.length > 0 && (
                <div className="pt-2 border-t border-[var(--bos-line)]">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-blue-600 font-semibold">
                    <span>✨ Possible Additions ({model.scopeRadar.possible.length})</span>
                  </div>
                  <div className="mt-1 space-y-1.5">
                    {model.scopeRadar.possible.map((item) => (
                      <div key={item.id} className="p-1.5 rounded-sm bg-blue-500/5 border border-blue-500/15 text-[11px] flex items-center justify-between gap-2">
                        <span className="text-[var(--bos-text-primary)]">{item.title}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void onToggleScope(item.id, "CORE")}
                            className="h-5 px-1.5 rounded-xs bg-[var(--bos-accent)] text-white text-[9px] font-medium"
                          >
                            Include
                          </button>
                          <button
                            type="button"
                            onClick={() => void onToggleScope(item.id, "OUT_OF_SCOPE")}
                            className="h-5 px-1.5 rounded-xs text-[9px] text-[var(--bos-text-tertiary)] hover:text-rose-600"
                          >
                            Exclude
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* OUT OF SCOPE */}
              {model.scopeRadar.outOfScope.length > 0 && (
                <div className="pt-2 border-t border-[var(--bos-line)]">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-rose-600 font-semibold">
                    <Ban className="w-3 h-3" />
                    <span>Out of Scope ({model.scopeRadar.outOfScope.length})</span>
                  </div>
                  <div className="mt-1 space-y-1">
                    {model.scopeRadar.outOfScope.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-[11px] text-[var(--bos-text-tertiary)] line-through py-0.5">
                        <span>• {item.title}</span>
                        <button
                          type="button"
                          onClick={() => void onToggleScope(item.id, "CORE")}
                          className="text-[9px] text-[var(--bos-accent)] hover:underline no-underline"
                        >
                          Re-include
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CARD 8: Open Decisions & Unknowns */}
        <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection("decisions")}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-[var(--bos-surface)]/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
              <span className="text-[12px] font-semibold text-[var(--bos-text-primary)]">
                Open Decisions ({model.openDecisions.length})
              </span>
            </div>
            {expandedSections["decisions"] ? <ChevronDown className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" />}
          </button>

          {expandedSections["decisions"] && (
            <div className="px-3.5 pb-3.5 pt-1 border-t border-[var(--bos-line)] text-[12px] space-y-2">
              {model.openDecisions.length > 0 ? (
                model.openDecisions.map((dec) => (
                  <div key={dec.id} className="p-2 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 text-[11px]">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium text-[var(--bos-text-primary)]">{dec.title}</span>
                      <span className="text-[9px] font-mono px-1 rounded-xs bg-[var(--bos-overlay)] text-[var(--bos-text-tertiary)]">
                        {dec.status}
                      </span>
                    </div>
                    {dec.reason && (
                      <p className="text-[10px] text-[var(--bos-text-secondary)] mt-0.5">{dec.reason}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-[var(--bos-text-tertiary)] italic py-1">
                  No blocking open decisions.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
