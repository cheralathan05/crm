"use client";

import { useState, useEffect } from "react";
import {
  Play,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  Layers,
  Server,
  Database,
  Globe,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FeaturePageViewProps {
  projectId: string;
  featureName: string;
  onStartBuild: (featureName: string) => void;
  onBack: () => void;
}

export function FeaturePageView({
  projectId,
  featureName,
  onStartBuild,
  onBack,
}: FeaturePageViewProps) {
  const [loading, setLoading] = useState(true);
  const [feature, setFeature] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/employee/product/feature?projectId=${projectId}&name=${encodeURIComponent(featureName)}`);
        const json = await res.json();
        if (json.ok) setFeature(json.feature);
      } catch (err) {
        console.error("Error loading feature spec:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId, featureName]);

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-3 font-mono text-xs text-[var(--bos-text-secondary)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)]" />
        <span>LOADING FEATURE SPECIFICATION...</span>
      </div>
    );
  }

  if (!feature) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-150 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-xs font-mono text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] cursor-pointer"
        >
          &larr; Back to Overview
        </button>
        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-xs font-bold uppercase">
          {feature.status}
        </span>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface-panel)] space-y-6">
        <div className="space-y-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-accent)] block">
            FEATURE SPECIFICATION
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--bos-text-primary)]">
            {feature.featureName}
          </h1>
        </div>

        {/* WHAT & WHY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1">
            <span className="font-mono text-[10px] font-bold text-emerald-400 uppercase block">WHAT</span>
            <p className="text-[var(--bos-text-primary)] leading-relaxed">{feature.what}</p>
          </div>
          <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1">
            <span className="font-mono text-[10px] font-bold text-blue-400 uppercase block">WHY</span>
            <p className="text-[var(--bos-text-secondary)] leading-relaxed">{feature.why}</p>
          </div>
        </div>

        {/* WHO OWNS IT */}
        <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold text-purple-400 uppercase">WHO OWNS IT</span>
          <span className="font-semibold text-[var(--bos-text-primary)]">{feature.whoOwnsIt}</span>
        </div>

        {/* WHAT EXISTS */}
        <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-2 text-xs">
          <span className="font-mono text-[10px] font-bold text-[var(--bos-text-secondary)] uppercase block">WHAT EXISTS</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
            <div className="p-2.5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] flex items-center justify-between">
              <span>Design</span>
              <span className="text-emerald-400 font-bold">✓</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] flex items-center justify-between">
              <span>Backend</span>
              <span className="text-emerald-400 font-bold">✓</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] flex items-center justify-between">
              <span>API</span>
              <span className="text-emerald-400 font-bold">✓</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] flex items-center justify-between">
              <span>Database</span>
              <span className="text-emerald-400 font-bold">✓</span>
            </div>
          </div>
        </div>

        {/* WHAT YOU BUILD & EXPECTED RESULT */}
        <div className="p-5 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3 text-xs">
          <div>
            <span className="font-mono text-[10px] font-bold text-[var(--bos-accent)] uppercase block">WHAT YOU BUILD</span>
            <p className="text-sm font-bold text-[var(--bos-text-primary)] mt-0.5">{feature.whatYouBuild}</p>
          </div>
          <div>
            <span className="font-mono text-[10px] font-bold text-[var(--bos-text-secondary)] uppercase block">EXPECTED RESULT</span>
            <p className="text-xs text-[var(--bos-text-secondary)] leading-relaxed mt-0.5">{feature.expectedResult}</p>
          </div>
        </div>

        {/* DEPENDENCIES */}
        <div className="p-5 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-2 text-xs">
          <span className="font-mono text-[10px] font-bold text-purple-400 uppercase block">DEPENDENCIES</span>
          {feature.dependencies?.map((dep: any, idx: number) => (
            <div key={idx} className="p-2.5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] flex items-center justify-between">
              <span className="font-mono font-bold text-purple-400">{dep.name}</span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">✓ {dep.status}</span>
            </div>
          ))}
        </div>

        {/* START BUILD CTA */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={() => onStartBuild(feature.featureName)}
            className="px-8 py-3.5 bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Build Workspace</span>
          </button>
        </div>
      </div>
    </div>
  );
}
