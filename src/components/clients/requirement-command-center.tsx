"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  Download,
  FileStack,
  FileText,
  Lightbulb,
  Loader2,
  Mail,
  MessageCircle,
  Pencil,
  RotateCcw,
  Send,
  ShieldX,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SECTIONS, getSection, type SectionDef } from "@/lib/requirement-config";
import { StatusChip, MicroButton } from "./kit";

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
  client: { id: string; companyName: string; industry: string | null; status: string } | null;
  answers: Record<string, Record<string, unknown>>;
  features: {
    id: string; name: string; priority: string; users: string[];
    description: string; config: Record<string, unknown>;
    acceptanceCriteria: string[]; dependencies: string[];
  }[];
  attachments: { id: string; name: string; size: number; mime: string; section: string; uploadedByName: string | null; createdAt: string }[];
  comments: { id: string; author: string; authorName: string; section: string | null; message: string; resolvedAt: string | null; createdAt: string }[];
  revisions: { id: string; revision: number; submittedByName: string | null; submittedAt: string; changes: string[] }[];
  events: { id: string; type: string; label: string; detail: string | null; createdAt: string }[];
  states: Record<string, boolean>;
  proposals: { id: string; title: string; status: string; amount: number | null; createdAt: string }[];
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

/* ── Deterministic intelligence ─────────────────────────────────
   Every number and label below is computed from the bundle's real
   stored data. Nothing is fabricated. */

type ReviewState = "confirmed" | "clarify" | "pending";

function openAdminComments(bundle: AdminBundle, section?: string) {
  return bundle.comments.filter(
    (c) => c.author === "ADMIN" && !c.resolvedAt && (section ? c.section === section : true),
  );
}

/** Per-section review state — complete + no open clarification = confirmed. */
function sectionReview(bundle: AdminBundle, key: string): ReviewState {
  if (openAdminComments(bundle, key).length > 0) return "clarify";
  if (bundle.states[key]) return "confirmed";
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
  for (const s of SECTIONS.filter((sec) => sec.weight > 0)) {
    if (!bundle.states[s.key]) {
      items.push({ kind: "incomplete", text: `${s.label} not confirmed`, section: s.key });
    }
  }
  for (const c of openAdminComments(bundle)) {
    const label = c.section ? getSection(c.section)?.label ?? c.section : "Requirement";
    items.push({ kind: "clarify", text: `${label} — awaiting client response`, section: c.section });
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
  const open = SECTIONS.filter((s) => s.weight > 0).filter((s) => !bundle.states[s.key]).length;
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
  const [dialog, setDialog] = useState<null | "send" | "remind" | "changes" | "revoke" | "proposal">(null);
  const [dialogSection, setDialogSection] = useState<string | null>(null);
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
        return { ok: false, message: data.message };
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
    setDialogSection(section);
    setDialog("changes");
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
  const canReview = ["SUBMITTED", "REVISION_SUBMITTED"].includes(r.status);
  const inReview = reviewMode && canReview;
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
            {r.status === "APPROVED" && !newestProposal && (
              <MicroButton variant="accent" onClick={() => setDialog("proposal")}>
                <Banknote className="w-3 h-3" aria-hidden="true" /> Create proposal
              </MicroButton>
            )}
            {r.status === "APPROVED" && newestProposal && (
              <a
                href={`/proposals/${newestProposal.id}`}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm text-[11px] font-medium bg-[var(--bos-accent)] text-white hover:bg-[var(--bos-accent-hover)] transition-colors duration-150"
              >
                <FileText className="w-3 h-3" aria-hidden="true" /> Open proposal studio
              </a>
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
            onChanges={(payload) =>
              void act(`/api/requirements/${r.id}/request-changes`, payload).then((res) => {
                if (res.ok) {
                  setDialog(null);
                  setDialogSection(null);
                  setNotice("✓ Clarification requested — the client will see it next time they open the workspace.");
                }
              })
            }
            onRevoke={(payload) => handleAction(`/api/requirements/${r.id}/revoke`, payload)}
            onProposal={createProposal}
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

            {view === "overview" && <OverviewView bundle={bundle} />}
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
            {view === "activity" && <ActivityView bundle={bundle} />}
            {SECTIONS.map((s) =>
              view === s.key ? (
                <SectionView
                  key={s.key}
                  bundle={bundle}
                  section={s}
                  inReview={inReview}
                  reviewState={sectionReview(bundle, s.key)}
                  onAskClient={() => openAskClient(s.key)}
                />
              ) : null,
            )}
          </div>

          {/* ═══ RIGHT — live intelligence ═══ */}
          <aside className="hidden lg:block border-l border-[var(--bos-line)] bg-[var(--bos-surface)]/30">
            <div className="px-3.5 pt-3 pb-2 text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)]">
              Requirement intelligence
            </div>
            <div className="px-3.5 pb-5 space-y-5">
              {/* Attention */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-secondary)]">Needs attention</span>
                  {attention.length > 0 && (
                    <span className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[var(--bos-warning)]/15 text-[9px] font-mono text-[var(--bos-warning)]">
                      {attention.length}
                    </span>
                  )}
                </div>
                {attention.length === 0 ? (
                  <p className="text-[11px] text-[var(--bos-text-tertiary)]">Nothing requires attention — every critical area is confirmed.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {attention.slice(0, 5).map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] text-[var(--bos-text-secondary)] leading-snug">
                        <AlertTriangle className="w-3 h-3 text-[var(--bos-warning)] mt-0.5 shrink-0" aria-hidden="true" />
                        {item.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Recommended next action */}
              <div className="rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)]/50 p-3">
                <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-accent)] mb-1.5">
                  Recommended next action
                </div>
                <NextAction bundle={bundle} onAskClient={openAskClient} onReview={() => { setView("review"); setReviewMode(true); }} onCreateProposal={() => setDialog("proposal")} />
              </div>

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
                        <div className="text-[11px] text-[var(--bos-text-primary)] leading-snug">{e.label}</div>
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

/* ═══ CENTER — Overview ═══ */

function OverviewView({ bundle }: { bundle: AdminBundle }) {
  const r = bundle.request;
  const data = (k: string) => (bundle.answers[k] ?? {}) as Record<string, unknown>;
  const business = data("business");
  const vision = data("vision");
  const timeline = data("timeline");
  const commercial = data("commercial");
  const stakeholders = (data("stakeholders").stakeholders as { name?: string }[] | undefined) ?? [];

  const story = String(vision.description || business.problem || business.description || "");

  return (
    <div className="space-y-8 req-enter">
      {/* What the client wants */}
      <section>
        <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)] mb-1">Business OS understanding</div>
        <h3 className="text-[17px] font-semibold tracking-tight text-[var(--bos-text-primary)]">What this client wants</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--bos-text-secondary)] max-w-prose">
          {story || "The client hasn't described the project yet — the workspace is still in progress."}
        </p>
      </section>

      {/* Key facts */}
      <section>
        <div className="mb-3 text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)]">Captured so far</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Fact label="Client" value={bundle.client?.companyName ?? "—"} />
          <Fact label="Project type" value={PROJECT_TYPE_LABELS[r.projectType] ?? r.projectType} />
          <Fact label="Timeline" value={timeline.launchWindow ? String(timeline.launchWindow) : "—"} />
          <Fact label="Budget model" value={commercial.budgetModel ? String(commercial.budgetModel) : "—"} />
          <Fact label="Features" value={String(bundle.features.length)} />
          <Fact label="Materials" value={String(bundle.attachments.length)} />
          <Fact label="Stakeholders" value={String(stakeholders.length)} />
          <Fact label="Revision" value={`v${r.revision}`} />
        </div>
      </section>

      {/* Readiness breakdown */}
      <section>
        <div className="mb-3 text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)]">
          Critical areas
        </div>
        <div className="space-y-2 max-w-xl">
          {SECTIONS.filter((s) => s.weight > 0).map((s) => {
            const complete = bundle.states[s.key] === true;
            return (
              <div key={s.key} className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex items-center justify-center w-4 h-4 rounded-full border shrink-0",
                    complete ? "border-[var(--bos-success)] bg-[var(--bos-success)] text-white" : "border-[var(--bos-border-strong)] text-transparent",
                  )}
                >
                  <Check className="w-2.5 h-2.5" aria-hidden="true" />
                </span>
                <span className={cn("flex-1 text-[12px]", complete ? "text-[var(--bos-text-primary)]" : "text-[var(--bos-text-tertiary)]")}>
                  {s.label}
                </span>
                <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] tabular-nums">{s.weight}%</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-[var(--bos-line)] px-3 py-2.5">
      <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)]">{label}</div>
      <div className="mt-0.5 text-[13px] font-medium text-[var(--bos-text-primary)] truncate">{value}</div>
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
}: {
  bundle: AdminBundle;
  section: SectionDef;
  inReview: boolean;
  reviewState: ReviewState;
  onAskClient: () => void;
}) {
  const openComments = bundle.comments.filter((c) => c.section === section.key && !c.resolvedAt);
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

      {/* Section clarification thread */}
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

      {/* Review actions */}
      {inReview && (
        <div className="flex items-center gap-2 max-w-prose">
          {!complete && (
            <MicroButton variant="accent" onClick={onAskClient}>
              <MessageCircle className="w-3 h-3" aria-hidden="true" /> Ask client
            </MicroButton>
          )}
          {complete && reviewState === "confirmed" && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--bos-success)]">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Confirmed — this section is ready
            </span>
          )}
          {complete && reviewState !== "confirmed" && (
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
          {r.status === "SUBMITTED" && "The client has submitted their requirements. Review each critical area, request clarification on anything unclear, and approve when ready."}
          {r.status === "REVISION_SUBMITTED" && "The client responded to your clarification and resubmitted. Review the changes and approve when ready."}
          {r.status === "CHANGES_REQUESTED" && "You asked for clarification. The client will see it next time they open the workspace."}
          {r.status === "APPROVED" && "Requirements approved — the proposal can be built from this data automatically."}
          {r.status === "IN_PROGRESS" && "The client is actively working through the workspace."}
          {r.status === "SENT" && "The link was sent. Waiting for the client to open it."}
          {r.status === "DRAFT" && "This request hasn't been sent yet."}
          {r.status === "REVOKED" && "Access to this request has been revoked."}
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
        ) : canReview ? (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <MicroButton variant="accent" onClick={() => onAskClient()}>
              <Pencil className="w-3 h-3" aria-hidden="true" /> Request changes
            </MicroButton>
            <MicroButton variant="accent" onClick={onApprove}>
              <Check className="w-3 h-3" aria-hidden="true" /> Approve requirements
            </MicroButton>
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

function ActivityView({ bundle }: { bundle: AdminBundle }) {
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
                <div className="text-[12px] text-[var(--bos-text-primary)]">{e.label}</div>
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
                  {c.resolvedAt && <span className="text-[var(--bos-success)]">✓ resolved</span>}
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
  onReview,
  onCreateProposal,
}: {
  bundle: AdminBundle;
  onAskClient: (section?: string | null) => void;
  onReview: () => void;
  onCreateProposal: () => void;
}) {
  const r = bundle.request;
  const attention = attentionItems(bundle);

  switch (r.status) {
    case "DRAFT":
      return (
        <>
          <p className="text-[11px] text-[var(--bos-text-secondary)] leading-snug">Send the secure link so the client can start their workspace.</p>
          <MicroButton variant="accent" onClick={() => onAskClient()} className="mt-2">
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
      return (
        <>
          <p className="text-[11px] text-[var(--bos-text-secondary)] leading-snug">
            The submission is ready for review — {attention.length} item{attention.length === 1 ? "" : "s"} to work through.
          </p>
          <MicroButton variant="accent" onClick={onReview} className="mt-2">
            <BadgeCheck className="w-3 h-3" aria-hidden="true" /> Review requirement
          </MicroButton>
        </>
      );
    case "CHANGES_REQUESTED":
      return (
        <>
          <p className="text-[11px] text-[var(--bos-text-secondary)] leading-snug">Clarification was requested — waiting for the client to respond.</p>
          <MicroButton onClick={() => onAskClient()} className="mt-2">
            <Mail className="w-3 h-3" aria-hidden="true" /> Remind client
          </MicroButton>
        </>
      );
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
  onSend,
  onRemind,
  onChanges,
  onRevoke,
  onProposal,
  onClose,
}: {
  kind: "send" | "remind" | "changes" | "revoke" | "proposal";
  bundle: AdminBundle;
  link: string | null;
  defaultEmail?: string;
  initialSection?: string | null;
  busy: boolean;
  onSend: (payload: { to: string; subject: string; message: string; link?: string }) => void;
  onRemind: (payload: { to: string; message: string; link?: string }) => void;
  onChanges: (payload: { section: string | null; message: string }) => void;
  onRevoke: (payload: { reason?: string }) => void;
  onProposal: () => void;
  onClose: () => void;
}) {
  const [to, setTo] = useState(defaultEmail ?? "");
  const [subject, setSubject] = useState(kind === "send" ? `Project discovery — ${bundle.request.title}` : `Reminder — ${bundle.request.title}`);
  const [message, setMessage] = useState("");
  const [section, setSection] = useState(initialSection ?? "");
  const [reason, setReason] = useState("");
  const [copied, setCopied] = useState(false);

  const suggested = section ? SUGGESTED_QUESTIONS[section] ?? "" : "";

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
    : kind === "changes" ? "Ask the client"
    : kind === "revoke" ? "Revoke access"
    : "Create proposal from requirements";

  const kicker =
    kind === "send" ? "The client opens a private guided workspace"
    : kind === "remind" ? "A gentle nudge to complete the workspace"
    : kind === "changes" ? "What do you need to clarify?"
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
        ) : kind === "changes" ? (
          <div className="space-y-3 max-w-xl">
            <div>
              <label className="bos-label">Target section</label>
              <div className="relative">
                <select value={section} onChange={(e) => setSection(e.target.value)} className={cn(inputCls, "appearance-none pr-8")}>
                  <option value="">Whole submission</option>
                  {SECTIONS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.number} — {s.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--bos-text-tertiary)] pointer-events-none" aria-hidden="true" />
              </div>
            </div>
            <div>
              <label className="bos-label">Question for the client</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder={suggested || "What do you need the client to confirm?"}
                className={cn(inputCls, "h-24 py-2 resize-none")}
              />
              {suggested && (
                <button
                  type="button"
                  onClick={() => setMessage(suggested)}
                  className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] text-[var(--bos-accent)] hover:text-[var(--bos-accent-hover)]"
                >
                  <Lightbulb className="w-3 h-3" aria-hidden="true" /> Use suggested question
                </button>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <MicroButton onClick={onClose}>Cancel</MicroButton>
              <MicroButton variant="accent" disabled={busy || !message.trim()} onClick={() => onChanges({ section: section || null, message })}>
                {busy ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <Send className="w-3 h-3" aria-hidden="true" />} Send to client
              </MicroButton>
            </div>
          </div>
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
