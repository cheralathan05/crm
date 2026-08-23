"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Banknote,
  Check,
  ClipboardList,
  FileStack,
  FileText,
  FolderKanban,
  History,
  Mail,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  ShieldAlert,
  SquareCheck,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientDetail, NextAction } from "@/lib/client-serialize";
import { StatusChip, TimeAgo } from "./kit";
import { QuickCreate, type CreateResource } from "./quick-create";
import { RequirementRequests } from "./requirement-requests";
import { NextActionCard, LifecycleRail, RelationshipScore, HealthBlock } from "./command-overview";
import { Timeline } from "./command-timeline";
import {
  ActiveWork,
  Requirements,
  Proposals,
  Commercial,
  Team,
  Contacts,
  Communication,
  Documents,
  RelationshipMap,
  ClientContext,
  AuditHistory,
  GitHubBlock,
} from "./command-sections";

/* ── Attention center — actionable problems only ────────────── */

function AttentionCenter({ detail, onAction }: { detail: ClientDetail; onAction: (a: NextAction) => void }) {
  const problems = detail.health.reasons.filter((r) => r.kind !== "ok");
  if (problems.length === 0) return null;
  return (
    <section id="attention" className="rounded-sm border border-[var(--bos-warning)]/30 bg-[var(--bos-warning)]/5 scroll-mt-20">
      <header className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--bos-warning)]/15">
        <ShieldAlert className="w-3.5 h-3.5 text-[var(--bos-warning)]" aria-hidden="true" />
        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-warning)]">Needs attention</span>
      </header>
      <ul className="p-4 space-y-1.5">
        {problems.map((r) => (
          <li key={r.text} className="flex items-center gap-2.5 text-[12px] text-[var(--bos-text-secondary)]">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0",
                r.kind === "risk" ? "bg-[var(--bos-error)]" : "bg-[var(--bos-warning)]",
              )}
              aria-hidden="true"
            />
            {r.text}
            {detail.nextAction && (
              <button
                type="button"
                onClick={() => onAction(detail.nextAction!)}
                className="ml-auto text-[11px] font-medium text-[var(--bos-accent)] hover:text-[var(--bos-accent-hover)] shrink-0 transition-colors duration-150"
              >
                Resolve
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── Toast ──────────────────────────────────────────────────── */

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

/* ── Command Center ─────────────────────────────────────────── */

export function ClientCommandCenter({ initial, actorName }: { initial: ClientDetail; actorName: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState(initial);
  const [quickCreate, setQuickCreate] = useState<CreateResource | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [timelineKey, setTimelineKey] = useState(0);
  const [expandedAudit, setExpandedAudit] = useState(false);
  const [reqConfigOpen, setReqConfigOpen] = useState(false);

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
      /* keep the current view on transient failures */
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
            ? "Client activated — ABC is now an active client."
            : status === "ARCHIVED"
              ? "Client archived. History is preserved."
              : status === "INACTIVE"
                ? "Client marked inactive."
                : "Client restored.",
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

  const scrollToAttention = useCallback(() => {
    document.getElementById("attention")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const clientCode = useMemo(() => `CL-${detail.client.id.slice(-6).toUpperCase()}`, [detail.client.id]);

  const customFields = useMemo(
    () => Object.entries(detail.client.customFields ?? {}).map(([label, value]) => ({ label, value })),
    [detail.client.customFields],
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

  const quickActions: { label: string; icon: React.ReactNode; onClick: () => void }[] = [
    { label: "Requirement", icon: <ClipboardList className="w-3.5 h-3.5" aria-hidden="true" />, onClick: openRequirements },
    { label: "Proposal", icon: <FileText className="w-3.5 h-3.5" aria-hidden="true" />, onClick: () => openCreate("proposal") },
    { label: "Project", icon: <FolderKanban className="w-3.5 h-3.5" aria-hidden="true" />, onClick: () => openCreate("project") },
    { label: "Task", icon: <SquareCheck className="w-3.5 h-3.5" aria-hidden="true" />, onClick: () => openCreate("task") },
  ];

  const moreActions: { label: string; icon: React.ReactNode; resource: CreateResource }[] = [
    { label: "Contact", icon: <UserRound className="w-3.5 h-3.5" aria-hidden="true" />, resource: "contact" },
    { label: "Payment", icon: <Banknote className="w-3.5 h-3.5" aria-hidden="true" />, resource: "payment" },
    { label: "Document", icon: <FileStack className="w-3.5 h-3.5" aria-hidden="true" />, resource: "document" },
    { label: "Message", icon: <Mail className="w-3.5 h-3.5" aria-hidden="true" />, resource: "message" },
    { label: "Note", icon: <Pencil className="w-3.5 h-3.5" aria-hidden="true" />, resource: "note" },
    { label: "Activity", icon: <Plus className="w-3.5 h-3.5" aria-hidden="true" />, resource: "activity" },
  ];

  return (
    <div className="px-5 sm:px-8 py-6 max-w-7xl">
      <Toast message={toast} />

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="section-number">
            <span className="opacity-30">—</span> CLIENT COMMAND CENTER
          </div>
          <div className="mt-1 flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--bos-text-primary)]">
              {detail.client.companyName}
            </h1>
            <span className="text-[11px] text-[var(--bos-text-tertiary)]">
              {[detail.client.industry, detail.client.businessType].filter(Boolean).join(" · ") || "—"}
            </span>
            <StatusChip status={detail.client.status} />
          </div>
          <div className="mt-1.5 flex items-center gap-4 text-[10px] text-[var(--bos-text-tertiary)] flex-wrap">
            <span className="font-mono tracking-[0.08em]">{clientCode}</span>
            <span>
              Owner · <span className="text-[var(--bos-text-secondary)]">{detail.client.ownerName ?? actorName}</span>
            </span>
            {detail.primaryContact && (
              <span>
                Primary contact ·{" "}
                <span className="text-[var(--bos-text-secondary)]">{detail.primaryContact.name}</span>
              </span>
            )}
            <span>
              Last activity · <TimeAgo value={detail.client.lastActivityLabel} />
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {quickActions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={a.onClick}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-sm border border-[var(--bos-line)] text-[11px] font-medium text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)] transition-colors duration-150"
            >
              {a.icon}
              {a.label}
            </button>
          ))}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              aria-label="More actions"
              aria-expanded={moreOpen}
              className="inline-flex items-center justify-center h-8 w-8 rounded-sm border border-[var(--bos-line)] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)] transition-colors duration-150"
            >
              <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-9 z-40 w-44 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] shadow-[var(--bos-shadow-lg)] py-1">
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
              </div>
            )}
          </div>
          {/* Status transition */}
          <div className="relative ml-1">
            <button
              type="button"
              onClick={() => {
                if (detail.client.status === "LEAD") void changeClientStatus("ACTIVE");
                else if (detail.client.status === "ARCHIVED") void changeClientStatus("ACTIVE");
                else void changeClientStatus("ARCHIVED");
              }}
              className={cn(
                "inline-flex items-center gap-1.5 h-8 px-3 rounded-sm text-[11px] font-medium transition-colors duration-150",
                detail.client.status === "ARCHIVED"
                  ? "border border-[var(--bos-line)] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)]"
                  : "bg-[var(--bos-accent)] text-white hover:bg-[var(--bos-accent-hover)]",
              )}
            >
              {detail.client.status === "LEAD" ? (
                <>Activate client</>
              ) : detail.client.status === "ARCHIVED" ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> Restore
                </>
              ) : (
                <>
                  <Archive className="w-3.5 h-3.5" aria-hidden="true" /> Archive
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick create panel */}
      {quickCreate && (
        <div className="mt-5 max-w-xl">
          <QuickCreate
            clientId={detail.client.id}
            resource={quickCreate}
            onClose={() => setQuickCreate(null)}
            onSaved={refresh}
          />
        </div>
      )}

      {/* ── Requirement requests ───────────────────────────── */}
      <div className="mt-6">
        <RequirementRequests
          requests={detail.requirementRequests}
          clientId={detail.client.id}
          defaultEmail={detail.primaryContact?.email}
          configOpen={reqConfigOpen}
          onConfigOpenChange={setReqConfigOpen}
          onChanged={refresh}
        />
      </div>

      {/* ── Overview row ───────────────────────────────────── */}
      <div className="mt-6 grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 space-y-4">
          <NextActionCard
            action={detail.nextAction}
            ownerName={detail.client.ownerName ?? actorName}
            onTake={takeAction}
          />
          <AttentionCenter detail={detail} onAction={takeAction} />
          <GitHubBlock connected={false} />
        </div>
        <div className="lg:col-span-5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)]/60 p-4 space-y-6">
          <LifecycleRail stage={detail.stage} status={detail.client.status} />
          <HealthBlock
            health={detail.health}
            attentionCount={detail.health.reasons.filter((r) => r.kind !== "ok").length}
            onScrollToAttention={scrollToAttention}
          />
          <div className="pt-4 border-t border-[var(--bos-line)]">
            <RelationshipScore score={detail.score} />
          </div>
        </div>
      </div>

      {/* ── Relationship sections ──────────────────────────── */}
      <div className="mt-4 grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 space-y-4">
          <ActiveWork
            projects={detail.projects}
            openTasks={detail.openTasks}
            blockedTasks={detail.blockedTasks}
            onOpenProject={() => router.push(`/projects`)}
            onCreateTask={() => openCreate("task")}
            onTransition={transition}
          />
          <div className="grid sm:grid-cols-2 gap-4">
            <Requirements
              requirements={detail.requirements}
              onCreate={openRequirements}
              onTransition={transition}
            />
            <Proposals
              proposals={detail.proposals}
              onCreate={() => openCreate("proposal")}
              onTransition={transition}
            />
          </div>
        </div>
        <div className="lg:col-span-4 space-y-4">
          <Commercial
            commercial={detail.commercial}
            payments={detail.payments}
            onCreate={() => openCreate("payment")}
            onTransition={transition}
          />
          <Team team={detail.team} />
        </div>
      </div>

      {/* ── Timeline row ───────────────────────────────────── */}
      <div className="mt-4 grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)]/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" aria-hidden="true" />
              <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-secondary)]">
                Live relationship timeline
              </span>
            </div>
          </div>
          <Timeline clientId={detail.client.id} initial={[]} refreshKey={timelineKey} />
        </div>
        <div className="lg:col-span-4 space-y-4">
          <Contacts
            contacts={detail.contacts}
            primaryContact={detail.primaryContact}
            onCreate={() => openCreate("contact")}
          />
          <RelationshipMap counts={detail.counts} />
        </div>
      </div>

      {/* ── Bottom row ─────────────────────────────────────── */}
      <div className="mt-4 grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4">
          <Communication messages={detail.messages} onCreate={() => openCreate("message")} />
        </div>
        <div className="lg:col-span-4">
          <Documents documents={detail.documents} onCreate={() => openCreate("document")} />
        </div>
        <div className="lg:col-span-4 space-y-4">
          <ClientContext
            client={detail.client}
            notes={detail.notes}
            onCreateNote={() => openCreate("note")}
            customFields={customFields}
          />
        </div>
      </div>

      <div className="mt-4">
        <AuditHistory audit={detail.audit} expanded={expandedAudit} onToggle={() => setExpandedAudit((e) => !e)} />
      </div>

      {/* Footer note */}
      <div className="mt-6 flex items-center justify-between text-[10px] text-[var(--bos-text-tertiary)]">
        <span>Everything here is derived from this client&apos;s real records in the workspace.</span>
        <span className="font-mono uppercase tracking-[0.1em]">Client 360° · Relationship graph · Lifecycle</span>
      </div>
    </div>
  );
}
