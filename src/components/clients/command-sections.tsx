"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  Calendar,
  Check,
  Download,
  ExternalLink,
  FileStack,
  GitBranch,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Send,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientDetail } from "@/lib/client-serialize";
import { Section, StatusChip, EmptyState, Progress, MicroButton, TimeAgo } from "./kit";

/* ── Formatters ─────────────────────────────────────────────── */

export function formatINR(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function formatCompactINR(n: number): string {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1).replace(/\.0$/, "")}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `₹${n}`;
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatINRFull(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/* ── Active work (projects + tasks) ─────────────────────────── */

export function ActiveWork({
  projects,
  openTasks,
  blockedTasks,
  onOpenProject,
  onCreateTask,
  onTransition,
}: {
  projects: ClientDetail["projects"];
  openTasks: ClientDetail["openTasks"];
  blockedTasks: number;
  onOpenProject: (id: string) => void;
  onCreateTask: () => void;
  onTransition: (resource: "tasks", id: string, status: string) => void;
}) {
  if (projects.length === 0 && openTasks.length === 0) {
    return (
      <Section id="work" title="Current work" action={<MicroButton onClick={onCreateTask}>New task</MicroButton>}>
        <EmptyState
          title="No project has been created yet."
          hint="Once work starts, the project and its tasks appear here."
          action={
            <MicroButton variant="accent" onClick={onCreateTask}>
              <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Create project
            </MicroButton>
          }
        />
      </Section>
    );
  }

  return (
    <Section id="work" title="Current work" meta={`${openTasks.length} open task${openTasks.length === 1 ? "" : "s"}`} action={<MicroButton onClick={onCreateTask}>New task</MicroButton>}>
      <div className="space-y-4">
        {projects.map((p) => (
          <div key={p.id} className="rounded-sm border border-[var(--bos-line)] p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-[var(--bos-text-primary)] truncate">{p.name}</span>
                  <StatusChip status={p.health} />
                </div>
                <div className="mt-1 flex items-center gap-3 text-[10px] text-[var(--bos-text-tertiary)]">
                  <span className="font-mono uppercase tracking-[0.1em]">{p.stage.replace("_", " ")}</span>
                  <span>Deadline {formatDate(p.deadline)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[16px] font-semibold text-[var(--bos-text-primary)] tabular-nums">{p.progress}%</span>
                <button
                  type="button"
                  onClick={() => onOpenProject(p.id)}
                  aria-label={`Open ${p.name}`}
                  className="flex items-center justify-center w-7 h-7 rounded-sm text-[var(--bos-text-tertiary)] hover:text-[var(--bos-accent)] hover:bg-[var(--bos-overlay)] transition-colors duration-150"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
            <Progress value={p.progress} className="mt-3" />
          </div>
        ))}

        {openTasks.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[10px] text-[var(--bos-text-tertiary)]">
              <span className="font-mono uppercase tracking-[0.12em]">Open tasks</span>
              {blockedTasks > 0 && (
                <span className="text-[var(--bos-warning)]">{blockedTasks} blocked</span>
              )}
            </div>
            <ul className="divide-y divide-[var(--bos-line)]">
              {openTasks.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-center gap-2.5 py-1.5">
                  <button
                    type="button"
                    onClick={() => onTransition("tasks", t.id, "DONE")}
                    aria-label="Complete task"
                    className={cn(
                      "flex items-center justify-center w-4 h-4 rounded-sm border transition-colors duration-150",
                      t.status === "DONE"
                        ? "border-[var(--bos-success)] bg-[var(--bos-success)] text-white"
                        : "border-[var(--bos-line)] hover:border-[var(--bos-border-strong)]",
                    )}
                  >
                    {t.status === "DONE" && <Check className="w-2.5 h-2.5" aria-hidden="true" />}
                  </button>
                  <span className={cn("flex-1 min-w-0 text-[12px] truncate", t.status === "DONE" ? "text-[var(--bos-text-tertiary)] line-through" : "text-[var(--bos-text-primary)]")}>
                    {t.title}
                  </span>
                  {t.blocked && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--bos-error)]">
                      <AlertTriangle className="w-2.5 h-2.5" aria-hidden="true" /> Blocked
                    </span>
                  )}
                  {t.dueAt && (
                    <span className={cn("text-[10px] tabular-nums", new Date(t.dueAt) < new Date() ? "text-[var(--bos-error)]" : "text-[var(--bos-text-tertiary)]")}>
                      {formatDate(t.dueAt)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Section>
  );
}

/* ── Requirements ───────────────────────────────────────────── */

export function Requirements({
  requirements,
  onCreate,
  onTransition,
}: {
  requirements: ClientDetail["requirements"];
  onCreate: () => void;
  onTransition: (resource: "requirements", id: string, status: string) => void;
}) {
  const open = requirements.filter((r) => r.status === "SUBMITTED" || r.status === "UNDER_REVIEW").length;
  const approved = requirements.filter((r) => r.status === "APPROVED").length;

  if (requirements.length === 0) {
    return (
      <Section id="requirements" title="Requirement status" action={<MicroButton onClick={onCreate}>Add requirement</MicroButton>}>
        <EmptyState
          title="No requirements submitted yet."
          hint="Capture what the client needs — it drives the proposal."
          action={
            <MicroButton variant="accent" onClick={onCreate}>
              <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Create requirement
            </MicroButton>
          }
        />
      </Section>
    );
  }

  return (
    <Section
      id="requirements"
      title="Requirement status"
      meta={`${open} open · ${approved} approved`}
      action={<MicroButton onClick={onCreate}>Add</MicroButton>}
    >
      <div className="space-y-2">
        {requirements.slice(0, 5).map((r) => (
          <div key={r.id} className="rounded-sm border border-[var(--bos-line)] p-2.5">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[12px] text-[var(--bos-text-primary)] leading-snug line-clamp-2">{r.title}</span>
              <StatusChip status={r.status} />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-[var(--bos-text-tertiary)]">
              <span className="font-mono uppercase tracking-[0.1em]">{r.priority}</span>
              <span>Submitted {formatDate(r.submittedAt)}</span>
            </div>
            {(r.status === "SUBMITTED" || r.status === "UNDER_REVIEW") && (
              <div className="mt-2 flex items-center gap-1.5">
                <MicroButton variant="accent" onClick={() => onTransition("requirements", r.id, "UNDER_REVIEW")}>
                  Review
                </MicroButton>
                <MicroButton onClick={() => onTransition("requirements", r.id, "APPROVED")}>Approve</MicroButton>
              </div>
            )}
            {r.status === "CHANGES_REQUESTED" && (
              <div className="mt-2">
                <MicroButton onClick={() => onTransition("requirements", r.id, "UNDER_REVIEW")}>Re-review</MicroButton>
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ── Proposals ──────────────────────────────────────────────── */

export function Proposals({
  proposals,
  onCreate,
  onTransition,
}: {
  proposals: ClientDetail["proposals"];
  onCreate: () => void;
  onTransition: (resource: "proposals", id: string, status: string) => void;
}) {
  if (proposals.length === 0) {
    return (
      <Section id="proposals" title="Proposal" action={<MicroButton onClick={onCreate}>New proposal</MicroButton>}>
        <EmptyState
          title="No proposal yet."
          hint="Once requirements are approved, draft the priced offer."
          action={
            <MicroButton variant="accent" onClick={onCreate}>
              <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Create proposal
            </MicroButton>
          }
        />
      </Section>
    );
  }

  return (
    <Section id="proposals" title="Proposal" action={<MicroButton onClick={onCreate}>New</MicroButton>}>
      <div className="space-y-2">
        {proposals.slice(0, 4).map((p) => (
          <div key={p.id} className="rounded-sm border border-[var(--bos-line)] p-2.5">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[12px] text-[var(--bos-text-primary)] leading-snug line-clamp-2">{p.title}</span>
              <StatusChip status={p.status} />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-[var(--bos-text-tertiary)]">
              <span className="font-semibold text-[var(--bos-text-secondary)] tabular-nums">{p.amount ? formatINRFull(p.amount) : "—"}</span>
              <span>Valid {formatDate(p.validUntil)}</span>
            </div>
            <div className="mt-1 flex items-center gap-3 text-[10px] text-[var(--bos-text-tertiary)]">
              <span>Sent {formatDate(p.sentAt)}</span>
              {p.viewedAt && <span>Viewed {formatDate(p.viewedAt)}</span>}
            </div>
            {(p.status === "DRAFT" || p.status === "CHANGES_REQUESTED") && (
              <div className="mt-2">
                <MicroButton variant="accent" onClick={() => onTransition("proposals", p.id, "SENT")}>
                  <Send className="w-3 h-3" aria-hidden="true" /> Send
                </MicroButton>
              </div>
            )}
            {p.status === "SENT" && (
              <div className="mt-2 flex items-center gap-1.5">
                <MicroButton variant="accent" onClick={() => onTransition("proposals", p.id, "APPROVED")}>
                  <Check className="w-3 h-3" aria-hidden="true" /> Approved
                </MicroButton>
                <MicroButton onClick={() => onTransition("proposals", p.id, "CHANGES_REQUESTED")}>Changes</MicroButton>
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ── Commercial center ──────────────────────────────────────── */

export function Commercial({
  commercial,
  payments,
  onCreate,
  onTransition,
}: {
  commercial: ClientDetail["commercial"];
  payments: ClientDetail["payments"];
  onCreate: () => void;
  onTransition: (resource: "payments", id: string, status: string) => void;
}) {
  const hasPayments = payments.length > 0 || commercial.contractValue > 0;
  return (
    <Section id="commercial" title="Commercial" meta="Contract · Paid · Pending" action={<MicroButton onClick={onCreate}>Record payment</MicroButton>}>
      {!hasPayments ? (
        <EmptyState
          title="No commercial records yet."
          hint="Record the contract value or first invoice."
          action={
            <MicroButton variant="accent" onClick={onCreate}>
              <Banknote className="w-3.5 h-3.5" aria-hidden="true" /> Add payment
            </MicroButton>
          }
        />
      ) : (
        <div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-sm border border-[var(--bos-line)] p-2">
              <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)]">Contract</div>
              <div className="mt-0.5 text-[14px] font-semibold text-[var(--bos-text-primary)] tabular-nums">{formatCompactINR(commercial.contractValue)}</div>
            </div>
            <div className="rounded-sm border border-[var(--bos-line)] p-2">
              <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)]">Paid</div>
              <div className="mt-0.5 text-[14px] font-semibold text-[var(--bos-success)] tabular-nums">{formatCompactINR(commercial.paid)}</div>
            </div>
            <div className="rounded-sm border border-[var(--bos-line)] p-2">
              <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)]">Pending</div>
              <div className={cn("mt-0.5 text-[14px] font-semibold tabular-nums", commercial.pending > 0 ? "text-[var(--bos-warning)]" : "text-[var(--bos-text-primary)]")}>
                {formatCompactINR(commercial.pending)}
              </div>
            </div>
          </div>

          {payments.length > 0 && (
            <ul className="mt-3 divide-y divide-[var(--bos-line)]">
              {payments.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-1.5">
                  <div className="min-w-0">
                    <div className="text-[11px] text-[var(--bos-text-primary)] truncate">
                      {p.label ?? (p.invoiceNumber ? `Invoice ${p.invoiceNumber}` : p.type.replace("_", " "))}
                    </div>
                    <div className="text-[9px] text-[var(--bos-text-tertiary)] font-mono uppercase tracking-[0.08em]">
                      {p.invoiceNumber ?? p.type.replace("_", " ")} · Due {formatDate(p.dueAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[12px] font-medium tabular-nums text-[var(--bos-text-primary)]">{formatCompactINR(p.amount)}</span>
                    {p.status === "PENDING" ? (
                      <MicroButton onClick={() => onTransition("payments", p.id, "PAID")}>
                        <Check className="w-3 h-3" aria-hidden="true" /> Mark paid
                      </MicroButton>
                    ) : (
                      <StatusChip status={p.status} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Section>
  );
}

/* ── Team context ───────────────────────────────────────────── */

export function Team({ team }: { team: ClientDetail["team"] }) {
  if (team.length === 0) {
    return (
      <Section id="team" title="Team context" meta="Who is working on this">
        <EmptyState title="No team assigned yet." hint="Tasks will assign roles and members automatically." />
      </Section>
    );
  }
  return (
    <Section id="team" title="Team context" meta={`${team.reduce((a, t) => a + t.count, 0)} open tasks`}>
      <ul className="space-y-2.5">
        {team.map((t) => (
          <li key={t.role}>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--bos-text-secondary)] font-medium">{t.role}</span>
              <span className="text-[var(--bos-text-tertiary)] tabular-nums">{t.count} task{t.count === 1 ? "" : "s"}</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              {t.assignees.slice(0, 3).map((a) => (
                <span
                  key={a.name}
                  className="inline-flex items-center gap-1 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-overlay)] px-1.5 py-0.5 text-[9px] text-[var(--bos-text-secondary)]"
                >
                  <UserRound className="w-2.5 h-2.5" aria-hidden="true" />
                  {a.name}
                  <span className="text-[var(--bos-text-tertiary)]">{a.tasks}</span>
                </span>
              ))}
              {t.assignees.length > 3 && (
                <span className="text-[9px] text-[var(--bos-text-tertiary)]">+{t.assignees.length - 3}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ── Contacts ───────────────────────────────────────────────── */

export function Contacts({
  contacts,
  primaryContact,
  onCreate,
}: {
  contacts: ClientDetail["contacts"];
  primaryContact: ClientDetail["primaryContact"];
  onCreate: () => void;
}) {
  if (contacts.length === 0) {
    return (
      <Section id="contacts" title="Contacts" action={<MicroButton onClick={onCreate}>Add contact</MicroButton>}>
        <EmptyState
          title="No contacts yet."
          action={
            <MicroButton variant="accent" onClick={onCreate}>
              <UserRound className="w-3.5 h-3.5" aria-hidden="true" /> Add contact
            </MicroButton>
          }
        />
      </Section>
    );
  }

  return (
    <Section id="contacts" title="Contacts" meta={`${contacts.length} total`} action={<MicroButton onClick={onCreate}>Add</MicroButton>}>
      <ul className="space-y-2.5">
        {contacts.slice(0, 4).map((c) => {
          const isPrimary = primaryContact?.id === c.id || c.isPrimary;
          return (
            <li key={c.id} className={cn("rounded-sm border p-2.5", isPrimary ? "border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)]/40" : "border-[var(--bos-line)]")}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-medium text-[var(--bos-text-primary)] truncate">{c.name}</span>
                    {isPrimary && (
                      <span className="text-[8px] font-mono uppercase tracking-[0.12em] text-[var(--bos-accent)] shrink-0">Primary</span>
                    )}
                  </div>
                  {c.role && <div className="text-[10px] text-[var(--bos-text-tertiary)]">{c.role}</div>}
                </div>
                <span className="text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--bos-text-tertiary)] shrink-0">
                  {c.preferredChannel?.replace("_", " ") ?? "Email"}
                </span>
              </div>
              {(c.email || c.phone) && (
                <div className="mt-1.5 flex items-center gap-2 text-[10px] text-[var(--bos-text-secondary)]">
                  {c.email && (
                    <span className="inline-flex items-center gap-1 min-w-0">
                      <Mail className="w-2.5 h-2.5 shrink-0 text-[var(--bos-text-tertiary)]" aria-hidden="true" />
                      <span className="truncate">{c.email}</span>
                    </span>
                  )}
                  {c.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5 text-[var(--bos-text-tertiary)]" aria-hidden="true" />
                      {c.phone}
                    </span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

/* ── Communication stream ───────────────────────────────────── */

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  EMAIL: <Mail className="w-3 h-3" />,
  WHATSAPP: <MessageSquare className="w-3 h-3" />,
  CALL: <Phone className="w-3 h-3" />,
  MEETING: <Calendar className="w-3 h-3" />,
  INTERNAL_NOTE: <Users className="w-3 h-3" />,
};

export function Communication({
  messages,
  onCreate,
}: {
  messages: ClientDetail["messages"];
  onCreate: () => void;
}) {
  if (messages.length === 0) {
    return (
      <Section id="communication" title="Conversation" action={<MicroButton onClick={onCreate}>Log message</MicroButton>}>
        <EmptyState
          title="No communication recorded."
          hint="Email, WhatsApp, calls and meetings appear here."
          action={
            <MicroButton variant="accent" onClick={onCreate}>
              <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" /> Log message
            </MicroButton>
          }
        />
      </Section>
    );
  }
  return (
    <Section id="communication" title="Conversation" meta={`${messages.length} messages`} action={<MicroButton onClick={onCreate}>Log</MicroButton>}>
      <ul className="space-y-2.5">
        {messages.slice(0, 5).map((m) => (
          <li key={m.id} className="flex items-start gap-2.5">
            <span className="flex items-center justify-center w-6 h-6 rounded-sm border border-[var(--bos-line)] text-[var(--bos-text-tertiary)] shrink-0 mt-0.5">
              {CHANNEL_ICON[m.channel] ?? <MessageSquare className="w-3 h-3" aria-hidden="true" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] text-[var(--bos-text-primary)] truncate">{m.subject}</span>
                <TimeAgo value={formatRelative(m.at)} />
              </div>
              <div className="text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--bos-text-tertiary)] mt-0.5">
                {m.channel.replace("_", " ")} · {m.direction === "OUT" ? "outbound" : "inbound"}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ── Documents ──────────────────────────────────────────────── */

export function Documents({
  documents,
  onCreate,
}: {
  documents: ClientDetail["documents"];
  onCreate: () => void;
}) {
  if (documents.length === 0) {
    return (
      <Section id="documents" title="Client files" action={<MicroButton onClick={onCreate}>Upload</MicroButton>}>
        <EmptyState
          title="No files yet."
          hint="Requirements, proposals, contracts, invoices and project files live here."
          action={
            <MicroButton variant="accent" onClick={onCreate}>
              <FileStack className="w-3.5 h-3.5" aria-hidden="true" /> Add document
            </MicroButton>
          }
        />
      </Section>
    );
  }
  return (
    <Section id="documents" title="Client files" meta={`${documents.length} files`} action={<MicroButton onClick={onCreate}>Upload</MicroButton>}>
      <ul className="space-y-1.5">
        {documents.slice(0, 6).map((d) => (
          <li key={d.id} className="flex items-center gap-2 py-1">
            <FileStack className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)] shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-[var(--bos-text-primary)] truncate">{d.name}</div>
              <div className="text-[9px] text-[var(--bos-text-tertiary)] font-mono uppercase tracking-[0.08em]">
                {d.category.replace("_", " ")} · {d.uploadedByName ?? "—"}
              </div>
            </div>
            {d.url && (
              <a href={d.url} target="_blank" rel="noreferrer" aria-label={`Download ${d.name}`} className="text-[var(--bos-text-tertiary)] hover:text-[var(--bos-accent)] transition-colors duration-150">
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ── Relationship map ───────────────────────────────────────── */

const MAP_NODES: { key: keyof ClientDetail["counts"]; label: string; anchor: string }[] = [
  { key: "contacts", label: "Contacts", anchor: "contacts" },
  { key: "requirements", label: "Requirements", anchor: "requirements" },
  { key: "proposals", label: "Proposals", anchor: "proposals" },
  { key: "projects", label: "Projects", anchor: "work" },
  { key: "openTasks", label: "Tasks", anchor: "work" },
  { key: "documents", label: "Documents", anchor: "documents" },
  { key: "payments", label: "Payments", anchor: "commercial" },
  { key: "messages", label: "Messages", anchor: "communication" },
];

export function RelationshipMap({ counts }: { counts: ClientDetail["counts"] }) {
  return (
    <Section id="map" title="Relationship map" meta="Click a node to jump">
      <div className="flex items-center justify-center py-2">
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)]/60 px-4 py-2 text-center">
            <div className="text-[12px] font-semibold text-[var(--bos-text-primary)]">Client</div>
            <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)]">one relationship</div>
          </div>
          <div className="grid grid-cols-4 gap-1.5 w-full">
            {MAP_NODES.map((n) => (
              <a
                key={n.key}
                href={`#${n.anchor}`}
                className="group flex flex-col items-center gap-1 rounded-sm border border-[var(--bos-line)] py-2 transition-colors duration-150 hover:border-[var(--bos-accent-ring)] hover:bg-[var(--bos-overlay)]"
              >
                <span className="text-[15px] font-semibold text-[var(--bos-text-primary)] tabular-nums group-hover:text-[var(--bos-accent)] transition-colors duration-150">
                  {counts[n.key]}
                </span>
                <span className="text-[8px] font-mono uppercase tracking-[0.1em] text-[var(--bos-text-tertiary)] text-center">
                  {n.label}
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ── Client context (memory + custom fields + notes) ────────── */

export function ClientContext({
  client,
  notes,
  onCreateNote,
  customFields,
}: {
  client: ClientDetail["client"];
  notes: ClientDetail["notes"];
  onCreateNote: () => void;
  customFields: { label: string; value: string }[];
}) {
  const hasMemory = customFields.length > 0 || notes.length > 0;
  return (
    <Section id="context" title="Client context" meta="Memory, preferences, notes" action={<MicroButton onClick={onCreateNote}>Add note</MicroButton>}>
      {!hasMemory && client.description ? (
        <p className="text-[12px] text-[var(--bos-text-secondary)] leading-relaxed">{client.description}</p>
      ) : (
        <div className="space-y-4">
          {customFields.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              {customFields.map((f) => (
                <div key={f.label} className="min-w-0">
                  <dt className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)] truncate">{f.label}</dt>
                  <dd className="text-[12px] text-[var(--bos-text-secondary)] truncate">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {notes.length > 0 && (
            <ul className="space-y-2">
              {notes.slice(0, 3).map((n) => (
                <li key={n.id} className="rounded-sm border border-[var(--bos-line)] p-2.5">
                  <p className="text-[12px] text-[var(--bos-text-secondary)] leading-relaxed">{n.content}</p>
                  <div className="mt-1 text-[9px] text-[var(--bos-text-tertiary)] font-mono uppercase tracking-[0.08em]">
                    {n.authorName ?? "Team"} · {formatDate(n.createdAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {!hasMemory && !client.description && (
        <EmptyState
          title="No context recorded yet."
          hint="Add notes about preferences, decision makers and important details."
          action={
            <MicroButton variant="accent" onClick={onCreateNote}>
              <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Add first note
            </MicroButton>
          }
        />
      )}
    </Section>
  );
}

/* ── Audit history ──────────────────────────────────────────── */

const AUDIT_LABEL: Record<string, string> = {
  CREATED: "Client created",
  UPDATED: "Record updated",
  STATUS_CHANGED: "Status changed",
  OWNER_CHANGED: "Owner changed",
  CONTACT_ADDED: "Contact added",
  REQUIREMENT_CREATED: "Requirement created",
  PROPOSAL_CREATED: "Proposal created",
  PROPOSAL_SENT: "Proposal sent",
  PROPOSAL_APPROVED: "Proposal approved",
  PROJECT_CREATED: "Project created",
  TASK_ASSIGNED: "Task assigned",
  PAYMENT_UPDATED: "Payment updated",
  DOCUMENT_UPLOADED: "Document uploaded",
  CLIENT_ARCHIVED: "Client archived",
  CLIENT_RESTORED: "Client restored",
  ACTIVITY_ADDED: "Activity added",
  NOTE_ADDED: "Note added",
  MESSAGE_ADDED: "Message added",
  STAGE_CHANGED: "Stage changed",
  CUSTOM_FIELD_UPDATED: "Custom field updated",
};

export function AuditHistory({ audit, expanded, onToggle }: { audit: ClientDetail["audit"]; expanded: boolean; onToggle: () => void }) {
  const visible = expanded ? audit : audit.slice(0, 6);
  return (
    <Section
      id="audit"
      title="Audit history"
      meta="System changes — who changed what"
      action={
        <MicroButton onClick={onToggle}>
          {expanded ? "Collapse" : `View full history (${audit.length})`}
        </MicroButton>
      }
    >
      {audit.length === 0 ? (
        <EmptyState title="No audit events yet." hint="Every change to this relationship is recorded here." />
      ) : (
        <ul className="space-y-1">
          {visible.map((a) => (
            <li key={a.id} className="flex items-baseline gap-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--bos-line)] shrink-0 self-center" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <span className="text-[11px] text-[var(--bos-text-primary)]">
                  {AUDIT_LABEL[a.action] ?? a.action.replace(/_/g, " ").toLowerCase()}
                </span>
                <span className="ml-1.5 text-[10px] text-[var(--bos-text-tertiary)] font-mono uppercase tracking-[0.06em]">
                  {a.entity}
                </span>
              </div>
              <span className="text-[10px] text-[var(--bos-text-tertiary)] shrink-0">{a.actorName ?? "System"}</span>
              <TimeAgo value={formatRelative(a.createdAt)} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function formatRelative(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const mins = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

/* ── GitHub block ───────────────────────────────────────────── */

export function GitHubBlock({ connected }: { connected: boolean }) {
  return (
    <Section id="github" title="GitHub" meta={connected ? "Connected" : "Not connected"}>
      {connected ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[12px] text-[var(--bos-text-secondary)]">
            <GitBranch className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" aria-hidden="true" />
            Repository connected
          </div>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="inline-flex items-center gap-1 text-[11px] text-[var(--bos-accent)] hover:text-[var(--bos-accent-hover)]"
          >
            View GitHub <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[var(--bos-text-tertiary)]">
            Connect a repository to see commits, PRs and issues for this client.
          </span>
          <MicroButton>
            <GitBranch className="w-3 h-3" aria-hidden="true" /> Connect
          </MicroButton>
        </div>
      )}
    </Section>
  );
}
