"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Ban,
  Banknote,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  Copy,
  Download,
  Eye,
  FileStack,
  FileText,
  Lightbulb,
  Loader2,
  Mail,
  MessageCircle,
  Pencil,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldX,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SECTIONS, getSection, type SectionDef } from "@/lib/requirement-config";
import type { Intel, NextAction } from "@/lib/requirement-intel";
import { acceptedClarificationKeys, sectionLabel } from "@/lib/requirement-intel";
import { StatusChip, MicroButton, EmptyState } from "./kit";

/* ────────────────────────────────────────────────────────────────
   REQUIREMENT COMMAND CENTER — ADMIN INTELLIGENCE
   The premium review surface for one requirement request. A three-column
   composition: requirement navigator (left) · editorial document (center)
   · live intelligence (right). Everything is real data — completeness,
   readiness, review states, next action and the intelligence cards are
   derived from the stored answers, never invented. No manual re-entry.
──────────────────────────────────────────────────────────────── */

type AdminBundle = {
  ok: true;
  request: {
    id: string; reference: string; title: string; projectType: string;
    status: string; statusLabel: string; revision: number;
    completeness: number; readiness: number;
    sentTo: string | null; sentAt: string | null; lastOpenedAt: string | null;
    submittedAt: string | null; approvedAt: string | null;
    responderName: string | null; responderRole: string | null; createdAt: string;
    createdByName: string | null; canSend: boolean;
  };
  client: { id: string; companyName: string; industry: string | null; status: string; email: string | null } | null;
  answers: Record<string, Record<string, unknown>>;
  features: {
    id: string; name: string; priority: string; users: string[];
    description: string; config: Record<string, unknown>;
    acceptanceCriteria: string[]; dependencies: string[];
  }[];
  attachments: { id: string; name: string; size: number; mime: string; section: string; uploadedByName: string | null; createdAt: string }[];
  comments: { id: string; author: string; authorName: string; section: string | null; message: string; resolvedAt: string | null; createdAt: string }[];
  revisions: { id: string; revision: number; submittedByName: string | null; submittedAt: string; changes: string[] }[];
  events: { id: string; type: string; label: string; detail: string | null; meta: Record<string, unknown>; createdAt: string }[];
  states: Record<string, boolean>;
  proposals: { id: string; title: string; status: string; amount: number | null; createdAt: string }[];
  questions: {
    id: string; section: string; sectionLabel: string;
    category: string | null; categoryLabel: string | null; subcategory: string | null;
    featureId: string | null;
    question: string; clientQuestion: string; internalNote: string | null;
    currentUnderstanding: string | null; whyWeAsk: string | null; helpText: string | null;
    answerType: string; options: string[]; priority: string; isBlocking: boolean;
    impact: Record<string, string>; qualityScore: number | null; qualityFlags: string[];
    version: number; dependsOnQuestionId: string | null; dependsOnAnswer: string | null;
    recipientName: string; recipientEmail: string; createdByName: string | null;
    status: string; sentAt: string | null; respondedAt: string | null;
    response: string | null; answerData: Record<string, unknown> | null;
    respondedByName: string | null; approvedAt: string | null; resolvedAt: string | null;
    createdAt: string; updatedAt: string;
  }[];
  clientContacts: { id: string; name: string; role: string | null; email: string | null; isPrimary: boolean }[];
  proposalBlock: { blocked: boolean; blockers: { id: string; label: string; category: string }[] };
  conflicts: { id: string; description: string; detail: string | null; createdAt: string }[];
  intel: Intel;
};

type ViewId = "overview" | "review" | "activity" | string; // section keys included

type Ceremony =
  | { phase: "approved" }
  | { phase: "building"; proposalId: string }
  | { phase: "ready"; proposalId: string }
  | null;

const PROJECT_TYPE_LABELS: Record<string, string> = {
  WEBSITE: "Website",
  WEB_APP: "Web Application",
  MOBILE_APP: "Mobile App",
  SAAS: "SaaS Product",
  ECOMMERCE: "E-Commerce",
  INTERNAL_SYSTEM: "Internal System",
  OTHER: "Custom Project",
};

function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

const QUESTION_STATUS_TONES: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Draft", cls: "text-[var(--bos-text-tertiary)] border-[var(--bos-line)] bg-[var(--bos-overlay)]" },
  READY_FOR_REVIEW: { label: "Needs review", cls: "text-[var(--bos-warning)] border-[var(--bos-warning)]/25 bg-[var(--bos-warning)]/6" },
  APPROVED: { label: "Approved", cls: "text-[var(--bos-info)] border-[var(--bos-info)]/25 bg-[var(--bos-info)]/8" },
  READY_TO_SEND: { label: "Ready to send", cls: "text-[var(--bos-text-tertiary)] border-[var(--bos-line)] bg-[var(--bos-overlay)]" },
  SENDING: { label: "Sending", cls: "text-[var(--bos-info)] border-[var(--bos-info)]/25 bg-[var(--bos-info)]/8" },
  SENT: { label: "Awaiting response", cls: "text-[var(--bos-warning)] border-[var(--bos-warning)]/25 bg-[var(--bos-warning)]/6" },
  DELIVERED: { label: "Delivered", cls: "text-[var(--bos-info)] border-[var(--bos-info)]/25 bg-[var(--bos-info)]/8" },
  OPENED: { label: "Opened", cls: "text-[var(--bos-info)] border-[var(--bos-info)]/25 bg-[var(--bos-info)]/8" },
  ANSWERED: { label: "Answered", cls: "text-[var(--bos-success)] border-[var(--bos-success)]/25 bg-[var(--bos-success)]/6" },
  UNDER_REVIEW: { label: "Under review", cls: "text-[var(--bos-warning)] border-[var(--bos-warning)]/25 bg-[var(--bos-warning)]/6" },
  RESOLVED: { label: "Resolved", cls: "text-[var(--bos-success)] border-[var(--bos-success)]/25 bg-[var(--bos-success)]/6" },
  BLOCKED: { label: "Blocked", cls: "text-[var(--bos-error)] border-[var(--bos-error)]/25 bg-[var(--bos-error)]/6" },
  FAILED: { label: "Delivery failed", cls: "text-[var(--bos-error)] border-[var(--bos-error)]/25 bg-[var(--bos-error)]/6" },
  CANCELLED: { label: "Cancelled", cls: "text-[var(--bos-text-tertiary)] border-[var(--bos-line)] bg-[var(--bos-overlay)]" },
  EXPIRED: { label: "Expired", cls: "text-[var(--bos-text-tertiary)] border-[var(--bos-line)] bg-[var(--bos-overlay)]" },
};

function QuestionStatusChip({ status }: { status: string }) {
  const tone = QUESTION_STATUS_TONES[status] ?? { label: status.replace(/_/g, " "), cls: "text-[var(--bos-text-secondary)] border-[var(--bos-line)] bg-[var(--bos-overlay)]" };
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-[3px] border text-[9px] font-mono uppercase tracking-[0.1em]", tone.cls)}>
      {tone.label}
    </span>
  );
}

/* ── Deterministic intelligence ─────────────────────────────────
   Every number and label below is computed from the bundle's real
   stored data. Nothing is fabricated. */

type ReviewState = "confirmed" | "clarify" | "pending";

function openAdminComments(bundle: AdminBundle, section?: string) {
  return bundle.comments.filter(
    (c) => c.author === "ADMIN" && !c.resolvedAt && (section ? c.section === section : true),
  );
}

const IN_FLIGHT_STATUSES = ["DRAFT", "READY_FOR_REVIEW", "APPROVED", "READY_TO_SEND", "SENDING", "SENT", "DELIVERED", "OPENED"];
const OPEN_Q_STATUSES = ["READY_TO_SEND", "SENDING", "SENT", "DELIVERED", "OPENED"];

/** Any in-flight question (draft through awaiting-client) for one section. */
function inFlightQuestions(bundle: AdminBundle, section?: string) {
  return bundle.questions.filter(
    (q) => IN_FLIGHT_STATUSES.includes(q.status) && (section ? q.section === section : true),
  );
}

/** Questions where the client's answer is genuinely awaited. */
function awaitingClientQuestions(bundle: AdminBundle) {
  return bundle.questions.filter((q) => OPEN_Q_STATUSES.includes(q.status));
}

/** Per-section review state — complete + no open clarification/question = confirmed. */
function sectionReview(bundle: AdminBundle, key: string): ReviewState {
  if (openAdminComments(bundle, key).length > 0) return "clarify";
  if (inFlightQuestions(bundle, key).length > 0) return "clarify";
  // Accepted clarification answers confirm the section item — the same rule
  // the backend uses, so the review checklist can never contradict the
  // intelligence engine (spec 08: one authoritative blocker calculation).
  if (bundle.states[key] || acceptedClarificationKeys(bundle.questions).has(key)) return "confirmed";
  return "pending";
}

function reviewProgress(bundle: AdminBundle) {
  const weightSections = SECTIONS.filter((s) => s.weight > 0);
  const totalWeight = weightSections.reduce((a, s) => a + s.weight, 0);
  const confirmedWeight = weightSections.reduce(
    (a, s) => a + (sectionReview(bundle, s.key) === "confirmed" ? s.weight : 0),
    0,
  );
  return {
    percent: totalWeight > 0 ? Math.round((confirmedWeight / totalWeight) * 100) : 0,
    confirmed: weightSections.filter((s) => sectionReview(bundle, s.key) === "confirmed").length,
    total: weightSections.length,
    ready: totalWeight > 0 && confirmedWeight === totalWeight,
  };
}

/** Things that genuinely need attention, derived from the data. */
function attentionItems(bundle: AdminBundle) {
  const items: { kind: "incomplete" | "clarify"; text: string; section: string | null }[] = [];
  const accepted = acceptedClarificationKeys(bundle.questions);
  for (const s of SECTIONS.filter((sec) => sec.weight > 0)) {
    if (!bundle.states[s.key] && !accepted.has(s.key)) {
      items.push({ kind: "incomplete", text: `${s.label} not confirmed`, section: s.key });
    }
  }
  for (const c of openAdminComments(bundle)) {
    const label = c.section ? getSection(c.section)?.label ?? c.section : "Requirement";
    items.push({ kind: "clarify", text: `${label} — awaiting client response`, section: c.section });
  }
  for (const q of inFlightQuestions(bundle)) {
    const label = getSection(q.section)?.label ?? q.section;
    items.push({
      kind: "clarify",
      text: OPEN_Q_STATUSES.includes(q.status)
        ? `${label} — awaiting response from ${q.recipientName}`
        : `${label} — clarification ${q.status.replace(/_/g, " ").toLowerCase()} (${q.categoryLabel ?? "unclassified"})`,
      section: q.section,
    });
  }
  return items;
}

function intentSignal(bundle: AdminBundle) {
  const business = bundle.answers.business ?? {};
  const vision = bundle.answers.vision ?? {};
  const parts = [business.description, vision.description];
  const present = parts.filter(Boolean).length;
  const confidence = Math.round(
    ((bundle.states.business ? 1 : 0) + (bundle.states.vision ? 1 : 0) + (bundle.states.users ? 1 : 0)) / 3 * 100,
  );
  if (present === 2) return { label: "Clear", confidence, tone: "good" as const };
  if (present === 1) return { label: "Partially clear", confidence, tone: "warn" as const };
  return { label: "Not captured yet", confidence, tone: "neutral" as const };
}

function scopeSignal(bundle: AdminBundle) {
  const openSections = new Set<string>();
  const accepted = acceptedClarificationKeys(bundle.questions);
  for (const s of SECTIONS.filter((sec) => sec.weight > 0)) {
    if (!bundle.states[s.key] && !accepted.has(s.key)) openSections.add(s.key);
  }
  for (const q of inFlightQuestions(bundle)) openSections.add(q.section);
  const open = openSections.size;
  return {
    label: open === 0 ? "Clear" : "Needs attention",
    open,
    tone: open === 0 ? ("good" as const) : ("warn" as const),
  };
}

function readinessSignal(readiness: number) {
  const label =
    readiness >= 95 ? "Ready" : readiness >= 70 ? "Almost ready" : readiness >= 40 ? "In progress" : "Early";
  return { label, readiness };
}

/** Suggested question per section — deterministic guidance for Ask Client. */
const SUGGESTED_QUESTIONS: Record<string, string> = {
  business: "Could you describe how the current process works today, in a little more detail?",
  vision: "Could you elaborate on what success looks like for this project?",
  users: "Who specifically will use the product, and what do they need to accomplish?",
  scope: "Could you confirm what should be included in the initial release?",
  features: "Which features are must-haves for launch?",
  design: "Do you have brand guidelines or reference material we should follow?",
  existingSystem: "Which parts of the current system should we keep, change or replace?",
  technology: "Are there any technology constraints or preferences we should know about?",
  integrations: "Could you confirm which external services the product must connect to?",
  timeline: "Could you confirm whether the delivery date is fixed?",
  commercial: "Could you confirm the budget model and range for this project?",
  stakeholders: "Who should we coordinate with on your side?",
  success: "What would make this project a clear success for you?",
};

export function RequirementCommandCenter({
  requestId,
  initialLink,
  defaultEmail,
  onClose,
  onChanged,
}: {
  requestId: string;
  initialLink?: string | null;
  defaultEmail?: string | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [bundle, setBundle] = useState<AdminBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewId>("overview");
  const [reviewMode, setReviewMode] = useState(false);
  const [dialog, setDialog] = useState<null | "send" | "remind" | "ask" | "revoke" | "proposal">(null);
  const [dialogSection, setDialogSection] = useState<string | null>(null);
  const [viewQuestionId, setViewQuestionId] = useState<string | null>(null);
  const [ceremony, setCeremony] = useState<Ceremony>(null);
  const [link, setLink] = useState<string | null>(initialLink ?? null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const reducedMotion = useReducedMotion();

  const load = useCallback(async () => {
    const res = await fetch(`/api/requirements/${requestId}`);
    const data = await res.json();
    if (res.ok && data.ok) setBundle(data);
    else setError(data.message ?? "Unable to load the requirement request.");
  }, [requestId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Live view — silently re-poll so the client's progress and submitted
  // responses show up here without a manual refresh.
  useEffect(() => {
    const t = window.setInterval(() => {
      void load();
    }, 10_000);
    return () => window.clearInterval(t);
  }, [load]);

  const act = async (path: string, body?: Record<string, unknown>): Promise<{ ok: boolean; data?: Record<string, unknown>; message?: string }> => {
    setBusy(true);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setNotice(`⚠ ${data.message ?? "Action failed."}`);
        return { ok: false, message: data.message, data };
      }
      setNotice(null);
      await load();
      await onChanged();
      return { ok: true, data };
    } catch {
      setNotice("⚠ Network error — please retry.");
      return { ok: false };
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  const openAskClient = (section: string | null = null) => {
    setViewQuestionId(null);
    setDialogSection(section);
    setDialog("ask");
  };

  const approve = () => {
    if (!bundle) return;
    void act(`/api/requirements/${bundle.request.id}/approve`).then((res) => {
      if (res.ok) {
        setCeremony({ phase: "approved" });
      }
    });
  };

  const createProposal = () => {
    if (!bundle) return;
    void act(`/api/requirements/${bundle.request.id}/proposal`).then((res) => {
      if (res.ok) {
        const proposal = res.data?.proposal as { id?: string } | undefined;
        const proposalId = proposal?.id ? String(proposal.id) : "";
        if (proposalId) setCeremony({ phase: "building", proposalId });
      }
    });
  };

  if (error) {
    return (
      <div className="rounded-sm border border-[var(--bos-error)]/30 bg-[var(--bos-error)]/5 p-6">
        <p className="text-[13px] text-[var(--bos-error)]">{error}</p>
        <MicroButton onClick={onClose} className="mt-3">Close</MicroButton>
      </div>
    );
  }

  if (!bundle) {
    return (
      <div className="rounded-sm border border-[var(--bos-line)] p-8 space-y-3" aria-busy="true">
        <div className="h-4 w-56 bg-[var(--bos-overlay)] animate-pulse rounded-sm" />
        <div className="h-3 w-80 bg-[var(--bos-overlay)] animate-pulse rounded-sm" />
        <div className="h-24 w-full bg-[var(--bos-overlay)] animate-pulse rounded-sm" />
      </div>
    );
  }

  const r = bundle.request;
  const weightSections = SECTIONS.filter((s) => s.weight > 0);
  const completeWeight = weightSections.filter((s) => bundle.states[s.key]).length;
  const attention = attentionItems(bundle);
  const review = reviewProgress(bundle);
  const intent = intentSignal(bundle);
  const scopeSig = scopeSignal(bundle);
  const readiness = readinessSignal(r.readiness);
  // Admin is the review authority: a requirement that has been collected
  // (client filling the workspace, submitted, or awaiting changes) can be
  // reviewed and approved — the submit click is not the gate.
  const canReview = ["SENT", "IN_PROGRESS", "SUBMITTED", "REVISION_SUBMITTED", "CHANGES_REQUESTED"].includes(r.status);
  // Review mode only activates within the Review tab — navigating elsewhere auto-deactivates it.
  const inReview = reviewMode && canReview && view === "review";
  const newestProposal = bundle.proposals[0] ?? null;

  const handleAction = (path: string, payload?: Record<string, unknown>) =>
    void act(path, payload).then((res) => {
      if (res.ok) setDialog(null);
    });

  return (
    <div className="rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-bg)]/80 overflow-hidden">
      {/* ═══ HERO — project intelligence header ═══ */}
      <div className="px-4 sm:px-5 py-4 border-b border-[var(--bos-line)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-[10px] tracking-[0.12em] text-[var(--bos-text-tertiary)]">{r.reference}</span>
            <span className="text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--bos-accent)]">
              {PROJECT_TYPE_LABELS[r.projectType] ?? r.projectType.replace("_", " ")}
            </span>
          </div>
          <MicroButton onClick={onClose}>
            <X className="w-3 h-3" aria-hidden="true" /> Close
          </MicroButton>
        </div>

        <div className="mt-2.5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--bos-text-tertiary)]">
              Requirement Intelligence
            </div>
            <h2 className="mt-1 text-[22px] font-semibold tracking-tight text-[var(--bos-text-primary)] leading-tight truncate">
              {r.title}
            </h2>
            <div className="mt-1.5 flex items-center gap-2.5 flex-wrap text-[11px] text-[var(--bos-text-tertiary)]">
              <span className="font-medium text-[var(--bos-text-secondary)]">{bundle.client?.companyName}</span>
              {r.responderName && (
                <span>Respondent · {r.responderName}{r.responderRole ? ` (${r.responderRole})` : ""}</span>
              )}
              <span>Revision {r.revision}</span>
              {r.approvedAt && (
                <span className="text-[var(--bos-success)]">
                  Approved {new Date(r.approvedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              )}
            </div>
          </div>

          {/* Primary actions — contextual, one obvious next step */}
          <div className="flex items-center gap-1.5 flex-wrap shrink-0 justify-end">
            {r.status === "DRAFT" && (
              <MicroButton variant="accent" onClick={() => setDialog("send")}>
                <Send className="w-3 h-3" aria-hidden="true" /> Send link
              </MicroButton>
            )}
            {["SENT", "IN_PROGRESS", "CHANGES_REQUESTED"].includes(r.status) && (
              <>
                <MicroButton variant="accent" onClick={() => setDialog("send")}>
                  <Mail className="w-3 h-3" aria-hidden="true" /> Remind
                </MicroButton>
                <MicroButton onClick={() => void copyLink()}>
                  {copied ? <Check className="w-3 h-3 text-[var(--bos-success)]" aria-hidden="true" /> : <Copy className="w-3 h-3" aria-hidden="true" />}
                  {copied ? "Copied" : "Copy link"}
                </MicroButton>
              </>
            )}
            {canReview && (
              <MicroButton
                variant={inReview ? "default" : "accent"}
                onClick={() => {
                  setReviewMode(!inReview);
                  if (!inReview) setView("review");
                }}
              >
                <BadgeCheck className="w-3 h-3" aria-hidden="true" /> {inReview ? "Exit review" : "Review"}
              </MicroButton>
            )}
            {r.status !== "REVOKED" && (
              newestProposal ? (
                <a
                  href={`/proposals/${newestProposal.id}`}
                  className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm text-[11px] font-medium bg-[var(--bos-accent)] text-white hover:bg-[var(--bos-accent-hover)] transition-colors duration-150 shadow-sm"
                  title="Open proposal studio"
                >
                  <FileText className="w-3 h-3" aria-hidden="true" /> Proposal
                </a>
              ) : (
                <MicroButton
                  variant="accent"
                  onClick={() => setDialog("proposal")}
                  title="Create proposal from requirements"
                >
                  <Banknote className="w-3 h-3" aria-hidden="true" /> Proposal
                </MicroButton>
              )
            )}
            {r.status !== "APPROVED" && r.status !== "REVOKED" && (
              <>
                <MicroButton onClick={() => void act(`/api/requirements/${r.id}/regenerate`).then((res) => { if (res.ok) setLink(String(res.data?.link ?? "")); })}>
                  <RotateCcw className="w-3 h-3" aria-hidden="true" /> New link
                </MicroButton>
                <MicroButton onClick={() => setDialog("revoke")}>
                  <ShieldX className="w-3 h-3" aria-hidden="true" /> Revoke
                </MicroButton>
              </>
            )}
          </div>
        </div>

        {/* Project health */}
        <div className="mt-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)]">
                Project health
              </span>
              <span className="text-[10px] font-mono tabular-nums text-[var(--bos-text-secondary)]">{r.completeness}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--bos-overlay)] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-[var(--bos-accent)]"
                initial={reducedMotion ? false : { width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, r.completeness))}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <div className="mt-1.5 text-[10px] text-[var(--bos-text-tertiary)]">
              {completeWeight} of {weightSections.length} critical areas confirmed
              {attention.length > 0 && ` · ${attention.length} need attention`}
            </div>
          </div>
        </div>

        {/* Intelligence cards */}
        <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <IntelCard
            label="Client intent"
            value={intent.label}
            sub={`${intent.confidence}% confidence`}
            tone={intent.tone}
          />
          <IntelCard
            label="Scope clarity"
            value={scopeSig.label}
            sub={scopeSig.open > 0 ? `${scopeSig.open} question${scopeSig.open === 1 ? "" : "s"} open` : "All areas covered"}
            tone={scopeSig.tone}
          />
          <IntelCard
            label="Proposal ready"
            value={`${readiness.readiness}%`}
            sub={readiness.label}
            tone={readiness.readiness >= 95 ? "good" : readiness.readiness >= 70 ? "warn" : "neutral"}
          />
        </div>

        {notice && (
          <div className="mt-3 rounded-sm border border-[var(--bos-warning)]/25 bg-[var(--bos-warning)]/6 px-3 py-2 text-[11px] text-[var(--bos-text-secondary)]">
            {notice}
          </div>
        )}

        {/* Review mode bar */}
        <AnimatePresence>
          {inReview && (
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={reducedMotion ? undefined : { opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-3 flex items-center gap-3 rounded-sm border border-[var(--bos-warning)]/30 bg-[var(--bos-warning)]/6 px-3.5 py-2.5">
                <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-warning)]">
                  <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" /> Reviewing requirement
                </span>
                <span className="text-[10px] text-[var(--bos-text-tertiary)]">
                  {review.percent}% confirmed · {attention.length} item{attention.length === 1 ? "" : "s"} require attention
                </span>
                <MicroButton variant="ghost" onClick={() => { setReviewMode(false); setView("overview"); }} className="ml-auto">
                  Exit review
                </MicroButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dialogs */}
        {dialog && (
          <Dialog
            kind={dialog}
            bundle={bundle}
            link={link}
            defaultEmail={defaultEmail ?? r.sentTo ?? undefined}
            initialSection={dialogSection}
            busy={busy}
            clientContacts={bundle.clientContacts}
            questions={bundle.questions}
            onClarifyAction={(path, body) =>
              act(path, body).then((res) => {
                if (res.ok && res.data?.dev) {
                  setNotice(`⚠ ${String(res.data.message ?? "Email provider not configured — the question was sent in dev mode and the response link was printed to the server console.")}`);
                }
                return res;
              })
            }
            onSend={(payload) =>
              void act(`/api/requirements/${r.id}/send`, payload).then((res) => {
                if (res.ok) {
                  setDialog(null);
                  if (res.data?.link) setLink(String(res.data.link));
                  setNotice(res.data?.message ? String(res.data.message) : "✓ Requirement link sent.");
                }
              })
            }
            onRemind={(payload) =>
              void act(`/api/requirements/${r.id}/remind`, payload).then((res) => {
                if (res.ok) {
                  setDialog(null);
                  if (res.data?.link) setLink(String(res.data.link));
                }
              })
            }
            onViewQuestion={(qid) => { setDialog(null); setDialogSection(null); setViewQuestionId(qid); }}
            onRevoke={(payload) => handleAction(`/api/requirements/${r.id}/revoke`, payload)}
            onProposal={createProposal}
            onOpenClarifications={() => { setDialog(null); setDialogSection(null); setView("clarifications"); }}
            onClose={() => { setDialog(null); setDialogSection(null); }}
          />
        )}
      </div>

      {/* ═══ Approval ceremony ═══ */}
      <AnimatePresence>
        {ceremony && (
          <CeremonyView
            ceremony={ceremony}
            bundle={bundle}
            onClose={() => setCeremony(null)}
            onCreateProposal={createProposal}
          />
        )}
      </AnimatePresence>

      {!ceremony && (
        <div className="grid lg:grid-cols-[208px_minmax(0,1fr)_264px]">
          {/* ═══ LEFT — requirement navigator ═══ */}
          <aside className="hidden lg:block border-r border-[var(--bos-line)] bg-[var(--bos-surface)]/30">
            <div className="px-3.5 pt-3 pb-2 text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)]">
              Requirement
            </div>
            <nav className="px-2 pb-4 space-y-px" aria-label="Requirement sections">
              <NavItem
                active={view === "overview"}
                onClick={() => setView("overview")}
                icon={<ClipboardList className="w-3.5 h-3.5" aria-hidden="true" />}
                label="Overview"
                right={r.status === "APPROVED" ? <Check className="w-3 h-3 text-[var(--bos-success)]" aria-hidden="true" /> : undefined}
              />
              <NavItem
                active={view === "review"}
                onClick={() => { setView("review"); setReviewMode(canReview); }}
                icon={<BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" />}
                label="Review"
                right={
                  canReview && attention.length > 0 ? (
                    <span className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[var(--bos-warning)]/15 text-[9px] font-mono text-[var(--bos-warning)]">
                      {attention.length}
                    </span>
                  ) : review.ready ? (
                    <Check className="w-3 h-3 text-[var(--bos-success)]" aria-hidden="true" />
                  ) : undefined
                }
              />
              <NavItem
                active={view === "clarifications"}
                onClick={() => setView("clarifications")}
                icon={<MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />}
                label="Clarifications"
                right={
                  bundle.questions.length > 0 ? (
                    <span className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[var(--bos-overlay)] text-[9px] font-mono text-[var(--bos-text-tertiary)]">
                      {bundle.questions.length}
                    </span>
                  ) : undefined
                }
              />
              <NavItem
                active={view === "activity"}
                onClick={() => setView("activity")}
                icon={<Clock className="w-3.5 h-3.5" aria-hidden="true" />}
                label="Activity"
                right={
                  bundle.events.length > 0 ? (
                    <span className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[var(--bos-overlay)] text-[9px] font-mono text-[var(--bos-text-tertiary)]">
                      {bundle.events.length}
                    </span>
                  ) : undefined
                }
              />

              <div className="pt-3 pb-1.5 text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)] px-1">
                Sections
              </div>
              {SECTIONS.map((s) => {
                const state = sectionReview(bundle, s.key);
                const openCount = bundle.comments.filter((c) => c.section === s.key && !c.resolvedAt).length;
                const attachmentCount = s.key === "files" ? bundle.attachments.length : 0;
                return (
                  <NavItem
                    key={s.key}
                    active={view === s.key}
                    onClick={() => setView(s.key)}
                    label={s.label}
                    number={s.number}
                    right={
                      attachmentCount > 0 ? (
                        <span className="text-[10px] text-[var(--bos-text-tertiary)] tabular-nums">{attachmentCount}</span>
                      ) : state === "confirmed" ? (
                        <Check className="w-3 h-3 text-[var(--bos-success)]" aria-hidden="true" />
                      ) : state === "clarify" ? (
                        <AlertTriangle className="w-3 h-3 text-[var(--bos-warning)]" aria-hidden="true" />
                      ) : openCount > 0 ? (
                        <span className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[var(--bos-overlay)] text-[9px] font-mono text-[var(--bos-text-tertiary)]">
                          {openCount}
                        </span>
                      ) : undefined
                    }
                    tone={state === "clarify" ? "warn" : state === "confirmed" ? "good" : "muted"}
                  />
                );
              })}
            </nav>
          </aside>

          {/* Mobile section picker */}
          <div className="lg:hidden border-b border-[var(--bos-line)] px-3 py-2 flex gap-1 overflow-x-auto no-scrollbar">
            <MobileChip active={view === "overview"} onClick={() => setView("overview")}>Overview</MobileChip>
            <MobileChip active={view === "review"} onClick={() => setView("review")}>Review</MobileChip>
            <MobileChip active={view === "clarifications"} onClick={() => setView("clarifications")}>Clarifications</MobileChip>
            <MobileChip active={view === "activity"} onClick={() => setView("activity")}>Activity</MobileChip>
            {SECTIONS.map((s) => (
              <MobileChip key={s.key} active={view === s.key} onClick={() => setView(s.key)}>
                {s.number} · {s.label}
              </MobileChip>
            ))}
          </div>

          {/* ═══ CENTER — editorial document ═══ */}
          <div className="min-w-0 px-4 sm:px-6 py-5">
            {busy && (
              <div className="mb-3 flex items-center gap-2 text-[11px] text-[var(--bos-text-tertiary)]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Updating…
              </div>
            )}

            {viewQuestionId ? (
              <QuestionDetailPanel
                questionId={viewQuestionId}
                bundle={bundle}
                onClose={() => setViewQuestionId(null)}
                onChanged={load}
              />
            ) : (
              <>
                {view === "overview" && (
                  <DecisionCenterView
                    bundle={bundle}
                    onAskClient={openAskClient}
                    onViewQuestion={(qid) => setViewQuestionId(qid)}
                    onReview={() => { setView("review"); setReviewMode(true); }}
                    onApprove={approve}
                    onProposal={() => setDialog("proposal")}
                    onSend={() => setDialog("send")}
                    onViewClarifications={() => setView("clarifications")}
                    onViewActivity={() => setView("activity")}
                    onViewSection={(key) => setView(key)}
                  />
                )}
                {view === "review" && (
                  <ReviewView
                    bundle={bundle}
                    review={review}
                    attention={attention}
                    canReview={canReview}
                    onAskClient={openAskClient}
                    onApprove={approve}
                    onProposal={() => setDialog("proposal")}
                    onOpenProposal={() => {
                      if (newestProposal) router.push(`/proposals/${newestProposal.id}`);
                    }}
                  />
                )}
                {view === "activity" && (
                  <ActivityView
                    bundle={bundle}
                    onViewQuestion={(qid) => setViewQuestionId(qid)}
                    onResolveComment={(cid) => void act(`/api/requirements/${r.id}/comments/${cid}/resolve`)}
                  />
                )}
                {view === "clarifications" && (
                  <ClarificationsView
                    bundle={bundle}
                    onViewQuestion={(qid) => setViewQuestionId(qid)}
                    onAskClient={openAskClient}
                  />
                )}
                {SECTIONS.map((s) =>
                  view === s.key ? (
                    <SectionView
                      key={s.key}
                      bundle={bundle}
                      section={s}
                      inReview={inReview}
                      reviewState={sectionReview(bundle, s.key)}
                      onAskClient={() => openAskClient(s.key)}
                      onViewQuestion={(qid) => setViewQuestionId(qid)}
                      onResolveComment={(cid) => void act(`/api/requirements/${r.id}/comments/${cid}/resolve`)}
                    />
                  ) : null,
                )}
              </>
            )}
          </div>

          {/* ═══ RIGHT — live intelligence ═══ */}
          <aside className="hidden lg:block border-l border-[var(--bos-line)] bg-[var(--bos-surface)]/30">
            <div className="px-3.5 pt-3 pb-2 text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)]">
              Requirement intelligence
            </div>
            <div className="px-3.5 pb-5 space-y-5">
              {/* Scope health */}
              <div>
                <div className="mb-1.5 text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-secondary)]">Scope health</div>
                <div className={cn("flex items-center gap-1.5 text-[12px] font-medium", scopeSig.tone === "good" ? "text-[var(--bos-success)]" : "text-[var(--bos-warning)]")}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", scopeSig.tone === "good" ? "bg-[var(--bos-success)]" : "bg-[var(--bos-warning)]")} aria-hidden="true" />
                  {scopeSig.label}
                </div>
              </div>

              {/* Proposal readiness */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-secondary)]">Proposal readiness</span>
                  <span className="text-[10px] font-mono tabular-nums text-[var(--bos-text-secondary)]">{readiness.readiness}%</span>
                </div>
                <div className="h-1 rounded-full bg-[var(--bos-overlay)] overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-500",
                      readiness.readiness >= 95 ? "bg-[var(--bos-success)]" : readiness.readiness >= 70 ? "bg-[var(--bos-warning)]" : "bg-[var(--bos-accent)]",
                    )}
                    style={{ width: `${Math.min(100, Math.max(0, readiness.readiness))}%` }}
                  />
                </div>
                <div className="mt-1 text-[10px] text-[var(--bos-text-tertiary)]">{readiness.label}</div>
              </div>

              {/* Live activity */}
              <div>
                <div className="mb-2 text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-secondary)]">Live activity</div>
                {bundle.events.length === 0 ? (
                  <p className="text-[11px] text-[var(--bos-text-tertiary)]">No activity yet.</p>
                ) : (
                  <ol className="relative border-l border-[var(--bos-line)] ml-1 space-y-2.5">
                    {bundle.events.slice(0, 5).map((e) => (
                      <li key={e.id} className="pl-3.5 relative">
                        <span className="absolute -left-[3px] top-1 w-1.5 h-1.5 rounded-full bg-[var(--bos-accent)]" aria-hidden="true" />
                        <div className="flex items-center gap-2">
                          <div className="text-[11px] text-[var(--bos-text-primary)] leading-snug">{e.label}</div>
                          {typeof e.meta?.questionId === "string" && (
                            <MicroButton onClick={() => setViewQuestionId(String(e.meta.questionId))}>
                              <Eye className="w-3 h-3" aria-hidden="true" /> View
                            </MicroButton>
                          )}
                        </div>
                        <div className="text-[9px] text-[var(--bos-text-tertiary)] tabular-nums">
                          {new Date(e.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ·{" "}
                          {new Date(e.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

/* ═══ Hero intelligence card ═══ */

function IntelCard({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "good" | "warn" | "neutral" }) {
  return (
    <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 px-3.5 py-3">
      <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)]">{label}</div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className={cn(
          "text-[17px] font-semibold tracking-tight",
          tone === "good" ? "text-[var(--bos-success)]" : tone === "warn" ? "text-[var(--bos-warning)]" : "text-[var(--bos-text-primary)]",
        )}>
          {value}
        </span>
        {tone === "good" && <Check className="w-3.5 h-3.5 text-[var(--bos-success)]" aria-hidden="true" />}
        {tone === "warn" && <AlertTriangle className="w-3.5 h-3.5 text-[var(--bos-warning)]" aria-hidden="true" />}
      </div>
      <div className="mt-0.5 text-[10px] text-[var(--bos-text-tertiary)]">{sub}</div>
    </div>
  );
}

/* ═══ Left navigator items ═══ */

function NavItem({
  active,
  onClick,
  icon,
  label,
  number,
  right,
  tone = "muted",
}: {
  active: boolean;
  onClick: () => void;
  icon?: ReactNode;
  label: string;
  number?: string;
  right?: ReactNode;
  tone?: "muted" | "warn" | "good";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "w-full flex items-center gap-2 h-8 px-2 rounded-sm text-[12px] transition-colors duration-150",
        active
          ? "bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] font-medium"
          : tone === "warn"
            ? "text-[var(--bos-warning)] hover:bg-[var(--bos-overlay)]"
            : tone === "good"
              ? "text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)] hover:text-[var(--bos-text-primary)]"
              : "text-[var(--bos-text-tertiary)] hover:bg-[var(--bos-overlay)] hover:text-[var(--bos-text-primary)]",
      )}
    >
      {icon}
      <span className="flex-1 text-left truncate">{label}</span>
      {number && <span className="font-mono text-[9px] text-[var(--bos-text-tertiary)]">{number}</span>}
      {right}
    </button>
  );
}

function MobileChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 h-7 px-2.5 rounded-sm text-[11px] border transition-colors duration-150",
        active
          ? "border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] font-medium"
          : "border-[var(--bos-line)] text-[var(--bos-text-tertiary)] hover:border-[var(--bos-border-strong)]",
      )}
    >
      {children}
    </button>
  );
}

/* ═══ CENTER — Decision Center ═══
   The intelligence overview (spec 77/95): real stats, what we know,
   what needs attention, what we're waiting for, optional items, the
   proposal readiness check and the next best action — every value
   derived from stored data, with honest empty states. */

function DecisionCenterView({
  bundle,
  onAskClient,
  onViewQuestion,
  onReview,
  onApprove,
  onProposal,
  onSend,
  onViewClarifications,
  onViewActivity,
  onViewSection,
}: {
  bundle: AdminBundle;
  onAskClient: (section?: string | null) => void;
  onViewQuestion: (questionId: string) => void;
  onReview: () => void;
  onApprove: () => void;
  onProposal: () => void;
  onSend: () => void;
  onViewClarifications: () => void;
  onViewActivity: () => void;
  onViewSection: (key: string) => void;
}) {
  const intel = bundle.intel;
  const r = bundle.request;
  const health = intel.health;
  const openClarifications = intel.waitingOnClient.length + intel.needsReview.length;

  const healthTone =
    health.level === "GOOD" ? "good"
    : health.level === "WATCH" ? "warn"
    : health.level === "AT_RISK" ? "warn"
    : "danger";

  const nextActionButton = (next: NextAction) => {
    switch (next.kind) {
      case "send": return { label: "Send link", icon: <Send className="w-3 h-3" aria-hidden="true" />, onClick: onSend };
      case "review-question": return { label: "Review response", icon: <BadgeCheck className="w-3 h-3" aria-hidden="true" />, onClick: () => onViewQuestion(next.questionId) };
      case "waiting": return { label: "View clarifications", icon: <MessageCircle className="w-3 h-3" aria-hidden="true" />, onClick: onViewClarifications };
      case "ask": return { label: "Ask client", icon: <Mail className="w-3 h-3" aria-hidden="true" />, onClick: () => onAskClient(next.section) };
      case "resolve-conflict": return { label: "Resolve conflict", icon: <AlertTriangle className="w-3 h-3" aria-hidden="true" />, onClick: onViewClarifications };
      case "review": return { label: "Review requirement", icon: <BadgeCheck className="w-3 h-3" aria-hidden="true" />, onClick: onReview };
      case "approve": return { label: "Approve requirement", icon: <Check className="w-3 h-3" aria-hidden="true" />, onClick: onApprove };
      case "proposal": return { label: "Create proposal", icon: <Banknote className="w-3 h-3" aria-hidden="true" />, onClick: onProposal };
      default: return null;
    }
  };
  const nextButton = nextActionButton(intel.nextAction);

  /* Workflow stage for the pipeline banner */
  const pipelineStage =
    r.status === "DRAFT" ? 0
    : r.status === "SENT" || r.status === "IN_PROGRESS" ? 1
    : r.status === "SUBMITTED" || r.status === "REVISION_SUBMITTED" || r.status === "CHANGES_REQUESTED" ? 2
    : r.status === "APPROVED" ? 3
    : bundle.proposals.length > 0 ? 4
    : 3;

  const pipelineSteps = [
    { label: "Send link", icon: "→" },
    { label: "Client fills", icon: "✎" },
    { label: "Review", icon: "✓" },
    { label: "Approved", icon: "★" },
    { label: "Proposal", icon: "📄" },
  ];

  return (
    <div className="space-y-6 req-enter">
      {/* Workflow pipeline strip */}
      <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 px-4 py-3">
        <div className="text-[8px] font-mono uppercase tracking-[0.2em] text-[var(--bos-text-tertiary)] mb-2.5">Workflow</div>
        <div className="flex items-center gap-0">
          {pipelineSteps.map((step, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center min-w-[56px]">
                <span
                  className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-full border text-[10px] font-semibold transition-all",
                    i < pipelineStage
                      ? "border-[var(--bos-success)] bg-[var(--bos-success)] text-white"
                      : i === pipelineStage
                        ? "border-[var(--bos-accent)] bg-[var(--bos-accent)] text-white shadow-[0_0_0_3px_var(--bos-accent-ring)]"
                        : "border-[var(--bos-line-strong)] text-[var(--bos-text-tertiary)] bg-transparent",
                  )}
                >
                  {i < pipelineStage ? <Check className="w-3 h-3" /> : <span className="text-[9px]">{i + 1}</span>}
                </span>
                <span
                  className={cn(
                    "mt-1 text-[8px] font-mono uppercase tracking-[0.1em] text-center whitespace-nowrap",
                    i === pipelineStage ? "text-[var(--bos-accent)] font-semibold" : i < pipelineStage ? "text-[var(--bos-success)]" : "text-[var(--bos-text-tertiary)]",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < pipelineSteps.length - 1 && (
                <span
                  className={cn(
                    "h-px w-6 mb-4",
                    i < pipelineStage ? "bg-[var(--bos-success)]" : "bg-[var(--bos-line-strong)]",
                  )}
                  aria-hidden="true"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Header line — who, what version, what state */}
      <div className="flex items-center gap-2 flex-wrap text-[11px] text-[var(--bos-text-tertiary)]">
        <span className="font-medium text-[var(--bos-text-secondary)]">{bundle.client?.companyName ?? "No client"}</span>
        <span>·</span>
        <span>v{r.revision}</span>
        <span>·</span>
        <StatusChip status={r.status} />
      </div>

      {/* Real stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        <Stat label="Completeness" value={`${r.completeness}%`} tone={r.completeness >= 95 ? "good" : r.completeness >= 60 ? "warn" : "neutral"} />
        <Stat label="Proposal readiness" value={`${intel.readiness.percent}%`} tone={intel.readiness.percent >= 95 ? "good" : intel.readiness.percent >= 60 ? "warn" : "neutral"} />
        <Stat label="Blockers" value={String(intel.pendingCount)} tone={intel.pendingCount > 0 ? "danger" : "good"} />
        <Stat label="Clarifications" value={String(openClarifications)} tone={openClarifications > 0 ? "warn" : "neutral"} />
        <Stat label="Conflicts" value={String(bundle.conflicts.length)} tone={bundle.conflicts.length > 0 ? "danger" : "neutral"} />
      </div>

      {/* Section status grid — per-section client info at a glance */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)]">Sections — client information</span>
          <span className="h-px flex-1 bg-[var(--bos-line)]" aria-hidden="true" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {SECTIONS.filter((s) => s.weight > 0).map((s) => {
            const hasData = bundle.states[s.key] === true;
            const openQ = bundle.questions.filter((q) => q.section === s.key && ["READY_TO_SEND", "SENDING", "SENT", "DELIVERED", "OPENED"].includes(q.status));
            const answeredQ = bundle.questions.filter((q) => q.section === s.key && ["ANSWERED", "UNDER_REVIEW"].includes(q.status));
            const resolvedQ = bundle.questions.filter((q) => q.section === s.key && q.status === "RESOLVED");
            const state = answeredQ.length > 0 ? "review" : openQ.length > 0 ? "waiting" : hasData || resolvedQ.length > 0 ? "confirmed" : "empty";
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => onViewSection(s.key)}
                className={cn(
                  "flex items-start gap-2.5 rounded-sm border px-2.5 py-2 text-left transition-colors duration-150 hover:bg-[var(--bos-overlay)]",
                  state === "confirmed" && "border-[var(--bos-success)]/20 bg-[var(--bos-success)]/4",
                  state === "review" && "border-[var(--bos-warning)]/25 bg-[var(--bos-warning)]/5",
                  state === "waiting" && "border-[var(--bos-info)]/20 bg-[var(--bos-info)]/5",
                  state === "empty" && "border-[var(--bos-line)] bg-transparent",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 w-1.5 h-1.5 rounded-full shrink-0",
                    state === "confirmed" && "bg-[var(--bos-success)]",
                    state === "review" && "bg-[var(--bos-warning)]",
                    state === "waiting" && "bg-[var(--bos-info)]",
                    state === "empty" && "bg-[var(--bos-line-strong)]",
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-[var(--bos-text-primary)] truncate">{s.label}</div>
                  <div className={cn(
                    "mt-0.5 text-[9px] font-mono uppercase tracking-[0.1em]",
                    state === "confirmed" && "text-[var(--bos-success)]",
                    state === "review" && "text-[var(--bos-warning)]",
                    state === "waiting" && "text-[var(--bos-info)]",
                    state === "empty" && "text-[var(--bos-text-tertiary)]",
                  )}>
                    {state === "confirmed" && "Confirmed"}
                    {state === "review" && `${answeredQ.length} answer${answeredQ.length === 1 ? "" : "s"} to review`}
                    {state === "waiting" && `Awaiting client`}
                    {state === "empty" && "Not provided"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Requirement health — explainable */}
      <div
        className={cn(
          "rounded-sm border px-4 py-3 flex items-start gap-3",
          healthTone === "good" && "border-[var(--bos-success)]/25 bg-[var(--bos-success)]/6",
          healthTone === "warn" && "border-[var(--bos-warning)]/25 bg-[var(--bos-warning)]/6",
          healthTone === "danger" && "border-[var(--bos-error)]/25 bg-[var(--bos-error)]/6",
        )}
      >
        <span
          className={cn(
            "flex items-center justify-center w-7 h-7 rounded-full shrink-0",
            healthTone === "good" && "bg-[var(--bos-success)]/15 text-[var(--bos-success)]",
            healthTone === "warn" && "bg-[var(--bos-warning)]/15 text-[var(--bos-warning)]",
            healthTone === "danger" && "bg-[var(--bos-error)]/15 text-[var(--bos-error)]",
          )}
        >
          {healthTone === "good" ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("text-[11px] font-mono uppercase tracking-[0.16em]", healthTone === "good" ? "text-[var(--bos-success)]" : healthTone === "warn" ? "text-[var(--bos-warning)]" : "text-[var(--bos-error)]")}>
              Requirement health — {health.level.replace("_", " ")}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-[var(--bos-text-secondary)] leading-snug">{health.reason}</p>
        </div>
      </div>

      {/* What we know — only real confirmed information */}
      <section>
        <SectionTitle title="What we know" hint="Only information actually provided" />
        {intel.known.length === 0 ? (
          <EmptyState title="No information provided yet" hint="The client has not submitted any answers — send the link or wait for the client to begin." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {intel.known.map((k) => (
              <div key={k.label} className="rounded-sm border border-[var(--bos-line)] px-3.5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)]">{k.label}</span>
                  <span className="text-[9px] text-[var(--bos-text-tertiary)] shrink-0">{k.source}</span>
                </div>
                <p className="mt-1 text-[12px] text-[var(--bos-text-primary)] leading-snug">{k.value}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* What needs attention — real blockers and review items */}
      <section>
        <SectionTitle title="What needs attention" hint="Only actual action items" />
        {intel.blockers.length === 0 && intel.needsReview.length === 0 ? (
          <EmptyState title="Nothing requires attention" hint="Every required item is confirmed and no clarification is waiting." />
        ) : (
          <ul className="space-y-1.5">
            {intel.blockers.map((b) => (
              <li key={b.id} className="flex items-start gap-2 rounded-sm border border-[var(--bos-error)]/25 bg-[var(--bos-error)]/5 px-3.5 py-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[var(--bos-error)] mt-0.5 shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-[var(--bos-text-primary)] leading-snug">{b.label}</div>
                  <div className="text-[10px] text-[var(--bos-text-tertiary)] mt-0.5">
                    {b.kind === "clarification" ? "Blocking clarification — " : "Required information — "}
                    {b.section ? sectionLabel(b.section) : ""}
                  </div>
                </div>
                {b.questionId && (
                  <MicroButton onClick={() => onViewQuestion(String(b.questionId))}>
                    <Eye className="w-3 h-3" aria-hidden="true" /> View
                  </MicroButton>
                )}
              </li>
            ))}
            {intel.needsReview.map((n) => (
              <li key={n.questionId} className="flex items-start gap-2 rounded-sm border border-[var(--bos-warning)]/25 bg-[var(--bos-warning)]/5 px-3.5 py-2.5">
                <BadgeCheck className="w-3.5 h-3.5 text-[var(--bos-warning)] mt-0.5 shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-[var(--bos-text-primary)] leading-snug">Client answered — {n.section}</div>
                  <div className="text-[10px] text-[var(--bos-text-tertiary)] mt-0.5 truncate">{n.label}</div>
                </div>
                <MicroButton variant="accent" onClick={() => onViewQuestion(n.questionId)}>
                  <BadgeCheck className="w-3 h-3" aria-hidden="true" /> Review
                </MicroButton>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* What we're waiting for — real client clarifications */}
      <section>
        <SectionTitle title="What we're waiting for" hint="Clarifications sent to the client" />
        {intel.waitingOnClient.length === 0 ? (
          <EmptyState title="Nothing waiting on the client" hint="No clarification questions are awaiting a response." />
        ) : (
          <ul className="space-y-1.5">
            {intel.waitingOnClient.map((w) => (
              <li key={w.questionId} className="flex items-start gap-2 rounded-sm border border-[var(--bos-line)] px-3.5 py-2.5">
                <Clock className="w-3.5 h-3.5 text-[var(--bos-info)] mt-0.5 shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-[var(--bos-text-primary)] leading-snug">{w.section}</div>
                  <div className="text-[10px] text-[var(--bos-text-tertiary)] mt-0.5 truncate">{w.label}</div>
                  <div className="text-[10px] text-[var(--bos-text-tertiary)] mt-0.5">
                    Sent to {w.recipient} · {formatDateTime(w.since)}
                  </div>
                </div>
                <MicroButton onClick={() => onViewQuestion(w.questionId)}>
                  <Eye className="w-3 h-3" aria-hidden="true" /> View
                </MicroButton>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Optional — never shown as an error */}
      <section>
        <SectionTitle title="Optional" hint="Optional information does not gate approval" />
        {intel.optional.length === 0 ? (
          <EmptyState title="No optional items configured" hint="Nothing optional exists for this requirement right now." />
        ) : (
          <ul className="space-y-1.5">
            {intel.optional.map((o) => (
              <li key={o.id} className="flex items-center gap-2 rounded-sm border border-[var(--bos-line)] px-3.5 py-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--bos-text-tertiary)] shrink-0" aria-hidden="true" />
                <span className="flex-1 text-[12px] text-[var(--bos-text-secondary)]">{o.label}</span>
                <span className="text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--bos-text-tertiary)]">
                  {o.status === "CONFIRMED" ? "Provided" : "Optional · not provided"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Not applicable — never shown as missing */}
      {intel.notApplicable.length > 0 && (
        <section>
          <SectionTitle title="Not applicable" hint="Genuinely irrelevant to this project" />
          <ul className="space-y-1.5">
            {intel.notApplicable.map((n) => (
              <li key={n.id} className="flex items-center gap-2 rounded-sm border border-[var(--bos-line)] px-3.5 py-2.5">
                <span className="text-[12px] text-[var(--bos-text-secondary)]">◇ {n.label}</span>
                <span className="ml-auto text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--bos-text-tertiary)]">Not applicable</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Proposal readiness check — exact reasons when not ready */}
      <section>
        <div className="flex items-center justify-between gap-2">
          <SectionTitle title="Proposal readiness check" hint="Generated from the current requirement state" />
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-[3px] text-[9px] font-mono uppercase tracking-[0.12em] border",
              intel.readiness.ok
                ? "text-[var(--bos-success)] border-[var(--bos-success)]/25 bg-[var(--bos-success)]/6"
                : "text-[var(--bos-warning)] border-[var(--bos-warning)]/25 bg-[var(--bos-warning)]/6",
            )}
          >
            {intel.readiness.ok ? "Ready" : "Not ready"}
          </span>
        </div>
        <ul className="mt-3 space-y-1">
          {intel.readiness.rows.map((row) => (
            <li key={row.key} className="flex items-start gap-2.5 py-1">
              <span
                className={cn(
                  "flex items-center justify-center w-4 h-4 rounded-full border shrink-0 mt-px",
                  row.ok ? "border-[var(--bos-success)] bg-[var(--bos-success)] text-white" : "border-[var(--bos-warning)] bg-[var(--bos-warning)] text-white",
                )}
              >
                {row.ok ? <Check className="w-2.5 h-2.5" aria-hidden="true" /> : <AlertTriangle className="w-2.5 h-2.5" aria-hidden="true" />}
              </span>
              <div className="min-w-0">
                <span className={cn("text-[12px]", row.ok ? "text-[var(--bos-text-primary)]" : "text-[var(--bos-warning)]")}>{row.label}</span>
                {!row.ok && <span className="ml-2 text-[11px] text-[var(--bos-text-tertiary)]">{row.note}</span>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* What changed — from the real revision history */}
      {intel.changed.length > 0 && (
        <section>
          <SectionTitle title="What changed" hint={`Latest revision v${r.revision}`} />
          <ul className="space-y-1">
            {intel.changed.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-[var(--bos-text-secondary)] leading-snug">
                <ArrowRight className="w-3 h-3 text-[var(--bos-text-tertiary)] mt-0.5 shrink-0" aria-hidden="true" />
                {c}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Next best action — computed from real state */}
      <div className="rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)]/50 p-4">
        <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-accent)] mb-1.5">
          Next best action
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[13px] text-[var(--bos-text-primary)] leading-snug">{intel.nextAction.text}</p>
          {nextButton && (
            <MicroButton variant="accent" onClick={nextButton.onClick}>
              {nextButton.icon} {nextButton.label}
            </MicroButton>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        <button type="button" onClick={onViewClarifications} className="text-[10px] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-accent)] transition-colors duration-150">
          Clarifications ({bundle.questions.length}) →
        </button>
        <button type="button" onClick={onViewActivity} className="text-[10px] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-accent)] transition-colors duration-150">
          Activity log →
        </button>
      </div>
    </div>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3">
      <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)]">{title}</div>
      {hint && <div className="mt-0.5 text-[10px] text-[var(--bos-text-tertiary)]">{hint}</div>}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "good" | "warn" | "danger" | "neutral" }) {
  return (
    <div className="rounded-sm border border-[var(--bos-line)] px-3.5 py-3 min-w-0 overflow-hidden">
      <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)] truncate" title={label}>{label}</div>
      <div
        className={cn(
          "mt-1.5 text-[20px] font-semibold tracking-tight tabular-nums truncate",
          tone === "good" ? "text-[var(--bos-success)]"
          : tone === "warn" ? "text-[var(--bos-warning)]"
          : tone === "danger" ? "text-[var(--bos-error)]"
          : "text-[var(--bos-text-primary)]",
        )}
      >
        {value}
      </div>
    </div>
  );
}

/* ═══ CENTER — Section (editorial document) ═══ */

function SectionView({
  bundle,
  section,
  inReview,
  reviewState,
  onAskClient,
  onViewQuestion,
  onResolveComment,
}: {
  bundle: AdminBundle;
  section: SectionDef;
  inReview: boolean;
  reviewState: ReviewState;
  onAskClient: () => void;
  onViewQuestion: (questionId: string) => void;
  onResolveComment: (commentId: string) => void;
}) {
  const openComments = bundle.comments.filter((c) => c.section === section.key && !c.resolvedAt);
  const awaiting = bundle.questions.filter((q) => OPEN_Q_STATUSES.includes(q.status) && q.section === section.key);
  const inFlight = inFlightQuestions(bundle, section.key);
  const history = bundle.questions.filter((q) => q.section === section.key);
  const complete = bundle.states[section.key] === true;

  const stateMeta =
    reviewState === "confirmed"
      ? { label: "Confirmed", cls: "text-[var(--bos-success)] border-[var(--bos-success)]/30 bg-[var(--bos-success)]/6", icon: <Check className="w-3 h-3" aria-hidden="true" /> }
      : reviewState === "clarify"
        ? { label: "Needs clarification", cls: "text-[var(--bos-warning)] border-[var(--bos-warning)]/30 bg-[var(--bos-warning)]/6", icon: <AlertTriangle className="w-3 h-3" aria-hidden="true" /> }
        : { label: "Not reviewed", cls: "text-[var(--bos-text-tertiary)] border-[var(--bos-line)] bg-[var(--bos-overlay)]", icon: <ChevronRight className="w-3 h-3" aria-hidden="true" /> };

  return (
    <div className="space-y-6 req-enter">
      {/* Editorial header */}
      <header className="border-b border-[var(--bos-line)] pb-4">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[10px] tracking-[0.16em] text-[var(--bos-accent)]">{section.number}</span>
          <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--bos-text-tertiary)]">{section.label}</span>
          {inReview && (
            <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] border text-[9px] font-mono uppercase tracking-[0.1em]", stateMeta.cls)}>
              {stateMeta.icon}
              {stateMeta.label}
            </span>
          )}
        </div>
        <h3 className="mt-1.5 text-[19px] font-semibold tracking-tight text-[var(--bos-text-primary)]">{section.title}</h3>
        {section.intro && <p className="mt-1 text-[12px] text-[var(--bos-text-tertiary)] max-w-prose">{section.intro}</p>}
      </header>

      {/* Client provided */}
      <div className="max-w-prose">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-secondary)]">Client provided</span>
          <span className="h-px flex-1 bg-[var(--bos-line)]" aria-hidden="true" />
        </div>
        <SectionBody bundle={bundle} section={section} />
      </div>

      {/* Section clarification thread — workspace comments */}
      {(openComments.length > 0 || inReview) && (
        <div className="max-w-prose">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-secondary)]">Conversation</span>
            <span className="h-px flex-1 bg-[var(--bos-line)]" aria-hidden="true" />
          </div>
          {openComments.length > 0 ? (
            <ul className="space-y-2">
              {openComments.map((c) => (
                <li key={c.id} className="rounded-sm border border-[var(--bos-warning)]/25 bg-[var(--bos-warning)]/5 px-3.5 py-2.5">
                  <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-warning)]">
                    <MessageCircle className="w-3 h-3" aria-hidden="true" /> Asked · {c.authorName}
                    <MicroButton className="ml-auto" onClick={() => onResolveComment(c.id)}>
                      <Check className="w-3 h-3" aria-hidden="true" /> Resolve
                    </MicroButton>
                  </div>
                  <p className="mt-1 text-[12px] text-[var(--bos-text-primary)]">{c.message}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-[var(--bos-text-tertiary)]">No open questions for this section.</p>
          )}
        </div>
      )}

      {/* Emailed clarification — pending status */}
      {awaiting.length > 0 && (
        <div className="max-w-prose">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-warning)]">Client response required</span>
            <span className="h-px flex-1 bg-[var(--bos-line)]" aria-hidden="true" />
          </div>
          <ul className="space-y-2">
            {awaiting.map((q) => (
              <li key={q.id} className="rounded-sm border border-[var(--bos-warning)]/25 bg-[var(--bos-warning)]/5 px-3.5 py-2.5">
                <div className="flex items-center gap-2 flex-wrap text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-warning)]">
                  <Clock className="w-3 h-3" aria-hidden="true" /> Sent to {q.recipientName} · waiting
                  {q.categoryLabel && <span className="text-[var(--bos-text-tertiary)]">· {q.categoryLabel}</span>}
                </div>
                <p className="mt-1 text-[12px] text-[var(--bos-text-primary)]">“{q.clientQuestion}”</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[9px] text-[var(--bos-text-tertiary)] tabular-nums">
                    {q.sentAt ? `Sent ${formatDateTime(q.sentAt)}` : "Not sent yet"}
                  </span>
                  <MicroButton onClick={() => onViewQuestion(q.id)}>
                    <Eye className="w-3 h-3" aria-hidden="true" /> View
                  </MicroButton>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Clarification history — a permanent business record */}
      {history.length > 0 && (
        <div className="max-w-prose">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-secondary)]">Clarification history</span>
            <span className="h-px flex-1 bg-[var(--bos-line)]" aria-hidden="true" />
          </div>
          <ul className="space-y-2">
            {history.map((q, i) => (
              <li key={q.id} className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 px-3.5 py-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">Question {history.length - i}</span>
                  <QuestionStatusChip status={q.status} />
                  {q.categoryLabel && (
                    <span className="inline-flex items-center rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)] px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--bos-accent)]">
                      {q.categoryLabel}
                    </span>
                  )}
                  {q.isBlocking && (
                    <span className="inline-flex items-center rounded-sm border border-[var(--bos-error)]/30 bg-[var(--bos-error)]/6 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--bos-error)]">
                      Blocking
                    </span>
                  )}
                  {q.qualityScore !== null && (
                    <span className={cn("text-[9px] font-mono tabular-nums", (q.qualityScore ?? 0) >= 70 ? "text-[var(--bos-success)]" : "text-[var(--bos-warning)]")}>
                      {q.qualityScore}/100
                    </span>
                  )}
                  <span className="text-[9px] text-[var(--bos-text-tertiary)] tabular-nums">
                    {q.sentAt ? `Sent ${formatDateTime(q.sentAt)}` : "Draft"}
                    {q.respondedAt ? ` · Answered ${formatDateTime(q.respondedAt)}` : ""}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-[var(--bos-text-primary)]">“{q.clientQuestion}”</p>
                {q.response && (
                  <div className="mt-1.5 rounded-sm border border-[var(--bos-success)]/20 bg-[var(--bos-success)]/5 px-2.5 py-1.5">
                    <div className="text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--bos-success)]">
                      Response · {q.respondedByName ?? q.recipientName}
                    </div>
                    <p className="mt-0.5 text-[12px] text-[var(--bos-text-secondary)]">{q.response}</p>
                  </div>
                )}
                <div className="mt-1.5">
                  <MicroButton onClick={() => onViewQuestion(q.id)}>
                    <Eye className="w-3 h-3" aria-hidden="true" /> View
                  </MicroButton>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Review actions */}
      {inReview && (
        <div className="flex items-center gap-2 max-w-prose">
          {inFlight.length === 0 && !complete && (
            <MicroButton variant="accent" onClick={onAskClient}>
              <MessageCircle className="w-3 h-3" aria-hidden="true" /> Ask client
            </MicroButton>
          )}
          {inFlight.length === 0 && complete && reviewState === "confirmed" && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--bos-success)]">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Confirmed — this section is ready
            </span>
          )}
          {complete && reviewState !== "confirmed" && awaiting.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--bos-warning)]">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" /> Awaiting client response
            </span>
          )}
          {complete && reviewState !== "confirmed" && inFlight.length > 0 && awaiting.length === 0 && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--bos-warning)]">
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Clarification draft awaiting approval
            </span>
          )}
          {complete && reviewState !== "confirmed" && inFlight.length === 0 && (
            <MicroButton variant="accent" onClick={onAskClient}>
              <MessageCircle className="w-3 h-3" aria-hidden="true" /> Ask client
            </MicroButton>
          )}
        </div>
      )}
    </div>
  );
}

/** Render the section's stored answers in editorial form. */
function SectionBody({ bundle, section }: { bundle: AdminBundle; section: SectionDef }) {
  const data = (bundle.answers[section.key] ?? {}) as Record<string, unknown>;

  switch (section.key) {
    case "users": {
      const users = (data.users as { name?: string; needs?: string[]; goals?: string[]; problems?: string[]; permissions?: string[] }[] | undefined) ?? [];
      if (users.length === 0) return <EmptyValue />;
      return (
        <div className="space-y-3">
          {users.map((u, i) => (
            <div key={i} className="rounded-sm border border-[var(--bos-line)] p-3.5">
              <div className="text-[13px] font-medium text-[var(--bos-text-primary)]">{u.name ?? `User type ${i + 1}`}</div>
              {u.needs && u.needs.length > 0 && <DetailLine label="Needs" value={u.needs.join(" · ")} />}
              {u.goals && u.goals.length > 0 && <DetailLine label="Goals" value={u.goals.join(" · ")} />}
              {u.problems && u.problems.length > 0 && <DetailLine label="Problems" value={u.problems.join(" · ")} />}
              {u.permissions && u.permissions.length > 0 && <DetailLine label="Permissions" value={u.permissions.join(" · ")} />}
            </div>
          ))}
        </div>
      );
    }
    case "scope": {
      const lists: { key: string; label: string }[] = [
        { key: "included", label: "What is included" },
        { key: "excluded", label: "What is not included" },
        { key: "assumptions", label: "Assumptions" },
        { key: "dependencies", label: "Dependencies" },
      ];
      return (
        <div className="space-y-4">
          {lists.map((l) => (
            <div key={l.key}>
              <div className="mb-1.5 text-[10px] font-medium text-[var(--bos-text-secondary)]">{l.label}</div>
              {listData(data, l.key).length > 0 ? (
                <ul className="space-y-1">
                  {listData(data, l.key).map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] text-[var(--bos-text-secondary)]">
                      <span className="text-[var(--bos-accent)] mt-0.5 shrink-0" aria-hidden="true">—</span>
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-[var(--bos-text-tertiary)]">Nothing recorded.</p>
              )}
            </div>
          ))}
        </div>
      );
    }
    case "features":
      return <FeaturesView features={bundle.features} />;
    case "stakeholders": {
      const stakeholders = (data.stakeholders as { name?: string; role?: string; type?: string; email?: string }[] | undefined) ?? [];
      if (stakeholders.length === 0) return <EmptyValue />;
      return (
        <div className="grid sm:grid-cols-2 gap-2">
          {stakeholders.map((s, i) => (
            <div key={i} className="rounded-sm border border-[var(--bos-line)] px-3.5 py-2.5">
              <div className="text-[13px] font-medium text-[var(--bos-text-primary)]">{s.name ?? "—"}</div>
              <div className="mt-0.5 text-[11px] text-[var(--bos-text-tertiary)]">
                {[s.role, s.type].filter(Boolean).join(" · ")}
                {s.email ? ` · ${s.email}` : ""}
              </div>
            </div>
          ))}
        </div>
      );
    }
    case "files":
      return <FilesView attachments={bundle.attachments} requestId={bundle.request.id} />;
    case "success": {
      const criteria = listData(data, "criteria");
      const kpis = data.kpis;
      return (
        <div className="space-y-4">
          {criteria.length > 0 && (
            <div>
              <div className="mb-1.5 text-[10px] font-medium text-[var(--bos-text-secondary)]">Acceptance criteria</div>
              <ul className="space-y-1">
                {criteria.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-[var(--bos-text-secondary)]">
                    <Check className="w-3.5 h-3.5 text-[var(--bos-success)] mt-0.5 shrink-0" aria-hidden="true" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {typeof kpis === "string" && kpis.trim() ? (
            <div>
              <div className="mb-1.5 text-[10px] font-medium text-[var(--bos-text-secondary)]">Target outcomes / KPIs</div>
              <p className="text-[12px] text-[var(--bos-text-secondary)] leading-relaxed">{kpis}</p>
            </div>
          ) : null}
          {criteria.length === 0 && !(typeof kpis === "string" && kpis?.trim()) && <EmptyValue />}
        </div>
      );
    }
    default: {
      const fields = section.fields.filter((f) => {
        if (!f.showIf) return true;
        return f.showIf(data);
      });
      const present = fields.filter((f) => hasValue(data[f.key]));
      if (present.length === 0) return <EmptyValue />;
      return (
        <div className="space-y-4">
          {present.map((f) => (
            <div key={f.key}>
              <div className="mb-1.5 text-[10px] font-medium text-[var(--bos-text-secondary)]">{f.label}</div>
              <FieldValue value={data[f.key]} type={f.type} />
            </div>
          ))}
        </div>
      );
    }
  }
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-1.5 text-[11px] text-[var(--bos-text-secondary)]">
      <span className="text-[var(--bos-text-tertiary)]">{label}:</span> {value}
    </div>
  );
}

function FieldValue({ value, type }: { value: unknown; type: SectionDef["fields"][number]["type"] }) {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    const items = value.filter(Boolean).map(String);
    if (items.length === 0) return null;
    if (type === "urls") {
      return (
        <ul className="space-y-0.5">
          {items.map((u, i) => (
            <li key={i} className="text-[12px] text-[var(--bos-accent)] truncate">{u}</li>
          ))}
        </ul>
      );
    }
    return <ChipRow items={items} />;
  }
  if (typeof value === "boolean") return <p className="text-[12px] text-[var(--bos-text-primary)]">{value ? "Yes" : "No"}</p>;
  return <p className="text-[12px] leading-relaxed text-[var(--bos-text-primary)]">{String(value)}</p>;
}

function hasValue(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.filter(Boolean).length > 0;
  return true;
}

function EmptyValue() {
  return <p className="text-[11px] text-[var(--bos-text-tertiary)]">Nothing captured in this section yet.</p>;
}

function ChipRow({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <span key={i} className="inline-flex items-center rounded-sm border border-[var(--bos-line)] bg-[var(--bos-overlay)] px-2 py-1 text-[11px] text-[var(--bos-text-secondary)]">
          {i}
        </span>
      ))}
    </div>
  );
}

function listData(data: Record<string, unknown>, key: string): string[] {
  const v = data[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/* ═══ CENTER — Features ═══ */

function FeaturesView({ features }: { features: AdminBundle["features"] }) {
  if (features.length === 0) {
    return <p className="py-4 text-[12px] text-[var(--bos-text-tertiary)]">No features have been configured yet.</p>;
  }
  return (
    <div className="space-y-3">
      {features.map((f) => (
        <div key={f.id} className="rounded-sm border border-[var(--bos-line)] overflow-hidden">
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-[var(--bos-line)] bg-[var(--bos-surface)]/40">
            <span className="text-[13px] font-medium text-[var(--bos-text-primary)] flex-1 min-w-0 truncate">{f.name}</span>
            <FeaturePriority priority={f.priority} />
          </div>
          <div className="p-3.5 space-y-3">
            {f.description && <p className="text-[12px] text-[var(--bos-text-secondary)] leading-relaxed">{f.description}</p>}
            {f.users.length > 0 && (
              <div>
                <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)] mb-1">Users</div>
                <ChipRow items={f.users} />
              </div>
            )}
            {Object.keys(f.config).length > 0 && (
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                {Object.entries(f.config).map(([k, v]) => {
                  if (v === undefined || v === null || v === "") return null;
                  const label = k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
                  return (
                    <div key={k} className="min-w-0">
                      <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)] mb-0.5">{label}</div>
                      <div className="text-[12px] text-[var(--bos-text-primary)]">{Array.isArray(v) ? v.join(", ") : String(v)}</div>
                    </div>
                  );
                })}
              </div>
            )}
            {f.acceptanceCriteria.length > 0 && (
              <div>
                <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)] mb-1.5">Acceptance criteria</div>
                <ul className="space-y-1">
                  {f.acceptanceCriteria.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] text-[var(--bos-text-secondary)]">
                      <Check className="w-3.5 h-3.5 text-[var(--bos-success)] mt-0.5 shrink-0" aria-hidden="true" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {f.dependencies.length > 0 && (
              <div>
                <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)] mb-1">Depends on</div>
                <ChipRow items={f.dependencies} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function FeaturePriority({ priority }: { priority: string }) {
  const tone =
    priority === "MUST_HAVE"
      ? "bg-[var(--bos-accent)]/10 text-[var(--bos-accent)]"
      : priority === "SHOULD_HAVE"
        ? "bg-[var(--bos-overlay)] text-[var(--bos-text-secondary)]"
        : "bg-[var(--bos-overlay)] text-[var(--bos-text-tertiary)]";
  return (
    <span className={cn("px-2 py-0.5 rounded-[3px] text-[9px] font-mono uppercase tracking-[0.1em] shrink-0", tone)}>
      {priority.replace(/_/g, " ")}
    </span>
  );
}

/* ═══ CENTER — Files ═══ */

function FilesView({ attachments, requestId }: { attachments: AdminBundle["attachments"]; requestId: string }) {
  if (attachments.length === 0) {
    return <p className="py-2 text-[12px] text-[var(--bos-text-tertiary)]">No project files have been uploaded yet.</p>;
  }
  return (
    <ul className="space-y-1.5 max-w-2xl">
      {attachments.map((a) => (
        <li key={a.id} className="flex items-center gap-3 rounded-sm border border-[var(--bos-line)] px-3.5 py-2.5">
          <FileStack className="w-4 h-4 text-[var(--bos-text-tertiary)] shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] text-[var(--bos-text-primary)] truncate">{a.name}</div>
            <div className="text-[9px] text-[var(--bos-text-tertiary)] font-mono uppercase tracking-[0.08em]">
              {a.section} · {a.uploadedByName ?? "Client"} · {(a.size / 1024).toFixed(0)} KB
            </div>
          </div>
          <a
            href={`/api/requirements/${requestId}/files/${a.id}`}
            className="flex items-center justify-center w-7 h-7 rounded-sm text-[var(--bos-text-tertiary)] hover:text-[var(--bos-accent)] hover:bg-[var(--bos-overlay)] transition-colors duration-150 shrink-0"
            aria-label={`Download ${a.name}`}
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  );
}

/* ═══ CENTER — Review (approval workflow) ═══ */

function ReviewView({
  bundle,
  review,
  attention,
  canReview,
  onAskClient,
  onApprove,
  onProposal,
  onOpenProposal,
}: {
  bundle: AdminBundle;
  review: { percent: number; confirmed: number; total: number; ready: boolean };
  attention: { kind: "incomplete" | "clarify"; text: string; section: string | null }[];
  canReview: boolean;
  onAskClient: (section?: string | null) => void;
  onApprove: () => void;
  onProposal: () => void;
  onOpenProposal: () => void;}) {
  const r = bundle.request;
  const weightSections = SECTIONS.filter((s) => s.weight > 0);
  const router = useRouter();



  return (
    <div className="space-y-6 req-enter">
      {/* Readiness */}
      <section className="rounded-sm border border-[var(--bos-line)] p-4">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-secondary)]">Requirement readiness</span>
          <span className="text-[18px] font-semibold tabular-nums text-[var(--bos-text-primary)]">{review.percent}%</span>
        </div>
        <div className="mt-2.5 h-1.5 rounded-full bg-[var(--bos-overlay)] overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full", review.ready ? "bg-[var(--bos-success)]" : "bg-[var(--bos-accent)]")}
            initial={false}
            animate={{ width: `${review.percent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <div className="mt-1.5 text-[11px] text-[var(--bos-text-tertiary)]">
          {review.confirmed} of {review.total} critical areas confirmed
          {attention.length > 0 && ` · ${attention.length} item${attention.length === 1 ? "" : "s"} require attention`}
        </div>
      </section>

      {/* Per-section review list */}
      <section>
        <div className="mb-3 text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)]">
          Review checklist
        </div>
        <div className="space-y-1.5">
          {weightSections.map((s) => {
            const state = sectionReview(bundle, s.key);
            return (
              <div key={s.key} className="flex items-center gap-3 rounded-sm border border-[var(--bos-line)] px-3.5 py-2.5">
                <span
                  className={cn(
                    "flex items-center justify-center w-5 h-5 rounded-full border text-[9px] shrink-0",
                    state === "confirmed" && "border-[var(--bos-success)] bg-[var(--bos-success)] text-white",
                    state === "clarify" && "border-[var(--bos-warning)] bg-[var(--bos-warning)]/10 text-[var(--bos-warning)]",
                    state === "pending" && "border-[var(--bos-border-strong)] text-[var(--bos-text-tertiary)]",
                  )}
                >
                  {state === "confirmed" ? <Check className="w-3 h-3" aria-hidden="true" /> : state === "clarify" ? "!" : "○"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-[var(--bos-text-primary)]">{s.label}</div>
                  <div className={cn(
                    "text-[10px]",
                    state === "confirmed" ? "text-[var(--bos-success)]" : state === "clarify" ? "text-[var(--bos-warning)]" : "text-[var(--bos-text-tertiary)]",
                  )}>
                    {state === "confirmed" ? "Confirmed" : state === "clarify" ? "Needs clarification — question sent to client" : "Not reviewed yet"}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] tabular-nums">{s.weight}%</span>
                {state === "clarify" && (
                  <MicroButton onClick={() => onAskClient(s.key)}>
                    <MessageCircle className="w-3 h-3" aria-hidden="true" /> Ask client
                  </MicroButton>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Decision */}
      <section className="rounded-sm border border-[var(--bos-border-strong)] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-secondary)]">Decision</span>
          <StatusChip status={r.status} />
        </div>
        <p className="text-[12px] text-[var(--bos-text-secondary)] leading-relaxed max-w-prose">
          {r.status === "SUBMITTED" && "The client submitted their requirements. Review each critical section, ask for clarification on anything unclear, then approve to proceed."}
          {r.status === "REVISION_SUBMITTED" && "The client answered your clarification and resubmitted. Review the updated sections and approve when satisfied."}
          {r.status === "CHANGES_REQUESTED" && "Clarification was requested from the client. The question has been emailed — waiting for their response."}
          {r.status === "APPROVED" && "Requirements approved — all data is ready to generate the proposal automatically."}
          {r.status === "IN_PROGRESS" && "The client is actively filling in the workspace. You can ask clarification questions at any time."}
          {r.status === "SENT" && "The secure link has been sent. The client has not opened it yet."}
          {r.status === "DRAFT" && "This requirement has not been sent to the client yet. Send the secure link to begin."}
          {r.status === "REVOKED" && "Access to this requirement has been revoked. The client can no longer open the workspace link."}
        </p>

        {r.status === "APPROVED" ? (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {bundle.proposals.length === 0 ? (
              <MicroButton variant="accent" onClick={onProposal}>
                <Banknote className="w-3 h-3" aria-hidden="true" /> Create proposal
              </MicroButton>
            ) : (
              <MicroButton variant="accent" onClick={onOpenProposal}>
                <FileText className="w-3 h-3" aria-hidden="true" /> Open proposal studio
              </MicroButton>
            )}
          </div>
        ) : r.status === "DRAFT" ? (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <MicroButton variant="accent" onClick={() => bundle.request.canSend && onAskClient()}>
              <Send className="w-3 h-3" aria-hidden="true" /> Send link to client
            </MicroButton>
          </div>
        ) : canReview ? (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <MicroButton variant="accent" onClick={() => onAskClient()}>
              <MessageCircle className="w-3 h-3" aria-hidden="true" /> Ask client
            </MicroButton>
            <MicroButton variant="accent" onClick={onApprove}>
              <Check className="w-3 h-3" aria-hidden="true" /> Approve requirements
            </MicroButton>
            {bundle.proposals.length === 0 ? (
              <MicroButton variant="default" onClick={onProposal}>
                <Banknote className="w-3 h-3" aria-hidden="true" /> Create proposal
              </MicroButton>
            ) : (
              <MicroButton variant="default" onClick={onOpenProposal}>
                <FileText className="w-3 h-3" aria-hidden="true" /> Proposal studio
              </MicroButton>
            )}
          </div>
        ) : null}
      </section>

      {/* Proposals from this requirement */}
      {bundle.proposals.length > 0 && (
        <section className="rounded-sm border border-[var(--bos-line)] p-4">
          <div className="mb-2 text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-secondary)]">
            Proposals from this requirement
          </div>
          <ul className="space-y-1.5">
            {bundle.proposals.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 text-[12px]">
                <span className="text-[var(--bos-text-primary)] truncate">{p.title}</span>
                <span className="flex items-center gap-2 shrink-0">
                  {p.amount !== null && <span className="tabular-nums text-[var(--bos-text-secondary)]">₹{p.amount.toLocaleString("en-IN")}</span>}
                  <StatusChip status={p.status} />
                  <MicroButton onClick={() => router.push(`/proposals/${p.id}`)}>
                    <ArrowRight className="w-3 h-3" aria-hidden="true" />
                  </MicroButton>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ═══ CENTER — Activity ═══ */

function ActivityView({
  bundle,
  onViewQuestion,
  onResolveComment,
}: {
  bundle: AdminBundle;
  onViewQuestion: (questionId: string) => void;
  onResolveComment: (commentId: string) => void;
}) {
  return (
    <div className="space-y-8 req-enter">
      <section>
        <div className="mb-3 text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)]">Live activity</div>
        {bundle.events.length === 0 ? (
          <p className="py-4 text-[12px] text-[var(--bos-text-tertiary)]">No activity yet.</p>
        ) : (
          <ol className="relative border-l border-[var(--bos-line)] ml-1.5 space-y-3.5">
            {bundle.events.map((e) => (
              <li key={e.id} className="pl-4 relative">
                <span className="absolute -left-[3px] top-1 w-1.5 h-1.5 rounded-full bg-[var(--bos-accent)]" aria-hidden="true" />
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-[12px] text-[var(--bos-text-primary)]">{e.label}</div>
                  {typeof e.meta?.questionId === "string" && (
                    <MicroButton onClick={() => onViewQuestion(String(e.meta.questionId))}>
                      <Eye className="w-3 h-3" aria-hidden="true" /> View
                    </MicroButton>
                  )}
                </div>
                {e.detail && <div className="text-[10px] text-[var(--bos-text-tertiary)]">{e.detail}</div>}
                <div className="text-[10px] text-[var(--bos-text-tertiary)] tabular-nums">
                  {new Date(e.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ·{" "}
                  {new Date(e.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <div className="mb-3 text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)]">Revisions</div>
        {bundle.revisions.length === 0 ? (
          <p className="py-4 text-[12px] text-[var(--bos-text-tertiary)]">No revisions yet.</p>
        ) : (
          <div className="space-y-3">
            {bundle.revisions.map((rev) => (
              <div key={rev.id} className="rounded-sm border border-[var(--bos-line)] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-[var(--bos-text-primary)]">Revision {rev.revision}</span>
                  <span className="text-[10px] text-[var(--bos-text-tertiary)]">
                    {rev.submittedByName ?? "Client"} · {new Date(rev.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </div>
                <ul className="mt-2 space-y-1">
                  {rev.changes.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-[var(--bos-text-secondary)]">
                      <span className="text-[var(--bos-accent)] mt-0.5 shrink-0" aria-hidden="true">→</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)]">Clarification thread</div>
        {bundle.comments.length === 0 ? (
          <p className="py-4 text-[12px] text-[var(--bos-text-tertiary)]">No clarifications yet.</p>
        ) : (
          <div className="space-y-2">
            {bundle.comments.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "rounded-sm border p-3",
                  c.author === "ADMIN" ? "border-[var(--bos-line)] bg-[var(--bos-bg)]" : "border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)]/30",
                )}
              >
                <div className="flex items-center gap-2 text-[10px]">
                  <span className={cn("font-mono uppercase tracking-[0.1em]", c.author === "ADMIN" ? "text-[var(--bos-text-tertiary)]" : "text-[var(--bos-accent)]")}>
                    {c.author === "ADMIN" ? "Team" : "Client"}
                  </span>
                  {c.section && <span className="text-[var(--bos-text-tertiary)]">{getSection(c.section)?.label ?? c.section}</span>}
                  {c.resolvedAt ? (
                    <span className="text-[var(--bos-success)]">✓ resolved</span>
                  ) : c.author === "ADMIN" ? (
                    <MicroButton className="ml-auto" onClick={() => onResolveComment(c.id)}>
                      <Check className="w-3 h-3" aria-hidden="true" /> Resolve
                    </MicroButton>
                  ) : null}
                </div>
                <p className="mt-1 text-[12px] text-[var(--bos-text-primary)]">{c.message}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ═══ RIGHT — next action ═══ */

function NextAction({
  bundle,
  onAskClient,
  onSend,
  onReview,
  onCreateProposal,
  onViewQuestion,
  onViewClarifications,
}: {
  bundle: AdminBundle;
  onAskClient: (section?: string | null) => void;
  onSend: () => void;
  onReview: () => void;
  onCreateProposal: () => void;
  onViewQuestion: (questionId: string) => void;
  onViewClarifications: () => void;
}) {
  const r = bundle.request;
  const attention = attentionItems(bundle);
  const openQuestions = awaitingClientQuestions(bundle);
  const answeredQuestions = bundle.questions.filter((q) => q.status === "ANSWERED" || q.status === "UNDER_REVIEW");


  // The client has an open emailed question — the one thing that matters.
  if (openQuestions.length > 0) {
    const q = openQuestions[0];
    return (
      <>
        <p className="text-[11px] text-[var(--bos-text-secondary)] leading-snug">
          Awaiting client — {q.categoryLabel ?? q.sectionLabel} clarification sent to {q.recipientName}.
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          <MicroButton variant="accent" onClick={() => onViewQuestion(q.id)}>
            <Eye className="w-3 h-3" aria-hidden="true" /> View question
          </MicroButton>
        </div>
      </>
    );
  }

  // Drafts awaiting admin approval also need attention.
  const pendingDraft = bundle.questions.find((q) => q.status === "DRAFT" || q.status === "READY_FOR_REVIEW");
  if (pendingDraft) {
    return (
      <>
        <p className="text-[11px] text-[var(--bos-text-secondary)] leading-snug">
          A clarification draft ({pendingDraft.categoryLabel ?? "unclassified"}) is awaiting your approval before it can be sent.
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          <MicroButton variant="accent" onClick={() => onViewQuestion(pendingDraft.id)}>
            <Eye className="w-3 h-3" aria-hidden="true" /> Review draft
          </MicroButton>
        </div>
      </>
    );
  }

  if (r.approvedAt || r.status === "APPROVED") {
    return (
      <>
        <p className="text-[11px] text-[var(--bos-text-secondary)] leading-snug">Requirements approved — everything is ready to flow into the proposal.</p>
        <MicroButton variant="accent" onClick={onCreateProposal} className="mt-2">
          <Banknote className="w-3 h-3" aria-hidden="true" /> Create proposal
        </MicroButton>
      </>
    );
  }

  switch (r.status) {
    case "DRAFT":
      return (
        <>
          <p className="text-[11px] text-[var(--bos-text-secondary)] leading-snug">Send the secure link so the client can start their workspace.</p>
          <MicroButton variant="accent" onClick={onSend} className="mt-2">
            <Send className="w-3 h-3" aria-hidden="true" /> Send link
          </MicroButton>
        </>
      );
    case "SENT":
    case "IN_PROGRESS":
      return (
        <>
          <p className="text-[11px] text-[var(--bos-text-secondary)] leading-snug">
            {r.status === "SENT" ? "The link was sent — waiting for the client to open it." : "The client is working through the workspace."}
          </p>
          {attention.length > 0 && (
            <MicroButton onClick={() => onAskClient(attention[0].section)} className="mt-2">
              <MessageCircle className="w-3 h-3" aria-hidden="true" /> Ask client
            </MicroButton>
          )}
        </>
      );
    case "SUBMITTED":
    case "REVISION_SUBMITTED":
      if (answeredQuestions.length > 0) {
        return (
          <>
            <p className="text-[11px] text-[var(--bos-text-secondary)] leading-snug">
              Client responded — review the answer for {answeredQuestions[0].sectionLabel} and accept or reject it.
            </p>
            <MicroButton variant="accent" onClick={() => onViewQuestion(answeredQuestions[0].id)} className="mt-2">
              <BadgeCheck className="w-3 h-3" aria-hidden="true" /> Review response
            </MicroButton>
          </>
        );
      }
      return (
        <>
          <p className="text-[11px] text-[var(--bos-text-secondary)] leading-snug">
            The submission is ready for review — {attention.length} item{attention.length === 1 ? "" : "s"} to work through.
          </p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <MicroButton variant="accent" onClick={onReview}>
              <BadgeCheck className="w-3 h-3" aria-hidden="true" /> Review requirement
            </MicroButton>
            <MicroButton onClick={onCreateProposal}>
              <Banknote className="w-3 h-3" aria-hidden="true" /> Create proposal
            </MicroButton>
          </div>
        </>
      );
    case "CHANGES_REQUESTED": {
      // A freshly answered question needs the admin's explicit review.
      const pendingReview = bundle.questions.find((q) => q.status === "ANSWERED" || q.status === "UNDER_REVIEW");
      if (pendingReview) {
        return (
          <>
            <p className="text-[11px] text-[var(--bos-text-secondary)] leading-snug">
              Client responded — review the answer for {pendingReview.sectionLabel} and accept or reject it.
            </p>
            <MicroButton variant="accent" onClick={() => onViewQuestion(pendingReview.id)} className="mt-2">
              <BadgeCheck className="w-3 h-3" aria-hidden="true" /> Review response
            </MicroButton>
          </>
        );
      }
      // Everything already answered and reviewed — nothing left to ask.
      const responses = bundle.questions.filter((q) => ["ANSWERED", "UNDER_REVIEW", "RESOLVED"].includes(q.status));
      if (responses.length > 0) {
        return (
          <>
            <p className="text-[11px] text-[var(--bos-text-secondary)] leading-snug">
              Client responses received and reviewed — continue the requirement review.
            </p>
            <MicroButton variant="accent" onClick={onReview} className="mt-2">
              <BadgeCheck className="w-3 h-3" aria-hidden="true" /> Continue review
            </MicroButton>
          </>
        );
      }
      return (
        <>
          <p className="text-[11px] text-[var(--bos-text-secondary)] leading-snug">Clarification was requested — waiting for the client to respond.</p>
          <MicroButton onClick={() => onAskClient()} className="mt-2">
            <Mail className="w-3 h-3" aria-hidden="true" /> Ask again
          </MicroButton>
        </>
      );
    }
    case "APPROVED":
      return (
        <>
          <p className="text-[11px] text-[var(--bos-text-secondary)] leading-snug">Requirements approved — everything is ready to flow into the proposal.</p>
          <MicroButton variant="accent" onClick={onCreateProposal} className="mt-2">
            <Banknote className="w-3 h-3" aria-hidden="true" /> Create proposal
          </MicroButton>
        </>
      );
    default:
      return <p className="text-[11px] text-[var(--bos-text-secondary)] leading-snug">No action pending.</p>;
  }
}

/* ═══ Approval ceremony ═══ */

function CeremonyView({
  ceremony,
  bundle,
  onClose,
  onCreateProposal,
}: {
  ceremony: Exclude<Ceremony, null>;
  bundle: AdminBundle;
  onClose: () => void;
  onCreateProposal: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const r = bundle.request;
  const [checked, setChecked] = useState(0);
  const BUILD_STEPS = [
    "Client information",
    "Business objectives",
    "Scope",
    "Features",
    "Deliverables",
    "Timeline",
    "Budget",
  ];

  useEffect(() => {
    if (ceremony.phase !== "building") return;
    // Reset and tick are both deferred so the effect only schedules timers.
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setChecked(0), 0));
    BUILD_STEPS.forEach((_, i) => {
      timers.push(setTimeout(() => setChecked(i + 1), 260 * (i + 1)));
    });
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ceremony.phase]);

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reducedMotion ? undefined : { opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="px-4 sm:px-5 py-8 flex justify-center"
    >
      <div className="w-full max-w-xl">
        {ceremony.phase === "approved" && (
          <div className="text-center req-enter">
            <motion.div
              initial={reducedMotion ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-[var(--bos-success)] text-white"
            >
              <Check className="w-8 h-8" aria-hidden="true" />
            </motion.div>
            <h3 className="mt-4 text-[22px] font-semibold tracking-tight text-[var(--bos-text-primary)]">Requirement approved</h3>
            <p className="mt-1 text-[12px] text-[var(--bos-text-tertiary)]">
              Approved by {r.createdByName ?? "the owner"} ·{" "}
              {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} ·{" "}
              {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>

            {/* Pipeline */}
            <div className="mt-8 flex items-center justify-center gap-2">
              <PipelineNode label="Requirement" state="done" />
              <PipelineArrow />
              <PipelineNode label="Approved" state="done" />
              <PipelineArrow highlight />
              <PipelineNode label="Proposal" state="next" />
              <PipelineArrow muted />
              <PipelineNode label="Project" state="future" />
            </div>

            <div className="mt-6 text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--bos-accent)]">Next</div>
            <div className="mt-1 text-[15px] font-semibold text-[var(--bos-text-primary)]">Create the proposal</div>
            <p className="mt-1 text-[12px] text-[var(--bos-text-tertiary)]">
              The client, scope, features, deliverables, timeline and budget flow in automatically.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <MicroButton onClick={onClose}>Later</MicroButton>
              <MicroButton variant="accent" onClick={onCreateProposal}>
                <Banknote className="w-3 h-3" aria-hidden="true" /> Create proposal →
              </MicroButton>
            </div>
          </div>
        )}

        {ceremony.phase === "building" && (
          <div className="req-enter">
            <div className="text-center">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--bos-accent)]">Building from approved requirement</div>
              <div className="mt-1 text-[18px] font-semibold tracking-tight text-[var(--bos-text-primary)]">Assembling your proposal</div>
            </div>
            <div className="mt-6 space-y-2 max-w-sm mx-auto">
              {BUILD_STEPS.map((step, i) => (
                <div
                  key={step}
                  className={cn(
                    "flex items-center gap-3 rounded-sm border px-3.5 py-2.5 transition-all duration-200",
                    i < checked
                      ? "border-[var(--bos-success)]/25 bg-[var(--bos-success)]/5"
                      : "border-[var(--bos-line)] bg-[var(--bos-surface)]/30",
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center w-4 h-4 rounded-full border text-[9px] shrink-0",
                      i < checked ? "border-[var(--bos-success)] bg-[var(--bos-success)] text-white" : "border-[var(--bos-border-strong)] text-transparent",
                    )}
                  >
                    <Check className="w-2.5 h-2.5" aria-hidden="true" />
                  </span>
                  <span className={cn("text-[12px]", i < checked ? "text-[var(--bos-text-primary)]" : "text-[var(--bos-text-tertiary)]")}>{step}</span>
                  {i < checked && <Sparkles className="w-3 h-3 text-[var(--bos-success)] ml-auto" aria-hidden="true" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {ceremony.phase === "ready" && (
          <div className="text-center req-enter">
            <motion.div
              initial={reducedMotion ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-[var(--bos-success)] text-white"
            >
              <FileText className="w-8 h-8" aria-hidden="true" />
            </motion.div>
            <h3 className="mt-4 text-[22px] font-semibold tracking-tight text-[var(--bos-text-primary)]">Proposal ready to edit</h3>
            <p className="mt-1 text-[12px] text-[var(--bos-text-tertiary)]">
              Every approved detail was carried over — nothing needs to be re-entered.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <MicroButton onClick={onClose}>Stay here</MicroButton>
              <a
                href={`/proposals/${ceremony.proposalId}`}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-sm bg-[var(--bos-accent)] text-white text-[11px] font-medium hover:bg-[var(--bos-accent-hover)] transition-colors duration-150"
              >
                <FileText className="w-3 h-3" aria-hidden="true" /> Open proposal studio →
              </a>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function PipelineNode({ label, state }: { label: string; state: "done" | "next" | "future" }) {
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-[72px]">
      <span
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full border text-[12px]",
          state === "done" && "border-[var(--bos-success)] bg-[var(--bos-success)] text-white",
          state === "next" && "border-[var(--bos-accent)] bg-[var(--bos-accent)] text-white shadow-[0_0_0_4px_var(--bos-accent-ring)]",
          state === "future" && "border-[var(--bos-line-strong)] text-[var(--bos-text-tertiary)]",
        )}
      >
        {state === "done" ? <Check className="w-4 h-4" aria-hidden="true" /> : state === "next" ? <ChevronDown className="w-4 h-4" aria-hidden="true" /> : "·"}
      </span>
      <span className={cn("text-[9px] font-mono uppercase tracking-[0.12em]", state === "future" ? "text-[var(--bos-text-tertiary)]" : "text-[var(--bos-text-secondary)]")}>
        {label}
      </span>
    </div>
  );
}

function PipelineArrow({ highlight, muted }: { highlight?: boolean; muted?: boolean }) {
  return (
    <span className={cn("flex items-center text-[var(--bos-text-tertiary)]", highlight && "text-[var(--bos-accent)]", muted && "opacity-40")} aria-hidden="true">
      <ArrowRight className="w-3.5 h-3.5" />
    </span>
  );
}

/* ═══ Dialog (send / remind / ask client / revoke / proposal) ═══ */

function Dialog({
  kind,
  bundle,
  link,
  defaultEmail,
  initialSection,
  busy,
  clientContacts,
  questions,
  onSend,
  onRemind,
  onClarifyAction,
  onViewQuestion,
  onRevoke,
  onProposal,
  onOpenClarifications,
  onClose,
}: {
  kind: "send" | "remind" | "ask" | "revoke" | "proposal";
  bundle: AdminBundle;
  link: string | null;
  defaultEmail?: string;
  initialSection?: string | null;
  busy: boolean;
  clientContacts: AdminBundle["clientContacts"];
  questions: AdminBundle["questions"];
  onSend: (payload: { to: string; subject: string; message: string; link?: string }) => void;
  onRemind: (payload: { to: string; message: string; link?: string }) => void;
  onClarifyAction: (path: string, body?: Record<string, unknown>) => Promise<{ ok: boolean; data?: Record<string, unknown>; message?: string }>;
  onViewQuestion: (questionId: string) => void;
  onRevoke: (payload: { reason?: string }) => void;
  onProposal: () => void;
  onOpenClarifications: () => void;
  onClose: () => void;
}) {
  const [to, setTo] = useState(defaultEmail ?? "");
  const [subject, setSubject] = useState(kind === "send" ? `Project discovery — ${bundle.request.title}` : `Reminder — ${bundle.request.title}`);
  const [message, setMessage] = useState("");
  const [section, setSection] = useState(initialSection ?? "");
  const [reason, setReason] = useState("");
  const [copied, setCopied] = useState(false);
  const [askStep, setAskStep] = useState<"compose" | "review" | "sending" | "success">("compose");
  const [askContactId, setAskContactId] = useState("");
  const [question, setQuestion] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [createdQuestionId, setCreatedQuestionId] = useState("");
  const [askError, setAskError] = useState<string | null>(null);
  const [existingQuestion, setExistingQuestion] = useState<{ id: string; sectionLabel: string; question: string; recipientName: string } | null>(null);
  const [sentQuestion, setSentQuestion] = useState<{ id: string; sectionLabel: string; recipientName: string; recipientEmail: string } | null>(null);

  const askRecipients: { id: string; name: string; role: string | null; email: string; isPrimary: boolean }[] = [
    ...clientContacts.filter((c) => c.email).map((c) => ({ ...c, email: c.email as string })),
    // Fallback: the client record itself when no contact has an email.
    ...(clientContacts.some((c) => c.email)
      ? []
      : bundle.client?.email
        ? [{ id: "", name: bundle.client.companyName, role: null as string | null, email: bundle.client.email, isPrimary: true }]
        : []),
  ];
  const askContact = askRecipients.find((c) => c.id === askContactId) ?? askRecipients.find((c) => c.isPrimary) ?? askRecipients[0] ?? null;

  const suggested = section ? SUGGESTED_QUESTIONS[section] ?? "" : "";

  // The structured Ask the Client flow: the note is classified and a
  // professional client question is generated server-side, then admin
  // approval happens at send. If the email fails the draft stays and a
  // retry re-sends it — never a duplicate question.
  const handleAskSend = async () => {
    setAskError(null);
    setAskStep("sending");
    const sectionLabel = section ? getSection(section)?.label ?? section : "";
    let qid = createdQuestionId;
    if (!qid) {
      const created = await onClarifyAction(`/api/requirements/${bundle.request.id}/clarifications`, {
        section,
        note: question,
        internalNote: internalNote.trim() ? internalNote : undefined,
        contactId: askContact?.id || undefined,
      });
      if (!created.ok) {
        const data = created.data as Record<string, unknown> | undefined;
        if (data?.code === "OPEN_QUESTION_EXISTS" && data.question) {
          const q = data.question as { id: string; sectionLabel: string; question: string; recipientName: string };
          setExistingQuestion(q);
          setAskStep("compose");
          return;
        }
        setAskError(created.message ?? "Unable to create the question.");
        setAskStep("compose");
        return;
      }
      qid = String((created.data?.question as { id?: string } | undefined)?.id ?? "");
      if (!qid) {
        setAskError("The question was created but returned no id — please retry.");
        setAskStep("compose");
        return;
      }
      setCreatedQuestionId(qid);
    }
    const sent = await onClarifyAction(`/api/clarifications/${qid}/send`, {});
    if (!sent.ok) {
      setAskError(`${sent.message ?? "The question was saved but could not be sent."} You can retry — it will not create a duplicate.`);
      setAskStep("review");
      return;
    }
    setSentQuestion({
      id: qid,
      sectionLabel,
      recipientName: askContact?.name ?? bundle.client?.companyName ?? "",
      recipientEmail: askContact?.email ?? "",
    });
    setAskStep("success");
  };

  const inputCls =
    "w-full h-9 px-3 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[13px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] transition-colors duration-150";

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  const title =
    kind === "send" ? "Send secure link"
    : kind === "remind" ? "Send reminder"
    : kind === "ask" ? "Ask the client"
    : kind === "revoke" ? "Revoke access"
    : "Create proposal from requirements";

  const kicker =
    kind === "send" ? "The client opens a private guided workspace"
    : kind === "remind" ? "A gentle nudge to complete the workspace"
    : kind === "ask" ? "Clarify something before moving forward"
    : kind === "revoke" ? "Retire the secure link immediately"
    : "Everything carries over automatically";

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden"
    >
      <div className="mt-3 rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-surface)]/60 p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-secondary)]">{title}</span>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="flex items-center justify-center w-6 h-6 rounded-sm text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)]">
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
        <p className="mb-3 text-[10px] text-[var(--bos-text-tertiary)]">{kicker}</p>

        {kind === "send" || kind === "remind" ? (
          <div className="space-y-3 max-w-xl">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="bos-label">Recipient</label>
                <input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="client@company.com" className={inputCls} />
              </div>
              {kind === "send" && (
                <div>
                  <label className="bos-label">Subject</label>
                  <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
                </div>
              )}
            </div>
            <div>
              <label className="bos-label">{kind === "send" ? "Personal message (optional)" : "Message"}</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder={kind === "send" ? "A short note about the project…" : "A gentle nudge to complete the workspace…"}
                className={cn(inputCls, "h-20 py-2 resize-none")}
              />
            </div>
            {link && (
              <div>
                <label className="bos-label">Secure link</label>
                <div className="flex items-center gap-2">
                  <input readOnly value={link} className={cn(inputCls, "font-mono text-[11px] truncate")} />
                  <MicroButton onClick={() => void copyLink()}>
                    {copied ? <Check className="w-3 h-3 text-[var(--bos-success)]" aria-hidden="true" /> : <Copy className="w-3 h-3" aria-hidden="true" />}
                    {copied ? "Copied" : "Copy"}
                  </MicroButton>
                </div>
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-1">
              <MicroButton onClick={onClose}>Cancel</MicroButton>
              <MicroButton
                variant="accent"
                disabled={busy || !to.trim()}
                onClick={() => {
                  if (kind === "send") onSend({ to: to.trim(), subject, message, link: link ?? undefined });
                  else onRemind({ to: to.trim(), message, link: link ?? undefined });
                }}
              >
                {busy ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <Send className="w-3 h-3" aria-hidden="true" />}
                {kind === "send" ? "Send email" : "Send reminder"}
              </MicroButton>
            </div>
          </div>
        ) : kind === "ask" ? (
          <AskClientPanel
            bundle={bundle}
            section={section}
            setSection={(s) => { setSection(s); setCreatedQuestionId(""); }}
            suggested={suggested}
            question={question}
            setQuestion={setQuestion}
            internalNote={internalNote}
            setInternalNote={setInternalNote}
            recipients={askRecipients}
            setContactId={(id) => { setAskContactId(id); setCreatedQuestionId(""); }}
            contact={askContact}
            questions={questions}
            step={askStep}
            setStep={setAskStep}
            error={askError}
            busy={busy}
            sentQuestion={sentQuestion}
            existingQuestion={existingQuestion}
            onSend={handleAskSend}
            onViewQuestion={onViewQuestion}
            onClose={onClose}
          />
        ) : kind === "revoke" ? (
          <div className="space-y-3 max-w-xl">
            <p className="text-[12px] text-[var(--bos-text-secondary)]">
              Revoking retires the secure link immediately. The client will see “access revoked” if they try to open it. Existing answers are preserved.
            </p>
            <div>
              <label className="bos-label">Reason (visible to you only)</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Wrong recipient — will resend" className={inputCls} />
            </div>
            <div className="flex justify-end gap-2">
              <MicroButton onClick={onClose}>Cancel</MicroButton>
              <MicroButton variant="accent" disabled={busy} onClick={() => onRevoke({ reason: reason || undefined })}>
                {busy ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <ShieldX className="w-3 h-3" aria-hidden="true" />} Revoke access
              </MicroButton>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-w-xl">
            <p className="text-[12px] text-[var(--bos-text-secondary)] leading-relaxed">
              Create a draft proposal from these approved requirements. The client, project name, scope, features, stakeholders, commercial range, materials and design direction are carried over automatically — nothing is re-entered.
            </p>
            <div className="rounded-sm border border-[var(--bos-line)] p-3">
              <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)] mb-1">Will be created</div>
              <div className="text-[13px] font-medium text-[var(--bos-text-primary)]">{bundle.request.title} — Proposal</div>
              <div className="mt-1 text-[11px] text-[var(--bos-text-tertiary)]">
                {bundle.features.length} features · {bundle.attachments.length} files · {bundle.request.completeness}% completeness carried over
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <MicroButton onClick={onClose}>Cancel</MicroButton>
              <MicroButton variant="accent" disabled={busy} onClick={onProposal}>
                {busy ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <Banknote className="w-3 h-3" aria-hidden="true" />} Create proposal
              </MicroButton>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ═══ Ask the client — compose → review → send → success ═══ */

function AskClientPanel({
  bundle,
  section,
  setSection,
  suggested,
  question,
  setQuestion,
  internalNote,
  setInternalNote,
  recipients,
  setContactId,
  contact,
  questions,
  step,
  setStep,
  error,
  busy,
  sentQuestion,
  existingQuestion,
  onSend,
  onViewQuestion,
  onClose,
}: {
  bundle: AdminBundle;
  section: string;
  setSection: (s: string) => void;
  suggested: string;
  question: string;
  setQuestion: (s: string) => void;
  internalNote: string;
  setInternalNote: (s: string) => void;
  recipients: { id: string; name: string; role: string | null; email: string; isPrimary: boolean }[];
  setContactId: (s: string) => void;
  contact: { id: string; name: string; role: string | null; email: string; isPrimary: boolean } | null;
  questions: AdminBundle["questions"];
  step: "compose" | "review" | "sending" | "success";
  setStep: (s: "compose" | "review" | "sending" | "success") => void;
  error: string | null;
  busy: boolean;
  sentQuestion: { id: string; sectionLabel: string; recipientName: string; recipientEmail: string } | null;
  existingQuestion: { id: string; sectionLabel: string; question: string; recipientName: string } | null;
  onSend: () => Promise<void>;
  onViewQuestion: (questionId: string) => void;
  onClose: () => void;
}) {
  const inputCls =
    "w-full h-9 px-3 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[13px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] transition-colors duration-150";

  const openForSection = questions.find((q) => OPEN_Q_STATUSES.includes(q.status) && q.section === section);
  const sectionLabel = section ? getSection(section)?.label ?? section : "";

  // A clarification is already awaiting a response for this section.
  if (existingQuestion) {
    return (
      <div className="space-y-3 max-w-xl">
        <div className="rounded-sm border border-[var(--bos-warning)]/25 bg-[var(--bos-warning)]/6 px-3.5 py-3">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--bos-warning)]">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" /> Already awaiting response
          </div>
          <p className="mt-1.5 text-[12px] text-[var(--bos-text-secondary)] leading-relaxed">
            A clarification for <strong>{existingQuestion.sectionLabel}</strong> was already sent to {existingQuestion.recipientName || "the client"} and is still waiting for an answer. Send a reminder instead of a duplicate question.
          </p>
          {existingQuestion.question && (
            <p className="mt-2 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] px-3 py-2 text-[12px] text-[var(--bos-text-primary)]">
              “{existingQuestion.question}”
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <MicroButton onClick={onClose}>Close</MicroButton>
          {existingQuestion.id && (
            <MicroButton variant="accent" onClick={() => onViewQuestion(existingQuestion.id)}>
              <Eye className="w-3 h-3" aria-hidden="true" /> View existing question
            </MicroButton>
          )}
        </div>
      </div>
    );
  }

  // Live guard while composing — the selected section already has an open question.
  if (step === "compose" && openForSection && !existingQuestion) {
    return (
      <div className="space-y-3 max-w-xl">
        <div className="rounded-sm border border-[var(--bos-warning)]/25 bg-[var(--bos-warning)]/6 px-3.5 py-3">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--bos-warning)]">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" /> Already awaiting response
          </div>
          <p className="mt-1.5 text-[12px] text-[var(--bos-text-secondary)] leading-relaxed">
            A clarification for <strong>{openForSection.sectionLabel}</strong> is already awaiting a response from {openForSection.recipientName}. You can remind the client instead of asking again.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <MicroButton onClick={onClose}>Close</MicroButton>
          <MicroButton variant="accent" onClick={() => onViewQuestion(openForSection.id)}>
            <Eye className="w-3 h-3" aria-hidden="true" /> View existing question
          </MicroButton>
        </div>
      </div>
    );
  }

  if (step === "sending") {
    return (
      <div className="space-y-4 max-w-xl py-2">
        <div className="flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-[var(--bos-accent)]" aria-hidden="true" />
          <div className="text-[12px] font-medium text-[var(--bos-text-primary)]">Sending your question</div>
        </div>
        <ol className="space-y-1.5 text-[11px] text-[var(--bos-text-tertiary)]">
          <li className="flex items-center gap-2"><Check className="w-3 h-3 text-[var(--bos-success)]" aria-hidden="true" /> Preparing message</li>
          <li className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> Sending securely</li>
          <li className="flex items-center gap-2 text-[var(--bos-text-tertiary)]"><span className="w-3" aria-hidden="true" /> Confirming delivery</li>
        </ol>
      </div>
    );
  }

  if (step === "success" && sentQuestion) {
    return (
      <div className="space-y-4 max-w-xl">
        <div className="req-enter">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--bos-success)] text-white shrink-0">
              <Check className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <div className="text-[15px] font-semibold tracking-tight text-[var(--bos-text-primary)]">Question sent</div>
              <div className="text-[11px] text-[var(--bos-text-tertiary)]">Awaiting client response</div>
            </div>
          </div>
        </div>
        <div className="rounded-sm border border-[var(--bos-line)] p-3.5 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)]">Sent to</span>
            <span className="text-[12px] text-[var(--bos-text-primary)]">{sentQuestion.recipientName} · {sentQuestion.recipientEmail}</span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)]">Section</span>
            <span className="text-[12px] text-[var(--bos-text-primary)]">{sentQuestion.sectionLabel}</span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)]">Status</span>
            <span className="text-[12px] text-[var(--bos-warning)]">Waiting for client</span>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <MicroButton onClick={onClose}>Done</MicroButton>
          <MicroButton variant="accent" onClick={() => onViewQuestion(sentQuestion.id)}>
            <Eye className="w-3 h-3" aria-hidden="true" /> View question
          </MicroButton>
        </div>
      </div>
    );
  }

  /* ── Compose ── */
  if (step === "compose") {
    return (
      <div className="space-y-3 max-w-xl">
        {/* Recipient — resolved from the client's contacts, never typed by hand */}
        <div className="rounded-sm border border-[var(--bos-line)] p-3">
          <div className="flex items-center justify-between">
            <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)]">Client</div>
            <span className="text-[12px] font-medium text-[var(--bos-text-primary)]">{bundle.client?.companyName}</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-3">
            <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)]">Contact</div>
            {recipients.length > 1 ? (
              <div className="relative min-w-0 flex-1 max-w-[260px]">
                <select
                  value={contact?.id ?? ""}
                  onChange={(e) => setContactId(e.target.value)}
                  className={cn(inputCls, "appearance-none pr-8")}
                  aria-label="Recipient contact"
                >
                  {recipients.map((c) => (
                    <option key={c.id || c.email} value={c.id}>
                      {c.name}{c.role ? ` — ${c.role}` : ""} · {c.email}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--bos-text-tertiary)] pointer-events-none" aria-hidden="true" />
              </div>
            ) : contact ? (
              <div className="text-right">
                <div className="text-[12px] text-[var(--bos-text-primary)]">{contact.name}{contact.role ? ` · ${contact.role}` : ""}</div>
                <div className="text-[10px] text-[var(--bos-text-tertiary)]">{contact.email}</div>
              </div>
            ) : (
              <span className="text-[11px] text-[var(--bos-error)]">No contact email on file</span>
            )}
          </div>
        </div>

        {/* Target section */}
        <div>
          <label className="bos-label">Target section</label>
          <div className="relative">
            <select value={section} onChange={(e) => setSection(e.target.value)} className={cn(inputCls, "appearance-none pr-8")}>
              <option value="">Choose a section</option>
              {SECTIONS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.number} — {s.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--bos-text-tertiary)] pointer-events-none" aria-hidden="true" />
          </div>
        </div>

        {/* Question */}
        <div>
          <label className="bos-label">Question for the client</label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={4}
            placeholder={suggested || "What do you need the client to confirm?"}
            className={cn(inputCls, "h-24 py-2 resize-none")}
          />
          {suggested && (
            <button
              type="button"
              onClick={() => setQuestion(suggested)}
              className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] text-[var(--bos-accent)] hover:text-[var(--bos-accent-hover)]"
            >
              <Lightbulb className="w-3 h-3" aria-hidden="true" /> Use suggested question
            </button>
          )}
        </div>

        {/* Internal note — never sent to the client */}
        <div>
          <label className="bos-label">
            Internal note <span className="text-[var(--bos-text-tertiary)]">(not sent to the client)</span>
          </label>
          <textarea
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            rows={2}
            placeholder="e.g. This is blocking proposal preparation"
            className={cn(inputCls, "h-16 py-2 resize-none")}
          />
        </div>

        <div className="flex justify-end gap-2">
          <MicroButton onClick={onClose}>Cancel</MicroButton>
          <MicroButton
            variant="accent"
            disabled={!section || !question.trim() || !contact}
            onClick={() => setStep("review")}
          >
            <ArrowRight className="w-3 h-3" aria-hidden="true" /> Review &amp; send
          </MicroButton>
        </div>
      </div>
    );
  }

  /* ── Review ── */
  return (
    <div className="space-y-3 max-w-xl">
      <div className="rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-bg)] p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)] pt-0.5">To</span>
          <div className="text-right">
            <div className="text-[12px] font-medium text-[var(--bos-text-primary)]">{contact?.name}</div>
            <div className="text-[10px] text-[var(--bos-text-tertiary)]">{contact?.email}</div>
          </div>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)] pt-0.5">Re</span>
          <div className="text-right">
            <div className="text-[12px] text-[var(--bos-text-primary)]">{bundle.request.title}</div>
            <div className="text-[10px] text-[var(--bos-text-tertiary)]">Requirement clarification</div>
          </div>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)] pt-0.5">Section</span>
          <div className="text-[12px] text-[var(--bos-text-primary)]">{sectionLabel}</div>
        </div>
        <div className="border-t border-[var(--bos-line)] pt-3">
          <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)] mb-1.5">Question</div>
          <p className="text-[13px] leading-relaxed text-[var(--bos-text-primary)]">“{question}”</p>
        </div>
      </div>

      {/* What the client receives */}
      <div className="rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)]/40 p-3.5">
        <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-accent)] mb-1">
          Client will receive
        </div>
        <p className="text-[11px] leading-relaxed text-[var(--bos-text-secondary)]">
          An email from your team asking for one clarification about {sectionLabel}, with a secure link to respond. The internal note below is never included.
        </p>
      </div>

      {internalNote && (
        <div className="rounded-sm border border-[var(--bos-line)] px-3 py-2">
          <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)]">Internal note (not sent)</div>
          <p className="mt-0.5 text-[11px] text-[var(--bos-text-tertiary)]">{internalNote}</p>
        </div>
      )}

      {error && (
        <div className="rounded-sm border border-[var(--bos-error)]/30 bg-[var(--bos-error)]/5 px-3 py-2 text-[11px] text-[var(--bos-error)]">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <MicroButton onClick={() => setStep("compose")}>Edit</MicroButton>
        <MicroButton variant="accent" disabled={busy} onClick={() => void onSend()}>
          {busy ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <Send className="w-3 h-3" aria-hidden="true" />} Send question
        </MicroButton>
      </div>
    </div>
  );
}

/* ═══ Clarifications — the admin clarification center ═══ */

const PRIORITY_TONES: Record<string, string> = {
  LOW: "text-[var(--bos-text-tertiary)] border-[var(--bos-line)] bg-[var(--bos-overlay)]",
  MEDIUM: "text-[var(--bos-info)] border-[var(--bos-info)]/25 bg-[var(--bos-info)]/8",
  HIGH: "text-[var(--bos-warning)] border-[var(--bos-warning)]/25 bg-[var(--bos-warning)]/6",
  BLOCKING: "text-[var(--bos-error)] border-[var(--bos-error)]/25 bg-[var(--bos-error)]/6",
};

const IMPACT_LABELS: Record<string, string> = {
  scope: "Scope",
  timeline: "Timeline",
  budget: "Budget",
  deliverables: "Deliverables",
  technical: "Complexity",
  risk: "Risk",
};

function ClarificationsView({
  bundle,
  onViewQuestion,
  onAskClient,
}: {
  bundle: AdminBundle;
  onViewQuestion: (questionId: string) => void;
  onAskClient: (section?: string | null) => void;
}) {
  const [tab, setTab] = useState<"all" | "blocking" | "pending" | "drafts" | "answered" | "resolved" | "conflicts">("all");
  const q = bundle.questions;

  const pending = q.filter((x) => OPEN_Q_STATUSES.includes(x.status));
  const drafts = q.filter((x) => ["DRAFT", "READY_FOR_REVIEW", "APPROVED"].includes(x.status));
  const answered = q.filter((x) => ["ANSWERED", "UNDER_REVIEW"].includes(x.status));
  const resolved = q.filter((x) => x.status === "RESOLVED");
  const blocking = q.filter((x) => x.isBlocking && !["RESOLVED", "CANCELLED", "BLOCKED"].includes(x.status));

  const list =
    tab === "blocking" ? blocking
    : tab === "pending" ? pending
    : tab === "drafts" ? drafts
    : tab === "answered" ? answered
    : tab === "resolved" ? resolved
    : tab === "conflicts" ? []
    : q;

  const tabs: { key: typeof tab; label: string; count: number; danger?: boolean }[] = [
    { key: "all", label: "All", count: q.length },
    { key: "blocking", label: "Blocking", count: blocking.length, danger: blocking.length > 0 },
    { key: "pending", label: "Pending client", count: pending.length },
    { key: "drafts", label: "Drafts", count: drafts.length },
    { key: "answered", label: "Answered", count: answered.length },
    { key: "resolved", label: "Resolved", count: resolved.length },
    { key: "conflicts", label: "Conflicts", count: bundle.conflicts.length, danger: bundle.conflicts.length > 0 },
  ];

  return (
    <div className="space-y-6 req-enter">
      <header className="border-b border-[var(--bos-line)] pb-4">
        <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--bos-text-tertiary)]">Requirement clarifications</div>
        <h3 className="mt-1.5 text-[19px] font-semibold tracking-tight text-[var(--bos-text-primary)]">Clarification center</h3>
        <p className="mt-1 text-[12px] text-[var(--bos-text-tertiary)] max-w-prose">
          Every question is classified, quality-gated and versioned. Blocking questions gate the proposal until resolved.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar border-b border-[var(--bos-line)] pb-px">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 h-8 px-2.5 rounded-t-sm text-[11px] font-medium transition-colors duration-150 shrink-0",
              tab === t.key
                ? "text-[var(--bos-accent)] border-b-2 border-[var(--bos-accent)]"
                : "text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]",
            )}
          >
            {t.label}
            <span className={cn("text-[9px] font-mono tabular-nums", t.danger ? "text-[var(--bos-error)]" : "text-[var(--bos-text-tertiary)]")}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {tab === "conflicts" ? (
        <div className="space-y-2">
          {bundle.conflicts.length === 0 ? (
            <p className="text-[12px] text-[var(--bos-text-tertiary)]">No open conflicts detected.</p>
          ) : (
            bundle.conflicts.map((c) => (
              <div key={c.id} className="rounded-sm border border-[var(--bos-warning)]/25 bg-[var(--bos-warning)]/5 px-3.5 py-3">
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--bos-warning)]">
                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> Possible requirement conflict
                </div>
                <p className="mt-1.5 text-[12px] text-[var(--bos-text-primary)] leading-relaxed">{c.description}</p>
                {c.detail && <p className="mt-1 text-[11px] text-[var(--bos-text-tertiary)]">{c.detail}</p>}
                <div className="mt-1 text-[9px] text-[var(--bos-text-tertiary)] tabular-nums">{formatDateTime(c.createdAt)}</div>
              </div>
            ))
          )}
          <div className="flex justify-end pt-2">
            <MicroButton variant="accent" onClick={() => onAskClient()}>
              <MessageCircle className="w-3 h-3" aria-hidden="true" /> Ask client
            </MicroButton>
          </div>
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-sm border border-[var(--bos-line)] px-4 py-8 text-center">
          <p className="text-[12px] text-[var(--bos-text-tertiary)]">Nothing here yet.</p>
          <MicroButton onClick={() => onAskClient()} className="mt-3">
            <MessageCircle className="w-3 h-3" aria-hidden="true" /> Ask the client
          </MicroButton>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((question) => {
            const impact = Object.entries(question.impact)
              .filter(([, v]) => v && v !== "UNKNOWN")
              .slice(0, 3);
            return (
              <div key={question.id} className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)]">
                        {question.sectionLabel}
                      </span>
                      {question.categoryLabel && (
                        <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-accent)]">
                          {question.categoryLabel}
                          {question.subcategory ? ` → ${question.subcategory}` : ""}
                        </span>
                      )}
                      <QuestionStatusChip status={question.status} />
                    </div>
                    <p className="mt-1.5 text-[13px] font-medium text-[var(--bos-text-primary)] leading-snug">
                      {question.clientQuestion ?? question.question}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      {question.priority && (
                        <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-[3px] border text-[9px] font-mono uppercase tracking-[0.1em]", PRIORITY_TONES[question.priority] ?? PRIORITY_TONES.MEDIUM)}>
                          {question.priority}
                        </span>
                      )}
                      {question.isBlocking && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--bos-error)]">
                          <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Required before proposal
                        </span>
                      )}
                      {question.qualityScore != null && (
                        <span className={cn("text-[9px] font-mono tabular-nums", question.qualityScore >= 70 ? "text-[var(--bos-success)]" : "text-[var(--bos-warning)]")}>
                          {question.qualityScore}/100 quality
                        </span>
                      )}
                      {impact.map(([k, v]) => (
                        <span key={k} className="text-[9px] font-mono uppercase tracking-[0.08em] text-[var(--bos-text-tertiary)]">
                          {IMPACT_LABELS[k] ?? k} · {String(v)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {["ANSWERED", "UNDER_REVIEW"].includes(question.status) && (
                      <MicroButton variant="accent" onClick={() => onViewQuestion(question.id)}>
                        <BadgeCheck className="w-3 h-3" aria-hidden="true" /> Review
                      </MicroButton>
                    )}
                    <MicroButton onClick={() => onViewQuestion(question.id)}>
                      <Eye className="w-3 h-3" aria-hidden="true" /> Open
                    </MicroButton>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══ Question detail — status, delivery trail, actions ═══ */

type QuestionDetail = {
  ok: true;
  question: AdminBundle["questions"][number];
  deliveries: { id: string; kind: string; recipient: string; provider: string | null; status: string; sentAt: string | null; failedAt: string | null; failureReason: string | null; createdAt: string }[];
  updateProposals: { id: string; summary: string; currentValue: string | null; proposedValue: string | null; status: string; createdAt: string }[];
};

function QuestionDetailPanel({
  questionId,
  bundle,
  onClose,
  onChanged,
}: {
  questionId: string;
  bundle: AdminBundle;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [detail, setDetail] = useState<QuestionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const summary = bundle.questions.find((q) => q.id === questionId) ?? null;

  const loadDetail = useCallback(async () => {
    const res = await fetch(`/api/clarifications/${questionId}`);
    const data = await res.json();
    if (res.ok && data.ok) {
      setDetail(data);
      setError(null);
    } else {
      setError(data.message ?? "Unable to load this question.");
    }
  }, [questionId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDetail();
  }, [loadDetail]);

  const doAction = async (path: string, body?: Record<string, unknown>) => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setNotice(`⚠ ${data.message ?? "Action failed."}`);
        return;
      }
      setNotice("✓ Done — the question state was updated.");
      await loadDetail();
      await onChanged();
    } catch {
      setNotice("⚠ Network error — please retry.");
    } finally {
      setBusy(false);
    }
  };

  const status = summary?.status ?? "";
  const isOpen = OPEN_Q_STATUSES.includes(status);
  const isFailed = status === "FAILED";
  const isAnswered = status === "ANSWERED" || status === "UNDER_REVIEW";
  const isResolved = status === "RESOLVED";

  const impact = Object.entries(summary?.impact ?? {}).filter(([, v]) => v && v !== "UNKNOWN");

  return (
    <div className="space-y-5 req-enter max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)]">Clarification question</span>
            {summary && <QuestionStatusChip status={summary.status} />}
          </div>
          <p className="mt-1.5 text-[16px] font-medium tracking-tight text-[var(--bos-text-primary)] leading-snug">
            {summary?.clientQuestion ?? summary?.question ?? "Loading…"}
          </p>
          {summary && (
            <div className="mt-1 text-[11px] text-[var(--bos-text-tertiary)]">
              {summary.sectionLabel} · {summary.recipientName} · {summary.recipientEmail}
              {summary.sentAt ? ` · Sent ${formatDateTime(summary.sentAt)}` : ""}
            </div>
          )}
        </div>
        <MicroButton onClick={onClose}>
          <X className="w-3 h-3" aria-hidden="true" /> Close
        </MicroButton>
      </div>

      {notice && (
        <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/50 px-3 py-2 text-[11px] text-[var(--bos-text-secondary)]">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-sm border border-[var(--bos-error)]/30 bg-[var(--bos-error)]/5 px-3 py-2 text-[11px] text-[var(--bos-error)]">
          {error}
        </div>
      )}

      {/* Scope classification — real engine data, shown for engine-created questions */}
      {(summary?.categoryLabel || summary?.answerType !== "LONG_TEXT" || summary?.priority) && (
        <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 px-3.5 py-3">
          <div className="mb-2 text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-secondary)]">Classification</div>
          <div className="flex items-center gap-2 flex-wrap">
            {summary?.categoryLabel && (
              <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-[var(--bos-accent)]">
                {summary.categoryLabel}{summary.subcategory ? ` → ${summary.subcategory}` : ""}
              </span>
            )}
            {summary?.answerType && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-[3px] border border-[var(--bos-line)] bg-[var(--bos-overlay)] text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--bos-text-secondary)]">
                {summary.answerType.replace(/_/g, " ")}
              </span>
            )}
            {summary?.priority && (
              <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-[3px] border text-[9px] font-mono uppercase tracking-[0.1em]", PRIORITY_TONES[summary.priority] ?? PRIORITY_TONES.MEDIUM)}>
                {summary.priority}
              </span>
            )}
            {summary?.qualityScore != null && (
              <span className={cn("text-[9px] font-mono tabular-nums", summary.qualityScore >= 70 ? "text-[var(--bos-success)]" : "text-[var(--bos-warning)]")}>
                {summary.qualityScore}/100 quality
              </span>
            )}
            {impact.map(([k, v]) => (
              <span key={k} className="text-[9px] font-mono uppercase tracking-[0.08em] text-[var(--bos-text-tertiary)]">
                {IMPACT_LABELS[k] ?? k} · {String(v)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Context the client saw */}
      {(summary?.currentUnderstanding || summary?.whyWeAsk) && (
        <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 px-3.5 py-3 space-y-2">
          {summary.currentUnderstanding && (
            <div>
              <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)]">Current understanding</div>
              <p className="mt-0.5 text-[12px] text-[var(--bos-text-secondary)] leading-relaxed">{summary.currentUnderstanding}</p>
            </div>
          )}
          {summary.whyWeAsk && (
            <div>
              <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)]">Why we&apos;re asking</div>
              <p className="mt-0.5 text-[12px] text-[var(--bos-text-secondary)] leading-relaxed">{summary.whyWeAsk}</p>
            </div>
          )}
        </div>
      )}

      {/* Response — the reason this question exists */}
      {summary && isAnswered ? (
        <div className="rounded-sm border border-[var(--bos-success)]/25 bg-[var(--bos-success)]/5 p-4">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--bos-success)]">
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Client response{summary.respondedByName ? ` · ${summary.respondedByName}` : ""}
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--bos-text-primary)]">{summary.response}</p>
          {summary.respondedAt && (
            <div className="mt-2 text-[10px] text-[var(--bos-text-tertiary)] tabular-nums">{formatDateTime(summary.respondedAt)}</div>
          )}
          {/* The admin's explicit review — nothing is confirmed without it */}
          <div className="mt-3 pt-3 border-t border-[var(--bos-success)]/15 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-[var(--bos-text-tertiary)]">Nothing is confirmed until you review it:</span>
            <MicroButton
              variant="accent"
              disabled={busy}
              onClick={() => void doAction(`/api/clarifications/${questionId}/review`, { decision: "accept" })}
            >
              {busy ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <BadgeCheck className="w-3 h-3" aria-hidden="true" />} Accept answer
            </MicroButton>
            <MicroButton
              disabled={busy}
              onClick={() => void doAction(`/api/clarifications/${questionId}/review`, { decision: "reject" })}
            >
              <Ban className="w-3 h-3" aria-hidden="true" /> Reject &amp; re-ask
            </MicroButton>
          </div>
        </div>
      ) : isResolved ? (
        <div className="rounded-sm border border-[var(--bos-success)]/25 bg-[var(--bos-success)]/5 p-4">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--bos-success)]">
            <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" /> Answer accepted
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--bos-text-primary)]">{summary?.response}</p>
          {summary?.resolvedAt && (
            <div className="mt-2 text-[10px] text-[var(--bos-text-tertiary)] tabular-nums">Resolved {formatDateTime(summary.resolvedAt)}</div>
          )}
        </div>
      ) : summary?.status === "FAILED" ? (
        <div className="rounded-sm border border-[var(--bos-error)]/25 bg-[var(--bos-error)]/5 p-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--bos-error)]">Message not sent</div>
          <p className="mt-1.5 text-[12px] text-[var(--bos-text-secondary)]">
            The clarification could not be delivered — the email provider did not confirm it. Retry once the email configuration is fixed.
          </p>
        </div>
      ) : null}

      {summary?.internalNote && (
        <div className="rounded-sm border border-[var(--bos-line)] px-3 py-2">
          <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)]">Internal note</div>
          <p className="mt-0.5 text-[11px] text-[var(--bos-text-tertiary)]">{summary.internalNote}</p>
        </div>
      )}

      {/* Requirement update proposals from resolved answers */}
      {detail && detail.updateProposals.length > 0 && (
        <div>
          <div className="mb-2 text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-secondary)]">Requirement update proposals</div>
          <div className="space-y-2">
            {detail.updateProposals.map((p) => (
              <div key={p.id} className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12px] font-medium text-[var(--bos-text-primary)]">{p.summary}</span>
                  <span
                    className={cn(
                      "text-[9px] font-mono uppercase tracking-[0.1em]",
                      p.status === "ACCEPTED" ? "text-[var(--bos-success)]" : "text-[var(--bos-text-tertiary)]",
                    )}
                  >
                    {p.status === "ACCEPTED" ? "Applied to requirement" : p.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-[11px] text-[var(--bos-text-secondary)]">
                  <div><span className="text-[var(--bos-text-tertiary)]">Current: </span>{p.currentValue || "Not specified in requirement"}</div>
                  <div><span className="text-[var(--bos-text-tertiary)]">Proposed: </span>{p.proposedValue || "—"}</div>
                </div>
                {p.status === "PENDING" && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <MicroButton variant="accent" disabled={busy} onClick={() => void doAction(`/api/clarifications/${p.id}/proposal`, { decision: "accept" })}>
                      <BadgeCheck className="w-3 h-3" aria-hidden="true" /> Accept update
                    </MicroButton>
                    <MicroButton disabled={busy} onClick={() => void doAction(`/api/clarifications/${p.id}/proposal`, { decision: "reject" })}>
                      <Ban className="w-3 h-3" aria-hidden="true" /> Reject
                    </MicroButton>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivery trail */}
      <div>
        <div className="mb-2 text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-secondary)]">Delivery trail</div>
        {!detail ? (
          <p className="text-[11px] text-[var(--bos-text-tertiary)]">Loading…</p>
        ) : detail.deliveries.length === 0 ? (
          <p className="text-[11px] text-[var(--bos-text-tertiary)]">No delivery attempts yet.</p>
        ) : (
          <ol className="relative border-l border-[var(--bos-line)] ml-1 space-y-2.5">
            {detail.deliveries.map((d) => (
              <li key={d.id} className="pl-3.5 relative">
                <span
                  className={cn(
                    "absolute -left-[3px] top-1 w-1.5 h-1.5 rounded-full",
                    d.status === "FAILED" ? "bg-[var(--bos-error)]" : "bg-[var(--bos-accent)]",
                  )}
                  aria-hidden="true"
                />
                <div className="text-[11px] text-[var(--bos-text-primary)] leading-snug">
                  {d.status === "FAILED" ? "Delivery failed" : d.kind === "REMINDER" ? "Reminder sent" : "Question sent"}
                </div>
                {d.failureReason && <div className="text-[9px] text-[var(--bos-text-tertiary)]">{d.failureReason}</div>}
                <div className="text-[9px] text-[var(--bos-text-tertiary)] tabular-nums">
                  {d.recipient} · {formatDateTime(d.createdAt)}
                </div>
              </li>
            ))}
            {detail.question.respondedAt && (
              <li className="pl-3.5 relative">
                <span className="absolute -left-[3px] top-1 w-1.5 h-1.5 rounded-full bg-[var(--bos-success)]" aria-hidden="true" />
                <div className="text-[11px] text-[var(--bos-text-primary)] leading-snug">Client responded</div>
                <div className="text-[9px] text-[var(--bos-text-tertiary)] tabular-nums">{formatDateTime(detail.question.respondedAt)}</div>
              </li>
            )}
            {detail.question.resolvedAt && (
              <li className="pl-3.5 relative">
                <span className="absolute -left-[3px] top-1 w-1.5 h-1.5 rounded-full bg-[var(--bos-success)]" aria-hidden="true" />
                <div className="text-[11px] text-[var(--bos-text-primary)] leading-snug">Answer accepted — resolved</div>
                <div className="text-[9px] text-[var(--bos-text-tertiary)] tabular-nums">{formatDateTime(detail.question.resolvedAt)}</div>
              </li>
            )}
          </ol>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {isFailed && (
          <MicroButton variant="accent" disabled={busy} onClick={() => void doAction(`/api/clarifications/${questionId}/send`)}>
            {busy ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <RefreshCw className="w-3 h-3" aria-hidden="true" />} Retry send
          </MicroButton>
        )}
        {isOpen && (
          <>
            <MicroButton variant="accent" disabled={busy} onClick={() => void doAction(`/api/clarifications/${questionId}/remind`)}>
              {busy ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <Mail className="w-3 h-3" aria-hidden="true" />} Send reminder
            </MicroButton>
            <MicroButton disabled={busy} onClick={() => void doAction(`/api/clarifications/${questionId}/cancel`)}>
              {busy ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <Ban className="w-3 h-3" aria-hidden="true" />} Cancel question
            </MicroButton>
          </>
        )}
      </div>
    </div>
  );
}
