"use client";

import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  Archive,
  Banknote,
  Bot,
  CalendarClock,
  Check,
  ChevronDown,
  Circle,
  ClipboardList,
  FileStack,
  FileText,
  FolderKanban,
  History,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
  SquareCheck,
  Target,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientDetail, NextAction } from "@/lib/client-serialize";
import {
  currentStateSentence,
  leadCode,
  lifecycleStages,
  opportunitySignals,
} from "@/lib/lead-intel";
import { StatusChip, MicroButton, Progress, TimeAgo } from "./kit";
import { QuickCreate, type CreateResource } from "./quick-create";
import { RequirementRequests } from "./requirement-requests";
import { Timeline } from "./command-timeline";
import { LeadCopilot } from "./lead-copilot";
import {
  ActiveWork,
  AuditHistory,
  ClientContext,
  Commercial,
  Communication,
  Contacts,
  Documents,
  GitHubBlock,
  Proposals,
  RelationshipMap,
  Requirements,
  Team,
} from "./command-sections";

/* ────────────────────────────────────────────────────────────────
   LEAD INTELLIGENCE WORKSPACE
   One private workspace for one lead. Identity → context → current
   state → story → AI. The lead is the subject; the copilot supports,
   never dominates. Every value comes from the real records.
──────────────────────────────────────────────────────────────── */

const STORY_FADE = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: "easeOut" as const },
};

function MonoLabel({ children, tone }: { children: React.ReactNode; tone?: "default" | "accent" }) {
  return (
    <span
      className={cn(
        "text-[9px] font-mono uppercase tracking-[0.16em]",
        tone === "accent" ? "text-[var(--bos-accent)]" : "text-[var(--bos-text-tertiary)]",
      )}
    >
      {children}
    </span>
  );
}

/* ── Hero identity ─────────────────────────────────────────── */

function HeroIdentity({ detail, actorName, voiceActive }: { detail: ClientDetail; actorName: string; voiceActive?: boolean }) {
  const c = detail.client;
  const code = leadCode(c.id);
  const isLead = c.status === "LEAD";
  return (
    <div className="relative">
      <motion.div {...STORY_FADE} transition={{ duration: 0.35 }}>
        <div className="flex items-center gap-2.5">
          <MonoLabel tone="accent">{isLead ? "Active lead" : c.status.replace(/_/g, " ")}</MonoLabel>
          <span className="text-[9px] font-mono tracking-[0.14em] text-[var(--bos-text-tertiary)]">·</span>
          <MonoLabel>{code}</MonoLabel>
          <span className="hidden sm:block">
            <StatusChip status={c.status} />
          </span>
        </div>
        <h1 className="mt-1.5 text-[34px] sm:text-[42px] font-semibold tracking-[-0.03em] leading-none text-[var(--bos-text-primary)]">
          {c.companyName}
        </h1>
        <motion.div
          animate={voiceActive ? { opacity: 1, scaleX: 1 } : { opacity: 0, scaleX: 0.5 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="mt-1.5 h-0.5 w-24 origin-left rounded-full bg-[var(--bos-accent)]/70"
          aria-hidden="true"
        />
        <div className="mt-2.5 flex items-center gap-x-3 gap-y-1 text-[11px] text-[var(--bos-text-tertiary)] flex-wrap">
          {[c.industry, c.businessType].filter(Boolean).length > 0 && (
            <span className="text-[var(--bos-text-secondary)]">
              {[c.industry, c.businessType].filter(Boolean).join(" · ")}
            </span>
          )}
          <span aria-hidden="true">·</span>
          <span>
            Owner <span className="text-[var(--bos-text-secondary)]">{c.ownerName ?? actorName}</span>
          </span>
          {detail.primaryContact && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                Contact <span className="text-[var(--bos-text-secondary)]">{detail.primaryContact.name}</span>
              </span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span>
            Last activity <TimeAgo value={c.lastActivityLabel} />
          </span>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Thin lifecycle rail ───────────────────────────────────── */

function LifecycleRail({ detail }: { detail: ClientDetail }) {
  const stages = lifecycleStages(detail);
  return (
    <div className="flex items-center" role="list" aria-label="Lead lifecycle">
      {stages.map((s, i) => (
        <div key={s.key} className="flex items-center flex-1 last:flex-none" role="listitem">
          <div className="flex flex-col items-start gap-1 min-w-0">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.1em] whitespace-nowrap transition-colors duration-200",
                s.state === "current" && "text-[var(--bos-accent)]",
                s.state === "done" && "text-[var(--bos-text-secondary)]",
                s.state === "future" && "text-[var(--bos-text-tertiary)]",
              )}
            >
              {s.state === "done" ? (
                <Check className="w-3 h-3" aria-hidden="true" />
              ) : s.state === "current" ? (
                <Circle className="w-2.5 h-2.5 fill-current" aria-hidden="true" />
              ) : (
                <Circle className="w-2 h-2" aria-hidden="true" />
              )}
              {s.label}
            </span>
          </div>
          {i < stages.length - 1 && (
            <div
              className={cn(
                "mx-2 h-px flex-1 min-w-4",
                stages[i].state === "done" || s.state === "current"
                  ? "bg-[var(--bos-accent)]/40"
                  : "bg-[var(--bos-line-strong)]",
              )}
              aria-hidden="true"
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Current state + next action ───────────────────────────── */

function CurrentStateBlock({ detail }: { detail: ClientDetail }) {
  const topReq = detail.requirementRequests[0] ?? detail.requirements[0] ?? null;
  const topProposal = detail.proposals[0] ?? null;
  const topProject = detail.projects[0] ?? null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-5">
      <div className="min-w-0">
        <div className="mb-1"><MonoLabel>Health</MonoLabel></div>
        <div className="flex items-center gap-2">
          <StatusChip status={detail.health.health} />
        </div>
      </div>
      <div className="min-w-0">
        <div className="mb-1"><MonoLabel>Requirement</MonoLabel></div>
        <div className="text-[12.5px] text-[var(--bos-text-primary)] truncate">
          {topReq ? topReq.title : "Not captured yet"}
        </div>
        {topReq && (
          <div className="mt-0.5 text-[10px] text-[var(--bos-text-tertiary)]">
            {topReq.status === "APPROVED" ? "Approved" : topReq.status.replace(/_/g, " ").toLowerCase()}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="mb-1"><MonoLabel>Proposal</MonoLabel></div>
        <div className="text-[12.5px] text-[var(--bos-text-primary)] truncate">
          {topProposal ? topProposal.title : "None yet"}
        </div>
        {topProposal && (
          <div className="mt-0.5 text-[10px] text-[var(--bos-text-tertiary)]">
            {topProposal.status.replace(/_/g, " ").toLowerCase()}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="mb-1"><MonoLabel>Project</MonoLabel></div>
        <div className="text-[12.5px] text-[var(--bos-text-primary)] truncate">
          {topProject ? topProject.name : "Not started"}
        </div>
        {topProject && (
          <div className="mt-0.5 flex items-center gap-2">
            <Progress value={topProject.progress} className="w-12" />
            <span className="text-[10px] text-[var(--bos-text-tertiary)] tabular-nums">{topProject.progress}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

function NextActionBlock({
  detail,
  ownerName,
  onTake,
}: {
  detail: ClientDetail;
  ownerName: string | null;
  onTake: (a: NextAction) => void;
}) {
  const action = detail.nextAction;
  if (!action) {
    return (
      <div className="rounded-sm border border-[var(--bos-line)] px-5 py-4">
        <MonoLabel>Next</MonoLabel>
        <div className="mt-1.5 text-[13px] text-[var(--bos-text-secondary)]">
          No action pending — the lead is on track.
        </div>
      </div>
    );
  }
  const kindIcon: Record<NextAction["kind"], React.ReactNode> = {
    review: <ClipboardList className="w-3.5 h-3.5" aria-hidden="true" />,
    proposal: <FileText className="w-3.5 h-3.5" aria-hidden="true" />,
    payment: <Wallet className="w-3.5 h-3.5" aria-hidden="true" />,
    task: <Target className="w-3.5 h-3.5" aria-hidden="true" />,
    deadline: <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />,
    "reach-out": <Send className="w-3.5 h-3.5" aria-hidden="true" />,
    create: <Plus className="w-3.5 h-3.5" aria-hidden="true" />,
  };
  return (
    <div className="rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)]/50 px-5 py-4">
      <div className="flex items-center gap-2">
        <MonoLabel tone="accent">Next</MonoLabel>
        {kindIcon[action.kind]}
      </div>
      <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="text-[17px] font-semibold tracking-tight text-[var(--bos-text-primary)]">
          {action.title}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[var(--bos-text-tertiary)]">
          <span>Today</span>
          <span aria-hidden="true">·</span>
          <span className="text-[var(--bos-text-secondary)]">{ownerName ?? "Owner"}</span>
        </div>
      </div>
      <div className="mt-0.5 text-[12px] text-[var(--bos-text-secondary)] line-clamp-2">{action.detail}</div>
      <div className="mt-3">
        <MicroButton variant="accent" onClick={() => onTake(action)}>
          Open
          <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
        </MicroButton>
      </div>
    </div>
  );
}

/* ── Story blocks ──────────────────────────────────────────── */

function StoryHeader({ icon, children, meta }: { icon?: React.ReactNode; children: React.ReactNode; meta?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <div className="flex items-center gap-2">
        {icon && <span className="text-[var(--bos-text-tertiary)]">{icon}</span>}
        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-secondary)]">
          {children}
        </span>
      </div>
      {meta && <div className="text-[10px] text-[var(--bos-text-tertiary)]">{meta}</div>}
    </div>
  );
}

function ConnectedRow({
  icon,
  label,
  sub,
  status,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  status?: string;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "w-full flex items-center gap-3 py-2 group",
        onClick && "cursor-pointer text-left",
      )}
    >
      <span className="flex items-center justify-center w-7 h-7 rounded-sm border border-[var(--bos-line)] text-[var(--bos-text-secondary)] group-hover:text-[var(--bos-accent)] group-hover:border-[var(--bos-accent-ring)] transition-colors duration-150">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] text-[var(--bos-text-primary)] truncate group-hover:text-[var(--bos-accent)] transition-colors duration-150">
          {label}
        </span>
        {sub && <span className="block text-[10px] text-[var(--bos-text-tertiary)] truncate">{sub}</span>}
      </span>
      {status && <StatusChip status={status} />}
      {onClick && (
        <ArrowUpRight
          className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          aria-hidden="true"
        />
      )}
    </Comp>
  );
}

function ConnectedList({ detail }: { detail: ClientDetail }) {
  const router = useRouter();
  const rows: React.ReactNode[] = [];

  if (detail.primaryContact) {
    rows.push(
      <ConnectedRow
        key="contact"
        icon={<UserRound className="w-3.5 h-3.5" aria-hidden="true" />}
        label={detail.primaryContact.name}
        sub={detail.primaryContact.role ?? "Primary contact"}
      />,
    );
  }
  const topReq = detail.requirementRequests[0] ?? null;
  if (topReq) {
    rows.push(
      <ConnectedRow
        key="req"
        icon={<ClipboardList className="w-3.5 h-3.5" aria-hidden="true" />}
        label={topReq.title}
        sub={`${topReq.reference} · ${topReq.completeness}% complete`}
        status={topReq.status}
        onClick={() => document.getElementById("requirement")?.scrollIntoView({ behavior: "smooth", block: "start" })}
      />,
    );
  }
  const topProposal = detail.proposals[0] ?? null;
  if (topProposal) {
    rows.push(
      <ConnectedRow
        key="proposal"
        icon={<FileText className="w-3.5 h-3.5" aria-hidden="true" />}
        label={topProposal.title}
        sub={topProposal.amount ? `₹${topProposal.amount.toLocaleString("en-IN")}` : "Proposal"}
        status={topProposal.status}
        onClick={() => router.push("/proposals")}
      />,
    );
  }
  const topProject = detail.projects[0] ?? null;
  if (topProject) {
    rows.push(
      <ConnectedRow
        key="project"
        icon={<FolderKanban className="w-3.5 h-3.5" aria-hidden="true" />}
        label={topProject.name}
        sub={`${topProject.progress}% complete`}
        status={topProject.health}
        onClick={() => router.push("/projects")}
      />,
    );
  }
  rows.push(
    <ConnectedRow
      key="tasks"
      icon={<SquareCheck className="w-3.5 h-3.5" aria-hidden="true" />}
      label={`${detail.counts.openTasks} open task${detail.counts.openTasks === 1 ? "" : "s"}`}
      sub="Work in flight"
      onClick={() => router.push("/tasks")}
    />,
    <ConnectedRow
      key="docs"
      icon={<FileStack className="w-3.5 h-3.5" aria-hidden="true" />}
      label={`${detail.counts.documents} document${detail.counts.documents === 1 ? "" : "s"}`}
      sub="Materials and records"
    />,
    <ConnectedRow
      key="messages"
      icon={<MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />}
      label={`${detail.counts.messages} message${detail.counts.messages === 1 ? "" : "s"}`}
      sub="Communication history"
    />,
  );

  return (
    <div className="divide-y divide-[var(--bos-line)]">
      {rows.map((r) => (
        <div key={String((r as React.ReactElement).key)} className="group">
          {r}
        </div>
      ))}
    </div>
  );
}

/* ── Full record — progressive disclosure ──────────────────── */

function FullRecord({
  detail,
  transition,
  openCreate,
  openRequirements,
}: {
  detail: ClientDetail;
  transition: (resource: "requirements" | "proposals" | "projects" | "tasks" | "payments", id: string, status: string) => void;
  openCreate: (r: CreateResource) => void;
  openRequirements: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [expandedAudit, setExpandedAudit] = useState(false);
  const customFields = useMemo(
    () => Object.entries(detail.client.customFields ?? {}).map(([label, value]) => ({ label, value })),
    [detail.client.customFields],
  );
  const router = useRouter();

  return (
    <section className="border-t border-[var(--bos-line)] pt-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between group"
      >
        <div className="flex items-center gap-2">
          <MonoLabel>Full record</MonoLabel>
          <span className="text-[10px] text-[var(--bos-text-tertiary)]">
            {detail.counts.projects} projects · {detail.counts.proposals} proposals · {detail.counts.contacts} contacts · {detail.counts.payments} payments
          </span>
        </div>
        <ChevronDown
          className={cn("w-4 h-4 text-[var(--bos-text-tertiary)] transition-transform duration-200", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-6 grid lg:grid-cols-12 gap-4">
              <div className="lg:col-span-8 space-y-4">
                <ActiveWork
                  projects={detail.projects}
                  openTasks={detail.openTasks}
                  blockedTasks={detail.blockedTasks}
                  onOpenProject={() => router.push("/projects")}
                  onCreateTask={() => openCreate("task")}
                  onTransition={transition}
                />
                <div className="grid sm:grid-cols-2 gap-4">
                  <Requirements requirements={detail.requirements} onCreate={openRequirements} onTransition={transition} />
                  <Proposals proposals={detail.proposals} onCreate={() => openCreate("proposal")} onTransition={transition} />
                </div>
              </div>
              <div className="lg:col-span-4 space-y-4">
                <Commercial commercial={detail.commercial} payments={detail.payments} onCreate={() => openCreate("payment")} onTransition={transition} />
                <Team team={detail.team} />
              </div>
            </div>

            <div className="mt-4 grid lg:grid-cols-12 gap-4">
              <div className="lg:col-span-4">
                <Contacts contacts={detail.contacts} primaryContact={detail.primaryContact} onCreate={() => openCreate("contact")} />
              </div>
              <div className="lg:col-span-4">
                <Communication messages={detail.messages} onCreate={() => openCreate("message")} />
              </div>
              <div className="lg:col-span-4">
                <Documents documents={detail.documents} onCreate={() => openCreate("document")} />
              </div>
            </div>

            <div className="mt-4 grid lg:grid-cols-12 gap-4">
              <div className="lg:col-span-4">
                <RelationshipMap counts={detail.counts} />
              </div>
              <div className="lg:col-span-4">
                <ClientContext client={detail.client} notes={detail.notes} onCreateNote={() => openCreate("note")} customFields={customFields} />
              </div>
              <div className="lg:col-span-4">
                <GitHubBlock connected={false} />
              </div>
            </div>

            <div className="mt-4">
              <AuditHistory audit={detail.audit} expanded={expandedAudit} onToggle={() => setExpandedAudit((e) => !e)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ── Toast ─────────────────────────────────────────────────── */

function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-5 right-5 z-50 rounded-sm border border-[var(--bos-success)]/30 bg-[var(--bos-bg)] px-4 py-3 shadow-[var(--bos-shadow-lg)]">
      <div className="flex items-center gap-2 text-[12px] text-[var(--bos-text-primary)]">
        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[var(--bos-success)] text-white">
          <Check className="w-2.5 h-2.5" aria-hidden="true" />
        </span>
        {message}
      </div>
    </div>
  );
}

/* ── Mobile copilot sheet ──────────────────────────────────── */

function MobileCopilotSheet({
  detail,
  open,
  onClose,
  onRefresh,
  onVoiceModeChange,
}: {
  detail: ClientDetail;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onVoiceModeChange?: (active: boolean) => void;
}) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-black/30 lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={reduced ? false : { y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="fixed inset-x-0 bottom-0 z-50 lg:hidden h-[78vh] rounded-t-xl border-t border-[var(--bos-line-strong)] bg-[var(--bos-bg)] shadow-[var(--bos-shadow-lg)] flex flex-col"
            role="dialog"
            aria-label="Lead Copilot"
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-secondary)]">
                <Bot className="w-3.5 h-3.5 text-[var(--bos-accent)]" aria-hidden="true" />
                Lead Copilot
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]">
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 min-h-0 px-4 pb-4">
              <LeadCopilot
                clientId={detail.client.id}
                clientName={detail.client.companyName}
                className="h-full"
                onChanged={onRefresh}
                onVoiceModeChange={onVoiceModeChange}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Lead Workspace ────────────────────────────────────────── */

export function LeadWorkspace({ initial, actorName }: { initial: ClientDetail; actorName: string }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [detail, setDetail] = useState(initial);
  const [quickCreate, setQuickCreate] = useState<CreateResource | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [timelineKey, setTimelineKey] = useState(0);
  const [reqConfigOpen, setReqConfigOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Only one copilot instance is ever mounted (desktop aside on lg+,
  // bottom sheet on smaller screens) so voice mode can never start two
  // simultaneous microphone sessions. Layout effect so the correct layout
  // is in place before first paint (no mobile-FAB flash on desktop).
  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${initial.client.id}`);
      const data = await res.json();
      if (res.ok && data.ok) {
        setDetail(data);
        setTimelineKey((k) => k + 1);
      }
    } catch {
      /* keep current view on transient failures */
    }
  }, [initial.client.id]);

  const transition = useCallback(
    async (resource: "requirements" | "proposals" | "projects" | "tasks" | "payments", id: string, status: string) => {
      const res = await fetch(`/api/clients/${initial.client.id}/${resource}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) await refresh();
    },
    [initial.client.id, refresh],
  );

  const changeClientStatus = useCallback(
    async (status: string) => {
      const res = await fetch(`/api/clients/${initial.client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.ok) {
        setDetail(data);
        setTimelineKey((k) => k + 1);
        notify(
          status === "ACTIVE"
            ? "Lead converted — this is now an active client."
            : status === "ARCHIVED"
              ? "Lead archived. History is preserved."
              : "Lead restored.",
        );
      }
    },
    [initial.client.id, notify],
  );

  const takeAction = useCallback(
    (a: NextAction) => {
      if (a.kind === "create") {
        setQuickCreate(a.title.toLowerCase().includes("proposal") ? "proposal" : "project");
        return;
      }
      if (a.targetHref?.startsWith("#")) {
        document.getElementById(a.targetHref.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [],
  );

  const openCreate = useCallback((r: CreateResource) => {
    setQuickCreate(r);
    setMoreOpen(false);
  }, []);

  const openRequirements = useCallback(() => {
    setReqConfigOpen(true);
    setMoreOpen(false);
    requestAnimationFrame(() => {
      document.getElementById("requirement-requests")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const moreActions: { label: string; icon: React.ReactNode; resource: CreateResource }[] = [
    { label: "Contact", icon: <UserRound className="w-3.5 h-3.5" aria-hidden="true" />, resource: "contact" },
    { label: "Payment", icon: <Banknote className="w-3.5 h-3.5" aria-hidden="true" />, resource: "payment" },
    { label: "Document", icon: <FileStack className="w-3.5 h-3.5" aria-hidden="true" />, resource: "document" },
    { label: "Message", icon: <Mail className="w-3.5 h-3.5" aria-hidden="true" />, resource: "message" },
    { label: "Note", icon: <Pencil className="w-3.5 h-3.5" aria-hidden="true" />, resource: "note" },
    { label: "Activity", icon: <Plus className="w-3.5 h-3.5" aria-hidden="true" />, resource: "activity" },
  ];

  const isLead = detail.client.status === "LEAD";
  const summary = currentStateSentence(detail);
  const signals = opportunitySignals(detail);
  const ownerName = detail.client.ownerName ?? actorName;

  return (
    <div className="px-5 sm:px-8 py-6 max-w-[1400px]">
      <Toast message={toast} />

      {/* ── Top bar ──────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push("/clients")}
          className="inline-flex items-center gap-1.5 text-[11px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] transition-colors duration-150"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          Clients
        </button>
        <div className="flex items-center gap-1.5">
          <MicroButton onClick={() => setEditOpen((o) => !o)}>
            <Pencil className="w-3 h-3" aria-hidden="true" />
            Edit
          </MicroButton>
          <span className="hidden sm:flex items-center gap-1.5">
            <MicroButton onClick={openRequirements}>
              <ClipboardList className="w-3 h-3" aria-hidden="true" />
              Requirement
            </MicroButton>
            <MicroButton onClick={() => openCreate("proposal")}>
              <FileText className="w-3 h-3" aria-hidden="true" />
              Proposal
            </MicroButton>
            <MicroButton onClick={() => openCreate("task")}>
              <SquareCheck className="w-3 h-3" aria-hidden="true" />
              Task
            </MicroButton>
          </span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              aria-label="More actions"
              aria-expanded={moreOpen}
              className="inline-flex items-center justify-center h-7 w-7 rounded-sm border border-[var(--bos-line)] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)] transition-colors duration-150"
            >
              <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-9 z-40 w-48 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] shadow-[var(--bos-shadow-lg)] py-1">
                {moreActions.map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    onClick={() => openCreate(a.resource)}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)] hover:text-[var(--bos-text-primary)] transition-colors duration-150"
                  >
                    {a.icon}
                    {a.label}
                  </button>
                ))}
                <div className="my-1 h-px bg-[var(--bos-line)]" aria-hidden="true" />
                {isLead ? (
                  <button
                    type="button"
                    onClick={() => void changeClientStatus("ACTIVE")}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] text-[var(--bos-accent)] hover:bg-[var(--bos-accent-subtle)] transition-colors duration-150"
                  >
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    Convert to client
                  </button>
                ) : detail.client.status === "ARCHIVED" ? (
                  <button
                    type="button"
                    onClick={() => void changeClientStatus("ACTIVE")}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)] transition-colors duration-150"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    Restore
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void changeClientStatus("ARCHIVED")}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)] transition-colors duration-150"
                  >
                    <Archive className="w-3.5 h-3.5" aria-hidden="true" />
                    Archive
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Hero identity ─────────────────────────────────── */}
      <div className="mt-8">
        <HeroIdentity detail={detail} actorName={actorName} voiceActive={voiceMode} />
      </div>

      {/* ── Lifecycle ─────────────────────────────────────── */}
      <motion.div
        {...(reduced ? {} : STORY_FADE)}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="mt-7"
      >
        <LifecycleRail detail={detail} />
      </motion.div>

      {/* ── What's happening ──────────────────────────────── */}
      <motion.div
        {...(reduced ? {} : STORY_FADE)}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="mt-7"
      >
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles className="w-3 h-3 text-[var(--bos-text-tertiary)]" aria-hidden="true" />
          <MonoLabel>Current state</MonoLabel>
        </div>
        <p className="text-[17px] leading-snug text-[var(--bos-text-primary)] max-w-2xl">{summary}</p>
      </motion.div>

      {/* ── Next action ───────────────────────────────────── */}
      <motion.div
        {...(reduced ? {} : STORY_FADE)}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="mt-5 max-w-2xl"
      >
        <NextActionBlock detail={detail} ownerName={ownerName} onTake={takeAction} />
      </motion.div>

      {/* ── Two-column: story + copilot ───────────────────── */}
      <div
        className={cn(
          "mt-9 grid gap-8 xl:gap-10 transition-[grid-template-columns] duration-300 ease-out",
          voiceMode ? "lg:grid-cols-[minmax(0,1fr)_480px]" : "lg:grid-cols-[minmax(0,1fr)_360px]",
        )}
      >
        {/* Story — dims slightly while voice mode is active */}
        <div
          className={cn(
            "min-w-0 space-y-10 transition-opacity duration-300",
            voiceMode && "opacity-[0.93]",
          )}
        >
          <motion.section
            {...(reduced ? {} : STORY_FADE)}
            transition={{ duration: 0.35, delay: 0.2 }}
            aria-labelledby="lead-state"
          >
            <StoryHeader icon={<ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />}>Current state</StoryHeader>
            <CurrentStateBlock detail={detail} />
            {signals.length > 0 && (
              <div className="mt-5 pt-4 border-t border-[var(--bos-line)]">
                <div className="mb-2"><MonoLabel>Opportunity</MonoLabel></div>
                <div className="flex flex-wrap gap-1.5">
                  {signals.map((s) => (
                    <span
                      key={s.label}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border text-[10px] font-medium",
                        s.positive
                          ? "border-[var(--bos-success)]/25 bg-[var(--bos-success)]/5 text-[var(--bos-success)]"
                          : "border-[var(--bos-warning)]/25 bg-[var(--bos-warning)]/5 text-[var(--bos-warning)]",
                      )}
                    >
                      {s.positive ? <Check className="w-2.5 h-2.5" aria-hidden="true" /> : <ShieldAlert className="w-2.5 h-2.5" aria-hidden="true" />}
                      {s.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.section>

          {/* Requirement */}
          <motion.section
            {...(reduced ? {} : STORY_FADE)}
            transition={{ duration: 0.35, delay: 0.25 }}
            id="requirement"
          >
            <StoryHeader
              icon={<ClipboardList className="w-3.5 h-3.5" aria-hidden="true" />}
              meta={detail.requirementRequests.length > 0 ? `${detail.requirementRequests.length} request${detail.requirementRequests.length === 1 ? "" : "s"}` : undefined}
            >
              Requirement
            </StoryHeader>
            <RequirementRequests
              requests={detail.requirementRequests}
              clientId={detail.client.id}
              defaultEmail={detail.primaryContact?.email}
              configOpen={reqConfigOpen}
              onConfigOpenChange={setReqConfigOpen}
              onChanged={refresh}
            />
          </motion.section>

          {/* Activity */}
          <motion.section
            {...(reduced ? {} : STORY_FADE)}
            transition={{ duration: 0.35, delay: 0.3 }}
          >
            <StoryHeader icon={<History className="w-3.5 h-3.5" aria-hidden="true" />}>Activity</StoryHeader>
            <Timeline clientId={detail.client.id} initial={[]} refreshKey={timelineKey} />
          </motion.section>

          {/* Connected */}
          <motion.section {...(reduced ? {} : STORY_FADE)} transition={{ duration: 0.35, delay: 0.35 }}>
            <StoryHeader icon={<Users className="w-3.5 h-3.5" aria-hidden="true" />}>Connected</StoryHeader>
            <ConnectedList detail={detail} />
          </motion.section>

          {/* Quick create panel */}
          {quickCreate && (
            <div className="max-w-xl">
              <QuickCreate clientId={detail.client.id} resource={quickCreate} onClose={() => setQuickCreate(null)} onSaved={refresh} />
            </div>
          )}

          {/* Edit panel */}
          {editOpen && (
            <LeadEdit
              detail={detail}
              onClose={() => setEditOpen(false)}
              onSaved={async () => {
                await refresh();
                setEditOpen(false);
                notify("Lead details updated.");
              }}
            />
          )}

          {/* Full record — progressive disclosure */}
          <FullRecord
            detail={detail}
            transition={transition}
            openCreate={openCreate}
            openRequirements={openRequirements}
          />

          <div className="flex items-center justify-between text-[10px] text-[var(--bos-text-tertiary)] pt-2">
            <span>Everything here is derived from this lead&apos;s real records.</span>
            <span className="font-mono uppercase tracking-[0.1em]">{leadCode(detail.client.id)}</span>
          </div>
        </div>

        {/* Copilot — desktop */}
        {isDesktop && (
          <aside className="flex flex-col sticky top-20 self-start w-full">
            <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/50 p-4 flex flex-col" style={{ height: "min(640px, calc(100vh - 8rem))" }}>
              <LeadCopilot
                clientId={detail.client.id}
                clientName={detail.client.companyName}
                className="h-full"
                onChanged={refresh}
                onVoiceModeChange={setVoiceMode}
              />
            </div>
          </aside>
        )}
      </div>

      {/* Mobile: Ask AI FAB + sheet (only when the desktop aside isn't mounted) */}
      {!isDesktop && (
        <button
          type="button"
          onClick={() => setCopilotOpen(true)}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 h-11 px-4 rounded-full bg-[var(--bos-accent)] text-white text-[12px] font-medium shadow-[var(--bos-shadow-md)] hover:bg-[var(--bos-accent-hover)] transition-colors duration-150"
          aria-label="Ask AI about this lead"
        >
          <Bot className="w-4 h-4" aria-hidden="true" />
          Ask AI
        </button>
      )}
      {!isDesktop && (
        <MobileCopilotSheet
          detail={detail}
          open={copilotOpen}
          onClose={() => setCopilotOpen(false)}
          onRefresh={refresh}
          onVoiceModeChange={setVoiceMode}
        />
      )}
    </div>
  );
}

/* ── Inline lead editor ────────────────────────────────────── */

function LeadEdit({
  detail,
  onClose,
  onSaved,
}: {
  detail: ClientDetail;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const c = detail.client;
  const [form, setForm] = useState({
    companyName: c.companyName,
    industry: c.industry ?? "",
    businessType: c.businessType ?? "",
    description: c.description ?? "",
    website: c.website ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!form.companyName.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${detail.client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          companyName: form.companyName.trim(),
          industry: form.industry || null,
          businessType: form.businessType || null,
          description: form.description || null,
          website: form.website || null,
          email: form.email || null,
          phone: form.phone || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "Unable to save.");
        return;
      }
      await onSaved();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const fields: { key: keyof typeof form; label: string; multiline?: boolean }[] = [
    { key: "companyName", label: "Company name" },
    { key: "industry", label: "Industry" },
    { key: "businessType", label: "Business type" },
    { key: "website", label: "Website" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "description", label: "About this lead", multiline: true },
  ];

  return (
    <section className="rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-surface)]/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Pencil className="w-3.5 h-3.5 text-[var(--bos-accent)]" aria-hidden="true" />
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-secondary)]">
            Edit lead
          </span>
        </div>
        <button type="button" onClick={onClose} aria-label="Close editor" className="p-1 text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]">
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      <div className="grid sm:grid-cols-2 gap-x-5 gap-y-4">
        {fields.map((f) => (
          <label key={f.key} className={cn("block", f.multiline && "sm:col-span-2")}>
            <span className="bos-label">{f.label}</span>
            {f.multiline ? (
              <textarea
                value={form[f.key]}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                rows={3}
                className="w-full rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] px-3 py-2 text-[13px] outline-none focus:border-[var(--bos-accent)] transition-colors duration-150 resize-y"
              />
            ) : (
              <input
                value={form[f.key]}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                className="w-full h-9 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] px-3 text-[13px] outline-none focus:border-[var(--bos-accent)] transition-colors duration-150"
              />
            )}
          </label>
        ))}
      </div>
      {error && <div className="mt-3 text-[11px] text-[var(--bos-error)]">{error}</div>}
      <div className="mt-4 flex justify-end gap-2">
        <MicroButton onClick={onClose}>Cancel</MicroButton>
        <MicroButton variant="accent" disabled={!form.companyName.trim() || saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save changes"}
        </MicroButton>
      </div>
    </section>
  );
}
