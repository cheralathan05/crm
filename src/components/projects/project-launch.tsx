"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  FileCheck2,
  FolderKanban,
  Layers,
  ListTodo,
  Loader2,
  Plus,
  Rocket,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScopeItem, SuggestedDeliverable, SuggestedMilestone, SuggestedProjectPlan, SuggestedTask } from "@/lib/projects";

type LaunchPreviewData = {
  proposal: {
    id: string;
    title: string;
    reference: string | null;
    version: number;
    amount: number | null;
    currency: string;
    status: string;
    approvedAt: string | null;
    existingProjectId: string | null;
  };
  client: {
    id: string;
    companyName: string;
    industry: string | null;
    primaryContact: string | null;
  };
  code: string;
  plan: SuggestedProjectPlan;
  workspaceUsers: Array<{ id: string; name: string; email: string; role: string }>;
};

export function ProjectLaunchWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const proposalId = searchParams.get("proposalId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LaunchPreviewData | null>(null);

  // Wizard Steps: 1: Lineage & Identity -> 2: Scope Review -> 3: Plan Builder -> 4: Team & Launch
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State (prefilled)
  const [projectName, setProjectName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerId, setManagerId] = useState<string | undefined>(undefined);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [targetCompletion, setTargetCompletion] = useState("");
  const [budget, setBudget] = useState<number>(0);
  const [currency, setCurrency] = useState("INR");

  // Scope & Plan State
  const [scopeItems, setScopeItems] = useState<ScopeItem[]>([]);
  const [milestones, setMilestones] = useState<SuggestedMilestone[]>([]);
  const [deliverables, setDeliverables] = useState<SuggestedDeliverable[]>([]);
  const [tasks, setTasks] = useState<SuggestedTask[]>([]);

  // Submission state
  const [isLaunching, setIsLaunching] = useState(false);

  useEffect(() => {
    if (!proposalId) {
      setError("No proposal specified for project launch.");
      setLoading(false);
      return;
    }

    async function loadPreview() {
      try {
        const res = await fetch(`/api/projects/launch-preview?proposalId=${proposalId}`);
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.message || "Failed to load proposal launch data.");
        }

        const preview: LaunchPreviewData = json;
        setData(preview);

        if (preview.proposal.existingProjectId) {
          router.replace(`/projects/${preview.proposal.existingProjectId}`);
          return;
        }

        // Prefill form
        setProjectName(preview.proposal.title);
        setProjectCode(preview.code);
        setBudget(preview.proposal.amount || 0);
        setCurrency(preview.proposal.currency || "INR");

        const target = new Date();
        target.setDate(target.getDate() + 8 * 7);
        setTargetCompletion(target.toISOString().split("T")[0]);

        if (preview.workspaceUsers.length > 0) {
          setManagerName(preview.workspaceUsers[0].name);
          setManagerId(preview.workspaceUsers[0].id);
        }

        setScopeItems(preview.plan.scopeItems);
        setMilestones(preview.plan.milestones);
        setDeliverables(preview.plan.deliverables);
        setTasks(preview.plan.tasks);
      } catch (e: any) {
        setError(e.message || "Could not load proposal launch context.");
      } finally {
        setLoading(false);
      }
    }

    void loadPreview();
  }, [proposalId, router]);

  const toggleScopeItem = (id: string) => {
    setScopeItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, included: !item.included } : item)),
    );
  };

  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleLaunch = async () => {
    if (!data) return;
    setIsLaunching(true);
    setError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: data.proposal.id,
          clientId: data.client.id,
          name: projectName,
          code: projectCode,
          managerId,
          managerName,
          startDate,
          targetCompletion,
          budget,
          currency,
          scopeItems,
          milestones,
          deliverables,
          tasks,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || "Failed to initialize project.");
      }

      router.push(`/projects/${json.project.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to launch project.");
      setIsLaunching(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)]" />
        <p className="text-[13px] font-mono text-[var(--bos-text-secondary)]">
          Synthesizing approved scope & building delivery structure…
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto my-16 p-6 rounded-lg border border-[var(--bos-border-subtle)] bg-[var(--bos-surface-panel)] text-center">
        <h2 className="text-[16px] font-semibold text-[var(--bos-text-primary)]">Project Launch Unavailable</h2>
        <p className="text-[13px] text-[var(--bos-text-secondary)] mt-2">{error || "Proposal data could not be found."}</p>
        <button
          type="button"
          onClick={() => router.push("/proposals")}
          className="mt-6 px-4 py-2 bg-[var(--bos-surface-sunken)] hover:bg-[var(--bos-overlay)] text-[12px] font-medium rounded-sm"
        >
          Return to Proposals
        </button>
      </div>
    );
  }

  const formatApprovedDate = data.proposal.approvedAt
    ? new Date(data.proposal.approvedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Verified by Admin";

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* ── HEADER ──────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between border-b border-[var(--bos-border-subtle)] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs font-mono text-[10px] font-semibold uppercase bg-[#3f6e35] text-white">
              <Rocket className="w-3 h-3" /> Project Launch
            </span>
            <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
              Transition from Approved Proposal into Live Delivery
            </span>
          </div>
          <h1 className="text-[22px] font-serif font-bold text-[var(--bos-text-primary)]">
            Launch Delivery Project: {projectName}
          </h1>
          <div className="flex items-center gap-4 text-[12px] text-[var(--bos-text-secondary)] mt-1">
            <span>
              Client: <strong className="text-[var(--bos-text-primary)]">{data.client.companyName}</strong>
            </span>
            <span>·</span>
            <span>
              Proposal: <strong className="text-[var(--bos-text-primary)]">{data.proposal.reference || "PROP"} (v{data.proposal.version})</strong>
            </span>
            <span>·</span>
            <span>
              Approved: <strong className="text-[#3f6e35]">{formatApprovedDate}</strong>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push(`/proposals/${data.proposal.id}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)] rounded-sm transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Proposal Studio
        </button>
      </div>

      {/* ── TRACEABILITY PROGRESS BAR ───────────────────────────── */}
      <div className="mb-8 p-4 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)]">
        <div className="flex items-center justify-between gap-2 overflow-x-auto text-[11.5px] font-mono">
          <div className="flex items-center gap-2 text-[#3f6e35] font-medium shrink-0">
            <CheckCircle2 className="w-4 h-4 text-[#3f6e35]" />
            <span>1. Client ({data.client.companyName})</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)] shrink-0" />
          <div className="flex items-center gap-2 text-[#3f6e35] font-medium shrink-0">
            <CheckCircle2 className="w-4 h-4 text-[#3f6e35]" />
            <span>2. Approved Requirement</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)] shrink-0" />
          <div className="flex items-center gap-2 text-[#3f6e35] font-medium shrink-0">
            <CheckCircle2 className="w-4 h-4 text-[#3f6e35]" />
            <span>3. Frozen Proposal v{data.proposal.version}</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)] shrink-0" />
          <div className="flex items-center gap-2 text-[#3f6e35] font-medium shrink-0">
            <CheckCircle2 className="w-4 h-4 text-[#3f6e35]" />
            <span>4. Scope & Budget Sign-off</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)] shrink-0" />
          <div className="flex items-center gap-2 text-[var(--bos-accent)] font-semibold shrink-0">
            <Rocket className="w-4 h-4 text-[var(--bos-accent)]" />
            <span>5. READY FOR DELIVERY</span>
          </div>
        </div>
      </div>

      {/* ── STEP NAVIGATION TABS ────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-[var(--bos-border-subtle)] mb-6">
        {[
          { num: 1, label: "Project Identity & Timeline" },
          { num: 2, label: `Import Approved Scope (${scopeItems.filter((s) => s.included).length}/${scopeItems.length})` },
          { num: 3, label: `Delivery Plan & Milestones (${milestones.length} Phases · ${tasks.length} Tasks)` },
          { num: 4, label: "Team & Final Launch" },
        ].map((s) => (
          <button
            key={s.num}
            type="button"
            onClick={() => setStep(s.num as any)}
            className={cn(
              "px-4 py-2.5 text-[12.5px] font-medium border-b-2 -mb-px transition-colors cursor-pointer",
              step === s.num
                ? "border-[var(--bos-accent)] text-[var(--bos-accent)]"
                : "border-transparent text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]",
            )}
          >
            {s.num}. {s.label}
          </button>
        ))}
      </div>

      {/* ── STEP 1: PROJECT IDENTITY ────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="p-6 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4">
            <div className="flex items-center gap-2 text-[14px] font-semibold text-[var(--bos-text-primary)]">
              <FolderKanban className="w-4 h-4 text-[var(--bos-accent)]" />
              <span>Project Identity (Prefilled from Approved Proposal)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full h-9 px-3 text-[13px] bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)] focus:outline-hidden focus:border-[var(--bos-accent)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">
                  Project Code (Traceability ID)
                </label>
                <input
                  type="text"
                  value={projectCode}
                  onChange={(e) => setProjectCode(e.target.value)}
                  className="w-full h-9 px-3 text-[13px] font-mono bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)] focus:outline-hidden focus:border-[var(--bos-accent)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">
                  Project Manager (Lead)
                </label>
                <select
                  value={managerId || ""}
                  onChange={(e) => {
                    const sel = data.workspaceUsers.find((u) => u.id === e.target.value);
                    if (sel) {
                      setManagerId(sel.id);
                      setManagerName(sel.name);
                    }
                  }}
                  className="w-full h-9 px-3 text-[13px] bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)] focus:outline-hidden focus:border-[var(--bos-accent)]"
                >
                  {data.workspaceUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role}) — {u.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">
                  Approved Contract Budget
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-[12px] font-mono text-[var(--bos-text-tertiary)]">
                    {currency}
                  </span>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-full h-9 pl-12 pr-3 text-[13px] font-mono bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)] focus:outline-hidden focus:border-[var(--bos-accent)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">
                  Kickoff Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-9 px-3 text-[13px] font-mono bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)] focus:outline-hidden focus:border-[var(--bos-accent)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[var(--bos-text-secondary)] mb-1">
                  Target Completion Date
                </label>
                <input
                  type="date"
                  value={targetCompletion}
                  onChange={(e) => setTargetCompletion(e.target.value)}
                  className="w-full h-9 px-3 text-[13px] font-mono bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] rounded-sm text-[var(--bos-text-primary)] focus:outline-hidden focus:border-[var(--bos-accent)]"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-sm bg-[var(--bos-accent)] text-white text-[13px] font-medium hover:brightness-95 transition-all shadow-sm cursor-pointer"
            >
              <span>Continue to Scope Import</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: APPROVED SCOPE IMPORT ───────────────────────── */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="p-6 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[14px] font-semibold text-[var(--bos-text-primary)]">
                <FileCheck2 className="w-4 h-4 text-[#3f6e35]" />
                <span>Import Approved Scope Items</span>
              </div>
              <span className="text-[11.5px] font-mono text-[var(--bos-text-tertiary)]">
                {scopeItems.filter((s) => s.included).length} of {scopeItems.length} selected for active execution
              </span>
            </div>

            <p className="text-[12.5px] text-[var(--bos-text-secondary)]">
              All items below are extracted directly from the verified client requirements and the approved proposal. Toggle to include/exclude items before converting into delivery deliverables.
            </p>

            <div className="space-y-2.5 pt-2">
              {scopeItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleScopeItem(item.id)}
                  className={cn(
                    "p-3.5 rounded border transition-all cursor-pointer flex items-start gap-3",
                    item.included
                      ? "bg-[#f9fdf8] border-[#c2e4bb]"
                      : "bg-[var(--bos-surface-sunken)] border-[var(--bos-border-subtle)] opacity-60",
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-bold",
                      item.included ? "bg-[#3f6e35] text-white" : "border border-[var(--bos-border-subtle)] text-transparent",
                    )}
                  >
                    {item.included ? <Check className="w-3.5 h-3.5" /> : null}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--bos-surface-panel)] text-[var(--bos-text-secondary)] border border-[var(--bos-border-subtle)]">
                        {item.category}
                      </span>
                      {item.priority && (
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#faece7] text-[#b5452a]">
                          {item.priority}
                        </span>
                      )}
                      <span className="text-[13px] font-semibold text-[var(--bos-text-primary)]">
                        {item.title}
                      </span>
                      {item.sourceSection && (
                        <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] ml-auto">
                          Source: {item.sourceSection}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[var(--bos-text-secondary)] line-clamp-2">{item.detail}</p>
                    {item.acceptanceCriteria && item.acceptanceCriteria.length > 0 && (
                      <div className="mt-2 text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                        <strong className="text-[var(--bos-text-secondary)]">Acceptance Criteria:</strong> {item.acceptanceCriteria.join(" · ")}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 px-4 py-2 text-[12.5px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-sm bg-[var(--bos-accent)] text-white text-[13px] font-medium hover:brightness-95 transition-all shadow-sm cursor-pointer"
            >
              <span>Build Project Plan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: PROJECT PLAN BUILDER ────────────────────────── */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="p-6 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[14px] font-semibold text-[var(--bos-text-primary)]">
                <Sparkles className="w-4 h-4 text-[var(--bos-accent)]" />
                <span>Intelligent Project Plan (Derived from Approved Scope)</span>
              </div>
              <span className="text-[11.5px] font-mono text-[var(--bos-text-tertiary)]">
                {milestones.length} Milestone Phases · {deliverables.length} Deliverables · {tasks.length} Actionable Tasks
              </span>
            </div>

            {/* Milestones Structure */}
            <div className="space-y-4">
              <h3 className="text-[12px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)]">
                Milestone Phase Gates & Commercial Payments
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {milestones.map((ms, idx) => (
                  <div key={ms.id} className="p-4 rounded bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-[var(--bos-accent)]/15 text-[var(--bos-accent)]">
                        Phase {idx + 1} Gate
                      </span>
                      <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                        Target Week {ms.targetWeek}
                      </span>
                    </div>
                    <h4 className="text-[13px] font-bold text-[var(--bos-text-primary)]">{ms.title}</h4>
                    <p className="text-[11.5px] text-[var(--bos-text-secondary)]">{ms.description}</p>
                    <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-[var(--bos-text-tertiary)] border-t border-[var(--bos-border-subtle)]/60">
                      <span>Commercial Trigger:</span>
                      <strong className="text-[var(--bos-text-primary)]">
                        {ms.paymentPercentage}% ({currency} {ms.paymentAmount.toLocaleString()})
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Deliverables Structure */}
            <div className="space-y-4 pt-2 border-t border-[var(--bos-border-subtle)]">
              <h3 className="text-[12px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)]">
                Traceable Project Deliverables (Client Acceptance Criteria)
              </h3>

              <div className="space-y-2.5">
                {deliverables.map((deliv, idx) => (
                  <div key={deliv.id} className="p-3.5 rounded bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--bos-surface-panel)] text-[var(--bos-text-secondary)]">
                        {deliv.category} · Milestone {deliv.milestoneIndex + 1}
                      </span>
                      <span className="text-[11px] font-mono text-[#3f6e35]">
                        Requires Client Acceptance Sign-off
                      </span>
                    </div>
                    <h4 className="text-[13px] font-semibold text-[var(--bos-text-primary)]">{deliv.title}</h4>
                    <p className="text-[12px] text-[var(--bos-text-secondary)] mt-0.5">{deliv.description}</p>
                    {deliv.acceptanceCriteria && deliv.acceptanceCriteria.length > 0 && (
                      <ul className="mt-2 space-y-1 pl-4 list-disc text-[11px] text-[var(--bos-text-tertiary)]">
                        {deliv.acceptanceCriteria.map((c, cIdx) => (
                          <li key={cIdx}>{c}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Task Breakdown */}
            <div className="space-y-4 pt-2 border-t border-[var(--bos-border-subtle)]">
              <div className="flex items-center justify-between">
                <h3 className="text-[12px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)]">
                  Work Breakdown Tasks ({tasks.length})
                </h3>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {tasks.map((task) => (
                  <div key={task.id} className="p-2.5 rounded bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] flex items-center justify-between gap-3 text-[12px]">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)] shrink-0">
                        M{task.milestoneIndex + 1}
                      </span>
                      <span className="font-medium text-[var(--bos-text-primary)] truncate">{task.title}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-[11px] font-mono text-[var(--bos-text-secondary)]">
                      <span>{task.teamRole}</span>
                      <span>{task.estimatedHours} hrs</span>
                      <button
                        type="button"
                        onClick={() => removeTask(task.id)}
                        className="text-[var(--bos-text-tertiary)] hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 px-4 py-2 text-[12.5px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-sm bg-[var(--bos-accent)] text-white text-[13px] font-medium hover:brightness-95 transition-all shadow-sm cursor-pointer"
            >
              <span>Review Team & Finalize Launch</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: TEAM & LAUNCH ──────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="p-6 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-5">
            <div className="flex items-center gap-2 text-[14px] font-semibold text-[var(--bos-text-primary)]">
              <Users className="w-4 h-4 text-[var(--bos-accent)]" />
              <span>Project Team & Readiness Summary</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] space-y-1">
                <span className="text-[11px] font-mono uppercase text-[var(--bos-text-tertiary)]">Project Lead</span>
                <p className="text-[14px] font-bold text-[var(--bos-text-primary)]">{managerName}</p>
                <p className="text-[11px] text-[var(--bos-text-secondary)]">Responsible for delivery milestones</p>
              </div>

              <div className="p-4 rounded bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] space-y-1">
                <span className="text-[11px] font-mono uppercase text-[var(--bos-text-tertiary)]">Delivery Scope</span>
                <p className="text-[14px] font-bold text-[var(--bos-text-primary)]">
                  {deliverables.length} Deliverables
                </p>
                <p className="text-[11px] text-[var(--bos-text-secondary)]">{tasks.length} planned engineering tasks</p>
              </div>

              <div className="p-4 rounded bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] space-y-1">
                <span className="text-[11px] font-mono uppercase text-[var(--bos-text-tertiary)]">Budget Value</span>
                <p className="text-[14px] font-bold text-[var(--bos-text-primary)]">
                  {currency} {budget.toLocaleString()}
                </p>
                <p className="text-[11px] text-[var(--bos-text-secondary)]">Across {milestones.length} milestone phase gates</p>
              </div>
            </div>

            <div className="p-4 rounded-md bg-[#eef7ec] border border-[#cbe8c6] text-[12.5px] text-[#2e5726] flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#3f6e35] shrink-0 mt-0.5" />
              <div>
                <strong>Traceability Lock & Event Recording</strong>
                <p className="mt-0.5 text-[12px] opacity-90">
                  Launching this project will atomically create the delivery database records, link them to Proposal v{data.proposal.version}, and update client stage to <strong>PROJECT</strong>.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex items-center gap-1.5 px-4 py-2 text-[12.5px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>

            <button
              type="button"
              disabled={isLaunching}
              onClick={handleLaunch}
              className="flex items-center gap-2 px-6 py-3 rounded-sm bg-[#3f6e35] text-white text-[13.5px] font-semibold hover:brightness-95 disabled:opacity-50 transition-all shadow-md cursor-pointer"
            >
              {isLaunching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              <span>{isLaunching ? "Launching Operating System…" : "Launch Delivery Project Now"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
