"use client";

import { useState } from "react";
import {
  GitBranch,
  Database,
  Server,
  Code2,
  Globe,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type DependencyEngineViewProps = {
  blueprint: any;
  onSelectNode?: (node: any) => void;
};

export function DependencyEngineView({ blueprint, onSelectNode }: DependencyEngineViewProps) {
  if (!blueprint) {
    return (
      <div className="p-8 text-center bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] rounded-2xl">
        <GitBranch className="w-8 h-8 text-[var(--bos-text-tertiary)] mx-auto mb-2" />
        <p className="text-[14px] font-bold text-[var(--bos-text-primary)]">No Active Engineering Blueprint</p>
      </div>
    );
  }

  const dependencies = (blueprint.dependencies || []) as Array<any>;
  const dbEntities = (blueprint.databaseEntities || []) as Array<any>;
  const apis = (blueprint.backendApis || []) as Array<any>;
  const frontendCaps = (blueprint.frontendCapabilities || []) as Array<any>;
  const tests = (blueprint.testSpecifications || []) as Array<any>;

  // Layers
  const layers = [
    {
      name: "1. DATABASE LAYER",
      count: dbEntities.length,
      icon: Database,
      color: "text-emerald-500",
      items: dbEntities.map((d) => ({ id: d.id, name: d.name, status: d.status, type: "DB" })),
    },
    {
      name: "2. BACKEND & DOMAIN LOGIC",
      count: blueprint.backendServices?.length || 1,
      icon: Server,
      color: "text-indigo-500",
      items: (blueprint.backendServices || []).map((s: any) => ({ id: s.id, name: s.name, status: s.status, type: "BE" })),
    },
    {
      name: "3. API CONTRACTS LAYER",
      count: apis.length,
      icon: Code2,
      color: "text-amber-500",
      items: apis.map((a) => ({ id: a.id, name: `${a.method} ${a.path}`, status: a.status, type: "API" })),
    },
    {
      name: "4. FRONTEND CAPABILITIES",
      count: frontendCaps.length,
      icon: Globe,
      color: "text-sky-500",
      items: frontendCaps.map((f) => ({ id: f.id, name: f.name, status: f.status, type: "FE" })),
    },
    {
      name: "5. TESTING & VERIFICATION",
      count: tests.length,
      icon: ShieldCheck,
      color: "text-teal-500",
      items: tests.map((t) => ({ id: t.id, name: t.name, status: t.status, type: "TEST" })),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="p-6 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-3 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-purple-500 font-bold">
            DEPENDENCY ENGINE
          </span>
          <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
            · Execution Cascade
          </span>
        </div>
        <h3 className="text-[16px] font-bold text-[var(--bos-text-primary)]">
          Database → Backend → API → Frontend → Testing → Client UAT
        </h3>
        <p className="text-[12.5px] text-[var(--bos-text-secondary)]">
          Enforces structural execution order. Upstream dependencies must be verified before downstream items can proceed.
        </p>
      </section>

      {/* Waterfall Flow */}
      <div className="space-y-4">
        {layers.map((layer, idx) => {
          const Icon = layer.icon;
          return (
            <div key={layer.name} className="space-y-2">
              <div className="p-4 bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--bos-border-subtle)]">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("w-4 h-4", layer.color)} />
                    <h4 className="text-[13.5px] font-mono font-bold text-[var(--bos-text-primary)]">
                      {layer.name}
                    </h4>
                  </div>
                  <span className="font-mono text-[11px] text-[var(--bos-text-secondary)]">
                    {layer.items.length} Elements
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {layer.items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onSelectNode?.({ type: item.type, id: item.id, name: item.name })}
                      className="px-3 py-1.5 rounded-lg bg-[var(--bos-surface-sunken)] hover:bg-[var(--bos-surface-sunken)]/80 border border-[var(--bos-border-subtle)] text-[11.5px] font-mono text-[var(--bos-text-primary)] flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {idx < layers.length - 1 && (
                <div className="flex justify-center py-1 text-[var(--bos-text-tertiary)]">
                  <ArrowDown className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
