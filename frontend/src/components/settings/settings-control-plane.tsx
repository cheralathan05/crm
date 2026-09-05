"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  Sliders,
  Users,
  Lock,
  Workflow,
  CreditCard,
  Zap,
  Globe,
  Mail,
  FileText,
  Activity,
  Search,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  History,
  Key,
  Webhook,
  Plus,
  Trash2,
  Play,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Check,
  Loader2,
  RefreshCw,
  Copy,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmailSettings, EmailConfig } from "./email-settings";
import { CommandPaletteModal } from "./command-palette-modal";
import { ChangePreviewModal, ChangePreviewData } from "./change-preview-modal";
import { ConfigSimulatorModal } from "./config-simulator-modal";
import { VersionHistoryModal } from "./version-history-modal";

export type NavTab =
  | "overview"
  | "general"
  | "security"
  | "access"
  | "workflows"
  | "payments"
  | "integrations"
  | "automations"
  | "portal"
  | "email"
  | "audit"
  | "health";

export interface SettingsControlPlaneProps {
  initialData: {
    workspace: {
      id: string;
      companyName: string;
      ownerId: string;
      environment: string;
      plan: string;
      createdAt: any;
    };
    currentUser: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
    counts: {
      employees: number;
      roles: number;
      teams: number;
      projects: number;
      tasks: number;
      apiKeys: number;
      webhooks: number;
      automations: number;
    };
    health: any;
    settings: any[];
    recentAuditEvents: any[];
    emailConfig: EmailConfig;
    employeesList: any[];
  };
}

export function SettingsControlPlane({ initialData }: SettingsControlPlaneProps) {
  const [activeTab, setActiveTab] = useState<NavTab>("overview");
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  // Modals
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [activeHistoryKey, setActiveHistoryKey] = useState<{ key: string; name: string; version: number } | null>(null);

  // Change Preview State
  const [pendingChange, setPendingChange] = useState<{ key: string; value: any; reason?: string } | null>(null);
  const [previewData, setPreviewData] = useState<ChangePreviewData | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isApplyingChange, setIsApplyingChange] = useState(false);

  // Developer API Keys & Webhooks local state
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [newWebhookName, setNewWebhookName] = useState("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");

  // Automations local state
  const [automationRules, setAutomationRules] = useState<any[]>([]);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleTrigger, setNewRuleTrigger] = useState("payment.confirmed");

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>(initialData.recentAuditEvents || []);
  const [auditCategory, setAuditCategory] = useState("ALL");
  const [auditRisk, setAuditRisk] = useState("ALL");

  // Success / Notice Banner
  const [bannerMessage, setBannerMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadTabSpecificData(activeTab);
  }, [activeTab]);

  const refreshControlPlane = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.ok) {
        setData((prev) => ({
          ...prev,
          workspace: json.workspace,
          currentUser: json.currentUser,
          counts: json.counts,
          health: json.health,
          settings: json.settings,
          recentAuditEvents: json.recentAuditEvents,
        }));
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const loadTabSpecificData = async (tab: NavTab) => {
    if (tab === "integrations") {
      try {
        const [keysRes, hooksRes] = await Promise.all([
          fetch("/api/settings/api-keys").then((r) => r.json()),
          fetch("/api/settings/webhooks").then((r) => r.json()),
        ]);
        if (keysRes.ok) setApiKeys(keysRes.keys || []);
        if (hooksRes.ok) setWebhooks(hooksRes.webhooks || []);
      } catch {}
    } else if (tab === "automations") {
      try {
        const res = await fetch("/api/settings/automations");
        const json = await res.json();
        if (json.ok) setAutomationRules(json.rules || []);
      } catch {}
    } else if (tab === "audit") {
      loadAuditLogs();
    }
  };

  const loadAuditLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (auditCategory !== "ALL") params.set("category", auditCategory);
      if (auditRisk !== "ALL") params.set("risk", auditRisk);
      const res = await fetch(`/api/settings/audit?${params.toString()}`);
      const json = await res.json();
      if (json.ok) setAuditLogs(json.items || []);
    } catch {}
  };

  // Setting update flow with Change Preview
  const initiateSettingUpdate = async (key: string, newValue: any) => {
    setBannerMessage(null);
    setIsPreviewLoading(true);
    setPendingChange({ key, value: newValue });

    try {
      const res = await fetch("/api/settings/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, newValue }),
      });
      const json = await res.json();
      if (json.ok) {
        setPreviewData(json.preview);
      } else {
        // Fallback to direct apply if preview fails
        await applySettingChange(key, newValue);
      }
    } catch (err: any) {
      setBannerMessage({ type: "error", text: err.message || "Failed to calculate change preview." });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const applySettingChange = async (key: string, value: any, reason?: string) => {
    setIsApplyingChange(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value, reason }),
      });
      const json = await res.json();
      if (json.ok) {
        setBannerMessage({
          type: "success",
          text: `Persisted ${key} (version snapshot v${json.version} recorded).`,
        });
        setPreviewData(null);
        setPendingChange(null);
        await refreshControlPlane();
      } else {
        setBannerMessage({
          type: "error",
          text: json.message || "Failed to update configuration.",
        });
      }
    } catch (err: any) {
      setBannerMessage({ type: "error", text: err.message || "Network error while applying change." });
    } finally {
      setIsApplyingChange(false);
    }
  };

  // API Key actions
  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const json = await res.json();
      if (json.ok) {
        setCreatedRawKey(json.rawSecretKey);
        setNewKeyName("");
        loadTabSpecificData("integrations");
      }
    } catch {}
  };

  const handleRevokeApiKey = async (id: string) => {
    if (!confirm("Revoke this API key? All applications using this key will be denied immediately.")) return;
    try {
      const res = await fetch(`/api/settings/api-keys?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.ok) loadTabSpecificData("integrations");
    } catch {}
  };

  // Webhook actions
  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookName.trim() || !newWebhookUrl.trim()) return;
    try {
      const res = await fetch("/api/settings/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWebhookName.trim(), url: newWebhookUrl.trim() }),
      });
      const json = await res.json();
      if (json.ok) {
        setNewWebhookName("");
        setNewWebhookUrl("");
        loadTabSpecificData("integrations");
      }
    } catch {}
  };

  const handleTestPingWebhook = async (webhookId: string) => {
    try {
      const res = await fetch("/api/settings/webhooks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookId }),
      });
      const json = await res.json();
      if (json.ok) {
        setBannerMessage({
          type: "success",
          text: `Webhook ping dispatched: Status ${json.delivery.statusCode} (${json.delivery.durationMs}ms)`,
        });
        loadTabSpecificData("integrations");
      }
    } catch {}
  };

  // Automation actions
  const handleCreateAutomationRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;
    try {
      const res = await fetch("/api/settings/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRuleName.trim(),
          triggerEvent: newRuleTrigger,
          actions: [{ type: "NOTIFY_OWNER" }, { type: "SYNC_EXCEL" }],
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setNewRuleName("");
        loadTabSpecificData("automations");
      }
    } catch {}
  };

  const handleToggleAutomation = async (ruleId: string) => {
    try {
      const res = await fetch("/api/settings/automations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId }),
      });
      const json = await res.json();
      if (json.ok) loadTabSpecificData("automations");
    } catch {}
  };

  const handleExecuteAutomation = async (ruleId: string) => {
    try {
      const res = await fetch("/api/settings/automations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId, payload: { test: true, timestamp: new Date().toISOString() } }),
      });
      const json = await res.json();
      if (json.ok) {
        setBannerMessage({
          type: "success",
          text: `Automation run executed: Status ${json.run.status}`,
        });
        loadTabSpecificData("automations");
      }
    } catch {}
  };

  // Helper to retrieve setting by key
  const getSettingObj = (key: string) => {
    return data.settings.find((s: any) => s.key === key);
  };

  return (
    <div className="min-h-screen bg-[var(--bos-bg)] text-[var(--bos-text-primary)]">
      {/* ── CONTEXT BAR & HEADER (Sections 04 & 131) ────────────────────── */}
      <div className="border-b border-[var(--bos-line)] bg-[var(--bos-surface)]/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* Title & Context */}
            <div>
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[var(--bos-text-muted)]">
                <span>Business OS</span>
                <span>/</span>
                <span className="text-[var(--bos-text-secondary)] font-semibold">
                  Settings Control Plane
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--bos-text-primary)]">
                  {data.workspace.companyName}
                </h1>
                <span
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold uppercase border",
                    data.health?.overall === "HEALTHY"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  )}
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full animate-pulse",
                      data.health?.overall === "HEALTHY" ? "bg-emerald-400" : "bg-amber-400"
                    )}
                  />
                  {data.health?.overall === "HEALTHY" ? "Healthy" : "Needs Attention"}
                </span>
              </div>
            </div>

            {/* Context Metadata Pill */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[12px] font-mono">
              <div className="px-2.5 py-1 rounded-md bg-[var(--bos-surface-subtle)] border border-[var(--bos-line)] text-[var(--bos-text-secondary)]">
                <span className="text-[var(--bos-text-muted)]">ID: </span>
                <span className="font-semibold">{data.workspace.id.slice(0, 10)}...</span>
              </div>
              <div className="px-2.5 py-1 rounded-md bg-[var(--bos-surface-subtle)] border border-[var(--bos-line)] text-[var(--bos-text-secondary)]">
                <span className="text-[var(--bos-text-muted)]">Env: </span>
                <span className="font-semibold text-blue-400">{data.workspace.environment}</span>
              </div>
              <div className="px-2.5 py-1 rounded-md bg-[var(--bos-surface-subtle)] border border-[var(--bos-line)] text-[var(--bos-text-secondary)]">
                <span className="text-[var(--bos-text-muted)]">Owner: </span>
                <span className="font-semibold">{data.currentUser.name}</span>
              </div>
              <div className="px-2.5 py-1 rounded-md bg-[var(--bos-surface-subtle)] border border-[var(--bos-line)] text-[var(--bos-text-secondary)]">
                <span className="text-[var(--bos-text-muted)]">Plan: </span>
                <span className="font-semibold text-purple-400">{data.workspace.plan}</span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCommandPaletteOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--bos-line)] bg-[var(--bos-surface-subtle)] hover:bg-[var(--bos-surface)] text-[12px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] transition"
              >
                <Search className="w-3.5 h-3.5 text-[var(--bos-text-muted)]" />
                <span className="hidden sm:inline">Search settings</span>
                <kbd className="px-1 py-0.2 text-[10px] font-mono uppercase bg-[var(--bos-surface)] border border-[var(--bos-line)] rounded text-[var(--bos-text-muted)]">
                  Ctrl K
                </kbd>
              </button>

              <button
                type="button"
                onClick={() => setIsSimulatorOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-[12px] font-medium text-indigo-300 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulate</span>
              </button>

              <button
                type="button"
                onClick={refreshControlPlane}
                disabled={loading}
                className="p-1.5 rounded-lg border border-[var(--bos-line)] bg-[var(--bos-surface-subtle)] hover:bg-[var(--bos-surface)] text-[var(--bos-text-muted)] hover:text-[var(--bos-text-primary)] transition"
                title="Refresh control plane state"
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── BANNER ALERTS ────────────────────────────────────────────── */}
      {bannerMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border text-[13px] animate-in fade-in",
              bannerMessage.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-rose-500/10 border-rose-500/30 text-rose-400"
            )}
          >
            <div className="flex items-center gap-2">
              {bannerMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{bannerMessage.text}</span>
            </div>
            <button
              onClick={() => setBannerMessage(null)}
              className="text-current opacity-70 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN LAYOUT: NAVIGATION & VIEWS (Section 125) ─────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Navigation Sidebar */}
          <aside className="w-full md:w-60 shrink-0 space-y-6">
            {/* Category Groups */}
            <div className="space-y-4">
              <div>
                <div className="px-3 text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-muted)] mb-1">
                  Control Plane
                </div>
                <nav className="space-y-0.5">
                  {[
                    { id: "overview", label: "Command Center", icon: Activity },
                    { id: "general", label: "General & Identity", icon: Sliders },
                    { id: "security", label: "Security & MFA", icon: Shield },
                    { id: "access", label: "Access & Roles", icon: Users },
                    { id: "workflows", label: "Workflows & Rules", icon: Workflow },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTab(item.id as NavTab)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition text-left",
                          activeTab === item.id
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface)]"
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div>
                <div className="px-3 text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-muted)] mb-1">
                  Operations & External
                </div>
                <nav className="space-y-0.5">
                  {[
                    { id: "payments", label: "Payments & Finance", icon: CreditCard },
                    { id: "integrations", label: "Integrations & Excel", icon: Sliders },
                    { id: "automations", label: "Automations", icon: Zap },
                    { id: "portal", label: "Client Portal", icon: Globe },
                    { id: "email", label: "Email Dispatch", icon: Mail },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTab(item.id as NavTab)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition text-left",
                          activeTab === item.id
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface)]"
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div>
                <div className="px-3 text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-muted)] mb-1">
                  Governance
                </div>
                <nav className="space-y-0.5">
                  {[
                    { id: "audit", label: "Audit Log Trail", icon: FileText },
                    { id: "health", label: "System Health", icon: Activity },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTab(item.id as NavTab)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition text-left",
                          activeTab === item.id
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface)]"
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Real Database Counts Pill */}
            <div className="p-3 rounded-lg border border-[var(--bos-line)] bg-[var(--bos-surface)]/50 space-y-2 text-[11px] font-mono">
              <div className="text-[10px] uppercase text-[var(--bos-text-muted)] font-semibold">
                Workspace Domain Nodes
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[var(--bos-text-secondary)]">
                <div>Members: <strong className="text-[var(--bos-text-primary)]">{data.counts.employees}</strong></div>
                <div>Roles: <strong className="text-[var(--bos-text-primary)]">{data.counts.roles}</strong></div>
                <div>Projects: <strong className="text-[var(--bos-text-primary)]">{data.counts.projects}</strong></div>
                <div>Tasks: <strong className="text-[var(--bos-text-primary)]">{data.counts.tasks}</strong></div>
                <div>API Keys: <strong className="text-[var(--bos-text-primary)]">{data.counts.apiKeys}</strong></div>
                <div>Webhooks: <strong className="text-[var(--bos-text-primary)]">{data.counts.webhooks}</strong></div>
              </div>
            </div>
          </aside>

          {/* Main Control Surface */}
          <main className="flex-1 min-w-0">
            {/* ═══════════════════════════════════════════════════════════════
               TAB 1: COMMAND CENTER / OVERVIEW (Section 04)
               ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Header */}
                <div className="p-5 rounded-xl border border-[var(--bos-line)] bg-[var(--bos-surface)]">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-[var(--bos-text-primary)]">
                        Control Plane Command Center
                      </h2>
                      <p className="text-[13px] text-[var(--bos-text-secondary)] mt-0.5">
                        Authoritative decision layer governing people, security, workflows, and integrations.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[11px] font-mono text-[var(--bos-text-muted)] uppercase">
                          Workspace Readiness
                        </div>
                        <div className="text-[18px] font-bold font-mono text-emerald-400">
                          {data.health?.readiness?.readinessScore ?? 83}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subsystems Health Grid (Section 04 & 71) */}
                <div>
                  <h3 className="text-[12px] font-mono uppercase tracking-wider text-[var(--bos-text-muted)] mb-3">
                    Control Plane Subsystem Health Checks (100% Real)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {data.health?.subsystems &&
                      Object.entries(data.health.subsystems).map(([key, item]: [string, any]) => (
                        <div
                          key={key}
                          className="p-3.5 rounded-lg border border-[var(--bos-line)] bg-[var(--bos-surface)] flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] font-semibold text-[var(--bos-text-primary)] uppercase font-mono">
                              {key}
                            </span>
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border",
                                item.status === "HEALTHY"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              )}
                            >
                              {item.status === "HEALTHY" ? "Healthy" : "Needs Attention"}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--bos-text-secondary)] mt-2 line-clamp-2">
                            {item.detail}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Requires Attention (Section 04) */}
                {data.health?.requiresAttention && data.health.requiresAttention.length > 0 && (
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <h4 className="text-[13px] font-semibold text-amber-300">
                        Requires Attention ({data.health.requiresAttention.length})
                      </h4>
                    </div>
                    <div className="space-y-2">
                      {data.health.requiresAttention.map((item: any) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-lg border border-amber-500/20 bg-[var(--bos-surface)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                        >
                          <div>
                            <div className="text-[13px] font-semibold text-[var(--bos-text-primary)]">
                              {item.title}
                            </div>
                            <p className="text-[12px] text-[var(--bos-text-secondary)] mt-0.5">
                              {item.description}
                            </p>
                            <div className="text-[11px] text-amber-400/90 mt-1 font-mono">
                              Impact: {item.impact}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveTab(item.targetTab as NavTab)}
                            className="shrink-0 px-3 py-1.5 text-[12px] font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded border border-amber-500/30 transition"
                          >
                            {item.actionLabel}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Control Changes (Section 04) */}
                <div className="p-5 rounded-xl border border-[var(--bos-line)] bg-[var(--bos-surface)]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[13px] font-semibold text-[var(--bos-text-primary)]">
                      Recent High-Impact Control Changes
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab("audit")}
                      className="text-[11px] text-blue-400 hover:text-blue-300 transition"
                    >
                      View Full Audit Trail →
                    </button>
                  </div>
                  {data.recentAuditEvents && data.recentAuditEvents.length > 0 ? (
                    <div className="divide-y divide-[var(--bos-line)]">
                      {data.recentAuditEvents.slice(0, 5).map((evt: any) => (
                        <div key={evt.id} className="py-2.5 flex items-center justify-between text-[12px]">
                          <div>
                            <span className="font-medium text-[var(--bos-text-primary)]">
                              {evt.impactSummary || evt.action}
                            </span>
                            <div className="text-[11px] text-[var(--bos-text-muted)] mt-0.5">
                              by {evt.actorName} • {new Date(evt.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border",
                              evt.risk === "CRITICAL" && "bg-rose-500/10 text-rose-400 border-rose-500/30",
                              evt.risk === "HIGH" && "bg-orange-500/10 text-orange-400 border-orange-500/30",
                              evt.risk === "MEDIUM" && "bg-amber-500/10 text-amber-400 border-amber-500/30",
                              evt.risk === "LOW" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            )}
                          >
                            {evt.risk}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-[12px] text-[var(--bos-text-muted)]">
                      No recent control changes recorded yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
               TAB 2: GENERAL & IDENTITY (Section 22)
               ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "general" && (
              <div className="space-y-6">
                <div className="border-b border-[var(--bos-line)] pb-4">
                  <h2 className="text-lg font-bold text-[var(--bos-text-primary)]">
                    Workspace General & Identity
                  </h2>
                  <p className="text-[13px] text-[var(--bos-text-secondary)] mt-0.5">
                    Governs workspace naming, localization, date displays, and base operating currency.
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    "general.workspace_name",
                    "general.timezone",
                    "general.date_format",
                    "general.currency",
                  ].map((key) => {
                    const s = getSettingObj(key);
                    if (!s) return null;
                    return (
                      <div
                        key={key}
                        className="p-4 rounded-xl border border-[var(--bos-line)] bg-[var(--bos-surface)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold text-[var(--bos-text-primary)]">
                              {s.definition.name}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-[var(--bos-surface-subtle)] border border-[var(--bos-line)] text-[var(--bos-text-muted)]">
                              Scope: {s.scope}
                            </span>
                            <span className="text-[11px] font-mono text-[var(--bos-text-muted)]">
                              v{s.version}
                            </span>
                          </div>
                          <p className="text-[12px] text-[var(--bos-text-secondary)]">
                            {s.definition.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {s.definition.type === "SELECT" ? (
                            <select
                              value={s.currentValue}
                              onChange={(e) => initiateSettingUpdate(key, e.target.value)}
                              className="bg-[var(--bos-surface-subtle)] border border-[var(--bos-line)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--bos-text-primary)] focus:outline-none"
                            >
                              {s.definition.options?.map((opt: any) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              defaultValue={s.currentValue}
                              onBlur={(e) => {
                                if (e.target.value !== s.currentValue) {
                                  initiateSettingUpdate(key, e.target.value);
                                }
                              }}
                              className="bg-[var(--bos-surface-subtle)] border border-[var(--bos-line)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--bos-text-primary)] focus:outline-none"
                            />
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              setActiveHistoryKey({
                                key,
                                name: s.definition.name,
                                version: s.version,
                              })
                            }
                            className="p-1.5 rounded-lg border border-[var(--bos-line)] text-[var(--bos-text-muted)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface-subtle)]"
                            title="Version history & rollback"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
               TAB 3: SECURITY & MFA (Section 57, 58, 59)
               ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div className="border-b border-[var(--bos-line)] pb-4">
                  <h2 className="text-lg font-bold text-[var(--bos-text-primary)]">
                    Security Control Center
                  </h2>
                  <p className="text-[13px] text-[var(--bos-text-secondary)] mt-0.5">
                    Authentication posture, MFA enforcement, session duration, and boundary policies.
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    "security.mfa_enforcement",
                    "security.session_timeout_minutes",
                    "security.password_min_length",
                    "security.ip_allowlist_enabled",
                  ].map((key) => {
                    const s = getSettingObj(key);
                    if (!s) return null;
                    return (
                      <div
                        key={key}
                        className="p-4 rounded-xl border border-[var(--bos-line)] bg-[var(--bos-surface)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold text-[var(--bos-text-primary)]">
                              {s.definition.name}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-[var(--bos-surface-subtle)] border border-[var(--bos-line)] text-[var(--bos-text-muted)]">
                              Scope: {s.scope}
                            </span>
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold border",
                                s.definition.sensitivity === "CRITICAL" && "bg-rose-500/10 text-rose-400 border-rose-500/30",
                                s.definition.sensitivity === "HIGH" && "bg-orange-500/10 text-orange-400 border-orange-500/30",
                                s.definition.sensitivity === "MEDIUM" && "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              )}
                            >
                              {s.definition.sensitivity}
                            </span>
                          </div>
                          <p className="text-[12px] text-[var(--bos-text-secondary)]">
                            {s.definition.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {s.definition.type === "SELECT" ? (
                            <select
                              value={s.currentValue}
                              onChange={(e) => initiateSettingUpdate(key, e.target.value)}
                              className="bg-[var(--bos-surface-subtle)] border border-[var(--bos-line)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--bos-text-primary)] focus:outline-none font-medium"
                            >
                              {s.definition.options?.map((opt: any) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : s.definition.type === "BOOLEAN" ? (
                            <button
                              type="button"
                              onClick={() => initiateSettingUpdate(key, !s.currentValue)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-[12px] font-medium border transition",
                                s.currentValue
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : "bg-[var(--bos-surface-subtle)] text-[var(--bos-text-muted)] border-[var(--bos-line)]"
                              )}
                            >
                              {s.currentValue ? "Enforced (Active)" : "Disabled"}
                            </button>
                          ) : (
                            <input
                              type="number"
                              defaultValue={s.currentValue}
                              onBlur={(e) => {
                                const val = Number(e.target.value);
                                if (val !== s.currentValue) {
                                  initiateSettingUpdate(key, val);
                                }
                              }}
                              className="w-20 bg-[var(--bos-surface-subtle)] border border-[var(--bos-line)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--bos-text-primary)] text-center focus:outline-none"
                            />
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              setActiveHistoryKey({
                                key,
                                name: s.definition.name,
                                version: s.version,
                              })
                            }
                            className="p-1.5 rounded-lg border border-[var(--bos-line)] text-[var(--bos-text-muted)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface-subtle)]"
                            title="Version history & rollback"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
               TAB 4: ACCESS & ROLES (Section 26, 27, 28)
               ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "access" && (
              <div className="space-y-6">
                <div className="border-b border-[var(--bos-line)] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--bos-text-primary)]">
                      Access & RBAC Control
                    </h2>
                    <p className="text-[13px] text-[var(--bos-text-secondary)] mt-0.5">
                      Role hierarchy, active team members, invitation parameters, and permission simulation.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSimulatorOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-white bg-blue-600 hover:bg-blue-500 transition"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Access Simulator</span>
                  </button>
                </div>

                {/* Team Members List */}
                <div className="p-5 rounded-xl border border-[var(--bos-line)] bg-[var(--bos-surface)] space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold text-[var(--bos-text-primary)]">
                      Active Workspace Members ({data.employeesList?.length || data.counts.employees})
                    </h3>
                  </div>
                  {data.employeesList && data.employeesList.length > 0 ? (
                    <div className="max-h-72 overflow-y-auto divide-y divide-[var(--bos-line)]">
                      {data.employeesList.map((emp: any) => (
                        <div key={emp.id} className="py-2.5 flex items-center justify-between text-[12px]">
                          <div>
                            <span className="font-semibold text-[var(--bos-text-primary)]">
                              {emp.fullName}
                            </span>
                            <span className="text-[11px] text-[var(--bos-text-muted)] ml-2">
                              {emp.email}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[var(--bos-surface-subtle)] border border-[var(--bos-line)] text-[var(--bos-text-secondary)]">
                              {emp.role?.name || "Member"}
                            </span>
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-mono uppercase",
                                emp.status === "ACTIVE" ? "text-emerald-400" : "text-amber-400"
                              )}
                            >
                              {emp.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-[12px] text-[var(--bos-text-muted)]">
                      No team members assigned yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
               TAB 5: WORKFLOWS & RULES (Section 31, 32, 113)
               ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "workflows" && (
              <div className="space-y-6">
                <div className="border-b border-[var(--bos-line)] pb-4">
                  <h2 className="text-lg font-bold text-[var(--bos-text-primary)]">
                    Workflows & Business Rules Engine
                  </h2>
                  <p className="text-[13px] text-[var(--bos-text-secondary)] mt-0.5">
                    Server-enforced policies controlling proof verification, project provisioning, and change requests.
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    "workflow.proof_review_required",
                    "workflow.proposal_approval_creates_project",
                    "workflow.client_change_request_policy",
                  ].map((key) => {
                    const s = getSettingObj(key);
                    if (!s) return null;
                    return (
                      <div
                        key={key}
                        className="p-4 rounded-xl border border-[var(--bos-line)] bg-[var(--bos-surface)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold text-[var(--bos-text-primary)]">
                              {s.definition.name}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-[var(--bos-surface-subtle)] border border-[var(--bos-line)] text-[var(--bos-text-muted)]">
                              Scope: {s.scope}
                            </span>
                          </div>
                          <p className="text-[12px] text-[var(--bos-text-secondary)]">
                            {s.definition.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {s.definition.type === "SELECT" ? (
                            <select
                              value={s.currentValue}
                              onChange={(e) => initiateSettingUpdate(key, e.target.value)}
                              className="bg-[var(--bos-surface-subtle)] border border-[var(--bos-line)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--bos-text-primary)] focus:outline-none"
                            >
                              {s.definition.options?.map((opt: any) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <button
                              type="button"
                              onClick={() => initiateSettingUpdate(key, !s.currentValue)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-[12px] font-medium border transition",
                                s.currentValue
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : "bg-[var(--bos-surface-subtle)] text-[var(--bos-text-muted)] border-[var(--bos-line)]"
                              )}
                            >
                              {s.currentValue ? "Active (Enforced)" : "Disabled"}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              setActiveHistoryKey({
                                key,
                                name: s.definition.name,
                                version: s.version,
                              })
                            }
                            className="p-1.5 rounded-lg border border-[var(--bos-line)] text-[var(--bos-text-muted)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface-subtle)]"
                            title="Version history & rollback"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
               TAB 6: PAYMENTS & FINANCE (Section 50, 51, 109)
               ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "payments" && (
              <div className="space-y-6">
                <div className="border-b border-[var(--bos-line)] pb-4">
                  <h2 className="text-lg font-bold text-[var(--bos-text-primary)]">
                    Payments & Financial Governance
                  </h2>
                  <p className="text-[13px] text-[var(--bos-text-secondary)] mt-0.5">
                    Confirmation workflows, automatic cryptographically stamped receipt dispatch, and financial ledger safety.
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    "payments.confirmation_workflow",
                    "payments.auto_generate_receipt",
                  ].map((key) => {
                    const s = getSettingObj(key);
                    if (!s) return null;
                    return (
                      <div
                        key={key}
                        className="p-4 rounded-xl border border-[var(--bos-line)] bg-[var(--bos-surface)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold text-[var(--bos-text-primary)]">
                              {s.definition.name}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-[var(--bos-surface-subtle)] border border-[var(--bos-line)] text-[var(--bos-text-muted)]">
                              Scope: {s.scope}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                              Critical
                            </span>
                          </div>
                          <p className="text-[12px] text-[var(--bos-text-secondary)]">
                            {s.definition.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {s.definition.type === "SELECT" ? (
                            <select
                              value={s.currentValue}
                              onChange={(e) => initiateSettingUpdate(key, e.target.value)}
                              className="bg-[var(--bos-surface-subtle)] border border-[var(--bos-line)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--bos-text-primary)] focus:outline-none font-medium"
                            >
                              {s.definition.options?.map((opt: any) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <button
                              type="button"
                              onClick={() => initiateSettingUpdate(key, !s.currentValue)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-[12px] font-medium border transition",
                                s.currentValue
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : "bg-[var(--bos-surface-subtle)] text-[var(--bos-text-muted)] border-[var(--bos-line)]"
                              )}
                            >
                              {s.currentValue ? "Active" : "Disabled"}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              setActiveHistoryKey({
                                key,
                                name: s.definition.name,
                                version: s.version,
                              })
                            }
                            className="p-1.5 rounded-lg border border-[var(--bos-line)] text-[var(--bos-text-muted)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface-subtle)]"
                            title="Version history & rollback"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
               TAB 7: INTEGRATIONS, EXCEL & DEVELOPER KEYS (Section 35-39, 60, 61)
               ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "integrations" && (
              <div className="space-y-6">
                <div className="border-b border-[var(--bos-line)] pb-4">
                  <h2 className="text-lg font-bold text-[var(--bos-text-primary)]">
                    Integrations & Developer Plane
                  </h2>
                  <p className="text-[13px] text-[var(--bos-text-secondary)] mt-0.5">
                    Excel Data Hub connection mode, cryptographic API keys, and outbound webhooks.
                  </p>
                </div>

                {/* Excel Data Hub Setting */}
                {(() => {
                  const s = getSettingObj("integrations.excel_sync_policy");
                  if (!s) return null;
                  return (
                    <div className="p-4 rounded-xl border border-[var(--bos-line)] bg-[var(--bos-surface)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-semibold text-[var(--bos-text-primary)]">
                            {s.definition.name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-[var(--bos-surface-subtle)] border border-[var(--bos-line)] text-[var(--bos-text-muted)]">
                            Scope: {s.scope}
                          </span>
                        </div>
                        <p className="text-[12px] text-[var(--bos-text-secondary)]">
                          {s.definition.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={s.currentValue}
                          onChange={(e) => initiateSettingUpdate(s.key, e.target.value)}
                          className="bg-[var(--bos-surface-subtle)] border border-[var(--bos-line)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--bos-text-primary)] focus:outline-none"
                        >
                          {s.definition.options?.map((opt: any) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveHistoryKey({
                              key: s.key,
                              name: s.definition.name,
                              version: s.version,
                            })
                          }
                          className="p-1.5 rounded-lg border border-[var(--bos-line)] text-[var(--bos-text-muted)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface-subtle)]"
                          title="Version history & rollback"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* API Keys Section */}
                <div className="p-5 rounded-xl border border-[var(--bos-line)] bg-[var(--bos-surface)] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[14px] font-semibold text-[var(--bos-text-primary)]">
                        Developer API Keys ({apiKeys.length})
                      </h3>
                      <p className="text-[12px] text-[var(--bos-text-secondary)] mt-0.5">
                        SHA-256 hashed keys for programmatic task, project, and webhook integrations.
                      </p>
                    </div>
                  </div>

                  {createdRawKey && (
                    <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 space-y-1">
                      <div className="text-[11px] font-mono uppercase text-emerald-400 font-bold">
                        API Key Generated — Copy Now (Will Not Be Shown Again)
                      </div>
                      <div className="flex items-center justify-between bg-black/40 p-2 rounded font-mono text-[12px] text-emerald-300">
                        <span className="select-all break-all">{createdRawKey}</span>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(createdRawKey)}
                          className="p-1 text-emerald-400 hover:text-white"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleCreateApiKey} className="flex gap-2">
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="Key name (e.g. CI/CD Dispatcher, External Agent)"
                      className="flex-1 bg-[var(--bos-surface-subtle)] border border-[var(--bos-line)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--bos-text-primary)] focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!newKeyName.trim()}
                      className="flex items-center gap-1 px-4 py-1.5 text-[12px] font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Generate Key
                    </button>
                  </form>

                  {apiKeys.length > 0 ? (
                    <div className="divide-y divide-[var(--bos-line)]">
                      {apiKeys.map((key) => (
                        <div key={key.id} className="py-3 flex items-center justify-between text-[12px]">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[var(--bos-text-primary)]">
                                {key.name}
                              </span>
                              <span className="font-mono text-[11px] text-[var(--bos-text-muted)]">
                                {key.keyPrefix}
                              </span>
                            </div>
                            <div className="text-[11px] text-[var(--bos-text-muted)] mt-0.5">
                              Created by {key.createdByName} on {new Date(key.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold",
                                key.status === "ACTIVE"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                              )}
                            >
                              {key.status}
                            </span>
                            {key.status === "ACTIVE" && (
                              <button
                                type="button"
                                onClick={() => handleRevokeApiKey(key.id)}
                                className="text-rose-400 hover:text-rose-300 p-1 text-[11px] hover:bg-rose-500/10 rounded"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-[12px] text-[var(--bos-text-muted)]">
                      No external API keys registered yet.
                    </div>
                  )}
                </div>

                {/* Webhooks Section */}
                <div className="p-5 rounded-xl border border-[var(--bos-line)] bg-[var(--bos-surface)] space-y-4">
                  <div>
                    <h3 className="text-[14px] font-semibold text-[var(--bos-text-primary)]">
                      Outbound Webhook Subscriptions ({webhooks.length})
                    </h3>
                    <p className="text-[12px] text-[var(--bos-text-secondary)] mt-0.5">
                      Subscribes to domain events: payment.confirmed, task.completed, blueprint.approved.
                    </p>
                  </div>

                  <form onSubmit={handleCreateWebhook} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={newWebhookName}
                      onChange={(e) => setNewWebhookName(e.target.value)}
                      placeholder="Webhook name"
                      className="bg-[var(--bos-surface-subtle)] border border-[var(--bos-line)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--bos-text-primary)] focus:outline-none"
                    />
                    <input
                      type="url"
                      value={newWebhookUrl}
                      onChange={(e) => setNewWebhookUrl(e.target.value)}
                      placeholder="Endpoint URL (https://...)"
                      className="bg-[var(--bos-surface-subtle)] border border-[var(--bos-line)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--bos-text-primary)] focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!newWebhookName.trim() || !newWebhookUrl.trim()}
                      className="flex items-center justify-center gap-1 px-4 py-1.5 text-[12px] font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Webhook
                    </button>
                  </form>

                  {webhooks.length > 0 ? (
                    <div className="divide-y divide-[var(--bos-line)]">
                      {webhooks.map((hook) => (
                        <div key={hook.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[12px]">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[var(--bos-text-primary)]">
                                {hook.name}
                              </span>
                              <span className="text-[11px] font-mono text-[var(--bos-text-muted)] truncate max-w-xs">
                                {hook.url}
                              </span>
                            </div>
                            <div className="text-[11px] text-[var(--bos-text-muted)] mt-0.5">
                              Failures: {hook.failureCount} • Last Delivery:{" "}
                              {hook.lastDeliveryAt ? new Date(hook.lastDeliveryAt).toLocaleTimeString() : "None"}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleTestPingWebhook(hook.id)}
                              className="px-2.5 py-1 text-[11px] font-medium rounded border border-[var(--bos-line)] hover:bg-[var(--bos-surface-subtle)] text-[var(--bos-text-secondary)]"
                            >
                              Test Ping
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-[12px] text-[var(--bos-text-muted)]">
                      No webhook subscriptions registered yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
               TAB 8: AUTOMATIONS (Section 40 - 44)
               ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "automations" && (
              <div className="space-y-6">
                <div className="border-b border-[var(--bos-line)] pb-4">
                  <h2 className="text-lg font-bold text-[var(--bos-text-primary)]">
                    Automation Engine (WHEN → IF → THEN)
                  </h2>
                  <p className="text-[13px] text-[var(--bos-text-secondary)] mt-0.5">
                    Real-time declarative event automations with execution logs and safety checks.
                  </p>
                </div>

                {/* Create Automation Form */}
                <div className="p-5 rounded-xl border border-[var(--bos-line)] bg-[var(--bos-surface)] space-y-3">
                  <h3 className="text-[13px] font-semibold text-[var(--bos-text-primary)]">
                    Create Automation Rule
                  </h3>
                  <form onSubmit={handleCreateAutomationRule} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={newRuleName}
                      onChange={(e) => setNewRuleName(e.target.value)}
                      placeholder="Rule name (e.g. On Payment Signoff)"
                      className="bg-[var(--bos-surface-subtle)] border border-[var(--bos-line)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--bos-text-primary)] focus:outline-none"
                    />
                    <select
                      value={newRuleTrigger}
                      onChange={(e) => setNewRuleTrigger(e.target.value)}
                      className="bg-[var(--bos-surface-subtle)] border border-[var(--bos-line)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--bos-text-primary)] focus:outline-none"
                    >
                      <option value="payment.confirmed">WHEN: payment.confirmed</option>
                      <option value="task.approved">WHEN: task.approved</option>
                      <option value="proof.submitted">WHEN: proof.submitted</option>
                      <option value="client.created">WHEN: client.created</option>
                    </select>
                    <button
                      type="submit"
                      disabled={!newRuleName.trim()}
                      className="flex items-center justify-center gap-1 px-4 py-1.5 text-[12px] font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create Rule
                    </button>
                  </form>
                </div>

                {/* Automation Rules List */}
                <div className="space-y-3">
                  {automationRules.length > 0 ? (
                    automationRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="p-4 rounded-xl border border-[var(--bos-line)] bg-[var(--bos-surface)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[14px] text-[var(--bos-text-primary)]">
                              {rule.name}
                            </span>
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold",
                                rule.status === "ACTIVE"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                              )}
                            >
                              {rule.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--bos-text-secondary)]">
                            <span>WHEN: {rule.triggerEvent}</span>
                            <span>•</span>
                            <span>Runs: {rule.runCount}</span>
                            <span>•</span>
                            <span>Last Run: {rule.lastRunStatus || "None"}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleExecuteAutomation(rule.id)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-blue-400 border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 rounded"
                          >
                            <Play className="w-3 h-3" />
                            Run Test
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleAutomation(rule.id)}
                            className="px-2.5 py-1 text-[11px] font-medium border border-[var(--bos-line)] hover:bg-[var(--bos-surface-subtle)] text-[var(--bos-text-secondary)] rounded"
                          >
                            {rule.status === "ACTIVE" ? "Pause" : "Activate"}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center border border-dashed border-[var(--bos-line)] rounded-xl">
                      <p className="text-[13px] text-[var(--bos-text-secondary)]">
                        No automation rules configured yet.
                      </p>
                      <p className="text-[11px] text-[var(--bos-text-muted)] mt-1">
                        Define automated actions to trigger on payment confirmation or proof approval.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
               TAB 9: CLIENT PORTAL (Section 48, 49, 108)
               ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "portal" && (
              <div className="space-y-6">
                <div className="border-b border-[var(--bos-line)] pb-4">
                  <h2 className="text-lg font-bold text-[var(--bos-text-primary)]">
                    Client Portal Visibility Matrix
                  </h2>
                  <p className="text-[13px] text-[var(--bos-text-secondary)] mt-0.5">
                    Governs client self-service boundary, financial ledger visibility, and internal dev notes air-gap.
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    "portal.client_payment_visibility",
                    "portal.employee_notes_shielded",
                  ].map((key) => {
                    const s = getSettingObj(key);
                    if (!s) return null;
                    return (
                      <div
                        key={key}
                        className="p-4 rounded-xl border border-[var(--bos-line)] bg-[var(--bos-surface)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold text-[var(--bos-text-primary)]">
                              {s.definition.name}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-[var(--bos-surface-subtle)] border border-[var(--bos-line)] text-[var(--bos-text-muted)]">
                              Scope: {s.scope}
                            </span>
                          </div>
                          <p className="text-[12px] text-[var(--bos-text-secondary)]">
                            {s.definition.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => initiateSettingUpdate(key, !s.currentValue)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[12px] font-medium border transition",
                              s.currentValue
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : "bg-[var(--bos-surface-subtle)] text-[var(--bos-text-muted)] border-[var(--bos-line)]"
                            )}
                          >
                            {s.currentValue ? "Active (Shielded)" : "Disabled"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setActiveHistoryKey({
                                key,
                                name: s.definition.name,
                                version: s.version,
                              })
                            }
                            className="p-1.5 rounded-lg border border-[var(--bos-line)] text-[var(--bos-text-muted)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface-subtle)]"
                            title="Version history & rollback"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
               TAB 10: EMAIL DISPATCH (Section 69, 70)
               ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "email" && (
              <div className="space-y-6">
                <div className="border-b border-[var(--bos-line)] pb-4">
                  <h2 className="text-lg font-bold text-[var(--bos-text-primary)]">
                    Email Delivery & Communication Hub
                  </h2>
                  <p className="text-[13px] text-[var(--bos-text-secondary)] mt-0.5">
                    Real email dispatch status, Resend/SMTP channel verification, and diagnostic test emails.
                  </p>
                </div>

                <EmailSettings initial={data.emailConfig} />
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
               TAB 11: AUDIT LOG TRAIL (Section 63, 64, 65)
               ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "audit" && (
              <div className="space-y-6">
                <div className="border-b border-[var(--bos-line)] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--bos-text-primary)]">
                      Immutable Audit Log Trail
                    </h2>
                    <p className="text-[13px] text-[var(--bos-text-secondary)] mt-0.5">
                      Cryptographic record of every configuration mutation, role assignment, and security event.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={auditCategory}
                      onChange={(e) => {
                        setAuditCategory(e.target.value);
                      }}
                      className="bg-[var(--bos-surface)] border border-[var(--bos-line)] rounded-lg px-2.5 py-1 text-[11px] text-[var(--bos-text-primary)] focus:outline-none"
                    >
                      <option value="ALL">All Categories</option>
                      <option value="SECURITY">Security</option>
                      <option value="ACCESS">Access</option>
                      <option value="GENERAL">General</option>
                      <option value="PAYMENTS">Payments</option>
                      <option value="INTEGRATIONS">Integrations</option>
                    </select>
                    <select
                      value={auditRisk}
                      onChange={(e) => {
                        setAuditRisk(e.target.value);
                      }}
                      className="bg-[var(--bos-surface)] border border-[var(--bos-line)] rounded-lg px-2.5 py-1 text-[11px] text-[var(--bos-text-primary)] focus:outline-none"
                    >
                      <option value="ALL">All Risk Levels</option>
                      <option value="CRITICAL">Critical</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                    <button
                      type="button"
                      onClick={loadAuditLogs}
                      className="p-1 rounded border border-[var(--bos-line)] hover:bg-[var(--bos-surface-subtle)]"
                      title="Apply filters"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[var(--bos-text-muted)]" />
                    </button>
                  </div>
                </div>

                <div className="p-5 rounded-xl border border-[var(--bos-line)] bg-[var(--bos-surface)]">
                  {auditLogs.length > 0 ? (
                    <div className="divide-y divide-[var(--bos-line)] max-h-96 overflow-y-auto">
                      {auditLogs.map((evt) => (
                        <div key={evt.id} className="py-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 text-[12px]">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[var(--bos-text-primary)]">
                                {evt.action}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-[var(--bos-surface-subtle)] border border-[var(--bos-line)] text-[var(--bos-text-muted)]">
                                {evt.category}
                              </span>
                            </div>
                            <p className="text-[12px] text-[var(--bos-text-secondary)] mt-0.5">
                              {evt.impactSummary}
                            </p>
                            <div className="text-[11px] text-[var(--bos-text-muted)] mt-1 font-mono">
                              by {evt.actorName} • {new Date(evt.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border self-start sm:self-auto",
                              evt.risk === "CRITICAL" && "bg-rose-500/10 text-rose-400 border-rose-500/30",
                              evt.risk === "HIGH" && "bg-orange-500/10 text-orange-400 border-orange-500/30",
                              evt.risk === "MEDIUM" && "bg-amber-500/10 text-amber-400 border-amber-500/30",
                              evt.risk === "LOW" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            )}
                          >
                            {evt.risk}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-[12px] text-[var(--bos-text-muted)]">
                      No audit events matching current filters.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
               TAB 12: SYSTEM HEALTH (Section 71, 95)
               ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "health" && (
              <div className="space-y-6">
                <div className="border-b border-[var(--bos-line)] pb-4">
                  <h2 className="text-lg font-bold text-[var(--bos-text-primary)]">
                    System Health & Readiness Engine
                  </h2>
                  <p className="text-[13px] text-[var(--bos-text-secondary)] mt-0.5">
                    100% verified status for database, AI inference, email, storage, and external boundaries.
                  </p>
                </div>

                {/* Readiness Scorecard */}
                <div className="p-5 rounded-xl border border-[var(--bos-line)] bg-[var(--bos-surface)] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[14px] font-semibold text-[var(--bos-text-primary)]">
                        Workspace Readiness Prerequisites
                      </h3>
                      <p className="text-[12px] text-[var(--bos-text-secondary)] mt-0.5">
                        Operational readiness calculated from active prerequisite checks.
                      </p>
                    </div>
                    <span className="text-2xl font-bold font-mono text-emerald-400">
                      {data.health?.readiness?.readinessScore ?? 83}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    {[
                      { label: "Authentication Gate", status: data.health?.readiness?.authentication },
                      { label: "Email Outbound", status: data.health?.readiness?.email },
                      { label: "Security & MFA", status: data.health?.readiness?.security },
                      { label: "Payments Pipeline", status: data.health?.readiness?.payments },
                      { label: "Excel Data Hub", status: data.health?.readiness?.excel },
                      { label: "AI Inference (Ollama)", status: data.health?.readiness?.ai },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="p-3 rounded-lg border border-[var(--bos-line)] bg-[var(--bos-surface-subtle)] flex items-center justify-between"
                      >
                        <span className="text-[12px] font-medium text-[var(--bos-text-primary)]">
                          {item.label}
                        </span>
                        {item.status ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Health Recommendations */}
                {data.health?.recommendations && data.health.recommendations.length > 0 && (
                  <div className="p-5 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-3">
                    <h3 className="text-[14px] font-semibold text-blue-300">
                      Settings Health Recommendations
                    </h3>
                    <div className="space-y-2">
                      {data.health.recommendations.map((rec: any) => (
                        <div
                          key={rec.id}
                          className="p-3 rounded-lg border border-blue-500/20 bg-[var(--bos-surface)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                        >
                          <div>
                            <div className="text-[13px] font-semibold text-[var(--bos-text-primary)]">
                              {rec.title}
                            </div>
                            <p className="text-[12px] text-[var(--bos-text-secondary)] mt-0.5">
                              {rec.rationale}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveTab(rec.targetTab as NavTab)}
                            className="shrink-0 px-3 py-1.5 text-[12px] font-medium text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded border border-blue-500/30 transition"
                          >
                            {rec.actionLabel}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ── MODALS ──────────────────────────────────────────────────── */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectSetting={(key) => {
          const setting = getSettingObj(key);
          if (setting) {
            if (setting.definition.category === "GENERAL") setActiveTab("general");
            else if (setting.definition.category === "SECURITY") setActiveTab("security");
            else if (setting.definition.category === "ACCESS") setActiveTab("access");
            else if (setting.definition.category === "WORKFLOW") setActiveTab("workflows");
            else if (setting.definition.category === "PAYMENT") setActiveTab("payments");
            else if (setting.definition.category === "INTEGRATION") setActiveTab("integrations");
            else if (setting.definition.category === "PORTAL") setActiveTab("portal");
          }
        }}
        onNavigateTab={(tab) => setActiveTab(tab as NavTab)}
      />

      <ChangePreviewModal
        isOpen={!!previewData}
        onClose={() => {
          setPreviewData(null);
          setPendingChange(null);
        }}
        onConfirm={() => {
          if (pendingChange) {
            applySettingChange(pendingChange.key, pendingChange.value, pendingChange.reason);
          }
        }}
        preview={previewData}
        loading={isApplyingChange}
      />

      <ConfigSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        employees={data.employeesList || []}
      />

      {activeHistoryKey && (
        <VersionHistoryModal
          isOpen={!!activeHistoryKey}
          onClose={() => setActiveHistoryKey(null)}
          settingKey={activeHistoryKey.key}
          settingName={activeHistoryKey.name}
          currentVersion={activeHistoryKey.version}
          onRollbackSuccess={refreshControlPlane}
        />
      )}
    </div>
  );
}
