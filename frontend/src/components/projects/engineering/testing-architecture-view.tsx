"use client";

import { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  Clock,
  Code2,
  Layers,
  ArrowRight,
  ListTodo,
  Sparkles,
  FileCheck2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type TestingArchitectureViewProps = {
  blueprint: any;
  tasks?: any[];
  onSelectTest?: (test: any) => void;
  onOpenTraceability?: (node: any) => void;
};

export function TestingArchitectureView({
  blueprint,
  tasks = [],
  onSelectTest,
  onOpenTraceability,
}: TestingArchitectureViewProps) {
  const [activeFilter, setActiveFilter] = useState<string>("ALL");

  let testSpecs = (blueprint?.testSpecifications || []) as Array<any>;

  if (testSpecs.length === 0) {
    return (
      <div className="p-8 text-center bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] rounded-2xl space-y-3">
        <ShieldCheck className="w-8 h-8 text-[var(--bos-text-tertiary)] mx-auto" />
        <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">Testing Specifications Not Generated</h3>
        <p className="text-[13px] text-[var(--bos-text-secondary)] max-w-md mx-auto">
          Generate an engineering blueprint to synthesize automated test specifications and client UAT verification criteria.
        </p>
      </div>
    );
  }

  // Filter test specs
  const filteredSpecs = testSpecs.filter((t) => {
    if (activeFilter === "ALL") return true;
    return t.testType === activeFilter;
  });

  // Calculate real metrics
  const passedCount = testSpecs.filter((t) => t.status === "PASSED").length;
  const pendingCount = testSpecs.filter((t) => t.status === "PENDING" || t.status === "PLANNED").length;
  const failingCount = testSpecs.filter((t) => t.status === "FAILING" || t.status === "BLOCKED").length;

  const testTypes = ["ALL", "API", "E2E", "UNIT", "INTEGRATION", "UAT"];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <section className="p-6 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4 shadow-xs">
        <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-[var(--bos-border-subtle)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-teal-500 font-bold">
                QUALITY ENGINEERING &amp; TESTING
              </span>
              <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                · {testSpecs.length} Automated Test Specifications
              </span>
            </div>
            <h2 className="text-[18px] font-bold text-[var(--bos-text-primary)] mt-0.5">
              Automated Verification, Integration Tests &amp; Client UAT
            </h2>
          </div>

          {/* Test Type Filter */}
          <div className="flex items-center gap-1 bg-[var(--bos-surface-sunken)] p-1 rounded-xl border border-[var(--bos-border-subtle)] overflow-x-auto">
            {testTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setActiveFilter(type)}
                className={cn(
                  "px-3 py-1 rounded-lg text-[11.5px] font-mono font-medium transition-all cursor-pointer",
                  activeFilter === type
                    ? "bg-[var(--bos-surface-panel)] text-[var(--bos-text-primary)] shadow-xs font-bold"
                    : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Real Status Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px] font-mono">
          <div className="p-3 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
            <span className="text-[var(--bos-text-tertiary)] block text-[10.5px]">TOTAL TEST SPECS</span>
            <strong className="text-[14px] text-[var(--bos-text-primary)]">{testSpecs.length}</strong>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
            <span className="text-[var(--bos-text-tertiary)] block text-[10.5px]">VERIFIED (PASSED)</span>
            <strong className="text-[14px] text-emerald-600">{passedCount}</strong>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
            <span className="text-[var(--bos-text-tertiary)] block text-[10.5px]">PLANNED / RUNNING</span>
            <strong className="text-[14px] text-amber-600">{pendingCount}</strong>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
            <span className="text-[var(--bos-text-tertiary)] block text-[10.5px]">FAILING / BLOCKED</span>
            <strong className="text-[14px] text-rose-600">{failingCount}</strong>
          </div>
        </div>
      </section>

      {/* Tests Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSpecs.map((t: any) => {
          let setupArr: string[] = [];
          let execArr: string[] = [];
          try {
            if (t.setupSteps) setupArr = JSON.parse(t.setupSteps);
          } catch {}
          try {
            if (t.executionSteps) execArr = JSON.parse(t.executionSteps);
          } catch {}

          // Find linked task if any
          const linkedTask = tasks.find(
            (task: any) =>
              task.testSpecificationId === t.id ||
              task.sourceRequirementId === t.requirementId ||
              task.title.toLowerCase().includes(t.name.toLowerCase())
          );

          return (
            <div
              key={t.id}
              onClick={() => {
                onSelectTest?.(t);
                onOpenTraceability?.({ type: "TEST", id: t.id, name: t.name });
              }}
              className="p-5 bg-[var(--bos-surface-panel)] hover:bg-[var(--bos-surface-panel)]/90 border border-[var(--bos-border-subtle)] hover:border-teal-500/50 rounded-2xl transition-all space-y-3 cursor-pointer group shadow-xs"
            >
              {/* Top Bar */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/10 text-teal-600 border border-teal-500/20">
                    {t.testType}
                  </span>
                  <h4 className="text-[14px] font-bold text-[var(--bos-text-primary)] group-hover:text-teal-500 transition-colors">
                    {t.name}
                  </h4>
                </div>
                <span className="font-mono text-[11px] text-[var(--bos-text-secondary)] font-semibold">
                  {t.requirementId || "REQ-APPROVED"}
                </span>
              </div>

              {/* Description */}
              <p className="text-[12.5px] text-[var(--bos-text-secondary)] leading-relaxed">
                {t.description}
              </p>

              {/* Expected Outcome */}
              <div className="p-3 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] space-y-1 font-mono text-[11px]">
                <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase font-semibold block">
                  Expected Outcome:
                </span>
                <p className="text-[var(--bos-text-primary)] font-sans text-[12px]">
                  {t.expectedOutcome || "HTTP 200 OK with correct response schema"}
                </p>
              </div>

              {/* Steps Preview */}
              {execArr.length > 0 && (
                <div className="space-y-1 font-mono text-[11px] text-[var(--bos-text-secondary)]">
                  <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase font-semibold block">
                    Execution Steps:
                  </span>
                  <ul className="space-y-0.5 list-disc list-inside">
                    {execArr.slice(0, 2).map((st, sIdx) => (
                      <li key={sIdx} className="truncate">{st}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Status & Linked Task */}
              <div className="pt-2 border-t border-[var(--bos-border-subtle)] flex items-center justify-between text-[11px] font-mono">
                <div className="flex items-center gap-1.5 text-[var(--bos-text-tertiary)]">
                  <ListTodo className="w-3 h-3 text-[var(--bos-accent)]" />
                  <span>Task: {linkedTask?.code || linkedTask?.title?.slice(0, 15) || "QA-VERIFY"}</span>
                </div>

                <span
                  className={cn(
                    "px-2 py-0.5 rounded font-semibold",
                    t.status === "PASSED"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : t.status === "RUNNING"
                      ? "bg-sky-500/10 text-sky-600"
                      : "bg-amber-500/10 text-amber-600"
                  )}
                >
                  {t.status}
                </span>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
