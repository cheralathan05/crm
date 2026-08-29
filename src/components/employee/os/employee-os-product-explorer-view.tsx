"use client";

import { useState } from "react";
import {
  Globe,
  Monitor,
  Tablet,
  Smartphone,
  Server,
  Database,
  Layers,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Code2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VisualPageSpec } from "@/lib/employees/employee-project-brief.service";

interface ProductExplorerProps {
  productMap: VisualPageSpec[];
  architectureConnections: any[];
  projectName: string;
  onSelectFeature?: (feature: VisualPageSpec) => void;
}

export function EmployeeOSProductExplorerView({
  productMap,
  architectureConnections,
  projectName,
  onSelectFeature,
}: ProductExplorerProps) {
  const [deviceFrame, setDeviceFrame] = useState<"DESKTOP" | "TABLET" | "MOBILE">("DESKTOP");
  const [selectedPage, setSelectedPage] = useState<VisualPageSpec>(productMap[0]);

  return (
    <div className="space-y-8 animate-in fade-in duration-200 font-sans">
      {/* Header & Device Switcher */}
      <div className="p-6 rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface-panel)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-accent)] block">
            VISUAL PRODUCT EXPLORER
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--bos-text-primary)]">
            Product Explorer
          </h1>
          <p className="text-xs text-[var(--bos-text-secondary)]">
            Inspect approved page layouts, interactive flows, and underlying technical connections.
          </p>
        </div>

        {/* Device Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] font-mono text-xs">
          <button
            onClick={() => setDeviceFrame("DESKTOP")}
            className={cn(
              "px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer",
              deviceFrame === "DESKTOP" ? "bg-[var(--bos-accent)] text-white font-bold shadow-xs" : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
            )}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Desktop</span>
          </button>
          <button
            onClick={() => setDeviceFrame("TABLET")}
            className={cn(
              "px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer",
              deviceFrame === "TABLET" ? "bg-[var(--bos-accent)] text-white font-bold shadow-xs" : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
            )}
          >
            <Tablet className="w-3.5 h-3.5" />
            <span>Tablet</span>
          </button>
          <button
            onClick={() => setDeviceFrame("MOBILE")}
            className={cn(
              "px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer",
              deviceFrame === "MOBILE" ? "bg-[var(--bos-accent)] text-white font-bold shadow-xs" : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
            )}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile</span>
          </button>
        </div>
      </div>

      {/* Main Split View: Page Selector + Preview Frame */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Page List */}
        <div className="lg:col-span-4 space-y-2.5">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-secondary)] block px-1">
            APPROVED PAGES ({productMap.length})
          </span>
          {productMap.map((page) => (
            <div
              key={page.id}
              onClick={() => setSelectedPage(page)}
              className={cn(
                "p-4 rounded-2xl border transition-all cursor-pointer text-xs space-y-1",
                selectedPage?.id === page.id
                  ? "bg-[var(--bos-surface)] border-[var(--bos-accent)] shadow-md"
                  : "bg-[var(--bos-surface-panel)] border-[var(--bos-border)] hover:border-[var(--bos-accent)]/50"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[var(--bos-text-primary)]">{page.name}</span>
                <span className="font-mono text-[10px] text-emerald-400">{page.route}</span>
              </div>
              <p className="text-[11px] text-[var(--bos-text-secondary)] line-clamp-1">{page.purpose}</p>
            </div>
          ))}
        </div>

        {/* Right Column: Visual Preview Canvas */}
        <div className="lg:col-span-8 space-y-4">
          <div
            className={cn(
              "mx-auto rounded-3xl border border-[var(--bos-border)] bg-[var(--bos-surface)] p-6 space-y-6 shadow-xl transition-all",
              deviceFrame === "DESKTOP" && "w-full",
              deviceFrame === "TABLET" && "max-w-xl",
              deviceFrame === "MOBILE" && "max-w-xs"
            )}
          >
            {/* Fake browser bar */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--bos-border)] text-[11px] font-mono text-[var(--bos-text-tertiary)]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/50" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
              </div>
              <span className="truncate max-w-[200px] text-[var(--bos-text-secondary)]">
                https://app.businessos.internal{selectedPage?.route}
              </span>
              <span className="text-[10px] font-bold text-[var(--bos-accent)] uppercase">
                SPEC PREVIEW
              </span>
            </div>

            {/* Spec Content Frame */}
            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-[var(--bos-text-primary)]">
                  {selectedPage?.name}
                </h2>
                <p className="text-xs text-[var(--bos-text-secondary)] leading-relaxed">
                  {selectedPage?.purpose}
                </p>
              </div>

              {/* Sections */}
              <div className="p-4 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] space-y-2">
                <span className="font-mono text-[10px] uppercase text-[var(--bos-text-secondary)] font-bold">
                  UI SECTIONS SPECIFIED
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPage?.mainSections.map((sec, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-[var(--bos-surface-subtle)] border border-[var(--bos-border)] font-mono text-[11px] text-[var(--bos-text-primary)]"
                    >
                      {sec}
                    </span>
                  ))}
                </div>
              </div>

              {/* Primary Action & States */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)]">
                  <span className="font-mono text-[10px] text-[var(--bos-text-secondary)] uppercase block">PRIMARY USER ACTION</span>
                  <span className="font-semibold text-emerald-400 mt-1 block">{selectedPage?.primaryAction}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)]">
                  <span className="font-mono text-[10px] text-[var(--bos-text-secondary)] uppercase block">DATA ATTRIBUTES</span>
                  <span className="text-[11px] text-[var(--bos-text-primary)] mt-1 block truncate">
                    {selectedPage?.dataShown.join(", ")}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                {onSelectFeature && (
                  <button
                    onClick={() => onSelectFeature(selectedPage)}
                    className="px-4 py-2 bg-[var(--bos-accent)] text-white text-xs font-mono font-bold uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Open Feature Specification</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
