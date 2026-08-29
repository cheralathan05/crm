"use client";

import { useState, useEffect } from "react";
import {
  FolderKanban,
  FileCode,
  Layers,
  ArrowRight,
  Sparkles,
  Server,
  Database,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductMapViewProps {
  projectId: string;
  onSelectFeature: (featureName: string) => void;
}

export function VisualProductMapView({ projectId, onSelectFeature }: ProductMapViewProps) {
  const [loading, setLoading] = useState(true);
  const [tree, setTree] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/employee/product/map?projectId=${projectId}`);
        const json = await res.json();
        if (json.ok) setTree(json.tree);
      } catch (err) {
        console.error("Error loading product map:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-3 font-mono text-xs text-[var(--bos-text-secondary)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)]" />
        <span>MAPPING PRODUCT ARCHITECTURE...</span>
      </div>
    );
  }

  if (!tree) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-150 font-sans max-w-5xl mx-auto">
      <div className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface-panel)] space-y-1">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-accent)] block">
          PRODUCT STRUCTURE
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--bos-text-primary)]">
          Visual Product Map
        </h1>
        <p className="text-xs text-[var(--bos-text-secondary)]">
          Inspect where your responsibility fits within the overall product hierarchy.
        </p>
      </div>

      {/* Visual Tree */}
      <div className="p-6 sm:p-8 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-6">
        {/* Root Product Node */}
        <div className="p-4 rounded-2xl bg-[var(--bos-surface-panel)] border-2 border-[var(--bos-accent)]/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--bos-accent)] text-white">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-[var(--bos-accent)] uppercase font-bold">PRODUCT ROOT</span>
              <h2 className="text-base font-bold text-[var(--bos-text-primary)]">{tree.name}</h2>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-[var(--bos-accent)]/10 text-[var(--bos-accent)] font-mono text-xs font-bold">
            {tree.areas?.length || 0} Areas
          </span>
        </div>

        {/* Tree Branches */}
        <div className="space-y-6 pl-4 border-l-2 border-[var(--bos-border)] ml-4">
          {tree.areas?.map((area: any) => (
            <div key={area.id} className="space-y-3">
              {/* Area Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[var(--bos-text-primary)]">
                    ├── {area.name}
                  </span>
                  {area.isEmployeeArea && (
                    <span className="px-2 py-0.5 rounded bg-[var(--bos-accent)] text-white font-mono text-[10px] font-bold uppercase tracking-wider animate-pulse">
                      ← YOUR AREA
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase">
                  {area.workstream}
                </span>
              </div>

              {/* Area Features */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
                {area.features?.map((feat: any) => (
                  <div
                    key={feat.id}
                    onClick={() => onSelectFeature(feat.name)}
                    className={cn(
                      "p-4 rounded-2xl border transition-all cursor-pointer text-xs space-y-1.5",
                      feat.isEmployeeFeature
                        ? "bg-[var(--bos-accent)]/10 border-[var(--bos-accent)] shadow-md"
                        : "bg-[var(--bos-surface-panel)] border-[var(--bos-border)] hover:border-[var(--bos-accent)]/40"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-[var(--bos-text-primary)]">{feat.name}</h4>
                      {feat.isEmployeeFeature && (
                        <span className="text-[10px] font-mono text-[var(--bos-accent)] font-bold">
                          YOUR FEATURE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--bos-text-secondary)] line-clamp-1">{feat.purpose}</p>
                    <div className="pt-1 flex items-center justify-between text-[10.5px] font-mono">
                      <span className="text-emerald-400 font-semibold">{feat.status}</span>
                      <span className="text-[var(--bos-text-tertiary)] flex items-center gap-1 group-hover:text-[var(--bos-text-primary)]">
                        Open Spec &rarr;
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
