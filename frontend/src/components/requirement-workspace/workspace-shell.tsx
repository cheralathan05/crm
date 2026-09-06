"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSection, SECTIONS, sectionStates, type CompletionContext, type SectionDef } from "@/lib/requirement-config";
import { BusinessOSMark } from "@/components/business-os-mark";
import type { PublicBundle, PublicFeature, SaveState } from "./types";
import { Landing } from "./landing";
import { IntakeChooser } from "./intake-chooser";
import { DiscoveryStudio } from "@/components/discovery-studio/discovery-studio";
import type { DiscoverySessionDto } from "@/lib/discovery/discovery.types";
import { ProgressRail } from "./progress-rail";
import { MobileNav } from "./mobile-nav";
import { SaveIndicator } from "./save-indicator";
import { SectionFields } from "./fields";
import { UsersBuilder, ScopeBuilder, StakeholderBuilder } from "./builders";
import { FeatureDiscovery } from "./feature-discovery";
import { FileCenter } from "./file-center";
import { ReviewScreen } from "./review-screen";
import { SubmitScreen } from "./submit-screen";
import { SuccessScreen } from "./success-screen";
import { WorkspaceError } from "./workspace-error";

/* ────────────────────────────────────────────────────────────────
   REQUIREMENT WORKSPACE — SHELL
   Intelligent discovery studio + advanced technical intake.
──────────────────────────────────────────────────────────────── */

type Stage =
  | { kind: "section"; key: string }
  | { kind: "review" }
  | { kind: "submit" };

const DRAFT_PREFIX = "req-draft:";

export function WorkspaceShell({ token, initial }: { token: string; initial: PublicBundle }) {
  const [bundle, setBundle] = useState<PublicBundle>(initial);
  const [fatal, setFatal] = useState<string | null>(null);
  const [discoverySession, setDiscoverySession] = useState<DiscoverySessionDto | null>(null);
  const [view, setView] = useState<"landing" | "chooser" | "guided" | "flow" | "success">("chooser");
  const [stage, setStage] = useState<Stage>({ kind: "section", key: initial.request.currentSection || "business" });
  const [draft, setDraft] = useState<Record<string, Record<string, unknown>>>(initial.answers);
  const [features, setFeatures] = useState<PublicFeature[]>(initial.features);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [submittedInfo, setSubmittedInfo] = useState<{ reference: string; revision: number; resubmitted: boolean } | null>(null);
  const [openReply, setOpenReply] = useState(false);
  const [replyText, setReplyText] = useState("");

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<{ section: string; data: Record<string, unknown> } | null>(null);
  const featureTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFeatures = useRef<PublicFeature[] | null>(null);
  const flushSectionRef = useRef<(section: string, data: Record<string, unknown>) => Promise<void>>(async () => undefined);
  const flushFeaturesRef = useRef<() => Promise<void>>(async () => undefined);

  const requestId = bundle.request.reference;

  const completionCtx = useMemo<CompletionContext>(
    () => ({
      featureCount: features.length,
      mustHaveCount: features.filter((f) => f.priority === "MUST_HAVE").length,
      attachmentCount: bundle.attachments.length,
    }),
    [features, bundle.attachments.length],
  );

  const states = useMemo(() => sectionStates(draft, completionCtx), [draft, completionCtx]);

  /* ── Fresh load + resume ──────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/public/requirements/${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok || !data.ok) {
          if (data.code) setFatal(data.code);
          return;
        }
        if (cancelled) return;
        setBundle(data);
        setFeatures(data.features);

        // Restore any unsaved local drafts (crash / offline resilience).
        const restored: Record<string, Record<string, unknown>> = {};
        for (const s of SECTIONS) {
          try {
            const raw = localStorage.getItem(`${DRAFT_PREFIX}${requestId}:${s.key}`);
            if (raw && !data.answers[s.key]) {
              restored[s.key] = JSON.parse(raw);
            }
          } catch {
            /* ignore malformed backups */
          }
        }
        if (Object.keys(restored).length > 0) {
          setDraft((d) => ({ ...d, ...restored }));
        }

        const status = data.request.status;
        if (["SUBMITTED", "REVISION_SUBMITTED", "APPROVED"].includes(status)) {
          setView("success");
          setSubmittedInfo({
            reference: data.request.reference,
            revision: data.request.revision,
            resubmitted: status === "REVISION_SUBMITTED",
          });
        }

        // Also fetch Intelligent Discovery Session
        try {
          const discRes = await fetch(`/api/public/requirements/${encodeURIComponent(token)}/discovery`);
          const discData = await discRes.json();
          if (discRes.ok && discData.ok && discData.session) {
            setDiscoverySession(discData.session);
            if (discData.session.intakePath === "GUIDED" && discData.session.completeness > 0) {
              // Can continue directly or stay on chooser with resume
            }
          }
        } catch {
          /* ignore discovery fetch failure */
        }
      } catch {
        /* keep the server-rendered bundle on transient failures */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, requestId]);

  /* ── Section save engine ──────────────────────────────────── */

  const persistBackup = useCallback(
    (section: string, data: Record<string, unknown>) => {
      try {
        localStorage.setItem(`${DRAFT_PREFIX}${requestId}:${section}`, JSON.stringify(data));
      } catch {
        /* storage full or unavailable */
      }
    },
    [requestId],
  );

  const flushSection = useCallback(
    async (section: string, data: Record<string, unknown>) => {
      pendingSave.current = null;
      setSaveState("saving");
      try {
        const res = await fetch(`/api/public/requirements/${encodeURIComponent(token)}/answers`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section, data }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.message ?? "Save failed");
        try {
          localStorage.removeItem(`${DRAFT_PREFIX}${requestId}:${section}`);
        } catch {
          /* ignore */
        }
        setSaveState("saved");
        setLastSavedAt(Date.now());
        setBundle((b) => ({
          ...b,
          request: {
            ...b.request,
            completeness: json.completeness ?? b.request.completeness,
            readiness: json.readiness ?? b.request.readiness,
            currentSection: section,
            status: json.status ?? b.request.status,
          },
        }));
      } catch {
        setSaveState("offline");
        pendingSave.current = { section, data };
        if (retryTimer.current) clearTimeout(retryTimer.current);
        retryTimer.current = setTimeout(() => {
          if (pendingSave.current) {
            void flushSectionRef.current(pendingSave.current.section, pendingSave.current.data);
          }
        }, 8000);
      }
    },
    [token, requestId],
  );

  useEffect(() => {
    flushSectionRef.current = flushSection;
  }, [flushSection]);

  const scheduleSectionSave = useCallback(
    (section: string, data: Record<string, unknown>, immediate = false) => {
      pendingSave.current = { section, data };
      if (immediate) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        void flushSection(section, data);
        return;
      }
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setSaveState("dirty");
      saveTimer.current = setTimeout(() => {
        if (pendingSave.current) void flushSection(pendingSave.current.section, pendingSave.current.data);
      }, 900);
    },
    [flushSection],
  );

  /* ── Feature save engine ──────────────────────────────────── */

  const flushFeatures = useCallback(async () => {
    const payload = pendingFeatures.current;
    pendingFeatures.current = null;
    if (!payload) return;
    setSaveState("saving");
    try {
      const res = await fetch(`/api/public/requirements/${encodeURIComponent(token)}/features`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features: payload }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.message ?? "Save failed");
      setSaveState("saved");
      setLastSavedAt(Date.now());
      setBundle((b) => ({
        ...b,
        request: {
          ...b.request,
          completeness: json.completeness ?? b.request.completeness,
          readiness: json.readiness ?? b.request.readiness,
        },
      }));
    } catch {
      setSaveState("offline");
      pendingFeatures.current = payload;
      if (featureTimer.current) clearTimeout(featureTimer.current);
      featureTimer.current = setTimeout(() => {
        if (pendingFeatures.current) void flushFeaturesRef.current();
      }, 8000);
    }
  }, [token]);

  useEffect(() => {
    flushFeaturesRef.current = flushFeatures;
  }, [flushFeatures]);

  const scheduleFeatures = useCallback(
    (next: PublicFeature[], immediate = false) => {
      pendingFeatures.current = next;
      if (immediate) {
        if (featureTimer.current) clearTimeout(featureTimer.current);
        void flushFeatures();
        return;
      }
      if (featureTimer.current) clearTimeout(featureTimer.current);
      setSaveState("dirty");
      featureTimer.current = setTimeout(() => {
        if (pendingFeatures.current) void flushFeatures();
      }, 1200);
    },
    [flushFeatures],
  );

  const updateSectionData = useCallback(
    (section: string, patch: Record<string, unknown>, immediate = false) => {
      setDraft((d) => {
        const data = { ...(d[section] ?? {}), ...patch };
        persistBackup(section, data);
        scheduleSectionSave(section, data, immediate);
        return { ...d, [section]: data };
      });
    },
    [persistBackup, scheduleSectionSave],
  );

  const updateFeatures = useCallback(
    (next: PublicFeature[], immediate = false) => {
      setFeatures(next);
      scheduleFeatures(next, immediate);
    },
    [scheduleFeatures],
  );

  /* ── Navigation ───────────────────────────────────────────── */

  const continueStep = useCallback(() => {
    if (pendingSave.current) void flushSection(pendingSave.current.section, pendingSave.current.data);
    if (pendingFeatures.current) void flushFeatures();

    if (stage.kind === "section") {
      const idx = SECTIONS.findIndex((s) => s.key === stage.key);
      if (idx >= 0 && idx < SECTIONS.length - 1) {
        setStage({ kind: "section", key: SECTIONS[idx + 1].key });
      } else {
        setStage({ kind: "review" });
      }
      return;
    }
    if (stage.kind === "review") {
      setStage({ kind: "submit" });
    }
  }, [stage, flushSection, flushFeatures]);

  const backStep = useCallback(() => {
    if (stage.kind === "submit") {
      setStage({ kind: "review" });
      return;
    }
    if (stage.kind === "review") {
      setStage({ kind: "section", key: SECTIONS[SECTIONS.length - 1].key });
      return;
    }
    const idx = SECTIONS.findIndex((s) => s.key === stage.key);
    if (idx > 0) {
      setStage({ kind: "section", key: SECTIONS[idx - 1].key });
    } else {
      setView("chooser");
    }
  }, [stage]);

  const jumpTo = useCallback((key: string) => {
    setStage({ kind: "section", key });
  }, []);

  /* ── Cleanup timers on unmount ────────────────────────────── */
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
      if (featureTimer.current) clearTimeout(featureTimer.current);
    };
  }, []);

  /* ── Change request reply ─────────────────────────────────── */
  const sendReply = async () => {
    if (!replyText.trim()) return;
    const res = await fetch(`/api/public/requirements/${encodeURIComponent(token)}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: replyText.trim(), commentId: bundle.openChange?.id }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setBundle((b) => ({
        ...b,
        comments: [...b.comments, data.comment],
        openChange: null,
        hasOpenChanges: false,
      }));
      setReplyText("");
      setOpenReply(false);
    }
  };

  /* ── Derived ──────────────────────────────────────────────── */

  const sectionKey = stage.kind === "section" ? stage.key : null;
  const currentSection = sectionKey ? getSection(sectionKey) : null;
  const isLastSection = stage.kind === "section" && SECTIONS.findIndex((s) => s.key === stage.key) === SECTIONS.length - 1;
  const sectionIncomplete = currentSection ? !states[currentSection.key] : false;
  const usersForFeatures = useMemo(() => {
    const list = (draft.users as { users?: { name?: string }[] } | undefined)?.users;
    return Array.isArray(list) ? list.map((u) => u.name ?? "").filter(Boolean) : [];
  }, [draft.users]);

  if (fatal) {
    return <WorkspaceError code={fatal} />;
  }

  if (view === "success") {
    return (
      <SuccessScreen
        reference={submittedInfo?.reference ?? bundle.request.reference}
        revision={submittedInfo?.revision ?? bundle.request.revision}
        resubmitted={submittedInfo?.resubmitted ?? false}
      />
    );
  }

  if (view === "chooser") {
    return (
      <main className="min-h-dvh bg-[var(--bos-bg)] flex flex-col">
        <WorkspaceTopbar reference={bundle.request.reference} />
        <div className="flex-1 flex items-center justify-center">
          <IntakeChooser
            projectTitle={bundle.request.title}
            companyName={bundle.request.companyName}
            reference={bundle.request.reference}
            existingSession={discoverySession}
            onSelectTechnical={() => {
              setStage({ kind: "section", key: bundle.request.currentSection || "business" });
              setView("flow");
            }}
            onSelectGuided={async () => {
              setView("guided");
              if (!discoverySession) {
                try {
                  const res = await fetch(`/api/public/requirements/${encodeURIComponent(token)}/discovery`);
                  const data = await res.json();
                  if (data.ok && data.session) setDiscoverySession(data.session);
                } catch {
                  /* ignore */
                }
              }
            }}
            onResumeGuided={async () => {
              setView("guided");
              if (!discoverySession) {
                try {
                  const res = await fetch(`/api/public/requirements/${encodeURIComponent(token)}/discovery`);
                  const data = await res.json();
                  if (data.ok && data.session) setDiscoverySession(data.session);
                } catch {
                  /* ignore */
                }
              }
            }}
          />
        </div>
        <WorkspaceFooter />
      </main>
    );
  }

  if (view === "guided") {
    return (
      <main className="h-dvh bg-[var(--bos-bg)] flex flex-col overflow-hidden">
        <WorkspaceTopbar reference={bundle.request.reference}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setStage({ kind: "section", key: bundle.request.currentSection || "business" });
                setView("flow");
              }}
              className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] transition-colors px-2.5 py-1 rounded-sm border border-[var(--bos-line)] hover:bg-[var(--bos-surface)]"
            >
              Switch to Advanced Technical Intake →
            </button>
          </div>
        </WorkspaceTopbar>

        <div className="flex-1 min-h-0 overflow-hidden">
          {discoverySession ? (
            <DiscoveryStudio
              token={token}
              initialSession={discoverySession}
              onSwitchToTechnical={() => {
                setStage({ kind: "section", key: bundle.request.currentSection || "business" });
                setView("flow");
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--bos-accent)]" />
            </div>
          )}
        </div>
      </main>
    );
  }

  if (view === "landing") {
    return (
      <main className="min-h-dvh bg-[var(--bos-bg)] flex flex-col">
        <WorkspaceTopbar reference={bundle.request.reference} />
        <div className="flex-1">
          <Landing
            bundle={bundle}
            onBegin={() => setView("chooser")}
            onResume={() => setView("chooser")}
          />
        </div>
        <WorkspaceFooter />
      </main>
    );
  }

  const isReview = stage.kind === "review";
  const isSubmit = stage.kind === "submit";

  return (
    <main className="min-h-dvh bg-[var(--bos-bg)] flex flex-col">
      <WorkspaceTopbar reference={bundle.request.reference}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView("guided")}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] text-[11px] font-mono hover:bg-[var(--bos-accent)] hover:text-white transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            <span>Open Discovery Studio</span>
          </button>
          <SaveIndicator state={saveState} lastSavedAt={lastSavedAt} />
        </div>
      </WorkspaceTopbar>

      <MobileNav
        current={stage.kind === "section" ? stage.key : "review"}
        states={states}
        completeness={bundle.request.completeness}
        onJump={jumpTo}
      />

      {/* Clarification banner */}
      {bundle.openChange && !isSubmit && (
        <div className="border-b border-[var(--bos-warning)]/25 bg-[var(--bos-warning)]/6">
          <div className="mx-auto w-full max-w-5xl px-5 sm:px-8 py-4">
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bos-warning)]/15 text-[var(--bos-warning)] shrink-0">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-warning)]">
                  Additional information required
                </div>
                <p className="mt-1 text-[13px] text-[var(--bos-text-primary)]">{bundle.openChange.message}</p>
                {bundle.openChange.section && (
                  <p className="mt-0.5 text-[11px] text-[var(--bos-text-tertiary)]">
                    {getSection(bundle.openChange.section)?.label ?? bundle.openChange.section} section
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (bundle.openChange?.section) jumpTo(bundle.openChange.section);
                  setOpenReply((o) => !o);
                }}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-sm bg-[var(--bos-accent)] text-white text-[12px] font-medium hover:bg-[var(--bos-accent-hover)] shrink-0 transition-colors duration-150"
              >
                Provide information
              </button>
            </div>
            {openReply && (
              <div className="mt-3 flex items-start gap-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Reply to the team (optional)…"
                  rows={2}
                  className="flex-1 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] px-3 py-2 text-[13px] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] transition-colors duration-150"
                />
                <button
                  type="button"
                  onClick={() => void sendReply()}
                  disabled={!replyText.trim()}
                  className="inline-flex items-center h-10 px-3 rounded-sm bg-[var(--bos-accent)] text-white text-[12px] font-medium disabled:opacity-40 hover:bg-[var(--bos-accent-hover)] transition-colors duration-150"
                >
                  Reply
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 w-full">
        <div className="mx-auto w-full max-w-5xl px-5 sm:px-8 py-8 flex gap-10">
          <ProgressRail
            current={stage.kind === "section" ? stage.key : "review"}
            states={states}
            completeness={bundle.request.completeness}
            onJump={jumpTo}
          />

          <div key={stage.kind === "section" ? stage.key : stage.kind} className="req-enter flex-1 min-w-0 pb-24 lg:pb-8">
            {sectionKey && currentSection && (
              <>
                <div className="mb-8">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] tracking-[0.14em] text-[var(--bos-accent)]">{currentSection.number}</span>
                    <span className="h-px flex-1 bg-[var(--bos-line)]" aria-hidden="true" />
                    {states[currentSection.key] ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--bos-success)]">
                        <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Complete
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)]">In progress</span>
                    )}
                  </div>
                  <h1 className="mt-3 text-2xl sm:text-[28px] font-semibold tracking-tight text-[var(--bos-text-primary)]">
                    {currentSection.title}
                  </h1>
                  <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[var(--bos-text-secondary)]">{currentSection.intro}</p>
                </div>

                <RenderSection
                  stageKey={sectionKey}
                  section={currentSection}
                  data={draft[sectionKey] ?? {}}
                  onChange={(patch, immediate) => updateSectionData(sectionKey, patch, immediate)}
                  projectType={bundle.request.projectType}
                  features={features}
                  onFeaturesChange={updateFeatures}
                  users={usersForFeatures}
                  contacts={bundle.contacts}
                  attachments={bundle.attachments}
                  token={token}
                  onUploaded={(file) => setBundle((b) => ({ ...b, attachments: [file, ...b.attachments] }))}
                  onRemoved={(fileId) => setBundle((b) => ({ ...b, attachments: b.attachments.filter((a) => a.id !== fileId) }))}
                  onStateChange={(completeness, readiness) =>
                    setBundle((b) => ({ ...b, request: { ...b.request, completeness, readiness } }))
                  }
                />
              </>
            )}

            {isReview && <ReviewScreen bundle={{ ...bundle, features, answers: draft }} onEdit={jumpTo} />}
            {isSubmit && (
              <SubmitScreen
                bundle={{ ...bundle, features, answers: draft }}
                token={token}
                onBack={backStep}
                onSubmitted={(reference, revision) => {
                  setSubmittedInfo({ reference, revision, resubmitted: bundle.request.status === "CHANGES_REQUESTED" });
                  setView("success");
                }}
              />
            )}

            {!isSubmit && (
              <div className="mt-10 pt-5 border-t border-[var(--bos-line)]">
                {sectionIncomplete && stage.kind === "section" && (
                  <p className="mb-3 text-[11px] text-[var(--bos-text-tertiary)]">
                    This section is optional to finish now — you can come back to it any time.
                  </p>
                )}
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={backStep}
                    className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-sm text-[12px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)] transition-colors duration-150"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={continueStep}
                    className={cn(
                      "inline-flex items-center gap-2 h-11 px-5 rounded-sm text-[13px] font-medium transition-colors duration-150",
                      isReview || isLastSection
                        ? "bg-[var(--bos-accent)] text-white hover:bg-[var(--bos-accent-hover)]"
                        : "border border-[var(--bos-line-strong)] text-[var(--bos-text-primary)] hover:border-[var(--bos-border-strong)]",
                    )}
                  >
                    {isReview ? "Continue to submission" : isLastSection ? "Review your project" : "Continue"}
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <WorkspaceFooter />
    </main>
  );
}

/* ── Section renderer ────────────────────────────────────────── */

function RenderSection({
  stageKey,
  section,
  data,
  onChange,
  projectType,
  features,
  onFeaturesChange,
  users,
  contacts,
  attachments,
  token,
  onUploaded,
  onRemoved,
  onStateChange,
}: {
  stageKey: string;
  section: SectionDef;
  data: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>, immediate?: boolean) => void;
  projectType: string;
  features: PublicFeature[];
  onFeaturesChange: (f: PublicFeature[], immediate?: boolean) => void;
  users: string[];
  contacts: PublicBundle["contacts"];
  attachments: PublicBundle["attachments"];
  token: string;
  onUploaded: (file: PublicBundle["attachments"][number]) => void;
  onRemoved: (fileId: string) => void;
  onStateChange: (completeness: number, readiness: number) => void;
}) {
  switch (stageKey) {
    case "users":
      return <UsersBuilder value={data.users} onChange={(d) => onChange({ users: d.users }, true)} />;
    case "scope":
      return <ScopeBuilder value={data} onChange={(d) => onChange(d, true)} />;
    case "features":
      return (
        <FeatureDiscovery
          projectType={projectType}
          features={features}
          users={users}
          onChange={(f, immediate) => onFeaturesChange(f, immediate)}
        />
      );
    case "stakeholders":
      return <StakeholderBuilder value={data} onChange={(d) => onChange(d, true)} contacts={contacts} />;
    case "files":
      return (
        <FileCenter
          token={token}
          attachments={attachments}
          onUploaded={onUploaded}
          onRemoved={onRemoved}
          onStateChange={onStateChange}
        />
      );
    default:
      return (
        <SectionFields
          section={section}
          data={data}
          onChange={(k, v) => onChange({ [k]: v })}
          idPrefix={`sec-${stageKey}`}
        />
      );
  }
}

/* ── Top bar ────────────────────────────────────────────────── */

function WorkspaceTopbar({ reference, children }: { reference: string; children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 bg-[var(--bos-bg)]/95 backdrop-blur-sm border-b border-[var(--bos-line)]">
      <div className="mx-auto w-full max-w-5xl px-5 sm:px-8 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <BusinessOSMark size="sm" />
          <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)] truncate">
            Project requirements
          </span>
          <span className="text-[10px] font-mono tracking-[0.08em] text-[var(--bos-text-tertiary)] truncate">{reference}</span>
        </div>
        {children}
      </div>
    </header>
  );
}

function WorkspaceFooter() {
  return (
    <footer className="border-t border-[var(--bos-line)] py-5">
      <div className="mx-auto w-full max-w-5xl px-5 sm:px-8 flex items-center justify-between text-[10px] text-[var(--bos-text-tertiary)]">
        <span>Your information is stored securely and only shared with the team that invited you.</span>
        <span className="font-mono uppercase tracking-[0.1em] hidden sm:inline">Business OS</span>
      </div>
    </footer>
  );
}
