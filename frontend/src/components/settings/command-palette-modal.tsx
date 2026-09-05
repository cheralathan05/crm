"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Shield, Zap, Sliders, ArrowRight, X, Lock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSetting: (key: string) => void;
  onNavigateTab: (tabId: string) => void;
}

export function CommandPaletteModal({
  isOpen,
  onClose,
  onSelectSetting,
  onNavigateTab,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      searchSettings("");
    } else {
      setQuery("");
    }
  }, [isOpen]);

  // Global keybinding Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Trigger open via parent
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const searchSettings = async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/settings/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.ok) {
        setResults(data.results || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (val: string) => {
    setQuery(val);
    searchSettings(val);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-[var(--bos-surface)] border border-[var(--bos-line)] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-[var(--bos-line)] gap-3 bg-[var(--bos-surface-subtle)]">
          <Search className="w-5 h-5 text-[var(--bos-text-muted)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Search settings, policies, integrations, permissions..."
            className="w-full bg-transparent text-[14px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-muted)] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => handleInputChange("")}
              className="text-[var(--bos-text-muted)] hover:text-[var(--bos-text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono uppercase bg-[var(--bos-surface)] border border-[var(--bos-line)] rounded text-[var(--bos-text-muted)]">
            ESC
          </kbd>
        </div>

        {/* Quick Navigation Shortcuts */}
        {!query && (
          <div className="p-3 border-b border-[var(--bos-line)] bg-[var(--bos-surface)]/50">
            <div className="text-[11px] font-medium text-[var(--bos-text-muted)] uppercase tracking-wider px-2 mb-2">
              Quick Controls
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Security & MFA", tab: "security", icon: Shield },
                { label: "Access & Roles", tab: "access", icon: Lock },
                { label: "Excel Data Hub", tab: "integrations", icon: Sliders },
                { label: "Automations", tab: "automations", icon: Zap },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.tab}
                    onClick={() => {
                      onNavigateTab(item.tab);
                      onClose();
                    }}
                    className="flex items-center gap-2 p-2 rounded-lg text-left text-[12px] font-medium text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface-subtle)] border border-transparent hover:border-[var(--bos-line)] transition"
                  >
                    <Icon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Search Results List */}
        <div className="max-h-96 overflow-y-auto divide-y divide-[var(--bos-line)] p-2">
          {loading ? (
            <div className="py-12 text-center text-[13px] text-[var(--bos-text-muted)]">
              Searching configuration registry...
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[13px] text-[var(--bos-text-secondary)] font-medium">
                No matching settings found
              </p>
              <p className="text-[11px] text-[var(--bos-text-muted)] mt-1">
                Search matches setting names, keys, descriptions, and affected modules.
              </p>
            </div>
          ) : (
            results.map((setting) => (
              <div
                key={setting.key}
                onClick={() => {
                  onSelectSetting(setting.key);
                  onClose();
                }}
                className="group flex items-start justify-between p-3 rounded-lg hover:bg-[var(--bos-surface-subtle)] cursor-pointer transition"
              >
                <div className="flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-[var(--bos-text-primary)] group-hover:text-blue-500 transition">
                      {setting.name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-[var(--bos-surface)] border border-[var(--bos-line)] text-[var(--bos-text-secondary)]">
                      {setting.category}
                    </span>
                    <span className="text-[11px] text-[var(--bos-text-muted)]">
                      Scope: <strong className="text-[var(--bos-text-secondary)]">{setting.scope}</strong>
                    </span>
                  </div>
                  <p className="text-[12px] text-[var(--bos-text-secondary)] mt-1 line-clamp-1">
                    {setting.description}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[var(--bos-text-muted)]">
                    <span>
                      Current:{" "}
                      <span className="font-mono text-[var(--bos-text-primary)] font-medium">
                        {String(setting.currentValue)}
                      </span>
                    </span>
                    <span>•</span>
                    <span>
                      Requires: <span className="font-medium">{setting.requiredPermission}</span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <ArrowRight className="w-4 h-4 text-[var(--bos-text-muted)] group-hover:text-blue-500 group-hover:translate-x-0.5 transition" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--bos-line)] bg-[var(--bos-surface-subtle)] text-[11px] text-[var(--bos-text-muted)]">
          <span>Search authoritative settings — not business records.</span>
          <span>Select to configure</span>
        </div>
      </div>
    </div>
  );
}
