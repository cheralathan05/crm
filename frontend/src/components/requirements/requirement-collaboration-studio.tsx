"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Ban,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  FileCheck2,
  FileEdit,
  FileText,
  History,
  Info,
  Layers,
  Lock,
  MessageSquare,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BusinessOSMark } from "@/components/business-os-mark";
import { ClientRequirementPortal } from "@/components/client-requirement/client-requirement-portal";
import {
  buildReviewQueue,
  type ReviewQueueItem,
  type ChangeReviewItem,
  type ProjectUnderstandingBrief,
  type ProjectUnderstandingState,
  type ProposalGateStatus,
  type VisualDiffChunk,
} from "@/lib/requirement-collaboration";

/* ────────────────────────────────────────────────────────────────
   REQUIREMENT COLLABORATION & APPROVAL STUDIO — ADMIN WORKSPACE
   The state-of-the-art replacement for the legacy requirement dashboard.
   Review → Request → Client Response → Change Detection → Admin Decision → Approval → Proposal Gate
──────────────────────────────────────────────────────────────── */

export function RequirementCollaborationStudio({
  requestId,
  onClose,
}: {
  requestId: string;
  onClose?: () => void;
}) {
  const router = useRouter();

  // Primary Data States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bundle, setBundle] = useState<any>(null);
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([]);
  const [changesQueue, setChangesQueue] = useState<ChangeReviewItem[]>([]);
  const [understanding, setUnderstanding] = useState<ProjectUnderstandingState | null>(null);
  const [gate, setGate] = useState<ProposalGateStatus | null>(null);

  // Active Workspace Navigation Tab
  const [activeTab, setActiveTab] = useState<"queue" | "changes" | "understanding" | "history">("queue");

  // Multi-Selection in Review Queue
  const [selectedQueueIds, setSelectedQueueIds] = useState<Record<string, boolean>>({});

  // Client Request Composer Drawer
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerItems, setComposerItems] = useState<
    {
      section: string;
      title: string;
      question: string;
      whyWeAsk: string;
      answerType: "MULTI_SELECT" | "SINGLE_SELECT" | "LONG_TEXT" | "SHORT_TEXT" | "NUMBER" | "DATE";
      options: string[];
      additionalContext?: string;
      isBlocking?: boolean;
    }[]
  >([]);
  const [sendingRequest, setSendingRequest] = useState(false);

  // Client Live Preview Modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [clientLink, setClientLink] = useState<string | null>(null);
  const [clientToken, setClientToken] = useState<string | null>(null);

  // Decision Modals (Clarification / Rejection)
  const [clarifyTarget, setClarifyTarget] = useState<ChangeReviewItem | null>(null);
  const [clarificationNote, setClarificationNote] = useState("");
  const [clarificationGuidance, setClarificationGuidance] = useState("");
  const [submittingClarify, setSubmittingClarify] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<ChangeReviewItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submittingReject, setSubmittingReject] = useState(false);

  const [approvingChangeId, setApprovingChangeId] = useState<string | null>(null);

  // Proposal Generation State
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch full requirement workspace
  const fetchWorkspace = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [resAdmin, resUnd] = await Promise.all([
        fetch(`/api/requirements/${encodeURIComponent(requestId)}`),
        fetch(`/api/requirements/${encodeURIComponent(requestId)}/project-understanding`),
      ]);

      const dataAdmin = await resAdmin.json();
      const dataUnd = await resUnd.json();

      if (!resAdmin.ok || !dataAdmin.ok) {
        throw new Error(dataAdmin.message ?? "Failed to load requirement request.");
      }

      setBundle(dataAdmin);

      // Build Review Queue
      const queue = buildReviewQueue(dataAdmin.answers ?? {}, dataAdmin.questions ?? [], dataAdmin.features ?? []);
      setReviewQueue(queue);

      if (dataUnd.ok) {
        setUnderstanding(dataUnd.understanding);
        setGate(dataUnd.gate);
      }

      // Load Changes Queue
      loadChangeQueue(dataAdmin);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load requirement details.");
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  const loadChangeQueue = (adminData: any) => {
    const rawQuestions = adminData.questions ?? [];
    const proposals = adminData.updateProposals ?? [];
    const changes: ChangeReviewItem[] = [];

    for (const q of rawQuestions) {
      if (q.response || q.answerData) {
        changes.push({
          id: q.id,
          questionId: q.id,
          section: q.section,
          sectionLabel: q.categoryLabel ?? q.section,
          title: q.clientQuestion ?? q.question,
          previousValue: (adminData.answers?.[q.section] ? JSON.stringify(adminData.answers[q.section]) : "No previous answer"),
          newValue: q.response ?? (q.answerData ? JSON.stringify(q.answerData) : ""),
          changedBy: q.respondedByName ?? "Client",
          changedAt: q.respondedAt ?? q.updatedAt,
          reason: q.response ? `Client responded: "${q.response.slice(0, 100)}..."` : "Answered during discovery",
          diff: [
            { type: "remove", text: (adminData.answers?.[q.section] ? JSON.stringify(adminData.answers[q.section]) : "") },
            { type: "add", text: q.response ?? "" },
          ],
          impact: {
            scope: "Defines architecture and sprint deliverable scope.",
            timeline: "Feeds directly into proposal timeline planning.",
          },
          status: q.status === "RESOLVED" ? "ACCEPTED" : q.status === "NEEDS_CLARIFICATION" ? "NEEDS_CLARIFICATION" : "PENDING",
        });
      }
    }
    setChangesQueue(changes);
  };

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  // Ensure live client link/token for preview
  const getClientLink = async () => {
    if (clientToken && clientLink) return { token: clientToken, link: clientLink };
    try {
      const res = await fetch(`/api/requirements/${encodeURIComponent(requestId)}/regenerate`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setClientToken(data.token);
        setClientLink(data.link);
        return { token: data.token, link: data.link };
      }
    } catch {
      /* fallback */
    }
    return { token: "demo-token", link: `/client-requirement/demo-token` };
  };

  // Open Composer with Selected Items
  const handleOpenComposer = () => {
    const selected = reviewQueue.filter((item) => selectedQueueIds[item.id]);
    const itemsToCompose = selected.length > 0 ? selected : reviewQueue.filter((i) => i.status !== "CONFIRMED").slice(0, 3);

    setComposerItems(
      itemsToCompose.map((item) => ({
        section: item.key,
        title: item.category,
        question: item.suggestedQuestion,
        whyWeAsk: item.whyWeNeedThis,
        answerType: item.responseType,
        options: item.options,
        additionalContext: "",
        isBlocking: true,
      })),
    );
    setComposerOpen(true);
  };

  // Send Focused Request to Client
  const handleSendClientRequest = async () => {
    if (composerItems.length === 0) return;
    setSendingRequest(true);
    try {
      const res = await fetch(`/api/requirements/${encodeURIComponent(requestId)}/client-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: composerItems }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed to send request.");

      notify(`✓ Request bundle with ${composerItems.length} decisions sent to client!`);
      setComposerOpen(false);
      setSelectedQueueIds({});
      await fetchWorkspace();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Error sending request.");
    } finally {
      setSendingRequest(false);
    }
  };

  // Open Client Preview
  const handleOpenPreview = async () => {
    await getClientLink();
    setPreviewModalOpen(true);
  };

  // Approve a Client Change (Transactional)
  const handleApproveChange = async (item: ChangeReviewItem) => {
    setApprovingChangeId(item.id);
    try {
      const res = await fetch(`/api/requirements/${encodeURIComponent(requestId)}/decide-change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "APPROVE",
          changeId: item.id,
          section: item.section,
          newValue: item.newValue,
          reason: "Approved by Admin in Requirement Studio.",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Approval failed.");

      notify(`✓ Change approved! Revision ${data.revision} created.`);
      await fetchWorkspace();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Error approving change.");
    } finally {
      setApprovingChangeId(null);
    }
  };

  // Request Clarification on a Change
  const handleClarifySubmit = async () => {
    if (!clarifyTarget || !clarificationNote.trim()) return;
    setSubmittingClarify(true);
    try {
      const res = await fetch(`/api/requirements/${encodeURIComponent(requestId)}/decide-change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CLARIFY",
          changeId: clarifyTarget.id,
          section: clarifyTarget.section,
          clarificationNote: clarificationNote.trim(),
          guidance: clarificationGuidance.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Clarification request failed.");

      notify("✓ Clarification request sent to client.");
      setClarifyTarget(null);
      setClarificationNote("");
      setClarificationGuidance("");
      await fetchWorkspace();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Error requesting clarification.");
    } finally {
      setSubmittingClarify(false);
    }
  };

  // Reject a Client Change (Reason is Mandatory!)
  const handleRejectSubmit = async () => {
    if (!rejectTarget || !rejectReason.trim()) {
      notify("Rejection reason is mandatory.");
      return;
    }
    setSubmittingReject(true);
    try {
      const res = await fetch(`/api/requirements/${encodeURIComponent(requestId)}/decide-change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REJECT",
          changeId: rejectTarget.id,
          section: rejectTarget.section,
          reason: rejectReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Rejection failed.");

      notify("✓ Change rejected. Previous authoritative specification remains locked.");
      setRejectTarget(null);
      setRejectReason("");
      await fetchWorkspace();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Error rejecting change.");
    } finally {
      setSubmittingReject(false);
    }
  };

  // Generate Proposal & Smoothly Route to Proposal Studio
  const handleGenerateProposal = async () => {
    if (!gate?.ready) {
      notify(`Proposal blocked: ${gate?.reasonsBlocked[0] ?? "Requirements must be confirmed and approved."}`);
      return;
    }

    setGeneratingProposal(true);
    try {
      const res = await fetch(`/api/requirements/${encodeURIComponent(requestId)}/proposal`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message ?? "Failed to generate proposal.");
      }

      notify(`✓ Proposal generated! Moving to Proposal Studio...`);
      // Smoothly navigate directly to the proposal studio!
      setTimeout(() => {
        router.push(`/proposals/${data.proposal.id}`);
      }, 700);
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Failed to generate proposal.");
      setGeneratingProposal(false);
    }
  };

  const selectedCount = Object.values(selectedQueueIds).filter(Boolean).length;
  const pendingChangesCount = changesQueue.filter((c) => c.status === "PENDING").length;

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 bg-[#0d0f12] text-white">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[13px] font-mono text-zinc-400">Loading Requirement Collaboration Workspace...</p>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 bg-[#0d0f12] text-white text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
        <h3 className="text-lg font-semibold">Unable to load requirement workspace</h3>
        <p className="text-[13px] text-zinc-400 mt-1 max-w-md">{error}</p>
        <button
          type="button"
          onClick={fetchWorkspace}
          className="mt-4 px-4 py-2 rounded-md bg-white/[0.08] hover:bg-white/[0.14] text-xs font-mono"
        >
          Try again
        </button>
      </div>
    );
  }

  const req = bundle.request;
  const client = bundle.client;

  return (
    <div className="min-h-screen bg-[#0d0f12] text-[#e1e4ea] font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-[#161a22] px-4 py-3 text-[13px] font-medium text-emerald-400 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="border-b border-white/[0.08] bg-[#12151c]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-zinc-400">REQUIREMENTS</span>
                <span className="text-zinc-600">·</span>
                <span className="text-[10px] font-mono text-zinc-400">{req.reference}</span>
                <span className="text-zinc-600">·</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Revision {req.revision}
                </span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-mono font-medium border",
                    req.status === "APPROVED"
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                      : req.status === "CHANGES_REQUESTED"
                        ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                        : "bg-blue-500/10 text-blue-300 border-blue-500/30",
                  )}
                >
                  {req.status === "APPROVED"
                    ? "Approved"
                    : req.status === "CHANGES_REQUESTED"
                      ? "Waiting for Client"
                      : "In Review"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">{req.title}</h1>
                <span className="text-[14px] text-zinc-400 font-medium">— {client?.companyName}</span>
              </div>
            </div>

            {/* Quick Action Bar */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={handleOpenPreview}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] text-[12px] font-medium text-zinc-200 transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>Preview client view</span>
              </button>

              <button
                type="button"
                onClick={handleOpenComposer}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-[12px] font-medium text-emerald-300 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Request from client</span>
              </button>

              {/* Dynamic Proposal Gate Button */}
              <button
                type="button"
                disabled={generatingProposal || !gate?.ready}
                onClick={handleGenerateProposal}
                className={cn(
                  "inline-flex items-center gap-2 h-9 px-4 rounded-lg font-semibold text-[12px] tracking-wide transition-all",
                  gate?.ready
                    ? "bg-emerald-500 hover:bg-emerald-400 text-[#0d0f12] shadow-lg shadow-emerald-500/20 hover:scale-[1.02]"
                    : "border border-white/[0.1] bg-white/[0.03] text-zinc-500 opacity-60 cursor-not-allowed",
                )}
                title={gate?.ready ? "All gates confirmed — generate proposal" : gate?.reasonsBlocked[0]}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{generatingProposal ? "Generating..." : "Generate proposal"}</span>
              </button>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* OVERVIEW STATUS STRIP */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-white/[0.06]">
            {/* Project Understanding Status */}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-1">
              <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">Project Understanding</span>
              <div className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-200">
                {understanding?.status === "APPROVED" ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Client Approved</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Awaiting Client</span>
                  </>
                )}
              </div>
            </div>

            {/* Client Response */}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-1">
              <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">Client Response</span>
              <div className="text-[13px] font-medium text-zinc-200">
                {req.submittedAt ? (
                  <span>Last submitted · {new Date(req.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                ) : (
                  <span className="text-zinc-500">Pending initial response</span>
                )}
              </div>
            </div>

            {/* Admin Review Status */}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-1">
              <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">Admin Review Queue</span>
              <div className="text-[13px] font-medium text-zinc-200">
                {pendingChangesCount > 0 ? (
                  <span className="text-amber-400 font-semibold">{pendingChangesCount} changes need review</span>
                ) : (
                  <span>{reviewQueue.filter((i) => i.status !== "CONFIRMED").length} items need decision</span>
                )}
              </div>
            </div>

            {/* Proposal Gate */}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-1">
              <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">Proposal Readiness</span>
              <div className="flex items-center gap-1.5 text-[13px] font-medium">
                {gate?.ready ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Ready for proposal
                  </span>
                ) : (
                  <span className="text-zinc-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-zinc-500" /> Blocked ({gate?.reasonsBlocked.length ?? 1})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* WORKSPACE TAB NAVIGATION */}
      <div className="border-b border-white/[0.08] bg-[#0d0f12]">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-8">
          <button
            type="button"
            onClick={() => setActiveTab("queue")}
            className={cn(
              "py-3 text-[13px] font-medium border-b-2 transition-colors relative",
              activeTab === "queue"
                ? "border-emerald-500 text-white font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200",
            )}
          >
            Review Queue
            <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.08] text-zinc-400">
              {reviewQueue.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("changes")}
            className={cn(
              "py-3 text-[13px] font-medium border-b-2 transition-colors relative flex items-center gap-1.5",
              activeTab === "changes"
                ? "border-emerald-500 text-white font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200",
            )}
          >
            Client Changes & Diffs
            {pendingChangesCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                {pendingChangesCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("understanding")}
            className={cn(
              "py-3 text-[13px] font-medium border-b-2 transition-colors relative",
              activeTab === "understanding"
                ? "border-emerald-500 text-white font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200",
            )}
          >
            Project Understanding
            {understanding?.status === "APPROVED" && (
              <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                ✓
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={cn(
              "py-3 text-[13px] font-medium border-b-2 transition-colors relative",
              activeTab === "history"
                ? "border-emerald-500 text-white font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200",
            )}
          >
            Revision History
          </button>
        </div>
      </div>

      {/* TAB CONTENT */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* TAB 1: REVIEW QUEUE */}
        {activeTab === "queue" && (
          <div className="space-y-6">
            {/* Multi-selection sticky action bar */}
            {selectedCount > 0 && (
              <div className="sticky top-20 z-20 flex items-center justify-between rounded-xl border border-emerald-500/40 bg-[#161a22]/95 backdrop-blur-md px-6 py-3 shadow-2xl animate-in fade-in">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[13px] font-medium text-white">
                    <span className="font-semibold text-emerald-400">{selectedCount}</span> decision
                    {selectedCount === 1 ? "" : "s"} selected
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedQueueIds({})}
                    className="text-[12px] text-zinc-400 hover:text-white px-3 py-1.5"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenComposer}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0d0f12] text-[12px] font-semibold transition-all hover:scale-[1.02]"
                  >
                    <span>Create client request</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Header description */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white tracking-tight">Requirement Review Queue</h2>
                <p className="text-[13px] text-zinc-400 mt-0.5">
                  Select only the items that need clarification or missing confirmation from the client.
                </p>
              </div>
              <div className="text-[12px] font-mono text-zinc-500">
                {reviewQueue.filter((i) => i.status === "CONFIRMED").length} / {reviewQueue.length} Confirmed
              </div>
            </div>

            {/* Decision Rows */}
            <div className="space-y-3">
              {reviewQueue.map((item) => {
                const isSelected = Boolean(selectedQueueIds[item.id]);
                const isConfirmed = item.status === "CONFIRMED";

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-xl border transition-all duration-150 p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-5",
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/[0.04]"
                        : isConfirmed
                          ? "border-white/[0.06] bg-[#12151c]/40"
                          : "border-white/[0.09] bg-[#12151c] hover:border-white/[0.16]",
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) =>
                          setSelectedQueueIds((prev) => ({ ...prev, [item.id]: e.target.checked }))
                        }
                        className="w-4 h-4 rounded border-zinc-600 text-emerald-500 focus:ring-emerald-500 bg-[#0d0f12] mt-1 cursor-pointer"
                      />

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                            {item.category}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-mono font-medium px-2 py-0.5 rounded",
                              isConfirmed
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : item.status === "MISSING"
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                            )}
                          >
                            {item.status}
                          </span>
                        </div>

                        <h3 className="text-base font-semibold text-white tracking-tight">{item.title}</h3>

                        <div className="text-[13px] text-zinc-300">
                          {item.currentAnswer ? (
                            <span className="text-zinc-200">{item.currentAnswer}</span>
                          ) : (
                            <span className="text-zinc-500 italic">No confirmed answer yet</span>
                          )}
                        </div>

                        {/* Why we need this */}
                        <div className="pt-1 flex items-start gap-2 text-[12px] text-zinc-400">
                          <span className="font-medium text-zinc-500 shrink-0">Why we need this:</span>
                          <span>{item.whyWeNeedThis}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedQueueIds({ [item.id]: true });
                          setComposerItems([
                            {
                              section: item.key,
                              title: item.category,
                              question: item.suggestedQuestion,
                              whyWeAsk: item.whyWeNeedThis,
                              answerType: item.responseType,
                              options: item.options,
                              additionalContext: "",
                              isBlocking: true,
                            },
                          ]);
                          setComposerOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] text-[12px] font-medium text-zinc-200 transition-colors"
                      >
                        <Send className="w-3 h-3 text-emerald-400" />
                        <span>Request from client</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: CLIENT CHANGES & VISUAL DIFFS */}
        {activeTab === "changes" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white tracking-tight">Client Changes & Document Diffs</h2>
              <p className="text-[13px] text-zinc-400 mt-0.5">
                Review exact submitted changes, client explanations, and downstream impacts before accepting.
              </p>
            </div>

            {changesQueue.length === 0 ? (
              <div className="rounded-xl border border-white/[0.08] bg-[#12151c]/40 p-12 text-center text-zinc-500">
                <FileCheck2 className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                <p className="text-[14px]">No client changes awaiting review.</p>
                <p className="text-[12px] text-zinc-600 mt-1">All submitted responses have been reviewed.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {changesQueue.map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/[0.1] bg-[#12151c] p-6 space-y-5 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                            {item.sectionLabel}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-mono px-2 py-0.5 rounded",
                              item.status === "ACCEPTED"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : item.status === "REJECTED"
                                  ? "bg-red-500/10 text-red-400"
                                  : "bg-amber-500/10 text-amber-400",
                            )}
                          >
                            {item.status}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-white tracking-tight mt-1">{item.title}</h3>
                      </div>

                      <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-2">
                        <span>Changed by {item.changedBy}</span>
                        <span>·</span>
                        <span>{new Date(item.changedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      </div>
                    </div>

                    {/* DOCUMENT-STYLE VISUAL DIFF */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-lg border border-red-500/20 bg-red-950/10 p-4 space-y-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-red-400">Previous</span>
                        <p className="text-[13px] text-zinc-300 font-mono whitespace-pre-wrap">{item.previousValue}</p>
                      </div>

                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/10 p-4 space-y-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">
                          Client changed to
                        </span>
                        <p className="text-[13px] text-emerald-200 font-mono whitespace-pre-wrap">{item.newValue}</p>
                      </div>
                    </div>

                    {/* Client Reason */}
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 flex items-start gap-3">
                      <MessageSquare className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                      <div className="text-[12px] leading-relaxed">
                        <span className="font-semibold text-zinc-300">Client explanation: </span>
                        <span className="text-zinc-400">{item.reason}</span>
                      </div>
                    </div>

                    {/* Impact Analysis Warning */}
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-[12px] leading-relaxed space-y-1">
                        <span className="font-semibold text-amber-300">Downstream Impact Detected:</span>
                        <p className="text-zinc-400">
                          This change affects <span className="text-zinc-200 font-medium">Timeline & Proposal Pricing</span>.
                          Does not automatically mutate downstream records; admin approval required.
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/[0.06]">
                      {item.status === "PENDING" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectTarget(item);
                              setRejectReason("");
                            }}
                            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-[12px] font-medium transition-colors"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Reject change</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setClarifyTarget(item);
                              setClarificationNote("");
                              setClarificationGuidance("");
                            }}
                            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 text-[12px] font-medium transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                            <span>Request clarification</span>
                          </button>

                          <button
                            type="button"
                            disabled={approvingChangeId === item.id}
                            onClick={() => handleApproveChange(item)}
                            className="inline-flex items-center gap-1.5 h-9 px-5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0d0f12] text-[12px] font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>{approvingChangeId === item.id ? "Approving..." : "Approve change"}</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-[12px] font-mono text-zinc-500">
                          Decision recorded: {item.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PROJECT UNDERSTANDING */}
        {activeTab === "understanding" && understanding && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white tracking-tight">Project Understanding Specification</h2>
                <p className="text-[13px] text-zinc-400 mt-0.5">
                  The client-readable executive project brief synthesized from confirmed requirements.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-[11px] font-mono px-2.5 py-1 rounded border",
                    understanding.status === "APPROVED"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-blue-500/10 text-blue-400 border-blue-500/30",
                  )}
                >
                  Status: {understanding.status.replace("_", " ")}
                </span>
              </div>
            </div>

            {/* Brief Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 rounded-xl border border-white/[0.08] bg-[#12151c] p-6 space-y-2">
                <span className="text-[10px] font-mono uppercase text-emerald-400">01 · Strategic Goal</span>
                <h4 className="text-base font-semibold text-white">Business Objective</h4>
                <p className="text-[13px] text-zinc-300 leading-relaxed">{understanding.brief.businessObjective}</p>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#12151c] p-6 space-y-2">
                <span className="text-[10px] font-mono uppercase text-emerald-400">02 · Stakeholders</span>
                <h4 className="text-base font-semibold text-white">Users & Roles</h4>
                <p className="text-[13px] text-zinc-300 leading-relaxed">{understanding.brief.users}</p>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#12151c] p-6 space-y-2">
                <span className="text-[10px] font-mono uppercase text-emerald-400">03 · Boundaries</span>
                <h4 className="text-base font-semibold text-white">Core Scope</h4>
                <p className="text-[13px] text-zinc-300 leading-relaxed">{understanding.brief.coreScope}</p>
              </div>

              <div className="md:col-span-2 rounded-xl border border-white/[0.08] bg-[#12151c] p-6 space-y-2">
                <span className="text-[10px] font-mono uppercase text-emerald-400">04 · Deliverables</span>
                <h4 className="text-base font-semibold text-white">Key Capabilities</h4>
                <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-line font-mono text-[12px]">
                  {understanding.brief.keyCapabilities}
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#12151c] p-6 space-y-2">
                <span className="text-[10px] font-mono uppercase text-emerald-400">05 · Interface</span>
                <h4 className="text-base font-semibold text-white">Design Direction</h4>
                <p className="text-[13px] text-zinc-300 leading-relaxed">{understanding.brief.designDirection}</p>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#12151c] p-6 space-y-2">
                <span className="text-[10px] font-mono uppercase text-emerald-400">06 · Ecosystem</span>
                <h4 className="text-base font-semibold text-white">Integrations</h4>
                <p className="text-[13px] text-zinc-300 leading-relaxed">{understanding.brief.integrations}</p>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#12151c] p-6 space-y-2">
                <span className="text-[10px] font-mono uppercase text-emerald-400">07 · Schedule</span>
                <h4 className="text-base font-semibold text-white">Target Timeline</h4>
                <p className="text-[13px] text-zinc-300 leading-relaxed">{understanding.brief.timeline}</p>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#12151c] p-6 space-y-2">
                <span className="text-[10px] font-mono uppercase text-emerald-400">08 · Commercial</span>
                <h4 className="text-base font-semibold text-white">Commercial Understanding</h4>
                <p className="text-[13px] text-zinc-300 leading-relaxed">
                  {understanding.brief.commercialUnderstanding}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: REVISION HISTORY */}
        {activeTab === "history" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white tracking-tight">Immutable Revision History</h2>
              <p className="text-[13px] text-zinc-400 mt-0.5">
                Every client submission and admin approval creates a frozen revision snapshot.
              </p>
            </div>

            <div className="divide-y divide-white/[0.08] rounded-xl border border-white/[0.08] bg-[#12151c]">
              {(bundle.revisions ?? []).map((rev: any) => (
                <div key={rev.id} className="p-6 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-white">Revision {rev.revision}</span>
                      {rev.revision === req.revision && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Current Authoritative
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-zinc-400 font-mono">
                      Submitted by {rev.submittedByName ?? "System"} on{" "}
                      {new Date(rev.submittedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">Immutable snapshot</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: CLIENT REQUEST COMPOSER */}
      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-2xl bg-[#12151c] border border-white/[0.12] rounded-xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Request Information from Client</h3>
                <p className="text-[12px] text-zinc-400">
                  Select the exact decisions you need the client to make before proposal preparation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                className="p-1 rounded text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Questions to configure */}
            <div className="space-y-6">
              {composerItems.map((item, idx) => (
                <div key={item.section} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                      0{idx + 1} · {item.title}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">{item.answerType}</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase text-zinc-400">Client Question</label>
                    <input
                      type="text"
                      value={item.question}
                      onChange={(e) => {
                        const next = [...composerItems];
                        next[idx].question = e.target.value;
                        setComposerItems(next);
                      }}
                      className="w-full h-10 px-3 rounded-lg border border-white/[0.1] bg-[#0d0f12] text-[13px] text-white outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase text-zinc-400">Why we are asking (Client sees this)</label>
                    <input
                      type="text"
                      value={item.whyWeAsk}
                      onChange={(e) => {
                        const next = [...composerItems];
                        next[idx].whyWeAsk = e.target.value;
                        setComposerItems(next);
                      }}
                      className="w-full h-10 px-3 rounded-lg border border-white/[0.1] bg-[#0d0f12] text-[13px] text-zinc-300 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Composer Summary */}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 flex items-center justify-between text-[12px] font-mono text-zinc-400">
              <span>Client will receive {composerItems.length} questions</span>
              <span>Estimated completion: 2–3 minutes</span>
            </div>

            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleOpenPreview}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-300 hover:text-white"
              >
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>Preview client view</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setComposerOpen(false)}
                  className="px-4 py-2 rounded-lg text-[13px] text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={sendingRequest || composerItems.length === 0}
                  onClick={handleSendClientRequest}
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0d0f12] text-[13px] font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{sendingRequest ? "Sending..." : "Send request"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REJECT CHANGE (MANDATORY REASON) */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#12151c] border border-red-500/30 rounded-xl shadow-2xl p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Reject Client Change</h3>
              <p className="text-[12px] text-zinc-400 mt-1">
                A specific reason is mandatory. The client will be notified and the previous approved value will remain authoritative.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase text-red-400">Rejection Reason (Required)</label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. This change exceeds the agreed Phase 1 scope and requires formal contract amendment."
                className="w-full rounded-lg border border-red-500/30 bg-[#0d0f12] p-3 text-[13px] text-white placeholder:text-zinc-600 outline-none focus:border-red-400 resize-y"
              />
            </div>

            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="px-4 py-2 rounded-lg text-[13px] text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingReject || !rejectReason.trim()}
                onClick={handleRejectSubmit}
                className="px-5 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-[13px] font-semibold transition-all disabled:opacity-40"
              >
                {submittingReject ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REQUEST CLARIFICATION */}
      {clarifyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#12151c] border border-white/[0.12] rounded-xl shadow-2xl p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Request Clarification</h3>
              <p className="text-[12px] text-zinc-400 mt-1">
                Tell the client exactly what needs to be clarified on {clarifyTarget.sectionLabel}.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase text-zinc-400">What needs clarification?</label>
              <textarea
                rows={3}
                value={clarificationNote}
                onChange={(e) => setClarificationNote(e.target.value)}
                placeholder="e.g. Please clarify whether multi-currency settlement is needed in Version 1."
                className="w-full rounded-lg border border-white/[0.1] bg-[#0d0f12] p-3 text-[13px] text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 resize-y"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase text-zinc-400">Optional Guidance</label>
              <input
                type="text"
                value={clarificationGuidance}
                onChange={(e) => setClarificationGuidance(e.target.value)}
                placeholder="e.g. Choosing single currency saves approximately 1 week of integration time."
                className="w-full h-10 px-3 rounded-lg border border-white/[0.1] bg-[#0d0f12] text-[13px] text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setClarifyTarget(null)}
                className="px-4 py-2 rounded-lg text-[13px] text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingClarify || !clarificationNote.trim()}
                onClick={handleClarifySubmit}
                className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0d0f12] text-[13px] font-semibold transition-all disabled:opacity-40"
              >
                {submittingClarify ? "Sending..." : "Send Clarification"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: FULL CLIENT PREVIEW MODAL */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-5xl h-[90vh] bg-[#0d0f12] border border-white/[0.14] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <ClientRequirementPortal
                initial={{
                  token: clientToken ?? "preview-token",
                  request: {
                    reference: req.reference,
                    title: req.title,
                    projectType: req.projectType,
                    status: req.status,
                    companyName: client?.companyName ?? "Client Org",
                    responderName: req.responderName,
                    submittedAt: req.submittedAt,
                    approvedAt: req.approvedAt,
                  },
                  questions: reviewQueue
                    .filter((i) => i.status !== "CONFIRMED")
                    .map((i) => ({
                      id: i.id,
                      section: i.key,
                      category: i.category,
                      question: i.suggestedQuestion,
                      whyWeAsk: i.whyWeNeedThis,
                      answerType: i.responseType,
                      options: i.options,
                      currentAnswer: i.currentAnswer,
                    })),
                  understanding: understanding ?? {
                    status: "DRAFT",
                    approvedAt: null,
                    approvedBy: null,
                    brief: {
                      businessObjective: "Platform objective",
                      users: "Administrators",
                      coreScope: "Version 1",
                      keyCapabilities: "Core modules",
                      designDirection: "Modern enterprise",
                      integrations: "APIs",
                      timeline: "8-12 weeks",
                      commercialUnderstanding: "Milestone based",
                      successCriteria: "Adoption",
                    },
                    changeRequests: [],
                  },
                  recentEvents: bundle.events ?? [],
                }}
                isPreviewMode={true}
                onClosePreview={() => setPreviewModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
