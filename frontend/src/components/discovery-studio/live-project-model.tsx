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
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  LiveProjectModel,
  ScopeTier,
  UserJourneyData,
  DecisionRecord,
} from "@/lib/discovery/discovery.types";

/* ────────────────────────────────────────────────────────────────────────────
   RIGHT PANEL — LIVE PROJECT MODEL (Screens 13, 14, 16, 17, 25, 27, 28, 30, 31, 38)
   The live-updating project knowledge graph that the client watches build
   in real time as they talk to the consultant.
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
    scope: true,
    decisions: true,
    assumptions: false,
    technical: false,
  });

  const [showTechBlueprint, setShowTechBlueprint] = useState(false);
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

        <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--bos-accent)]">
          Real-Time Sync
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
            {expandedSections["building"] ? <ChevronDown className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)] text-[var(--bos-text-tertiary)]" />}
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
                  Process Transformation
                </span>
              </div>
              {expandedSections["transformation"] ? <ChevronDown className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" />}
            </button>

            {expandedSections["transformation"] && (
              <div className="px-3.5 pb-3.5 pt-1 border-t border-[var(--bos-line)] text-[12px]">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-sm border border-rose-500/20 bg-rose-500/5 p-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-rose-600 font-semibold block mb-1">
                      Today (Current)
                    </span>
                    <ul className="space-y-1 text-[11px] text-[var(--bos-text-secondary)]">
                      {model.processTransformation.todayProcess.map((p, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span>•</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-sm border border-emerald-500/20 bg-emerald-500/5 p-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 font-semibold block mb-1">
                      Future (Proposed)
                    </span>
                    <ul className="space-y-1 text-[11px] text-[var(--bos-text-primary)] font-medium">
                      {model.processTransformation.futureProcess.map((p, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span>✓</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CARD 3: Customer Experience Journey */}
        <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection("journey")}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-[var(--bos-surface)]/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
              <span className="text-[12px] font-semibold text-[var(--bos-text-primary)]">
                Customer Experience Journey
              </span>
            </div>
            <div className="flex items-center gap-2">
              {primaryJourney?.isConfirmed && (
                <span className="text-[10px] font-mono text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-sm">
                  Confirmed
                </span>
              )}
              {expandedSections["journey"] ? <ChevronDown className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" />}
            </div>
          </button>

          {expandedSections["journey"] && (
            <div className="px-3.5 pb-3.5 pt-1 border-t border-[var(--bos-line)] text-[12px]">
              {primaryJourney && primaryJourney.steps.length > 0 ? (
                <div className="space-y-2">
                  <div className="space-y-1.5">
                    {primaryJourney.steps.map((step, sIdx) => (
                      <div
                        key={sIdx}
                        className="flex items-center gap-2 text-[12px] text-[var(--bos-text-primary)]"
                      >
                        <span className="w-4 h-4 rounded-full bg-[var(--bos-accent)]/15 text-[var(--bos-accent)] font-mono text-[10px] flex items-center justify-center shrink-0">
                          {sIdx + 1}
                        </span>
                        <span className="truncate">{step}</span>
                        {sIdx < primaryJourney.steps.length - 1 && (
                          <span className="text-[10px] text-[var(--bos-text-tertiary)] shrink-0">↓</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {editingJourneyId === primaryJourney.id ? (
                    <div className="mt-3 pt-2 border-t border-[var(--bos-line)] space-y-2">
                      <input
                        type="text"
                        value={newStepText}
                        onChange={(e) => setNewStepText(e.target.value)}
                        placeholder="Add step e.g. SMS Delivery Update"
                        className="w-full h-8 px-2.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] text-[12px] text-[var(--bos-text-primary)] outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (newStepText.trim()) {
                              void onEditJourney(primaryJourney.id, [...primaryJourney.steps, newStepText.trim()]);
                              setNewStepText("");
                              setEditingJourneyId(null);
                            }
                          }}
                          className="h-7 px-3 rounded-sm bg-[var(--bos-accent)] text-white text-[11px] font-medium hover:bg-[var(--bos-accent-hover)]"
                        >
                          Add Step
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingJourneyId(null)}
                          className="h-7 px-2 text-[11px] text-[var(--bos-text-secondary)]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingJourneyId(primaryJourney.id)}
                      className="mt-2 text-[11px] text-[var(--bos-accent)] hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Edit / Add Journey Step
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-[11px] text-[var(--bos-text-tertiary)] italic py-1">
                  Explaining the purchasing flow will model the journey here.
                </div>
              )}
            </div>
          )}
        </div>

        {/* CARD 4: System Capabilities */}
        <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection("capabilities")}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-[var(--bos-surface)]/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
              <span className="text-[12px] font-semibold text-[var(--bos-text-primary)]">
                System Capabilities Map ({model.capabilities.length})
              </span>
            </div>
            {expandedSections["capabilities"] ? <ChevronDown className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" />}
          </button>

          {expandedSections["capabilities"] && (
            <div className="px-3.5 pb-3.5 pt-1 border-t border-[var(--bos-line)] text-[12px] space-y-2">
              {model.capabilities.length > 0 ? (
                model.capabilities.map((cap) => (
                  <div
                    key={cap.id}
                    className="p-2 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 flex items-start justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
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

        {/* CARD 5: Scope Radar (Core, Possible, Unknown, Out of Scope) */}
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

              {/* OUT OF SCOPE (Screen 30: What are we NOT building?) */}
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

        {/* CARD 6: Open Decisions & Unknowns */}
        <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection("decisions")}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-[var(--bos-surface)]/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
              <span className="text-[12px] font-semibold text-[var(--bos-text-primary)]">
                Decisions ({model.openDecisions.length})
              </span>
            </div>
            {expandedSections["decisions"] ? <ChevronDown className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" />}
          </button>

          {expandedSections["decisions"] && (
            <div className="px-3.5 pb-3.5 pt-1 border-t border-[var(--bos-line)] space-y-2 text-[12px]">
              {model.openDecisions.map((dec) => (
                <div key={dec.id} className="p-2 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-medium text-[var(--bos-text-primary)] text-[12px]">{dec.title}</span>
                    <span className="text-[9px] font-mono text-[var(--bos-accent)] font-semibold">
                      {dec.status}
                    </span>
                  </div>
                  {dec.selectedOption ? (
                    <div className="text-[11px] text-emerald-600 font-medium">
                      Selected: {dec.selectedOption}
                    </div>
                  ) : (
                    <div className="pt-1 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void onRecordDecision(dec.title, "Confirmed in Staging")}
                        className="h-6 px-2 rounded-sm bg-[var(--bos-accent)] text-white text-[10px] font-medium"
                      >
                        Decide now
                      </button>
                      <button
                        type="button"
                        onClick={() => void onRecordDecision(dec.title, "UNDECIDED")}
                        className="h-6 px-2 rounded-sm border border-[var(--bos-line)] text-[10px] text-[var(--bos-text-secondary)]"
                      >
                        Leave for later
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Technical Blueprint Toggle (Screen 42) */}
        <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setShowTechBlueprint(!showTechBlueprint)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-[var(--bos-surface)]/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
              <span className="text-[12px] font-semibold text-[var(--bos-text-primary)]">
                Technical Architecture Preview
              </span>
            </div>
            <span className="text-[11px] text-[var(--bos-accent)] font-mono">
              {showTechBlueprint ? "Hide" : "View Blueprint"}
            </span>
          </button>

          {showTechBlueprint && (
            <div className="px-3.5 pb-3.5 pt-1 border-t border-[var(--bos-line)] space-y-2 text-[11px]">
              <div className="p-2.5 rounded-sm bg-[var(--bos-surface)]/80 border border-[var(--bos-line)] space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-[var(--bos-text-primary)]">Frontend:</span>
                  <span className="text-[var(--bos-text-secondary)]">Next.js 16 + Tailwind CSS (Responsive Client Storefront)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-[var(--bos-text-primary)]">Backend:</span>
                  <span className="text-[var(--bos-text-secondary)]">Node / TypeScript REST Services + Server Actions</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-[var(--bos-text-primary)]">Database:</span>
                  <span className="text-[var(--bos-text-secondary)]">Prisma ORM with SQLite (dev.db)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-[var(--bos-text-primary)]">External APIs:</span>
                  <span className="text-[var(--bos-text-secondary)]">Payment Gateway Webhooks + WhatsApp / Email Notifications</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
