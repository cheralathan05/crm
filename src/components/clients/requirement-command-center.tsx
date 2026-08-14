"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  BadgeCheck,
  Banknote,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  Download,
  FileStack,
  History,
  Loader2,
  Mail,
  Palette,
  Pencil,
  RotateCcw,
  Send,
  ShieldX,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SECTIONS, getSection } from "@/lib/requirement-config";
import { StatusChip, MicroButton } from "./kit";

/* ────────────────────────────────────────────────────────────────
   REQUIREMENT COMMAND CENTER — ADMIN
   The full review surface for one requirement request: real data in
   tabs, honest state transitions (send, remind, clarify, approve,
   revoke, regenerate, proposal). Never raw JSON — every tab renders
   a professional summary. No manual re-entry anywhere.
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
    canSend: boolean;
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

const TABS = [
  { id: "overview", label: "Overview", icon: ClipboardList },
  { id: "responses", label: "Responses", icon: Pencil },
  { id: "features", label: "Features", icon: BadgeCheck },
  { id: "scope", label: "Scope", icon: Check },
  { id: "design", label: "Design", icon: Palette },
  { id: "technology", label: "Technology", icon: History },
  { id: "files", label: "Files", icon: FileStack },
  { id: "timeline", label: "Timeline", icon: Activity },
  { id: "activity", label: "Activity", icon: History },
  { id: "review", label: "Review", icon: CheckCircle2 },
] as const;

type TabId = (typeof TABS)[number]["id"];

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
  const [tab, setTab] = useState<TabId>("overview");
  const [dialog, setDialog] = useState<null | "send" | "remind" | "changes" | "revoke" | "proposal">(null);
  const [link, setLink] = useState<string | null>(initialLink ?? null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-bg)]/80">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-[var(--bos-line)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-[11px] tracking-[0.1em] text-[var(--bos-text-tertiary)]">{r.reference}</span>
              <span className="text-[16px] font-semibold text-[var(--bos-text-primary)] truncate">{r.title}</span>
              <StatusChip status={r.status} />
            </div>
            <div className="mt-1 flex items-center gap-3 text-[10px] text-[var(--bos-text-tertiary)] flex-wrap">
              <span>{bundle.client?.companyName}</span>
              {r.responderName && <span>Respondent · {r.responderName}{r.responderRole ? ` (${r.responderRole})` : ""}</span>}
              <span>{r.completeness}% complete</span>
              <span>Revision {r.revision}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
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
                {link && (
                  <MicroButton onClick={() => void copyLink()}>
                    {copied ? <Check className="w-3 h-3 text-[var(--bos-success)]" aria-hidden="true" /> : <Copy className="w-3 h-3" aria-hidden="true" />}
                    {copied ? "Copied" : "Copy link"}
                  </MicroButton>
                )}
              </>
            )}
            {["SUBMITTED", "REVISION_SUBMITTED", "CHANGES_REQUESTED", "IN_PROGRESS"].includes(r.status) && (
              <>
                <MicroButton variant="accent" onClick={() => setDialog("changes")}>
                  <Pencil className="w-3 h-3" aria-hidden="true" /> Request changes
                </MicroButton>
                <MicroButton variant="accent" onClick={() => void act(`/api/requirements/${r.id}/approve`)}>
                  <Check className="w-3 h-3" aria-hidden="true" /> Approve
                </MicroButton>
              </>
            )}
            {r.status === "APPROVED" && (
              <MicroButton variant="accent" onClick={() => setDialog("proposal")}>
                <Banknote className="w-3 h-3" aria-hidden="true" /> Create proposal
              </MicroButton>
            )}
            {r.status !== "REVOKED" && r.status !== "APPROVED" && (
              <>
                <MicroButton onClick={() => void act(`/api/requirements/${r.id}/regenerate`).then((res) => { if (res.ok) setLink(String(res.data?.link ?? "")); })}>
                  <RotateCcw className="w-3 h-3" aria-hidden="true" /> New link
                </MicroButton>
                <MicroButton onClick={() => setDialog("revoke")}>
                  <ShieldX className="w-3 h-3" aria-hidden="true" /> Revoke
                </MicroButton>
              </>
            )}
            <MicroButton onClick={onClose}>
              <X className="w-3 h-3" aria-hidden="true" /> Close
            </MicroButton>
          </div>
        </div>

        {notice && (
          <div className="mt-2.5 rounded-sm border border-[var(--bos-warning)]/25 bg-[var(--bos-warning)]/6 px-3 py-2 text-[11px] text-[var(--bos-text-secondary)]">
            {notice}
          </div>
        )}

        {/* Dialogs */}
        {dialog && (
          <Dialog
            kind={dialog}
            bundle={bundle}
            link={link}
            defaultEmail={defaultEmail ?? r.sentTo ?? undefined}
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
                  setNotice("✓ Clarification requested — the client will see it next time they open the workspace.");
                }
              })
            }
            onRevoke={(payload) =>
              void act(`/api/requirements/${r.id}/revoke`, payload).then((res) => {
                if (res.ok) setDialog(null);
              })
            }
            onProposal={() =>
              void act(`/api/requirements/${r.id}/proposal`).then((res) => {
                if (res.ok) {
                  setDialog(null);
                  setNotice("✓ Proposal created from these requirements — no manual re-entry.");
                }
              })
            }
            onClose={() => setDialog(null)}
          />
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto px-3 pt-2 border-b border-[var(--bos-line)] no-scrollbar" role="tablist" aria-label="Requirement sections">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-1.5 h-9 px-3 rounded-t-sm text-[11px] font-medium whitespace-nowrap transition-colors duration-150 border-b-2",
                active
                  ? "border-[var(--bos-accent)] text-[var(--bos-accent)]"
                  : "border-transparent text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-secondary)]",
              )}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="p-4">
        {busy && (
          <div className="mb-3 flex items-center gap-2 text-[11px] text-[var(--bos-text-tertiary)]">
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Updating…
          </div>
        )}

        {tab === "overview" && <OverviewTab bundle={bundle} />}
        {tab === "responses" && <ResponsesTab bundle={bundle} />}
        {tab === "features" && <FeaturesTab features={bundle.features} />}
        {tab === "scope" && <ScopeTab answers={bundle.answers} />}
        {tab === "design" && <DesignTab answers={bundle.answers} />}
        {tab === "technology" && <TechTab answers={bundle.answers} />}
        {tab === "files" && <FilesTab attachments={bundle.attachments} requestId={r.id} />}
        {tab === "timeline" && <TimelineTab answers={bundle.answers} />}
        {tab === "activity" && <ActivityTab bundle={bundle} />}
        {tab === "review" && (
          <ReviewTab
            bundle={bundle}
            onRequestChanges={() => setDialog("changes")}
            onApprove={() =>
              void act(`/api/requirements/${r.id}/approve`).then((res) => {
                if (res.ok) setNotice("✓ Requirements approved.");
              })
            }
            onProposal={() => setDialog("proposal")}
          />
        )}
      </div>
    </div>
  );
}

/* ── Shared bits ─────────────────────────────────────────────── */

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)] mb-1">{label}</div>
      <div className="text-[13px] text-[var(--bos-text-primary)]">{children}</div>
    </div>
  );
}

function AnswerBlock({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  let rendered: ReactNode;
  if (typeof value === "string") rendered = value;
  else if (typeof value === "number" || typeof value === "boolean") rendered = String(value);
  else if (Array.isArray(value)) rendered = (value as unknown[]).join(", ");
  else rendered = value as ReactNode; // JSX element (e.g. ChipRow)
  if (rendered === "" || rendered === null) return null;
  return (
    <div>
      <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)] mb-1">{label}</div>
      <div className="text-[13px] leading-relaxed text-[var(--bos-text-primary)]">{rendered}</div>
    </div>
  );
}

function ChipRow({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <span key={i} className="inline-flex items-center gap-1 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-overlay)] px-2 py-1 text-[11px] text-[var(--bos-text-secondary)]">
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

/* ── Overview ────────────────────────────────────────────────── */

function OverviewTab({ bundle }: { bundle: AdminBundle }) {
  const r = bundle.request;
  const data = (k: string) => (bundle.answers[k] ?? {}) as Record<string, unknown>;
  const stakeholders = (data("stakeholders").stakeholders as { name?: string }[] | undefined) ?? [];
  const timeline = data("timeline");
  const commercial = data("commercial");

  const cards = [
    { label: "Project", value: r.title },
    { label: "Client", value: bundle.client?.companyName ?? "—" },
    { label: "Status", value: r.statusLabel },
    { label: "Completeness", value: `${r.completeness}%` },
    { label: "Features", value: String(bundle.features.length) },
    { label: "Files", value: String(bundle.attachments.length) },
    { label: "Stakeholders", value: String(stakeholders.length) },
    { label: "Timeline", value: timeline.launchWindow ? String(timeline.launchWindow) : "—" },
    { label: "Budget", value: commercial.budgetModel ? String(commercial.budgetModel) : "—" },
    { label: "Revision", value: `v${r.revision}` },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {cards.map((c) => (
          <div key={c.label} className="rounded-sm border border-[var(--bos-line)] p-3">
            <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)]">{c.label}</div>
            <div className="mt-1 text-[13px] font-medium text-[var(--bos-text-primary)] truncate">{c.value}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-secondary)]">Readiness</div>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
          {SECTIONS.filter((s) => s.weight > 0).map((s) => {
            const complete = bundle.states[s.key] === true;
            return (
              <div key={s.key} className="flex items-center gap-2">
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", complete ? "bg-[var(--bos-success)]" : "bg-[var(--bos-warning)]")} aria-hidden="true" />
                <span className="flex-1 text-[11px] text-[var(--bos-text-secondary)]">{s.label}</span>
                <span className={cn("text-[10px] font-mono uppercase tracking-[0.08em]", complete ? "text-[var(--bos-success)]" : "text-[var(--bos-warning)]")}>
                  {complete ? "✓" : "⚠"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Responses ───────────────────────────────────────────────── */

function ResponsesTab({ bundle }: { bundle: AdminBundle }) {
  const data = (k: string) => (bundle.answers[k] ?? {}) as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <AnswerSection title="Project vision" state={bundle.states.vision}>
        <AnswerBlock label="Goals" value={<ChipRow items={listData(data("vision"), "goals")} />} />
        <AnswerBlock label="Tell us more" value={data("vision").description} />
        <AnswerBlock label="What does success look like?" value={data("vision").success} />
        <AnswerBlock label="User outcomes" value={<ChipRow items={listData(data("vision"), "userOutcomes")} />} />
      </AnswerSection>

      <AnswerSection title="Business" state={bundle.states.business}>
        <AnswerBlock label="Company" value={data("business").companyName} />
        <AnswerBlock label="What the company does" value={data("business").description} />
        <AnswerBlock label="Customers" value={data("business").customers} />
        <AnswerBlock label="Differentiator" value={data("business").differentiator} />
        <AnswerBlock label="Problem to solve" value={data("business").problem} />
        <AnswerBlock label="Current process" value={data("business").currentProcess} />
      </AnswerSection>

      <AnswerSection title="Target users" state={bundle.states.users}>
        {(data("users").users as { name?: string; needs?: string[]; goals?: string[]; problems?: string[]; permissions?: string[] }[] | undefined)?.length ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {(data("users").users as { name?: string; needs?: string[]; goals?: string[]; problems?: string[]; permissions?: string[] }[]).map((u, i) => (
              <div key={i} className="rounded-sm border border-[var(--bos-line)] p-3">
                <div className="text-[13px] font-medium text-[var(--bos-text-primary)]">{u.name ?? "User type"}</div>
                {u.needs && u.needs.length > 0 && (
                  <p className="mt-1.5 text-[11px] text-[var(--bos-text-secondary)]"><span className="text-[var(--bos-text-tertiary)]">Needs:</span> {u.needs.join(" · ")}</p>
                )}
                {u.permissions && u.permissions.length > 0 && (
                  <p className="mt-1 text-[11px] text-[var(--bos-text-secondary)]"><span className="text-[var(--bos-text-tertiary)]">Permissions:</span> {u.permissions.join(" · ")}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-[var(--bos-text-tertiary)]">No user types recorded.</p>
        )}
      </AnswerSection>

      <AnswerSection title="Existing system" state={bundle.states.existingSystem}>
        <AnswerBlock label="Existing system" value={data("existingSystem").hasExisting} />
        <AnswerBlock label="Keep" value={data("existingSystem").keep} />
        <AnswerBlock label="Change" value={data("existingSystem").change} />
        <AnswerBlock label="Replace" value={data("existingSystem").replace} />
        <AnswerBlock label="Migrate" value={data("existingSystem").migrate} />
      </AnswerSection>

      <AnswerSection title="Integrations" state={bundle.states.integrations}>
        <AnswerBlock label="Services to connect" value={<ChipRow items={listData(data("integrations"), "tools")} />} />
        <AnswerBlock label="How they should connect" value={data("integrations").notes} />
      </AnswerSection>

      <AnswerSection title="Commercial" state={bundle.states.commercial}>
        <AnswerBlock label="Budget model" value={data("commercial").budgetModel} />
        <AnswerBlock label="Budget range" value={data("commercial").budgetRange} />
        <AnswerBlock label="Notes" value={data("commercial").notes} />
      </AnswerSection>

      <AnswerSection title="Success criteria" state={bundle.states.success}>
        <AnswerBlock label="Criteria" value={<ChipRow items={listData(data("success"), "criteria")} />} />
        <AnswerBlock label="Target outcomes / KPIs" value={data("success").kpis} />
      </AnswerSection>
    </div>
  );
}

function AnswerSection({ title, state, children }: { title: string; state: boolean; children: React.ReactNode }) {
  return (
    <section className="rounded-sm border border-[var(--bos-line)]">
      <header className="flex items-center gap-2 px-3.5 py-2 border-b border-[var(--bos-line)]">
        <span className={cn("text-[10px] font-mono uppercase tracking-[0.16em]", state ? "text-[var(--bos-success)]" : "text-[var(--bos-text-tertiary)]")}>
          {title}
        </span>
        <span className={cn("text-[10px]", state ? "text-[var(--bos-success)]" : "text-[var(--bos-warning)]")}>
          {state ? "✓ Complete" : "Incomplete"}
        </span>
      </header>
      <div className="p-3.5 grid sm:grid-cols-2 gap-x-6 gap-y-4">{children}</div>
    </section>
  );
}

/* ── Features ────────────────────────────────────────────────── */

function FeaturesTab({ features }: { features: AdminBundle["features"] }) {
  if (features.length === 0) {
    return <EmptyHint text="No features have been configured yet." />;
  }
  return (
    <div className="space-y-3">
      {features.map((f) => (
        <div key={f.id} className="rounded-sm border border-[var(--bos-line)] overflow-hidden">
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-[var(--bos-line)] bg-[var(--bos-overlay)]/40">
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
                    <KV key={k} label={label}>
                      {Array.isArray(v) ? v.join(", ") : String(v)}
                    </KV>
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

/* ── Scope / Design / Tech / Files / Timeline ────────────────── */

function ScopeTab({ answers }: { answers: AdminBundle["answers"] }) {
  const data = (answers.scope ?? {}) as Record<string, unknown>;
  const lists: { key: string; label: string }[] = [
    { key: "included", label: "What is included" },
    { key: "excluded", label: "What is not included" },
    { key: "assumptions", label: "Assumptions" },
    { key: "dependencies", label: "Dependencies" },
  ];
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {lists.map((l) => (
        <div key={l.key} className="rounded-sm border border-[var(--bos-line)] p-3.5">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-secondary)] mb-2">{l.label}</div>
          {listData(data, l.key).length > 0 ? (
            <ul className="space-y-1">
              {listData(data, l.key).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] text-[var(--bos-text-secondary)]">
                  <Check className="w-3.5 h-3.5 text-[var(--bos-success)] mt-0.5 shrink-0" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px] text-[var(--bos-text-tertiary)]">Nothing recorded.</p>
          )}
        </div>
      ))}
    </div>
  );
}

function DesignTab({ answers }: { answers: AdminBundle["answers"] }) {
  const data = (answers.design ?? {}) as Record<string, unknown>;
  return (
    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4 max-w-3xl">
      <AnswerBlock label="Existing branding" value={data.hasBranding} />
      <AnswerBlock label="Preferred style" value={data.style} />
      <AnswerBlock label="Dark mode" value={data.darkMode} />
      <AnswerBlock label="Reference websites" value={<ChipRow items={listData(data, "references")} />} />
      <AnswerBlock label="Apps they like" value={<ChipRow items={listData(data, "apps")} />} />
      <AnswerBlock label="Design notes" value={data.notes} />
    </div>
  );
}

function TechTab({ answers }: { answers: AdminBundle["answers"] }) {
  const data = (answers.technology ?? {}) as Record<string, unknown>;
  const preference = data.preference;
  if (preference && preference !== "Yes") {
    return (
      <div className="max-w-xl rounded-sm border border-[var(--bos-line)] p-4">
        <AnswerBlock label="Technology preference" value={preference} />
        <p className="mt-3 text-[12px] text-[var(--bos-text-secondary)]">
          The client asked us to recommend the right technology based on the requirements. No stack constraints were provided.
        </p>
      </div>
    );
  }
  return (
    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4 max-w-3xl">
      <AnswerBlock label="Technology preference" value={preference} />
      <AnswerBlock label="Frontend" value={data.frontend} />
      <AnswerBlock label="Backend" value={data.backend} />
      <AnswerBlock label="Database" value={data.database} />
      <AnswerBlock label="Hosting / cloud" value={data.hosting} />
      <AnswerBlock label="Existing APIs" value={data.apis} />
    </div>
  );
}

function FilesTab({ attachments, requestId }: { attachments: AdminBundle["attachments"]; requestId: string }) {
  if (attachments.length === 0) {
    return <EmptyHint text="No project files have been uploaded yet." />;
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

function TimelineTab({ answers }: { answers: AdminBundle["answers"] }) {
  const data = (answers.timeline ?? {}) as Record<string, unknown>;
  return (
    <div className="max-w-xl space-y-4">
      <div className="rounded-sm border border-[var(--bos-line)] p-4 space-y-3">
        <AnswerBlock label="Launch window" value={data.launchWindow} />
        <AnswerBlock label="Fixed deadline" value={data.fixedDeadline} />
        <AnswerBlock label="Deadline date" value={data.deadlineDate} />
        <AnswerBlock label="Priority" value={data.priority} />
      </div>
    </div>
  );
}

/* ── Activity + revisions ────────────────────────────────────── */

function ActivityTab({ bundle }: { bundle: AdminBundle }) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div>
        <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-secondary)]">Live activity</div>
        {bundle.events.length === 0 ? (
          <EmptyHint text="No activity yet." />
        ) : (
          <ol className="relative border-l border-[var(--bos-line)] ml-1.5 space-y-3">
            {bundle.events.map((e) => (
              <li key={e.id} className="pl-4">
                <span className="absolute -left-[3px] w-1.5 h-1.5 rounded-full bg-[var(--bos-accent)]" aria-hidden="true" />
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
      </div>

      <div>
        <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-secondary)]">Revisions</div>
        {bundle.revisions.length === 0 ? (
          <EmptyHint text="No revisions yet." />
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

        <div className="mt-5">
          <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-secondary)]">Clarification thread</div>
          {bundle.comments.length === 0 ? (
            <EmptyHint text="No clarifications yet." />
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
        </div>
      </div>
    </div>
  );
}

/* ── Review / decisions ──────────────────────────────────────── */

function ReviewTab({
  bundle,
  onRequestChanges,
  onApprove,
  onProposal,
}: {
  bundle: AdminBundle;
  onRequestChanges: () => void;
  onApprove: () => void;
  onProposal: () => void;
}) {
  const r = bundle.request;
  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-sm border border-[var(--bos-line)] p-4">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-secondary)]">Decision</div>
          <StatusChip status={r.status} />
        </div>
        <p className="mt-2 text-[13px] text-[var(--bos-text-secondary)] leading-relaxed">
          {r.status === "SUBMITTED" && "The client has submitted their requirements. Review the responses, request clarification on anything unclear, or approve to move toward a proposal."}
          {r.status === "REVISION_SUBMITTED" && "The client responded to your clarification and resubmitted. Review the changes and approve when ready."}
          {r.status === "CHANGES_REQUESTED" && "You requested clarification. The client will see it next time they open the workspace."}
          {r.status === "APPROVED" && "Requirements approved. Create the proposal — all the structured data flows into it automatically."}
          {r.status === "IN_PROGRESS" && "The client is actively working through the workspace."}
          {r.status === "SENT" && "The link was sent. Waiting for the client to open it."}
          {r.status === "DRAFT" && "This request hasn't been sent yet."}
          {r.status === "REVOKED" && "Access to this request has been revoked."}
        </p>
        <div className="mt-3 flex items-center gap-2">
          {["SUBMITTED", "REVISION_SUBMITTED"].includes(r.status) && (
            <>
              <MicroButton variant="accent" onClick={onRequestChanges}>
                <Pencil className="w-3 h-3" aria-hidden="true" /> Request clarification
              </MicroButton>
              <MicroButton variant="accent" onClick={onApprove}>
                <Check className="w-3 h-3" aria-hidden="true" /> Approve
              </MicroButton>
            </>
          )}
          {r.status === "APPROVED" && (
            <MicroButton variant="accent" onClick={onProposal}>
              <Banknote className="w-3 h-3" aria-hidden="true" /> Create proposal
            </MicroButton>
          )}
        </div>
      </div>

      {bundle.proposals.length > 0 && (
        <div className="rounded-sm border border-[var(--bos-line)] p-4">
          <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-secondary)]">Proposals from this requirement</div>
          <ul className="space-y-1.5">
            {bundle.proposals.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 text-[12px]">
                <span className="text-[var(--bos-text-primary)] truncate">{p.title}</span>
                <span className="flex items-center gap-2 shrink-0">
                  {p.amount !== null && <span className="tabular-nums text-[var(--bos-text-secondary)]">₹{p.amount.toLocaleString("en-IN")}</span>}
                  <StatusChip status={p.status} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── Dialog (send / changes / revoke / proposal) ─────────────── */

function Dialog({
  kind,
  bundle,
  link,
  defaultEmail,
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
  const [section, setSection] = useState("");
  const [reason, setReason] = useState("");
  const [copied, setCopied] = useState(false);

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
    kind === "send" ? "Send requirement link"
    : kind === "remind" ? "Send reminder"
    : kind === "changes" ? "Request clarification"
    : kind === "revoke" ? "Revoke access"
    : "Create proposal from requirements";

  return (
    <div className="mt-3 rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-surface)]/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-secondary)]">{title}</span>
        <button type="button" onClick={onClose} aria-label="Close dialog" className="flex items-center justify-center w-6 h-6 rounded-sm text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)]">
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

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
              {!link && (
                <p className="mt-1 text-[10px] text-[var(--bos-text-tertiary)]">A fresh link will be generated on send.</p>
              )}
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
            <select value={section} onChange={(e) => setSection(e.target.value)} className={inputCls}>
              <option value="">Whole submission</option>
              {SECTIONS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.number} — {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="bos-label">Message to the client</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="e.g. Please provide more details about subscription billing in the Payments feature."
              className={cn(inputCls, "h-24 py-2 resize-none")}
            />
          </div>
          <div className="flex justify-end gap-2">
            <MicroButton onClick={onClose}>Cancel</MicroButton>
            <MicroButton variant="accent" disabled={busy || !message.trim()} onClick={() => onChanges({ section: section || null, message })}>
              {busy ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <Send className="w-3 h-3" aria-hidden="true" />} Send request
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
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="py-6 text-center text-[12px] text-[var(--bos-text-tertiary)]">{text}</p>;
}
