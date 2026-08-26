"use client";

import { useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Code2,
  Copy,
  Database,
  DollarSign,
  Edit3,
  ExternalLink,
  Eye,
  FileCode2,
  FileEdit,
  FileText,
  Filter,
  Flame,
  FolderKanban,
  Globe,
  HardDrive,
  Key,
  Layers,
  Layout,
  LayoutGrid,
  List,
  Lock,
  MessageSquare,
  Milestone,
  MoreHorizontal,
  MoveRight,
  PieChart,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Send,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Table,
  Tag,
  Target,
  Terminal,
  TrendingUp,
  User,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type InteractiveProductPreviewProps = {
  projectName?: string;
  featureName?: string;
  featureDescription?: string;
  route?: string;
  layer?: string;
  tableName?: string;
  apiPath?: string;
  actions?: string[];
  components?: string[];
};

export function InteractiveProductPreview({
  projectName = "AI-Powered Business CRM Platform",
  featureName = "Workspace View",
  featureDescription = "High-fidelity interactive product workspace",
  route = "/workspace",
  layer = "FRONTEND",
  tableName = "records",
  apiPath = "/api/v1/records",
  actions = ["Create New", "Export Data", "Bulk Action"],
  components = ["DataTable", "FilterBar", "ActionModal"],
}: InteractiveProductPreviewProps) {
  const contextText = `${featureName} ${featureDescription} ${route} ${tableName}`.toLowerCase();

  let archetype: "CMS_PAGES" | "CRM_PIPELINE" | "DATABASE_SCHEMA" | "AUTH_SECURITY" | "ANALYTICS_DASHBOARD" | "AI_COPILOT" = "CRM_PIPELINE";

  if (contextText.includes("page") || contextText.includes("content") || contextText.includes("cms") || contextText.includes("blog") || contextText.includes("article")) {
    archetype = "CMS_PAGES";
  } else if (contextText.includes("database") || contextText.includes("schema") || contextText.includes("prisma") || contextText.includes("migration") || contextText.includes("model") || contextText.includes("entity") || contextText.includes("sql")) {
    archetype = "DATABASE_SCHEMA";
  } else if (contextText.includes("auth") || contextText.includes("security") || contextText.includes("role") || contextText.includes("token") || contextText.includes("session") || contextText.includes("permission") || contextText.includes("guard")) {
    archetype = "AUTH_SECURITY";
  } else if (contextText.includes("ai") || contextText.includes("copilot") || contextText.includes("prompt") || contextText.includes("automation") || contextText.includes("bot") || contextText.includes("agent")) {
    archetype = "AI_COPILOT";
  } else if (contextText.includes("analytics") || contextText.includes("dashboard") || contextText.includes("metric") || contextText.includes("report") || contextText.includes("chart")) {
    archetype = "ANALYTICS_DASHBOARD";
  }

  const [activeSubTab, setActiveSubTab] = useState<string>("MAIN");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="w-full rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] overflow-hidden shadow-inner font-sans text-xs">
      {/* ── Product App Top Navigation Bar ─────────────────────────── */}
      <div className="px-4 py-2.5 bg-[var(--bos-surface)] border-b border-[var(--bos-border)] flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[var(--bos-accent)] text-white font-bold font-mono tracking-tight text-[11px] shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>CRM OS</span>
          </div>

          <div className="h-4 w-[1px] bg-[var(--bos-border)]" />

          {/* Sub Navigation Links */}
          <div className="flex items-center gap-1 font-medium text-[11.5px]">
            <button
              onClick={() => setActiveSubTab("MAIN")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                activeSubTab === "MAIN"
                  ? "bg-[var(--bos-surface-subtle)] text-[var(--bos-text-primary)] font-semibold border border-[var(--bos-border)]"
                  : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
              )}
            >
              Live Workspace
            </button>
            <button
              onClick={() => setActiveSubTab("ANALYTICS")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1",
                activeSubTab === "ANALYTICS"
                  ? "bg-[var(--bos-surface-subtle)] text-[var(--bos-text-primary)] font-semibold border border-[var(--bos-border)]"
                  : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
              )}
            >
              <BarChart3 className="w-3 h-3 text-[var(--bos-accent)]" />
              Insights
            </button>
            <button
              onClick={() => setActiveSubTab("AUTOMATION")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1",
                activeSubTab === "AUTOMATION"
                  ? "bg-[var(--bos-surface-subtle)] text-[var(--bos-text-primary)] font-semibold border border-[var(--bos-border)]"
                  : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
              )}
            >
              <Zap className="w-3 h-3 text-amber-500" />
              AI Automation
            </button>
          </div>
        </div>

        {/* Global Search & User Profile */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] text-[11px] text-[var(--bos-text-secondary)]">
            <Search className="w-3 h-3" />
            <input
              type="text"
              placeholder={`Search ${featureName.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-[var(--bos-text-primary)] placeholder-[var(--bos-text-tertiary)] focus:outline-hidden w-28 sm:w-36 text-[11px]"
            />
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)]">
            <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[9px] font-bold text-white">
              A
            </div>
            <span className="text-[11px] font-semibold text-[var(--bos-text-primary)] hidden sm:inline">Admin User</span>
          </div>
        </div>
      </div>

      {/* ── SubTab 1: Main Product Archetype Screen ─────────────────── */}
      {activeSubTab === "MAIN" && (
        <div className="p-4 sm:p-6 space-y-5">
          {archetype === "CMS_PAGES" && <CmsPagesView featureName={featureName} featureDescription={featureDescription} />}
          {archetype === "CRM_PIPELINE" && <CrmPipelineView featureName={featureName} featureDescription={featureDescription} />}
          {archetype === "DATABASE_SCHEMA" && <DatabaseSchemaView featureName={featureName} featureDescription={featureDescription} tableName={tableName} />}
          {archetype === "AUTH_SECURITY" && <AuthSecurityView featureName={featureName} featureDescription={featureDescription} />}
          {archetype === "AI_COPILOT" && <AiCopilotView featureName={featureName} featureDescription={featureDescription} />}
          {archetype === "ANALYTICS_DASHBOARD" && <AnalyticsDashboardView featureName={featureName} featureDescription={featureDescription} />}
        </div>
      )}

      {/* ── SubTab 2: Analytics & Insights ──────────────────────────── */}
      {activeSubTab === "ANALYTICS" && (
        <div className="p-4 sm:p-6 space-y-5">
          <AnalyticsDashboardView featureName={featureName} featureDescription="Real-time performance metrics and velocity telemetry" />
        </div>
      )}

      {/* ── SubTab 3: AI Automation ─────────────────────────────────── */}
      {activeSubTab === "AUTOMATION" && (
        <div className="p-4 sm:p-6 space-y-5">
          <AiCopilotView featureName={featureName} featureDescription="Automated triggers, lead enrichment, and copilot agent actions" />
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   1. CMS PAGES & CONTENT WORKSPACE ARCHETYPE
   ═════════════════════════════════════════════════════════════════════ */
function CmsPagesView({ featureName, featureDescription }: { featureName: string; featureDescription: string }) {
  const [selectedPageId, setSelectedPageId] = useState("page-1");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PUBLISHED" | "DRAFT">("ALL");

  const mockPages = [
    {
      id: "page-1",
      title: "Landing Page Hero & Product Tour",
      slug: "/overview",
      status: "PUBLISHED",
      author: "Chera A.",
      seoScore: 96,
      views: "14,250",
      updated: "10 mins ago",
      blocks: 6,
    },
    {
      id: "page-2",
      title: "Enterprise Solutions & Integrations",
      slug: "/solutions/enterprise",
      status: "PUBLISHED",
      author: "Alex Morgan",
      seoScore: 92,
      views: "8,940",
      updated: "2 hours ago",
      blocks: 8,
    },
    {
      id: "page-3",
      title: "Pricing Tiers & Custom Deal Configurator",
      slug: "/pricing",
      status: "DRAFT",
      author: "Chera A.",
      seoScore: 88,
      views: "1,120",
      updated: "Yesterday",
      blocks: 5,
    },
    {
      id: "page-4",
      title: "Customer Case Studies — Fintech & AI CRM",
      slug: "/case-studies",
      status: "PUBLISHED",
      author: "Elena Rostova",
      seoScore: 94,
      views: "5,680",
      updated: "3 days ago",
      blocks: 11,
    },
  ];

  const filteredPages = mockPages.filter((p) => {
    if (statusFilter === "ALL") return true;
    return p.status === statusFilter;
  });

  const activePage = mockPages.find((p) => p.id === selectedPageId) || mockPages[0];

  return (
    <div className="space-y-4">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1">
          <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase font-semibold">Published Pages</span>
          <div className="text-[18px] font-bold font-mono text-[var(--bos-text-primary)]">18 <span className="text-emerald-500 text-[11px] font-normal">+3 this week</span></div>
        </div>
        <div className="p-3 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1">
          <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase font-semibold">Avg SEO Health</span>
          <div className="text-[18px] font-bold font-mono text-emerald-500">94 / 100</div>
        </div>
        <div className="p-3 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1">
          <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase font-semibold">Total Pageviews</span>
          <div className="text-[18px] font-bold font-mono text-[var(--bos-text-primary)]">148.2k</div>
        </div>
        <div className="p-3 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1">
          <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase font-semibold">Draft Revisions</span>
          <div className="text-[18px] font-bold font-mono text-amber-500">4 in review</div>
        </div>
      </div>

      {/* Main CMS Layout (Split List + Live Block Editor) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Pages List */}
        <div className="lg:col-span-5 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[13px] text-[var(--bos-text-primary)] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
              <span>Pages & Content Hierarchy</span>
            </h3>
            <button className="px-2.5 py-1 bg-[var(--bos-accent)] hover:brightness-110 text-white font-semibold rounded-lg text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-xs">
              <Plus className="w-3 h-3" /> New Page
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 font-mono text-[10.5px]">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={cn("px-2 py-0.5 rounded cursor-pointer", statusFilter === "ALL" ? "bg-[var(--bos-accent)] text-white font-bold" : "text-[var(--bos-text-secondary)] hover:bg-[var(--bos-bg)]")}
            >
              All ({mockPages.length})
            </button>
            <button
              onClick={() => setStatusFilter("PUBLISHED")}
              className={cn("px-2 py-0.5 rounded cursor-pointer", statusFilter === "PUBLISHED" ? "bg-emerald-600 text-white font-bold" : "text-[var(--bos-text-secondary)] hover:bg-[var(--bos-bg)]")}
            >
              Published (3)
            </button>
            <button
              onClick={() => setStatusFilter("DRAFT")}
              className={cn("px-2 py-0.5 rounded cursor-pointer", statusFilter === "DRAFT" ? "bg-amber-600 text-white font-bold" : "text-[var(--bos-text-secondary)] hover:bg-[var(--bos-bg)]")}
            >
              Drafts (1)
            </button>
          </div>

          <div className="space-y-2 pt-1">
            {filteredPages.map((page) => (
              <div
                key={page.id}
                onClick={() => setSelectedPageId(page.id)}
                className={cn(
                  "p-3 rounded-lg border transition-all cursor-pointer space-y-1.5",
                  selectedPageId === page.id
                    ? "bg-[var(--bos-accent)]/10 border-[var(--bos-accent)] shadow-xs"
                    : "bg-[var(--bos-bg)] border-[var(--bos-border)] hover:border-[var(--bos-accent)]/50"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[12.5px] text-[var(--bos-text-primary)] truncate">{page.title}</span>
                  <span className={cn("text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border", page.status === "PUBLISHED" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/25" : "bg-amber-500/10 text-amber-600 border-amber-500/25")}>
                    {page.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[var(--bos-text-secondary)] font-mono">
                  <span className="text-[var(--bos-accent)]">{page.slug}</span>
                  <span>{page.views} views</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Live Visual Block Inspector */}
        <div className="lg:col-span-7 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--bos-border)] flex-wrap gap-2">
            <div>
              <div className="text-[10px] font-mono text-[var(--bos-accent)] uppercase font-semibold">Active Document Editor</div>
              <h2 className="text-[15px] font-bold text-[var(--bos-text-primary)]">{activePage.title}</h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold">
                SEO Score {activePage.seoScore}/100
              </span>
              <button className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] shadow-xs cursor-pointer">
                Publish Changes
              </button>
            </div>
          </div>

          {/* Visual Block Stack */}
          <div className="space-y-2.5">
            <span className="text-[10.5px] font-mono uppercase font-bold text-[var(--bos-text-secondary)]">Content Component Tree</span>

            <div className="p-3 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-sky-500/10 text-sky-600 flex items-center justify-center font-mono font-bold text-[10px]">1</div>
                <div>
                  <div className="font-bold text-[12px] text-[var(--bos-text-primary)]">HeroBannerComponent</div>
                  <div className="text-[11px] text-[var(--bos-text-secondary)]">Headline: &quot;Scale Your B2B Operations with Antigravity CRM&quot;</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-emerald-600 font-bold">LIVE</span>
            </div>

            <div className="p-3 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-sky-500/10 text-sky-600 flex items-center justify-center font-mono font-bold text-[10px]">2</div>
                <div>
                  <div className="font-bold text-[12px] text-[var(--bos-text-primary)]">FeatureGridComponent</div>
                  <div className="text-[11px] text-[var(--bos-text-secondary)]">3 Columns: Pipeline Analytics, AI Lead Scoring, Contract Engine</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-emerald-600 font-bold">LIVE</span>
            </div>

            <div className="p-3 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-sky-500/10 text-sky-600 flex items-center justify-center font-mono font-bold text-[10px]">3</div>
                <div>
                  <div className="font-bold text-[12px] text-[var(--bos-text-primary)]">InteractivePricingCalculator</div>
                  <div className="text-[11px] text-[var(--bos-text-secondary)]">Dynamic seat slider + annual discount 20% toggle</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-amber-600 font-bold">MODIFIED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   2. CRM PIPELINE & DEAL ENGINE ARCHETYPE
   ═════════════════════════════════════════════════════════════════════ */
function CrmPipelineView({ featureName, featureDescription }: { featureName: string; featureDescription: string }) {
  const stages = [
    {
      id: "stage-1",
      name: "Qualified Lead",
      totalValue: "$145,000",
      color: "border-sky-500/50 text-sky-600",
      deals: [
        { id: "DL-101", company: "Apex Horizon Tech", value: "$45,000", contact: "David Vance", aiScore: "94% Win Prob", next: "Send Security Docs" },
        { id: "DL-102", company: "Sovereign Health", value: "$100,000", contact: "Dr. Amanda Cole", aiScore: "86% Win Prob", next: "HIPAA Review" },
      ],
    },
    {
      id: "stage-2",
      name: "Demo & Solution Pitch",
      totalValue: "$220,000",
      color: "border-blue-500/50 text-blue-600",
      deals: [
        { id: "DL-201", company: "Nordic Logistics", value: "$120,000", contact: "Soren Lind", aiScore: "91% Win Prob", next: "Tech Demo on Thu" },
        { id: "DL-202", company: "Vertex Cloud Infra", value: "$100,000", contact: "Kavita Rao", aiScore: "88% Win Prob", next: "Pricing Matrix Review" },
      ],
    },
    {
      id: "stage-3",
      name: "Proposal & Contract",
      totalValue: "$340,000",
      color: "border-purple-500/50 text-purple-600",
      deals: [
        { id: "DL-301", company: "Meridian Financial", value: "$250,000", contact: "Robert Sterling", aiScore: "98% Win Prob", next: "Legal Signoff" },
        { id: "DL-302", company: "BioGenix Lab", value: "$90,000", contact: "Sarah Jenkins", aiScore: "89% Win Prob", next: "Final Scope Verification" },
      ],
    },
    {
      id: "stage-4",
      name: "Closed Won",
      totalValue: "$580,000",
      color: "border-emerald-500/50 text-emerald-600",
      deals: [
        { id: "DL-401", company: "Starlight Media Group", value: "$380,000", contact: "Marcus King", aiScore: "WON", next: "Onboarding Started" },
        { id: "DL-402", company: "Titan Aerospace", value: "$200,000", contact: "Col. Gregory", aiScore: "WON", next: "Live in Production" },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {/* Pipeline Header Summary */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] flex-wrap gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-[var(--bos-text-primary)]">Enterprise Sales Pipeline & Deal Flow</h2>
          <p className="text-[12px] text-[var(--bos-text-secondary)]">Total Weighted Pipeline: <strong className="text-emerald-500 font-mono text-[13px]">$1,285,000</strong> across 8 active opportunities</p>
        </div>

        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 bg-[var(--bos-accent)] hover:brightness-110 text-white font-bold rounded-lg text-[11px] flex items-center gap-1.5 cursor-pointer shadow-xs">
            <Plus className="w-3.5 h-3.5" />
            <span>Create Opportunity</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5 items-start">
        {stages.map((stg) => (
          <div key={stg.id} className="p-3.5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3 shadow-xs">
            <div className={cn("flex items-center justify-between pb-2 border-b-2 font-mono", stg.color)}>
              <span className="font-bold uppercase text-[11px]">{stg.name}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[var(--bos-bg)]">{stg.totalValue}</span>
            </div>

            <div className="space-y-2.5">
              {stg.deals.map((deal) => (
                <div key={deal.id} className="p-3 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] hover:border-[var(--bos-accent)] transition-all space-y-2 cursor-pointer shadow-2xs group">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[12.5px] text-[var(--bos-text-primary)] group-hover:text-[var(--bos-accent)]">{deal.company}</span>
                    <span className="font-mono font-bold text-[12px] text-[var(--bos-accent)]">{deal.value}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--bos-text-secondary)]">
                    <span>{deal.contact}</span>
                    <span className="font-mono text-[10px] font-bold text-emerald-500">{deal.aiScore}</span>
                  </div>

                  <div className="pt-1.5 border-t border-[var(--bos-border)] flex items-center justify-between text-[10.5px] font-mono text-[var(--bos-text-tertiary)]">
                    <span className="truncate">Next: {deal.next}</span>
                    <ArrowRight className="w-3 h-3 text-[var(--bos-accent)] shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   3. DATABASE SCHEMA & DATA MODEL ARCHETYPE
   ═════════════════════════════════════════════════════════════════════ */
function DatabaseSchemaView({ featureName, featureDescription, tableName }: { featureName: string; featureDescription: string; tableName: string }) {
  const schemaTables = [
    {
      name: tableName || "ClientTask",
      columns: [
        { name: "id", type: "String @id @default(cuid())", isKey: true },
        { name: "projectId", type: "String (FK -> ClientProject)", isKey: false },
        { name: "title", type: "String", isKey: false },
        { name: "workstream", type: "WorkstreamType", isKey: false },
        { name: "status", type: "TaskStatus @default(TODO)", isKey: false },
        { name: "priority", type: "Priority @default(MEDIUM)", isKey: false },
        { name: "estimatedHours", type: "Float?", isKey: false },
        { name: "dueAt", type: "DateTime?", isKey: false },
      ],
      indexes: ["@@index([projectId, status])", "@@index([workstream])"],
    },
    {
      name: "ClientProject",
      columns: [
        { name: "id", type: "String @id @default(cuid())", isKey: true },
        { name: "name", type: "String", isKey: false },
        { name: "code", type: "String @unique", isKey: false },
        { name: "status", type: "ProjectStatus", isKey: false },
        { name: "totalBudget", type: "Decimal", isKey: false },
      ],
      indexes: ["@@index([clientId])"],
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/20 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-[14px] text-[var(--bos-text-primary)]">Relational Database Data Models & Prisma Schema</h3>
            <p className="text-[12px] text-[var(--bos-text-secondary)]">High-performance indexed schemas with relational constraints and cascade integrity</p>
          </div>
        </div>

        <span className="font-mono text-[11px] px-2.5 py-1 rounded bg-purple-500/10 text-purple-600 border border-purple-500/25 font-bold">
          PRISMA 6.4 &bull; POSTGRESQL / SQLITE
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {schemaTables.map((tbl, idx) => (
          <div key={idx} className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl p-4 space-y-3 font-mono">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--bos-border)]">
              <span className="font-bold text-[13px] text-purple-500 flex items-center gap-1.5">
                <Table className="w-3.5 h-3.5" /> model {tbl.name}
              </span>
              <span className="text-[10px] text-[var(--bos-text-secondary)]">{tbl.columns.length} columns</span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              {tbl.columns.map((col, cIdx) => (
                <div key={cIdx} className="flex items-center justify-between py-1 px-2 rounded bg-[var(--bos-bg)] border border-[var(--bos-border)]/50">
                  <span className={cn("font-bold", col.isKey ? "text-[var(--bos-accent)]" : "text-[var(--bos-text-primary)]")}>
                    {col.name} {col.isKey && "🔑"}
                  </span>
                  <span className="text-[var(--bos-text-secondary)]">{col.type}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[var(--bos-border)] text-[10px] text-[var(--bos-text-tertiary)] space-y-0.5">
              {tbl.indexes.map((idxStr, i) => (
                <div key={i}>{idxStr}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   4. AUTHENTICATION & SECURITY ARCHETYPE
   ═════════════════════════════════════════════════════════════════════ */
function AuthSecurityView({ featureName, featureDescription }: { featureName: string; featureDescription: string }) {
  const roles = [
    { role: "Executive Admin", users: 3, permissions: "Full unrestricted access + Billing + Role config" },
    { role: "Project Manager", users: 8, permissions: "Create/edit tasks, sprint scheduling, scope approve" },
    { role: "Senior Developer", users: 14, permissions: "Code commit, PR review, state transition, task verify" },
    { role: "Client Stakeholder", users: 5, permissions: "Read-only preview, UAT verification, feedback signoff" },
  ];

  return (
    <div className="space-y-4">
      <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-6 h-6 text-emerald-500" />
          <div>
            <h3 className="font-bold text-[14px] text-[var(--bos-text-primary)]">Security Middleware & Role-Based Access Control</h3>
            <p className="text-[12px] text-[var(--bos-text-secondary)]">Encrypted JWT session guardrails, CSRF tokens, and permission matrix enforcement</p>
          </div>
        </div>

        <span className="font-mono text-[11px] px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/25">
          AUTH PROTOCOL: NEXTAUTH v5 + SHA-256
        </span>
      </div>

      <div className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl p-4 space-y-3">
        <h4 className="font-bold text-[13px] text-[var(--bos-text-primary)] flex items-center gap-2">
          <Key className="w-4 h-4 text-emerald-500" /> Role & Permission Hierarchy
        </h4>

        <div className="space-y-2">
          {roles.map((r, idx) => (
            <div key={idx} className="p-3 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-bold text-[12.5px] text-[var(--bos-text-primary)]">{r.role}</div>
                <div className="text-[11px] text-[var(--bos-text-secondary)]">{r.permissions}</div>
              </div>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)] font-bold text-[var(--bos-text-primary)]">
                {r.users} Active Users
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   5. AI COPILOT & AUTOMATION ARCHETYPE
   ═════════════════════════════════════════════════════════════════════ */
function AiCopilotView({ featureName, featureDescription }: { featureName: string; featureDescription: string }) {
  const [messages, setMessages] = useState([
    {
      sender: "AI",
      text: "Greetings! I am your Autonomous CRM Copilot. I have analyzed 14 recent client requirements and identified 3 high-priority scope items ready for decomposition.",
      time: "Just now",
    },
    {
      sender: "AI",
      text: "Opportunity identified: 'Meridian Financial' is showing an 98% win probability. I can auto-draft the Statement of Work (SOW) based on the database schema.",
      time: "1 min ago",
    },
  ]);

  const [inputVal, setInputVal] = useState("");

  const handleSend = () => {
    if (!inputVal.trim()) return;
    const userMsg = { sender: "User", text: inputVal, time: "Just now" };
    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: "AI",
          text: `Executing autonomous action: &quot;${userMsg.text}&quot;. Synthesizing technical requirements and triggering background workers...`,
          time: "Just now",
        },
      ]);
    }, 600);
  };

  return (
    <div className="space-y-4">
      <div className="p-3.5 rounded-xl bg-[var(--bos-accent)]/10 border border-[var(--bos-accent)]/30 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <Bot className="w-6 h-6 text-[var(--bos-accent)]" />
          <div>
            <h3 className="font-bold text-[14px] text-[var(--bos-text-primary)]">AI Copilot & Business Agent Automation</h3>
            <p className="text-[12px] text-[var(--bos-text-secondary)]">Autonomous lead enrichment, proposal generation, and architecture decomposition</p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl p-4 space-y-3">
        <div className="h-48 overflow-y-auto space-y-2.5 p-3 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)]">
          {messages.map((m, i) => (
            <div key={i} className={cn("p-2.5 rounded-lg text-[12px] leading-relaxed max-w-[85%]", m.sender === "AI" ? "bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-primary)] mr-auto" : "bg-[var(--bos-accent)] text-white ml-auto")}>
              <div className="text-[10px] font-mono opacity-70 mb-0.5">{m.sender} &bull; {m.time}</div>
              <div>{m.text}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask AI Copilot to analyze, decompose, or automate..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg px-3 py-2 text-[12px] text-[var(--bos-text-primary)] focus:outline-hidden"
          />
          <button
            onClick={handleSend}
            className="px-4 py-2 bg-[var(--bos-accent)] hover:brightness-110 text-white font-bold rounded-lg text-[12px] flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   6. EXECUTIVE ANALYTICS DASHBOARD ARCHETYPE
   ═════════════════════════════════════════════════════════════════════ */
function AnalyticsDashboardView({ featureName, featureDescription }: { featureName: string; featureDescription: string }) {
  return (
    <div className="space-y-4">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1">
          <span className="text-[11px] font-mono text-[var(--bos-text-secondary)] uppercase">Monthly Recurring Revenue</span>
          <div className="text-[22px] font-bold font-mono text-[var(--bos-text-primary)]">$148,200</div>
          <div className="text-[11px] text-emerald-500 font-mono">+24.5% vs last month</div>
        </div>
        <div className="p-4 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1">
          <span className="text-[11px] font-mono text-[var(--bos-text-secondary)] uppercase">Win Rate (Qualified Leads)</span>
          <div className="text-[22px] font-bold font-mono text-emerald-500">68.4%</div>
          <div className="text-[11px] text-emerald-500 font-mono">+4.2% AI optimization boost</div>
        </div>
        <div className="p-4 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-1">
          <span className="text-[11px] font-mono text-[var(--bos-text-secondary)] uppercase">Delivery Cycle Time</span>
          <div className="text-[22px] font-bold font-mono text-sky-500">14.2 Days</div>
          <div className="text-[11px] text-[var(--bos-text-secondary)] font-mono">From requirement to prod</div>
        </div>
      </div>

      {/* Simulated Velocity Chart */}
      <div className="p-4 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[13px] text-[var(--bos-text-primary)]">Engineering Velocity & Scope Burnup</span>
          <span className="font-mono text-[11px] text-emerald-500 font-bold">98% On-Schedule</span>
        </div>

        <div className="grid grid-cols-6 gap-2 pt-2 items-end h-28">
          {[40, 65, 80, 55, 90, 95].map((h, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 h-full justify-end">
              <div
                style={{ height: `${h}%` }}
                className="w-full bg-[var(--bos-accent)]/80 hover:bg-[var(--bos-accent)] rounded-t transition-all cursor-pointer"
                title={`Sprint ${i + 1}: ${h}% capacity`}
              />
              <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">Sp {i + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
