"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Terminal, 
  Briefcase, 
  Code2, 
  Sliders, 
  CheckCircle2, 
  ArrowRight, 
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
  Zap,
  Users,
  FileText,
  DollarSign,
  FolderKanban,
  Check,
  Building,
  Bell,
  BarChart3
} from "lucide-react";
import { ProductModule } from "./types";

const MODULES: ProductModule[] = [
  // Category 1: Business Operations
  {
    id: "clients_leads",
    category: "operations",
    title: "Clients & Leads",
    tagline: "Dedicated CRM & Branded Client Portal",
    description: "Manage prospective accounts, intake questionnaires, organizational roles, and external stakeholders with end-to-end audit security.",
    workflow: [
      "Prospective client submits project inquiry via branded portal",
      "Automatic ingestion parses brief and assigns client partner",
      "Client dashboard unlocks real-time status and encrypted file sharing"
    ],
    connectedModules: ["Requirements", "Proposals", "Documents"],
    status: "Operational",
    actionLabel: "Access Client Portal Flow",
    actionHref: "/login",
    highlightStats: [
      { label: "Intake Speed", value: "3x Faster" },
      { label: "Portal Access", value: "Role-Gated" }
    ]
  },
  {
    id: "requirements",
    category: "operations",
    title: "Requirements Studio",
    tagline: "Scope Decomposition & Clarification Engine",
    description: "Break complex customer requests into clear, atomic user stories and functional criteria. Clarifying questions ensure complete mutual agreement.",
    workflow: [
      "AI-assisted breakdown parses unstructured brief into functional requirements",
      "Questions drafted for ambiguous edge cases requiring client signoff",
      "Requirements freeze into immutable baseline for proposal generation"
    ],
    connectedModules: ["Clients & Leads", "Proposals", "Projects"],
    status: "Operational",
    actionLabel: "Try Requirement Scoping",
    actionHref: "/signup",
    highlightStats: [
      { label: "Scope Precision", value: "100%" },
      { label: "Creep Prevention", value: "Automated" }
    ]
  },
  {
    id: "proposals",
    category: "operations",
    title: "Proposal Studio",
    tagline: "Commercial Contracts & Milestone Payouts",
    description: "Generate binding commercial proposals directly from confirmed requirements with automated margin analysis and built-in electronic sign-off.",
    workflow: [
      "Proposal generated from verified scope with automated pricing models",
      "Milestone breakdown establishes deliverables and payment schedule",
      "Digital signature executed by client automatically triggers project creation"
    ],
    connectedModules: ["Requirements", "Projects", "Payments & Invoices"],
    status: "Operational",
    actionLabel: "Explore Proposal Builder",
    actionHref: "/signup",
    highlightStats: [
      { label: "Close Rate", value: "84%" },
      { label: "Contract Turnaround", value: "< 24h" }
    ]
  },
  {
    id: "projects",
    category: "operations",
    title: "Project Command Center",
    tagline: "Mission Control for Complex Initiatives",
    description: "Real-time command center providing full visibility into active sprints, critical path dependencies, resource allocation, and burn velocity.",
    workflow: [
      "Project structure auto-scaffolds from executed proposal contract",
      "Milestones mapped into sprints with active dependency gates",
      "Command center tracks delivery health and risk telemetry in real time"
    ],
    connectedModules: ["Proposals", "Tasks & Dependencies", "Analytics & Margins"],
    status: "Operational",
    actionLabel: "Open Command Center",
    actionHref: "/login",
    highlightStats: [
      { label: "Scaffolding", value: "Instantaneous" },
      { label: "Critical Path", value: "Live Monitored" }
    ]
  },
  {
    id: "tasks_dependencies",
    category: "operations",
    title: "Tasks & Dependencies",
    tagline: "Graph-Aware Workstreams",
    description: "Prevent blocking bugs with strict dependency enforcement. Downstream stages cannot begin until prerequisite milestones are verified.",
    workflow: [
      "Sprint work divided into modular tasks bound to parent requirements",
      "Dependencies strictly enforce that prerequisites pass QA first",
      "Automated unblocking triggers when reviewer approves predecessor task"
    ],
    connectedModules: ["Projects", "Work Submissions", "Employee Workspace"],
    status: "Operational",
    actionLabel: "View Dependency Graph",
    actionHref: "/signup",
    highlightStats: [
      { label: "Blocker Detection", value: "Real-time" },
      { label: "Schedule Integrity", value: "100%" }
    ]
  },

  // Category 2: Team Execution
  {
    id: "employee_workspace",
    category: "execution",
    title: "Employee Workspace",
    tagline: "Distraction-Free Specialist Environment",
    description: "Individual contributors work in a streamlined build mode focused purely on their active work orders, acceptance criteria, and peer reviews.",
    workflow: [
      "Engineer logs in to view current sprint work order and criteria",
      "Build mode provides direct links to repositories, docs, and guidelines",
      "Progress checkpoints allow immediate submission upon completion"
    ],
    connectedModules: ["Team Assignments", "Work Submissions", "Tasks & Dependencies"],
    status: "Operational",
    actionLabel: "Employee Workspace Portal",
    actionHref: "/login",
    highlightStats: [
      { label: "Focus Efficiency", value: "+40%" },
      { label: "Role Context", value: "Strict Isolation" }
    ]
  },
  {
    id: "team_assignments",
    category: "execution",
    title: "Team Assignments",
    tagline: "Capability & Capacity Routing",
    description: "Assign tasks based on engineering specializations, current workload bandwidth, and project clearance levels.",
    workflow: [
      "System balances active workload across architects, developers, and QA",
      "Specialists notified instantly when unblocked tasks enter their queue",
      "Leadership monitors team utilization without micromanagement"
    ],
    connectedModules: ["Employee Workspace", "Reviews & Approvals", "Analytics & Margins"],
    status: "Operational",
    actionLabel: "Manage Assignments",
    actionHref: "/signup",
    highlightStats: [
      { label: "Utilization", value: "91.4%" },
      { label: "Over-Allocation", value: "0%" }
    ]
  },
  {
    id: "work_submissions",
    category: "execution",
    title: "Work Submissions",
    tagline: "Cryptographic Artifact Submission Drawer",
    description: "Specialists submit code commits, design assets, and test logs directly against task acceptance criteria with cryptographic verification.",
    workflow: [
      "Developer links Git pull request or deliverable bundle to task",
      "Automated test coverage passes verification checks",
      "Submission drawer locks artifact and alerts designated peer reviewer"
    ],
    connectedModules: ["Employee Workspace", "Reviews & Approvals", "Documents Vault"],
    status: "Operational",
    actionLabel: "Inspect Submission Drawer",
    actionHref: "/signup",
    highlightStats: [
      { label: "Traceability", value: "Commit-Linked" },
      { label: "Verification", value: "Automated Suite" }
    ]
  },
  {
    id: "reviews_approvals",
    category: "execution",
    title: "Reviews & Approvals",
    tagline: "Multi-Role Sovereign Quality Gates",
    description: "Authorized reviewers inspect submissions against original client specifications, approving or requesting changes with full audit trails.",
    workflow: [
      "Assigned reviewer receives structured review packet with diffs and proofs",
      "Checklist verified: Security, unit tests, and client criteria satisfied",
      "Approval triggers unblocking of downstream tasks and milestone credit"
    ],
    connectedModules: ["Work Submissions", "Projects", "Documents Vault"],
    status: "Operational",
    actionLabel: "Review Approval Flow",
    actionHref: "/login",
    highlightStats: [
      { label: "Bug Catch Rate", value: "99.4%" },
      { label: "Gate Enforcement", value: "Strict" }
    ]
  },
  {
    id: "project_communication",
    category: "execution",
    title: "Project Communication",
    tagline: "Task-Aware Contextual Discussion",
    description: "Conversations happen directly attached to the relevant task, requirement, or document. No context is ever lost in outside messaging apps.",
    workflow: [
      "Discussion threads tied specifically to individual tasks and deliverables",
      "Internal engineering notes kept separate from client-visible dialog",
      "Full conversation history archived for future audits and handover"
    ],
    connectedModules: ["Employee Workspace", "Notifications & Activity", "Clients & Leads"],
    status: "Operational",
    actionLabel: "Connect Communication",
    actionHref: "/signup",
    highlightStats: [
      { label: "Context Loss", value: "0%" },
      { label: "History Retention", value: "Infinite" }
    ]
  },

  // Category 3: Business Administration
  {
    id: "documents_vault",
    category: "administration",
    title: "Documents Vault",
    tagline: "Encrypted Enterprise Asset Repository",
    description: "Centralized storage for master service agreements, statement of works, architectural schematics, and milestone sign-off certificates.",
    workflow: [
      "Generated proposals and signed contracts auto-archive into secure vault",
      "All documents version-controlled with SHA-256 fingerprinting",
      "Strict role-based access control protects sensitive corporate data"
    ],
    connectedModules: ["Proposals", "Reviews & Approvals", "Payments & Invoices"],
    status: "Operational",
    actionLabel: "Explore Document Vault",
    actionHref: "/login",
    highlightStats: [
      { label: "Encryption", value: "AES-256" },
      { label: "Version History", value: "Immutable" }
    ]
  },
  {
    id: "notifications_activity",
    category: "administration",
    title: "Notifications & Activity",
    tagline: "Intelligent Priority Event Feed",
    description: "Real-time activity log showing every sign-off, commit, and approval. Actionable notifications alert users only when their decision is needed.",
    workflow: [
      "Unified event stream logs all actions across the entire enterprise",
      "Smart filters separate urgent blockers from routine status events",
      "Webhook support for enterprise Slack, Teams, and email routing"
    ],
    connectedModules: ["Project Communication", "Reviews & Approvals", "Projects"],
    status: "Operational",
    actionLabel: "View Activity Engine",
    actionHref: "/signup",
    highlightStats: [
      { label: "Alert Precision", value: "High Signal" },
      { label: "Notification Spam", value: "0%" }
    ]
  },
  {
    id: "analytics_margins",
    category: "administration",
    title: "Analytics & Margins",
    tagline: "Real-Time Gross Margin & Delivery Telemetry",
    description: "Live financial intelligence calculates actual project profitability against original estimates as hours and expenses are logged.",
    workflow: [
      "Project burn rate tracked automatically against proposal pricing",
      "Gross margins calculated per workstream, team, and client account",
      "Predictive warnings trigger if margin dips below target thresholds"
    ],
    connectedModules: ["Projects", "Proposals", "Payments & Invoices"],
    status: "Operational",
    actionLabel: "View Financial Telemetry",
    actionHref: "/login",
    highlightStats: [
      { label: "Margin Accuracy", value: "Real-time" },
      { label: "Profitability Lift", value: "+18%" }
    ]
  },
  {
    id: "payments_invoices",
    category: "administration",
    title: "Payments & Invoices",
    tagline: "Milestone Escrow & Automated Settlements",
    description: "Integrated billing triggers invoices and payment releases the instant client acceptance is signed off, eliminating days of delay.",
    workflow: [
      "Deposit collected in escrow before project work begins",
      "Milestone approval by client triggers immediate automated release",
      "Settlement ledger reconciles with corporate accounting automatically"
    ],
    connectedModules: ["Proposals", "Analytics & Margins", "Documents Vault"],
    status: "Operational",
    actionLabel: "Payment & Escrow System",
    actionHref: "/signup",
    highlightStats: [
      { label: "Collection Lag", value: "< 1hr" },
      { label: "Dispute Rate", value: "0%" }
    ]
  }
];

export function ProductExplorer() {
  const [activeCategory, setActiveCategory] = useState<"operations" | "execution" | "administration">("operations");
  const filteredModules = MODULES.filter((m) => m.category === activeCategory);
  const [activeModuleId, setActiveModuleId] = useState<string>("requirements");

  const currentModule = MODULES.find((m) => m.id === activeModuleId) || filteredModules[0] || MODULES[0];

  return (
    <section id="explorer" className="relative py-32 bg-[#07060a] overflow-hidden border-t border-white/[0.08]">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/3 w-[650px] h-[500px] bg-[#ff6b3d]/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-[#ff8f5a] uppercase tracking-widest mb-4">
            <Terminal className="w-3.5 h-3.5" />
            <span>Interactive Product Explorer</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mb-5">
            EXAMINE THE REAL SYSTEM.
          </h2>

          <p className="text-base sm:text-lg text-white/60 leading-relaxed font-normal">
            No fictional marketing claims. Explore how Business OS actually coordinates
            operations, engineering, and administration in one connected machine.
          </p>
        </div>

        {/* Primary Category Selector Tabs */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-1.5 rounded-2xl bg-[#121017] border border-white/[0.08] backdrop-blur-xl">
            {[
              { id: "operations", label: "Business Operations", icon: Briefcase },
              { id: "execution", label: "Team Execution", icon: Code2 },
              { id: "administration", label: "Business Administration", icon: Sliders },
            ].map((cat) => {
              const isActive = activeCategory === cat.id;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id as any);
                    const firstInCat = MODULES.find((m) => m.category === cat.id);
                    if (firstInCat) setActiveModuleId(firstInCat.id);
                  }}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${
                    isActive
                      ? "bg-[#ff6b3d] text-white shadow-[0_0_20px_rgba(255,107,61,0.4)]"
                      : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* EXPLORER LAYOUT: Module List + Central Detailed Presentation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Module Selector Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-2">
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest px-2 mb-1">
              Modules in Category ({filteredModules.length})
            </div>

            {filteredModules.map((mod) => {
              const isSelected = mod.id === currentModule.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModuleId(mod.id)}
                  className={`w-full p-4 rounded-xl text-left border transition-all duration-200 focus:outline-none flex items-center justify-between ${
                    isSelected
                      ? "bg-[#181522] border-[#ff6b3d] shadow-[0_0_25px_rgba(255,107,61,0.2)]"
                      : "bg-[#0e0d13]/80 border-white/[0.06] hover:bg-[#14121a] hover:border-white/[0.15]"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-bold tracking-tight ${isSelected ? "text-white" : "text-white/80"}`}>
                        {mod.title}
                      </span>
                    </div>
                    <div className="text-xs text-white/40 truncate max-w-[240px]">
                      {mod.tagline}
                    </div>
                  </div>

                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    isSelected
                      ? "bg-[#ff6b3d]/20 text-[#ff8f5a] border-[#ff6b3d]/30"
                      : "bg-white/[0.03] text-white/40 border-white/[0.06]"
                  }`}>
                    {mod.status}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Central Presentation Viewport */}
          <div className="lg:col-span-8 rounded-2xl bg-[#0e0d13] border border-white/[0.12] p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.8)] flex flex-col justify-between">
            {/* Module Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/[0.08] mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff6b3d] animate-pulse" />
                  <span className="text-xs font-mono text-[#ff8f5a] uppercase tracking-wider">
                    MODULE DEEP DIVE
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {currentModule.title}
                </h3>
                <p className="text-sm text-white/50">{currentModule.tagline}</p>
              </div>

              {/* Status and Direct CTA */}
              <div className="flex items-center gap-3">
                <Link
                  href={currentModule.actionHref}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] hover:border-white/[0.2] transition-all flex items-center gap-2"
                >
                  <span>{currentModule.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#ff8f5a]" />
                </Link>
              </div>
            </div>

            {/* Core Description & Highlights */}
            <div className="mb-8">
              <p className="text-base text-white/80 leading-relaxed mb-6 font-normal">
                {currentModule.description}
              </p>

              {/* Stats badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                {currentModule.highlightStats.map((st) => (
                  <div key={st.label} className="p-3 rounded-lg bg-black/40 border border-white/[0.06]">
                    <div className="text-[10px] font-mono text-white/40 uppercase">{st.label}</div>
                    <div className="text-base font-bold text-white font-mono mt-0.5">{st.value}</div>
                  </div>
                ))}
                <div className="p-3 rounded-lg bg-black/40 border border-white/[0.06]">
                  <div className="text-[10px] font-mono text-white/40 uppercase">System Status</div>
                  <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">Verified Active</div>
                </div>
                <div className="p-3 rounded-lg bg-black/40 border border-white/[0.06]">
                  <div className="text-[10px] font-mono text-white/40 uppercase">Audit Trail</div>
                  <div className="text-base font-bold text-[#ff8f5a] font-mono mt-0.5">100% Immutable</div>
                </div>
              </div>

              {/* Step-by-Step Workflow Progression */}
              <div className="p-5 rounded-xl bg-[#131118] border border-white/[0.08] mb-6">
                <div className="text-xs font-mono text-[#ff8f5a] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Operational Step-by-Step Workflow</span>
                </div>
                <div className="space-y-3">
                  {currentModule.workflow.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#ff6b3d]/20 text-[#ff8f5a] border border-[#ff6b3d]/30 flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="text-xs sm:text-sm text-white/80 leading-snug">
                        {step}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connected Upstream/Downstream Modules */}
              <div className="pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-white/40">CONNECTED PIPELINE MODULES:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentModule.connectedModules.map((c) => (
                      <span
                        key={c}
                        className="px-2.5 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-white/70"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <Link
                  href="/signup"
                  className="text-xs font-mono text-[#ff8f5a] hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <span>INITIALIZE WORKSPACE</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
