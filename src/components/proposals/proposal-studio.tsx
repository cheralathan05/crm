"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  Eye,
  EyeOff,
  FileText,
  History,
  Loader2,
  Mail,
  Maximize2,
  Minimize2,
  RefreshCw,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Wand2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  amountLabel,
  computeProposalQuality,
  SOURCE_LABELS,
  type ProposalBlock,
  type ProposalDoc,
  type ProposalSection,
  type ProposalSource,
} from "@/lib/proposal-doc";
import type { ProposalDeliveryBundle } from "@/lib/proposal-delivery";
import { StatusChip } from "@/components/clients/kit";

/* ────────────────────────────────────────────────────────────────
   PROPOSAL STUDIO — A4 document editor
   Left: section navigator · Center: live A4 canvas · Right: section
   settings (content / layout / data source / AI assist). The document
   is the same structure that finalizes into the PDF — what you see
   is what ships. Every section carries its real data source.
──────────────────────────────────────────────────────────────── */

type StudioInitial = {
  proposal: {
    id: string;
    title: string;
    amount: number | null;
    currency: string;
    status: string;
    version: number;
    reference: string | null;
    pdfPath: string | null;
    pdfPages: number | null;
    finalizedAt: string | null;
    createdAt: string;
  };
  document: ProposalDoc;
  requirement: {
    id: string;
    reference: string;
    title: string;
    status: string;
    completeness: number;
    readiness: number;
    approvedAt: string | null;
    responderName: string | null;
  } | null;
  client: { id: string; companyName: string; industry: string | null; email: string | null } | null;
  workspace: { companyName: string; email: string | null; phone: string | null; website: string | null };
  delivery: ProposalDeliveryBundle;
};

const ZOOMS = [0.5, 0.75, 1, 1.25] as const;
const PANEL_TABS = ["proposal", "content", "layout", "data", "ai"] as const;
type PanelTab = (typeof PANEL_TABS)[number];

const SOURCE_DOT: Record<ProposalSource, string> = {
  REQUIREMENT: "bg-[var(--bos-accent)]",
  CLIENT: "bg-[var(--bos-info)]",
  WORKSPACE: "bg-[var(--bos-success)]",
  MANUAL: "bg-[var(--bos-text-tertiary)]",
  AI_DRAFT: "bg-[var(--bos-warning)]",
};

const GENERATION_STEPS = [
  "Preparing content",
  "Applying Business OS template",
  "Rendering pages",
  "Validating layout",
  "Generating PDF",
  "Saving document",
];

const AI_QUICK_ACTIONS = ["Improve wording", "Make more professional", "Summarize scope", "Expand with facts"];

export function ProposalStudio({ initial }: { initial: StudioInitial }) {
  const [doc, setDoc] = useState<ProposalDoc>(initial.document);
  const [proposalMeta, setProposalMeta] = useState(initial.proposal);
  const [activeSection, setActiveSection] = useState<string>("cover");
  const [zoom, setZoom] = useState<(typeof ZOOMS)[number]>(0.75);
  const [fullscreen, setFullscreen] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>("content");
  const [saving, setSaving] = useState(false);
  const [savedLabel, setSavedLabel] = useState<string>("Saved");
  const [error, setError] = useState<string | null>(null);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiState, setAiState] = useState<"idle" | "streaming" | "draft">("idle");
  const [aiText, setAiText] = useState("");
  const [finalize, setFinalize] = useState<null | "check" | "generating" | "ready">(null);
  const [finalizeInfo, setFinalizeInfo] = useState<{ reference: string | null; pages: number; generatedAt: string } | null>(null);
  const [genStep, setGenStep] = useState(0);
  const [delivery, setDelivery] = useState<ProposalDeliveryBundle>(initial.delivery);
  const [deliveryPanel, setDeliveryPanel] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion();

  const quality = useMemo(() => computeProposalQuality(doc), [doc]);
  const pages = useMemo(() => doc.sections.filter((s) => s.visible), [doc.sections]);
  const pageIdx = Math.max(0, pages.findIndex((s) => s.id === activeSection));
  const page = pages[pageIdx] ?? pages[0];
  const activeDef = doc.sections.find((s) => s.id === activeSection) ?? doc.sections[0];

  const goToPage = (idx: number) => {
    const target = pages[Math.max(0, Math.min(pages.length - 1, idx))];
    if (target) setActiveSection(target.id);
  };

  /* ── Persist ─────────────────────────────────────────────── */

  const persist = useCallback(
    (next: ProposalDoc, label = "Saved") => {
      setSaving(true);
      setSavedLabel("Saving…");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/proposals/${initial.proposal.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ document: next }),
          });
          const data = await res.json();
          if (!res.ok || !data.ok) throw new Error(data.message ?? "Save failed");
          setSavedLabel(label);
        } catch {
          setSavedLabel("Save failed — retrying");
          setError("We couldn't save this change. Your work is still on screen — it will retry automatically.");
        } finally {
          setSaving(false);
        }
      }, 700);
    },
    [initial.proposal.id],
  );

  const updateDoc = useCallback(
    (updater: (d: ProposalDoc) => ProposalDoc, label?: string) => {
      setDoc((prev) => {
        const next = updater(prev);
        persist(next, label);
        return next;
      });
    },
    [persist],
  );

  const updateSection = useCallback(
    (id: string, patch: Partial<ProposalSection>) => {
      updateDoc((d) => ({
        ...d,
        sections: d.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      }));
    },
    [updateDoc],
  );

  const updateBlock = useCallback(
    (sectionId: string, blockIndex: number, patch: Partial<ProposalBlock>) => {
      updateDoc((d) => ({
        ...d,
        sections: d.sections.map((s) =>
          s.id === sectionId
            ? { ...s, blocks: s.blocks.map((b, i) => (i === blockIndex ? { ...b, ...patch } as ProposalBlock : b)) }
            : s,
        ),
      }));
    },
    [updateDoc],
  );

  const saveProposalMeta = useCallback(
    (patch: { title?: string; amount?: number | null }) => {
      setSaving(true);
      void (async () => {
        try {
          const res = await fetch(`/api/proposals/${initial.proposal.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          });
          const data = await res.json();
          if (!res.ok || !data.ok) throw new Error(data.message ?? "Save failed");
          setProposalMeta((p) => ({ ...p, ...patch }));
          setSavedLabel("Saved");
        } catch {
          setSavedLabel("Save failed");
        } finally {
          setSaving(false);
        }
      })();
    },
    [initial.proposal.id],
  );

  /* ── AI assist ───────────────────────────────────────────── */

  const runAi = async () => {
    if (!aiInstruction.trim() || !activeDef) return;
    setAiState("streaming");
    setAiText("");
    setError(null);
    try {
      const res = await fetch(`/api/proposals/${initial.proposal.id}/assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: activeDef.id, instruction: aiInstruction }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "AI assist failed.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setAiText(text);
      }
      if (text.trim()) setAiState("draft");
      else setAiState("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI assist failed.");
      setAiState("idle");
    }
  };

  const insertAiDraft = () => {
    if (!activeDef || !aiText.trim()) return;
    updateDoc((d) => ({
      ...d,
      sections: d.sections.map((s) =>
        s.id === activeDef.id
          ? {
              ...s,
              source: "AI_DRAFT",
              blocks: [{ type: "paragraph", text: aiText.trim() }],
            }
          : s,
      ),
    }), "Saved");
    setAiState("idle");
    setAiText("");
  };

  /* ── Finalize ────────────────────────────────────────────── */

  const runFinalize = async () => {
    setFinalize("generating");
    setGenStep(0);
    const timer = window.setInterval(() => {
      setGenStep((s) => Math.min(s + 1, GENERATION_STEPS.length - 1));
    }, 320);
    try {
      const res = await fetch(`/api/proposals/${initial.proposal.id}/finalize`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Finalization failed.");
      setFinalizeInfo({
        reference: data.proposal?.reference ?? null,
        pages: data.pages ?? 0,
        generatedAt: new Date().toISOString(),
      });
      setProposalMeta((p) => ({ ...p, pdfPath: data.proposal?.pdfPath ?? null, pdfPages: data.pages ?? null, finalizedAt: data.proposal?.finalizedAt ?? null }));
      setFinalize("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Finalization failed.");
      setFinalize("check");
    } finally {
      window.clearInterval(timer);
    }
  };

  /* ── Delivery ──────────────────────────────────────────────── */

  const refreshDelivery = useCallback(async () => {
    const res = await fetch(`/api/proposals/${initial.proposal.id}/delivery`);
    if (!res.ok) return;
    const data = await res.json();
    if (data?.ok) {
      setDelivery(data);
      setProposalMeta((p) => ({ ...p, status: data.proposal?.status ?? p.status }));
    }
  }, [initial.proposal.id]);

  const runSend = async () => {
    setSending(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch(`/api/proposals/${initial.proposal.id}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message ?? "The proposal could not be sent.");
      if (data.dev) {
        setSendOpen(false);
        setNotice(`⚠ ${data.message}`);
      } else if (data.sent) {
        setSendOpen(false);
        setNotice("The proposal was sent to the client.");
      } else {
        // Real delivery failure — keep the dialog open so it can be retried.
        setError(data.message ?? "The proposal email could not be delivered.");
        setSending(false);
        return;
      }
      await refreshDelivery();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The proposal could not be sent.");
    } finally {
      setSending(false);
    }
  };

  const decideChange = async (crId: string, action: "accept" | "decline" | "clarification", response?: string) => {
    setNotice(null);
    try {
      const res = await fetch(`/api/proposals/change-requests/${crId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Decision could not be saved.");
      await refreshDelivery();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Decision could not be saved.");
    }
  };

  const createRevision = async () => {
    setNotice(null);
    try {
      const res = await fetch(`/api/proposals/${initial.proposal.id}/create-revision`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message ?? "The revision could not be started.");
      setProposalMeta((p) => ({ ...p, version: data.proposal?.version ?? p.version, status: data.proposal?.status ?? p.status }));
      setNotice(`Revision v${data.proposal?.version ?? ""} started — edit the document and finalize it again.`);
      await refreshDelivery();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The revision could not be started.");
    }
  };

  const inputCls =
    "w-full h-9 px-3 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[13px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] transition-colors duration-150";

  if (!page || !activeDef) {
    return (
      <div className="p-10 text-center text-[13px] text-[var(--bos-text-secondary)]">
        This proposal has no visible sections yet. Rebuild it from the approved requirement.
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col">
      {/* ═══ Top bar ═══ */}
      <div className="border-b border-[var(--bos-line)] bg-[var(--bos-bg)]/90 backdrop-blur-sm px-4 sm:px-5 py-2.5 flex items-center gap-3 flex-wrap">
        <Link href="/proposals" className="flex items-center gap-1 text-[11px] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] transition-colors duration-150">
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Proposals
        </Link>
        <span className="w-px h-4 bg-[var(--bos-line-strong)]" aria-hidden="true" />
        <span className="font-mono text-[10px] tracking-[0.1em] text-[var(--bos-text-tertiary)]">{proposalMeta.reference ?? "PROP"}</span>
        <span className="text-[14px] font-semibold tracking-tight text-[var(--bos-text-primary)] truncate max-w-[320px]">{doc.meta.title}</span>
        <StatusChip status={proposalMeta.status} />
        <span className={cn("text-[10px] font-mono", saving ? "text-[var(--bos-text-tertiary)]" : "text-[var(--bos-success)]")}>
          {savedLabel}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Zoom */}
          <div className="relative">
            <select
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value) as (typeof ZOOMS)[number])}
              aria-label="Zoom"
              className="appearance-none h-7 pl-2.5 pr-7 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] text-[11px] text-[var(--bos-text-secondary)] outline-none hover:border-[var(--bos-border-strong)] cursor-pointer"
            >
              {ZOOMS.map((z) => (
                <option key={z} value={z}>{Math.round(z * 100)}%</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--bos-text-tertiary)] pointer-events-none" aria-hidden="true" />
          </div>

          {/* Page nav */}
          <div className="flex items-center gap-1 text-[11px] text-[var(--bos-text-tertiary)]">
            <button
              type="button"
              onClick={() => goToPage(pageIdx - 1)}
              disabled={pageIdx === 0}
              className="flex items-center justify-center w-7 h-7 rounded-sm border border-[var(--bos-line)] hover:border-[var(--bos-border-strong)] disabled:opacity-30"
              aria-label="Previous page"
            >
              <ArrowLeft className="w-3 h-3" aria-hidden="true" />
            </button>
            <span className="tabular-nums">
              Page {pageIdx + 1} / {pages.length}
            </span>
            <button
              type="button"
              onClick={() => goToPage(pageIdx + 1)}
              disabled={pageIdx >= pages.length - 1}
              className="flex items-center justify-center w-7 h-7 rounded-sm border border-[var(--bos-line)] hover:border-[var(--bos-border-strong)] disabled:opacity-30"
              aria-label="Next page"
            >
              <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setFullscreen(!fullscreen)}
            className="flex items-center justify-center w-7 h-7 rounded-sm border border-[var(--bos-line)] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:border-[var(--bos-border-strong)]"
            aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {fullscreen ? <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" /> : <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setPanelTab("ai");
              window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
            }}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)] text-[11px] font-medium text-[var(--bos-accent)] hover:bg-[var(--bos-accent-subtle)]/70 transition-colors duration-150"
          >
            <Sparkles className="w-3 h-3" aria-hidden="true" /> AI assist
          </button>

          {proposalMeta.finalizedAt ? (
            <a
              href={`/api/proposals/${initial.proposal.id}/pdf`}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border border-[var(--bos-line)] text-[11px] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)] transition-colors duration-150"
            >
              <FileText className="w-3 h-3" aria-hidden="true" /> View PDF
            </a>
          ) : (
            <button
              type="button"
              onClick={() => setFinalize("check")}
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-sm bg-[var(--bos-accent)] text-white text-[11px] font-medium hover:bg-[var(--bos-accent-hover)] transition-colors duration-150"
            >
              <Banknote className="w-3 h-3" aria-hidden="true" /> Finalize
            </button>
          )}

          {proposalMeta.finalizedAt && !["APPROVED", "REJECTED"].includes(proposalMeta.status) && (
            <button
              type="button"
              onClick={() => setSendOpen(true)}
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-sm bg-[var(--bos-accent)] text-white text-[11px] font-medium hover:bg-[var(--bos-accent-hover)] transition-colors duration-150"
            >
              <Send className="w-3 h-3" aria-hidden="true" /> Send
            </button>
          )}

          <button
            type="button"
            onClick={() => setDeliveryPanel(true)}
            className={cn(
              "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border text-[11px] font-medium transition-colors duration-150",
              delivery.proposal.sentAt
                ? "border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] hover:bg-[var(--bos-accent-subtle)]/70"
                : "border-[var(--bos-line)] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)]",
            )}
          >
            <ClipboardList className="w-3 h-3" aria-hidden="true" /> Delivery
          </button>
        </div>
      </div>

      {notice && (
        <div className="mx-4 mt-3 rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)]/50 px-3 py-2 text-[11px] text-[var(--bos-text-secondary)] flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-[var(--bos-accent)] shrink-0" aria-hidden="true" />
          {notice}
          <button type="button" onClick={() => setNotice(null)} className="ml-auto text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]">
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>
      )}

      {error && (
        <div className="mx-4 mt-3 rounded-sm border border-[var(--bos-warning)]/30 bg-[var(--bos-warning)]/6 px-3 py-2 text-[11px] text-[var(--bos-text-secondary)] flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-[var(--bos-warning)] shrink-0" aria-hidden="true" />
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-auto text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]">
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* ═══ Body ═══ */}
      <div className={cn("flex-1 grid", fullscreen ? "grid-cols-1" : "lg:grid-cols-[220px_minmax(0,1fr)_300px]")}>
        {/* Left — navigator */}
        {!fullscreen && (
          <aside className="hidden lg:block border-r border-[var(--bos-line)] bg-[var(--bos-surface)]/30">
            <div className="px-3.5 pt-3 pb-2 text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)]">Proposal</div>
            <nav className="px-2 pb-3 space-y-px" aria-label="Proposal sections">
              {doc.sections.map((s) => {
                const isActive = activeSection === s.id;
                return (
                  <div key={s.id} className="group flex items-center">
                    <button
                      type="button"
                      onClick={() => setActiveSection(s.id)}
                      className={cn(
                        "flex-1 flex items-center gap-2 h-8 px-2 rounded-sm text-[12px] transition-colors duration-150 min-w-0",
                        isActive
                          ? "bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] font-medium"
                          : s.visible
                            ? "text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)] hover:text-[var(--bos-text-primary)]"
                            : "text-[var(--bos-text-tertiary)] opacity-60 hover:opacity-100 hover:bg-[var(--bos-overlay)]",
                      )}
                    >
                      <span className="font-mono text-[9px] text-[var(--bos-text-tertiary)] shrink-0">{s.number === "—" ? "·" : s.number}</span>
                      <span className="flex-1 truncate">{s.title}</span>
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", SOURCE_DOT[s.source])} title={SOURCE_LABELS[s.source]} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSection(s.id, { visible: !s.visible })}
                      className="flex items-center justify-center w-6 h-8 text-[var(--bos-text-tertiary)] opacity-0 group-hover:opacity-100 hover:text-[var(--bos-text-primary)] transition-opacity duration-150"
                      aria-label={s.visible ? "Hide section" : "Show section"}
                      title={s.visible ? "Hide from proposal" : "Show in proposal"}
                    >
                      {s.visible ? <Eye className="w-3 h-3" aria-hidden="true" /> : <EyeOff className="w-3 h-3" aria-hidden="true" />}
                    </button>
                  </div>
                );
              })}
            </nav>
            <div className="px-3.5 pb-4 space-y-2 border-t border-[var(--bos-line)] pt-3">
              <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-secondary)]">Quality</div>
              <div className="flex items-center gap-2">
                <span className={cn("text-[15px] font-semibold tabular-nums", quality.total >= 80 ? "text-[var(--bos-success)]" : quality.total >= 50 ? "text-[var(--bos-warning)]" : "text-[var(--bos-error)]")}>
                  {quality.total}
                </span>
                <span className="text-[10px] text-[var(--bos-text-tertiary)]">/ 100</span>
              </div>
              <div className="space-y-1">
                {quality.items.map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5 text-[10px]">
                    <span className={cn("w-3.5 h-3.5 flex items-center justify-center rounded-full", item.ok ? "bg-[var(--bos-success)]/15 text-[var(--bos-success)]" : "bg-[var(--bos-warning)]/15 text-[var(--bos-warning)]")}>
                      {item.ok ? <Check className="w-2 h-2" aria-hidden="true" /> : <span className="text-[8px]">!</span>}
                    </span>
                    <span className="text-[var(--bos-text-tertiary)] truncate">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* Center — A4 canvas */}
        <main className="min-w-0 bg-[var(--bos-surface)]/40 relative">
          <div className="px-4 sm:px-8 py-8 flex flex-col items-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${page.id}-${pageIdx}`}
                initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                className="origin-top"
                style={{ transform: `scale(${zoom})` }}
              >
                <PageView section={page} doc={doc} pageNumber={pageIdx + 1} totalPages={pages.length} onSelectSection={setActiveSection} />
              </motion.div>
            </AnimatePresence>
            <div className="mt-6 flex items-center gap-3 text-[10px] text-[var(--bos-text-tertiary)]">
              <span className="flex items-center gap-1.5">
                <span className={cn("w-1.5 h-1.5 rounded-full", SOURCE_DOT[page.source])} aria-hidden="true" />
                {SOURCE_LABELS[page.source]}
              </span>
              <span className="w-px h-3 bg-[var(--bos-line-strong)]" aria-hidden="true" />
              <span>A4 · {proposalMeta.reference ?? "PROP"}</span>
            </div>
          </div>
        </main>

        {/* Right — section settings */}
        {!fullscreen && (
          <aside className="hidden lg:block border-l border-[var(--bos-line)] bg-[var(--bos-surface)]/30">
            <div className="px-3.5 pt-3 pb-2 flex items-center justify-between">
              <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)]">Section settings</span>
              <span className={cn("w-1.5 h-1.5 rounded-full", SOURCE_DOT[activeDef.source])} aria-hidden="true" />
            </div>

            {/* Tabs */}
            <div className="flex gap-0.5 px-2.5 pb-2 overflow-x-auto no-scrollbar">
              {PANEL_TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPanelTab(t)}
                  className={cn(
                    "shrink-0 px-2 h-6 rounded-sm text-[10px] font-medium uppercase tracking-[0.08em] transition-colors duration-150",
                    panelTab === t ? "bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)]" : "text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-secondary)]",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="px-3.5 pb-5 space-y-4">
              {panelTab === "proposal" && (
                <div className="space-y-3">
                  <div>
                    <label className="bos-label">Proposal title</label>
                    <input
                      value={doc.meta.title}
                      onChange={(e) => updateDoc((d) => ({ ...d, meta: { ...d.meta, title: e.target.value } }))}
                      className={inputCls}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="bos-label">Amount</label>
                      <input
                        type="number"
                        value={doc.meta.amount ?? ""}
                        placeholder="e.g. 250000"
                        onChange={(e) => {
                          const v = e.target.value;
                          updateDoc((d) => ({ ...d, meta: { ...d.meta, amount: v === "" ? null : Number(v), amountLabel: amountLabel(v === "" ? null : Number(v)) } }));
                          saveProposalMeta({ amount: v === "" ? null : Number(v) });
                        }}
                        className={cn(inputCls, "tabular-nums")}
                      />
                    </div>
                    <div>
                      <label className="bos-label">Currency</label>
                      <div className={cn(inputCls, "flex items-center text-[13px] text-[var(--bos-text-secondary)]")}>{doc.meta.currency}</div>
                    </div>
                  </div>
                  <div>
                    <label className="bos-label">Timeline</label>
                    <div className={cn(inputCls, "flex items-center text-[13px] text-[var(--bos-text-secondary)]")}>{doc.meta.timelineLabel || "—"}</div>
                  </div>
                  <div>
                    <label className="bos-label">Prepared by</label>
                    <div className={cn(inputCls, "flex items-center text-[13px] text-[var(--bos-text-secondary)]")}>{doc.meta.preparedBy || "—"}</div>
                  </div>
                </div>
              )}

              {panelTab === "content" && (
                <div className="space-y-3">
                  <div>
                    <label className="bos-label">Section title</label>
                    <input
                      value={activeDef.title}
                      onChange={(e) => updateSection(activeDef.id, { title: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  {activeDef.blocks.length === 0 && (
                    <p className="text-[11px] text-[var(--bos-text-tertiary)]">
                      This section has no editable content yet — it is generated from {SOURCE_LABELS[activeDef.source].toLowerCase()} data.
                    </p>
                  )}
                  {activeDef.blocks.map((b, i) => (
                    <div key={i}>
                      {b.type === "paragraph" ? (
                        <div>
                          <label className="bos-label">Paragraph {i + 1}</label>
                          <textarea
                            value={b.text}
                            rows={Math.max(3, Math.ceil(b.text.length / 60))}
                            onChange={(e) => updateBlock(activeDef.id, i, { text: e.target.value })}
                            className={cn(inputCls, "h-auto py-2 resize-y leading-relaxed")}
                          />
                        </div>
                      ) : b.type === "list" ? (
                        <div>
                          <label className="bos-label">List {i + 1} — one per line</label>
                          <textarea
                            value={b.items.join("\n")}
                            rows={Math.max(3, b.items.length)}
                            onChange={(e) => updateBlock(activeDef.id, i, { items: e.target.value.split("\n") })}
                            className={cn(inputCls, "h-auto py-2 resize-y leading-relaxed")}
                          />
                        </div>
                      ) : b.type === "table" ? (
                        <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/50 px-3 py-2.5">
                          <div className="text-[10px] font-medium text-[var(--bos-text-secondary)]">Table — {b.headers.join(" · ")}</div>
                          <div className="mt-1 text-[10px] text-[var(--bos-text-tertiary)]">
                            {b.rows.length} rows · bound from {SOURCE_LABELS[activeDef.source].toLowerCase()}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-[var(--bos-text-tertiary)]">Spacer</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {panelTab === "layout" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-sm border border-[var(--bos-line)] px-3 py-2.5">
                    <div>
                      <div className="text-[12px] font-medium text-[var(--bos-text-primary)]">Visible in proposal</div>
                      <div className="text-[10px] text-[var(--bos-text-tertiary)]">Included in the PDF and page count</div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={activeDef.visible}
                      onClick={() => updateSection(activeDef.id, { visible: !activeDef.visible })}
                      className={cn(
                        "relative w-8 h-4.5 rounded-full transition-colors duration-200",
                        activeDef.visible ? "bg-[var(--bos-accent)]" : "bg-[var(--bos-border-strong)]",
                      )}
                      style={{ height: 18 }}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all duration-200",
                          activeDef.visible ? "left-[16px]" : "left-0.5",
                        )}
                      />
                    </button>
                  </div>
                  <div className="rounded-sm border border-[var(--bos-line)] px-3 py-2.5">
                    <div className="text-[10px] font-medium text-[var(--bos-text-secondary)]">Source</div>
                    <div className="mt-0.5 text-[12px] text-[var(--bos-text-primary)]">{SOURCE_LABELS[activeDef.source]}</div>
                    <p className="mt-1 text-[10px] text-[var(--bos-text-tertiary)] leading-snug">
                      {activeDef.source === "MANUAL"
                        ? "This section is written by your team. Requirement-bound sections stay locked unless you replace them with an AI draft."
                        : activeDef.source === "AI_DRAFT"
                          ? "An AI draft replaced the original content — review it before finalizing."
                          : "Content flows from real data. Edits here are saved to the document."}
                    </p>
                  </div>
                  <div className="rounded-sm border border-[var(--bos-line)] px-3 py-2.5">
                    <div className="text-[10px] font-medium text-[var(--bos-text-secondary)]">Page position</div>
                    <div className="mt-0.5 text-[12px] text-[var(--bos-text-primary)]">Section {activeDef.number} of {doc.sections.filter((s) => s.visible).length}</div>
                  </div>
                </div>
              )}

              {panelTab === "data" && (
                <div className="space-y-3">
                  <div className="rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)]/40 px-3 py-2.5">
                    <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-accent)] mb-1">Data source</div>
                    <div className="text-[12px] font-medium text-[var(--bos-text-primary)]">{SOURCE_LABELS[activeDef.source]}</div>
                  </div>
                  <DataBinding sectionId={activeDef.id} />
                  {initial.requirement && (
                    <div className="rounded-sm border border-[var(--bos-line)] px-3 py-2.5">
                      <div className="text-[10px] font-medium text-[var(--bos-text-secondary)]">Approved requirement</div>
                      <div className="mt-0.5 text-[12px] text-[var(--bos-text-primary)]">{initial.requirement.title}</div>
                      <div className="text-[10px] text-[var(--bos-text-tertiary)]">
                        {initial.requirement.reference} · {initial.requirement.completeness}% complete
                      </div>
                    </div>
                  )}
                </div>
              )}

              {panelTab === "ai" && (
                <div className="space-y-3">
                  <div>
                    <label className="bos-label">What should the copilot do?</label>
                    <textarea
                      value={aiInstruction}
                      onChange={(e) => setAiInstruction(e.target.value)}
                      rows={3}
                      placeholder={`e.g. Improve the wording of ${activeDef.title}…`}
                      className={cn(inputCls, "h-20 py-2 resize-none")}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {AI_QUICK_ACTIONS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setAiInstruction(a.toLowerCase())}
                        className="px-2 py-1 rounded-sm border border-[var(--bos-line)] text-[10px] text-[var(--bos-text-secondary)] hover:border-[var(--bos-accent-ring)] hover:text-[var(--bos-accent)] transition-colors duration-150"
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => void runAi()}
                    disabled={aiState === "streaming" || !aiInstruction.trim()}
                    className="w-full inline-flex items-center justify-center gap-1.5 h-8 rounded-sm bg-[var(--bos-accent)] text-white text-[11px] font-medium hover:bg-[var(--bos-accent-hover)] disabled:opacity-40 transition-colors duration-150"
                  >
                    {aiState === "streaming" ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <Wand2 className="w-3 h-3" aria-hidden="true" />}
                    {aiState === "streaming" ? "Drafting…" : "Generate draft"}
                  </button>

                  <AnimatePresence>
                    {aiState !== "idle" && (
                      <motion.div
                        initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reducedMotion ? undefined : { opacity: 0 }}
                        className="rounded-sm border border-[var(--bos-warning)]/30 bg-[var(--bos-warning)]/5 p-3"
                      >
                        <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-warning)] mb-1.5">
                          <Sparkles className="w-3 h-3" aria-hidden="true" /> AI draft
                        </div>
                        <div className="text-[12px] text-[var(--bos-text-primary)] whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                          {aiText || "Drafting…"}
                        </div>
                        {aiState === "draft" && (
                          <div className="mt-2.5 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={insertAiDraft}
                              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-sm bg-[var(--bos-accent)] text-white text-[11px] font-medium hover:bg-[var(--bos-accent-hover)]"
                            >
                              <Check className="w-3 h-3" aria-hidden="true" /> Insert
                            </button>
                            <button
                              type="button"
                              onClick={() => { setAiState("idle"); setAiText(""); }}
                              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-sm border border-[var(--bos-line)] text-[11px] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)]"
                            >
                              <X className="w-3 h-3" aria-hidden="true" /> Reject
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <p className="text-[10px] text-[var(--bos-text-tertiary)] leading-snug">
                    The copilot drafts from this proposal&apos;s real data only — it never invents prices, dates or scope. Drafts are not saved until you insert them.
                  </p>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ═══ Finalize flows ═══ */}
      <AnimatePresence>
        {finalize === "check" && (
          <FinalCheck
            quality={quality}
            onClose={() => setFinalize(null)}
            onFinalize={() => void runFinalize()}
          />
        )}
        {finalize === "generating" && (
          <GeneratingOverlay step={genStep} />
        )}
        {finalize === "ready" && finalizeInfo && (
          <ReadyOverlay
            info={finalizeInfo}
            proposalId={initial.proposal.id}
            onClose={() => setFinalize(null)}
          />
        )}
        {sendOpen && (
          <SendDialog
            proposal={initial.proposal}
            client={initial.client}
            delivery={delivery}
            busy={sending}
            onClose={() => setSendOpen(false)}
            onSend={() => void runSend()}
          />
        )}
        {deliveryPanel && (
          <DeliveryPanel
            delivery={delivery}
            onClose={() => setDeliveryPanel(false)}
            onRefresh={() => void refreshDelivery()}
            onDecide={(crId, action, response) => void decideChange(crId, action, response)}
            onCreateRevision={() => void createRevision()}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══ A4 page renderer ═══ */

function PageView({
  section,
  doc,
  pageNumber,
  totalPages,
  onSelectSection,
}: {
  section: ProposalSection;
  doc: ProposalDoc;
  pageNumber: number;
  totalPages: number;
  onSelectSection: (id: string) => void;
}) {
  return (
    <div className="w-[660px] bg-white shadow-[0_2px_4px_rgba(26,23,20,0.06),0_12px_40px_rgba(26,23,20,0.1)] select-none">
      {/* Page body */}
      <div className="px-12 py-14 min-h-[700px] relative">
        {section.id === "cover" ? (
          <CoverPage section={section} doc={doc} />
        ) : section.id === "contents" ? (
          <ContentsPage doc={doc} onSelectSection={onSelectSection} />
        ) : (
          <BodyPage section={section} />
        )}
      </div>

      {/* Page footer */}
      <div className="px-12 pb-6 flex items-center justify-between text-[8px] font-mono uppercase tracking-[0.14em] text-[#9a948a]">
        <span>{doc.meta.clientName}</span>
        <span>{String(pageNumber).padStart(2, "0")} / {String(totalPages).padStart(2, "0")}</span>
        <span>{doc.meta.reference}</span>
      </div>
    </div>
  );
}

function CoverPage({ section, doc }: { section: ProposalSection; doc: ProposalDoc }) {
  const meta: Record<string, string> = {};
  let last: string | null = null;
  for (const b of section.blocks) {
    if (b.type !== "paragraph") continue;
    const t = b.text.trim();
    if (["Prepared for", "Prepared by", "Investment", "Timeline"].includes(t)) {
      last = t;
    } else if (last) {
      meta[last] = t;
      last = null;
    }
  }

  return (
    <div className="flex flex-col min-h-[580px]">
      <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#9a948a]">{doc.meta.preparedBy}</div>
      <div className="mt-20">
        <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-[#b5452a] font-semibold">Proposal</div>
        <h1 className="mt-3 text-[38px] font-bold leading-[1.1] tracking-tight text-[#1a1714]">{doc.meta.title}</h1>
        <div className="mt-5 text-[13px] text-[#6b655c]">
          Prepared for <span className="text-[#1a1714] font-medium">{doc.meta.clientName}</span>
        </div>
        <div className="text-[11px] text-[#9a948a] mt-1">
          {new Date(doc.meta.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      <div className="mt-auto pt-10">
        <div className="h-[3px] w-full bg-[#b5452a]" aria-hidden="true" />
        <div className="mt-8 grid grid-cols-3 gap-6">
          <MetaCell label="Investment" value={meta.Investment ?? doc.meta.amountLabel} />
          <MetaCell label="Timeline" value={meta.Timeline ?? doc.meta.timelineLabel} />
          <MetaCell label="Reference" value={doc.meta.reference} />
        </div>
        <div className="mt-14 flex gap-[2px]">
          <div className="h-2 w-[150px] bg-[#b5452a]" aria-hidden="true" />
          <div className="h-2 flex-1 bg-[#f5edea]" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[8px] font-mono uppercase tracking-[0.16em] text-[#9a948a]">{label}</div>
      <div className="mt-1 text-[13px] font-semibold text-[#1a1714]">{value}</div>
    </div>
  );
}

function ContentsPage({ doc, onSelectSection }: { doc: ProposalDoc; onSelectSection: (id: string) => void }) {
  const items = doc.sections.filter((s) => s.visible && s.id !== "cover" && s.id !== "contents");
  return (
    <div>
      <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#b5452a]">This proposal</div>
      <h2 className="mt-2 text-[26px] font-bold tracking-tight text-[#1a1714]">Contents</h2>
      <div className="mt-8 space-y-1">
        {items.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelectSection(s.id)}
            className="group w-full flex items-baseline gap-3 py-2 border-b border-[#e7e2d8] text-left"
          >
            <span className="font-mono text-[10px] text-[#b5452a] tabular-nums">{String(i + 1).padStart(2, "0")}</span>
            <span className="text-[14px] text-[#1a1714] group-hover:text-[#b5452a] transition-colors duration-150">{s.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BodyPage({ section }: { section: ProposalSection }) {
  return (
    <div>
      <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#b5452a]">
        {section.number !== "—" ? `${section.number} · ${section.kicker}` : section.kicker}
      </div>
      <h2 className="mt-2 text-[24px] font-bold tracking-tight text-[#1a1714] border-b-2 border-[#b5452a] pb-3">{section.title}</h2>
      <div className="mt-5 space-y-3">
        {section.blocks.map((b, i) => {
          if (b.type === "paragraph") {
            if (!b.text.trim()) return null;
            return (
              <p key={i} className="text-[12.5px] leading-[1.7] text-[#2a2621]">
                {b.text}
              </p>
            );
          }
          if (b.type === "list") {
            return (
              <div key={i} className="space-y-1.5">
                {b.items.filter(Boolean).map((item, j) => (
                  <div key={j} className="flex items-start gap-3 text-[12.5px] leading-[1.6] text-[#2a2621]">
                    <span className="font-mono text-[10px] text-[#b5452a] tabular-nums mt-0.5">{String(j + 1).padStart(2, "0")}</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            );
          }
          if (b.type === "table") {
            return (
              <table key={i} className="w-full border-collapse">
                <thead>
                  <tr>
                    {b.headers.map((h, j) => (
                      <th key={j} className="bg-[#b5452a] text-white text-[10px] font-semibold uppercase tracking-[0.08em] text-left px-3 py-2 first:rounded-l-sm last:rounded-r-sm">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((row, j) => (
                    <tr key={j} className={j % 2 === 0 ? "bg-[#faf7f2]" : ""}>
                      {row.map((cell, k) => (
                        <td key={k} className="px-3 py-2 text-[11.5px] text-[#2a2621] border-b border-[#e7e2d8]">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

/* ═══ Data binding explainer ═══ */

function DataBinding({ sectionId }: { sectionId: string }) {
  const bindings: Record<string, string[]> = {
    cover: ["Project title ← Requirement.title", "Client ← Client.companyName", "Prepared by ← Workspace.companyName", "Investment ← Requirement.budgetRange"],
    "executive-summary": ["Narrative ← Requirement.business + vision"],
    overview: ["About ← Client + Requirement.business"],
    objectives: ["Goals ← Requirement.vision.goals", "Success criteria ← Requirement.success"],
    scope: ["Included / Excluded ← Requirement.scope"],
    deliverables: ["Capabilities ← Requirement.features"],
    timeline: ["Launch window ← Requirement.timeline", "Deadline ← Requirement.timeline.deadlineDate"],
    roles: ["Stakeholders ← Requirement.stakeholders"],
    communication: ["Primary contact ← Client contacts"],
    investment: ["Budget model ← Requirement.commercial", "Amount ← estimated from budget range"],
    contact: ["Company ← Workspace", "Email / phone ← Workspace profile"],
  };
  const rows = bindings[sectionId];
  if (!rows) return null;
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r} className="flex items-start gap-1.5 text-[10px] text-[var(--bos-text-secondary)]">
          <ArrowRight className="w-3 h-3 text-[var(--bos-accent)] mt-0.5 shrink-0" aria-hidden="true" />
          <span>{r}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══ Finalize flows ═══ */

function FinalCheck({
  quality,
  onClose,
  onFinalize,
}: {
  quality: { total: number; items: { label: string; ok: boolean; note: string }[] };
  onClose: () => void;
  onFinalize: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-lg rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-bg)] shadow-[var(--bos-shadow-lg)]"
      >
        <div className="px-5 py-4 border-b border-[var(--bos-line)]">
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-secondary)]">Final proposal check</div>
          <button type="button" onClick={onClose} className="absolute right-4 top-4 text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]" aria-label="Close">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {quality.items.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={cn("flex items-center justify-center w-4 h-4 rounded-full", item.ok ? "bg-[var(--bos-success)] text-white" : "bg-[var(--bos-warning)] text-white")}>
                  {item.ok ? <Check className="w-2.5 h-2.5" aria-hidden="true" /> : <span className="text-[9px] font-bold">!</span>}
                </span>
                <span className="text-[12px] text-[var(--bos-text-primary)]">{item.label}</span>
                {!item.ok && <span className="text-[10px] text-[var(--bos-text-tertiary)] ml-auto">{item.note}</span>}
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span className={cn("flex items-center justify-center w-4 h-4 rounded-full", "bg-[var(--bos-success)] text-white")}>
                <Check className="w-2.5 h-2.5" aria-hidden="true" />
              </span>
              <span className="text-[12px] text-[var(--bos-text-primary)]">Template</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("flex items-center justify-center w-4 h-4 rounded-full", "bg-[var(--bos-success)] text-white")}>
                <Check className="w-2.5 h-2.5" aria-hidden="true" />
              </span>
              <span className="text-[12px] text-[var(--bos-text-primary)]">PDF layout</span>
            </div>
          </div>

          <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 px-3.5 py-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--bos-text-secondary)]">Proposal readiness</span>
              <span className={cn("font-semibold tabular-nums", quality.total >= 80 ? "text-[var(--bos-success)]" : "text-[var(--bos-warning)]")}>{quality.total}%</span>
            </div>
            <div className="mt-1.5 h-1 rounded-full bg-[var(--bos-overlay)] overflow-hidden">
              <div className={cn("h-full rounded-full transition-[width] duration-500", quality.total >= 80 ? "bg-[var(--bos-success)]" : "bg-[var(--bos-warning)]")} style={{ width: `${quality.total}%` }} />
            </div>
          </div>
        </div>
        <div className="px-5 py-3.5 border-t border-[var(--bos-line)] flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="h-7 px-3 rounded-sm text-[11px] text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)]">
            Cancel
          </button>
          <button
            type="button"
            onClick={onFinalize}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-sm bg-[var(--bos-accent)] text-white text-[11px] font-medium hover:bg-[var(--bos-accent-hover)]"
          >
            <FileText className="w-3 h-3" aria-hidden="true" /> Finalize proposal
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function GeneratingOverlay({ step }: { step: number }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-sm rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-bg)] shadow-[var(--bos-shadow-lg)] p-6"
      >
        <div className="text-center">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--bos-accent)]">Generating your proposal</div>
          <div className="mt-3 space-y-2 text-left">
            {GENERATION_STEPS.map((s, i) => (
              <div key={s} className={cn("flex items-center gap-2.5 text-[12px]", i <= step ? "text-[var(--bos-text-primary)]" : "text-[var(--bos-text-tertiary)]")}>
                <span className={cn("flex items-center justify-center w-4 h-4 rounded-full border text-[8px]", i < step ? "border-[var(--bos-success)] bg-[var(--bos-success)] text-white" : i === step ? "border-[var(--bos-accent)] text-[var(--bos-accent)]" : "border-[var(--bos-border-strong)] text-transparent")}>
                  {i < step ? <Check className="w-2.5 h-2.5" aria-hidden="true" /> : i === step ? <Loader2 className="w-2.5 h-2.5 animate-spin" aria-hidden="true" /> : ""}
                </span>
                {s}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ReadyOverlay({
  info,
  proposalId,
  onClose,
}: {
  info: { reference: string | null; pages: number; generatedAt: string };
  proposalId: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-sm rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-bg)] shadow-[var(--bos-shadow-lg)] p-6 text-center"
      >
        <div className="mx-auto flex items-center justify-center w-14 h-14 rounded-full bg-[var(--bos-success)] text-white">
          <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
        </div>
        <h3 className="mt-4 text-[18px] font-semibold tracking-tight text-[var(--bos-text-primary)]">Proposal ready</h3>
        <div className="mt-2 space-y-1 text-[11px] text-[var(--bos-text-tertiary)]">
          <div className="font-mono text-[var(--bos-text-secondary)]">{info.reference ?? "PROP"}</div>
          <div>{info.pages} pages</div>
          <div>Generated {new Date(info.generatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2">
          <a
            href={`/api/proposals/${proposalId}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-sm border border-[var(--bos-line)] text-[11px] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)]"
          >
            <Eye className="w-3 h-3" aria-hidden="true" /> View PDF
          </a>
          <a
            href={`/api/proposals/${proposalId}/pdf`}
            download
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-sm bg-[var(--bos-accent)] text-white text-[11px] font-medium hover:bg-[var(--bos-accent-hover)]"
          >
            <FileText className="w-3 h-3" aria-hidden="true" /> Download
          </a>
        </div>
      </motion.div>
    </div>
  );
}

/* ═══ Send to client — explicit admin delivery ═══ */

function SendDialog({
  proposal,
  client,
  delivery,
  busy,
  onClose,
  onSend,
}: {
  proposal: StudioInitial["proposal"];
  client: StudioInitial["client"];
  delivery: ProposalDeliveryBundle;
  busy: boolean;
  onClose: () => void;
  onSend: () => void;
}) {
  const recipient = delivery.proposal.sentTo ?? client?.email ?? "";
  const canSend = Boolean(recipient);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-lg rounded-sm border border-[var(--bos-border-strong)] bg-[var(--bos-bg)] shadow-[var(--bos-shadow-lg)]"
      >
        <div className="px-5 py-4 border-b border-[var(--bos-line)] flex items-center gap-2.5">
          <Mail className="w-4 h-4 text-[var(--bos-accent)]" aria-hidden="true" />
          <div>
            <div className="text-[14px] font-semibold tracking-tight text-[var(--bos-text-primary)]">Send proposal to client</div>
            <div className="text-[10px] text-[var(--bos-text-tertiary)]">The finalized PDF is emailed with a secure client review link.</div>
          </div>
          <button type="button" onClick={onClose} className="ml-auto text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]" aria-label="Close">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-sm border border-[var(--bos-line)] px-3 py-2.5">
              <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)]">Recipient</div>
              <div className="mt-0.5 text-[12px] font-medium text-[var(--bos-text-primary)] truncate">{delivery.proposal.sentToName ?? client?.companyName ?? "Client"}</div>
              <div className="text-[10px] text-[var(--bos-text-secondary)] truncate">{recipient || "—"}</div>
            </div>
            <div className="rounded-sm border border-[var(--bos-line)] px-3 py-2.5">
              <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)]">Attachment</div>
              <div className="mt-0.5 text-[12px] font-medium text-[var(--bos-text-primary)]">{proposal.pdfPages ? `${proposal.pdfPages} page PDF` : "PDF"}</div>
              <div className="text-[10px] text-[var(--bos-text-secondary)]">v{delivery.proposal.version}</div>
            </div>
          </div>
          {delivery.proposal.sentAt && (
            <div className="rounded-sm border border-[var(--bos-line)] bg-[var(--bos-overlay)]/40 px-3 py-2.5 text-[11px] text-[var(--bos-text-secondary)]">
              Already sent {formatDateTime(delivery.proposal.sentAt)} — sending again re-issues a fresh secure link and records a new delivery.
            </div>
          )}
          {!canSend && (
            <div className="rounded-sm border border-[var(--bos-warning)]/25 bg-[var(--bos-warning)]/5 px-3 py-2.5 text-[11px] text-[var(--bos-text-secondary)]">
              No client email is on file. Add a contact email to the client before sending.
            </div>
          )}
        </div>
        <div className="px-5 py-3.5 border-t border-[var(--bos-line)] flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="h-7 px-3 rounded-sm text-[11px] text-[var(--bos-text-secondary)] hover:bg-[var(--bos-overlay)]">
            Cancel
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={busy || !canSend}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-sm bg-[var(--bos-accent)] text-white text-[11px] font-medium hover:bg-[var(--bos-accent-hover)] disabled:opacity-40"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <Send className="w-3 h-3" aria-hidden="true" />}
            {busy ? "Sending…" : "Send proposal"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ═══ Delivery panel — the full journey ═══ */

const CR_STATUS_TONE: Record<string, string> = {
  SUBMITTED: "text-[var(--bos-warning)] border-[var(--bos-warning)]/25 bg-[var(--bos-warning)]/6",
  ACCEPTED: "text-[var(--bos-success)] border-[var(--bos-success)]/25 bg-[var(--bos-success)]/6",
  DECLINED: "text-[var(--bos-error)] border-[var(--bos-error)]/25 bg-[var(--bos-error)]/6",
  CLARIFICATION_REQUIRED: "text-[var(--bos-warning)] border-[var(--bos-warning)]/25 bg-[var(--bos-warning)]/6",
  IMPLEMENTED: "text-[var(--bos-success)] border-[var(--bos-success)]/25 bg-[var(--bos-success)]/6",
  RESOLVED: "text-[var(--bos-success)] border-[var(--bos-success)]/25 bg-[var(--bos-success)]/6",
};

function DeliveryPanel({
  delivery,
  onClose,
  onRefresh,
  onDecide,
  onCreateRevision,
}: {
  delivery: ProposalDeliveryBundle;
  onClose: () => void;
  onRefresh: () => void;
  onDecide: (changeRequestId: string, decision: "accept" | "decline" | "clarification", response?: string) => void;
  onCreateRevision: () => void;
}) {
  const [response, setResponse] = useState<Record<string, string>>({});
  const p = delivery.proposal;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        className="relative w-full max-w-xl h-full bg-[var(--bos-bg)] border-l border-[var(--bos-border-strong)] shadow-[var(--bos-shadow-lg)] flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--bos-line)] flex items-center gap-2.5">
          <ClipboardList className="w-4 h-4 text-[var(--bos-accent)]" aria-hidden="true" />
          <div>
            <div className="text-[14px] font-semibold tracking-tight text-[var(--bos-text-primary)]">Delivery</div>
            <div className="text-[10px] text-[var(--bos-text-tertiary)]">v{p.version} · {p.reference ?? "PROP"}</div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={onRefresh}
              className="flex items-center justify-center w-7 h-7 rounded-sm border border-[var(--bos-line)] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:border-[var(--bos-border-strong)]"
              aria-label="Refresh delivery state"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button type="button" onClick={onClose} className="flex items-center justify-center w-7 h-7 rounded-sm text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]" aria-label="Close">
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Status + next action */}
          <div className="rounded-sm border border-[var(--bos-line)] p-4">
            <div className="flex items-center justify-between gap-2">
              <StatusChip status={p.status} />
              {p.sentAt && <span className="text-[10px] text-[var(--bos-text-tertiary)] tabular-nums">Sent {formatDateTime(p.sentAt)}</span>}
            </div>
            <div className="mt-2.5 text-[13px] font-medium text-[var(--bos-text-primary)]">{delivery.nextAction.title}</div>
            <p className="mt-0.5 text-[11px] text-[var(--bos-text-secondary)] leading-snug">{delivery.nextAction.detail}</p>

            {(p.status === "CHANGES_REQUESTED" || p.status === "REVISION_IN_PROGRESS") && (
              <button
                type="button"
                onClick={onCreateRevision}
                className="mt-3 inline-flex items-center gap-1.5 h-7 px-3 rounded-sm bg-[var(--bos-accent)] text-white text-[11px] font-medium hover:bg-[var(--bos-accent-hover)]"
              >
                <History className="w-3 h-3" aria-hidden="true" /> Start revision v{p.version + 1}
              </button>
            )}
          </div>

          {/* Deliveries */}
          <div>
            <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)] mb-2">Deliveries</div>
            {delivery.deliveries.length === 0 ? (
              <p className="text-[11px] text-[var(--bos-text-tertiary)]">Not sent yet — finalize the PDF and send it to the client.</p>
            ) : (
              <div className="space-y-2">
                {delivery.deliveries.map((d) => (
                  <div key={d.id} className="rounded-sm border border-[var(--bos-line)] px-3.5 py-2.5">
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className={cn("px-1.5 py-0.5 rounded-[3px] font-mono uppercase tracking-[0.1em]", d.status === "FAILED" ? "text-[var(--bos-error)] bg-[var(--bos-error)]/8" : "text-[var(--bos-success)] bg-[var(--bos-success)]/8")}>
                        {d.status}
                      </span>
                      <span className="text-[var(--bos-text-secondary)] font-medium">{d.kind.replace(/_/g, " ").toLowerCase()}</span>
                      <span className="text-[var(--bos-text-tertiary)] ml-auto tabular-nums">{formatDateTime(d.sentAt ?? d.createdAt)}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-[var(--bos-text-secondary)]">
                      To {d.recipientName} · {d.recipient} · v{d.version}
                    </div>
                    {d.failedAt && (
                      <div className="mt-1 text-[10px] text-[var(--bos-error)]">{d.failureReason ?? "Delivery failed."}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Client activity */}
          {delivery.views.length > 0 && (
            <div>
              <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)] mb-2">Client activity</div>
              <div className="space-y-2">
                {delivery.views.map((v) => (
                  <div key={v.id} className="rounded-sm border border-[var(--bos-line)] px-3.5 py-2.5 text-[11px] text-[var(--bos-text-secondary)]">
                    <span className="font-medium text-[var(--bos-text-primary)]">{v.viewCount}×</span> opened · last {formatDateTime(v.lastViewedAt)}
                    {v.pdfOpened && <span className="ml-2 text-[var(--bos-info)]">PDF opened</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approvals */}
          {delivery.approvals.length > 0 && (
            <div>
              <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)] mb-2">Approvals</div>
              <div className="space-y-2">
                {delivery.approvals.map((a) => (
                  <div key={a.id} className="rounded-sm border border-[var(--bos-success)]/25 bg-[var(--bos-success)]/5 px-3.5 py-2.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-[var(--bos-success)]">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Approved · v{a.version}
                      <span className="ml-auto text-[10px] text-[var(--bos-text-tertiary)] tabular-nums">{formatDateTime(a.approvedAt)}</span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-[var(--bos-text-secondary)]">by {a.clientName}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Change requests */}
          <div>
            <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)] mb-2">Change requests</div>
            {delivery.changeRequests.length === 0 ? (
              <p className="text-[11px] text-[var(--bos-text-tertiary)]">No change requests.</p>
            ) : (
              <div className="space-y-3">
                {delivery.changeRequests.map((cr) => (
                  <div key={cr.id} className="rounded-sm border border-[var(--bos-line)] px-3.5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[var(--bos-text-tertiary)]">{cr.reference}</span>
                      <span className={cn("px-1.5 py-0.5 rounded-[3px] text-[9px] font-mono uppercase tracking-[0.1em]", CR_STATUS_TONE[cr.status] ?? "text-[var(--bos-text-secondary)] bg-[var(--bos-overlay)]")}>
                        {cr.status.replace(/_/g, " ")}
                      </span>
                      <span className={cn("px-1.5 py-0.5 rounded-[3px] text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--bos-text-tertiary)] bg-[var(--bos-overlay)]")}>{cr.priority}</span>
                      <span className="ml-auto text-[10px] text-[var(--bos-text-tertiary)] tabular-nums">{formatDateTime(cr.submittedAt)}</span>
                    </div>
                    <p className="mt-2 text-[12px] text-[var(--bos-text-primary)] leading-snug">{cr.message}</p>
                    {cr.reasons.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {cr.reasons.map((r) => (
                          <span key={r} className="px-1.5 py-0.5 rounded-sm bg-[var(--bos-overlay)] text-[9px] text-[var(--bos-text-tertiary)]">{r}</span>
                        ))}
                      </div>
                    )}
                    {cr.sections.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {cr.sections.map((s) => (
                          <span key={s} className="px-1.5 py-0.5 rounded-sm border border-[var(--bos-line)] text-[9px] text-[var(--bos-text-secondary)]">{s}</span>
                        ))}
                      </div>
                    )}
                    {cr.items.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {cr.items.map((item) => (
                          <div key={item.id} className="rounded-sm bg-[var(--bos-surface)]/60 border border-[var(--bos-line)] px-2.5 py-2 text-[11px]">
                            <div className="font-medium text-[var(--bos-text-primary)]">{item.section}{item.field ? ` · ${item.field}` : ""}</div>
                            {item.currentValue && <div className="text-[10px] text-[var(--bos-text-tertiary)] line-through decoration-[var(--bos-error)]/50">{item.currentValue}</div>}
                            {item.requestedValue && <div className="text-[10px] text-[var(--bos-success)]">→ {item.requestedValue}</div>}
                            {item.reason && <div className="text-[10px] text-[var(--bos-text-secondary)] mt-0.5">{item.reason}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                    {cr.adminResponse && (
                      <div className="mt-2 rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)]/40 px-2.5 py-2 text-[11px] text-[var(--bos-text-secondary)]">
                        <span className="font-medium text-[var(--bos-accent)]">Your response:</span> {cr.adminResponse}
                      </div>
                    )}
                    {(cr.status === "SUBMITTED" || cr.status === "CLARIFICATION_REQUIRED") && (
                      <div className="mt-2.5">
                        <textarea
                          value={response[cr.id] ?? ""}
                          onChange={(e) => setResponse((r) => ({ ...r, [cr.id]: e.target.value }))}
                          rows={2}
                          placeholder="Note for the client (optional)…"
                          className="w-full px-2.5 py-1.5 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[11px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] resize-none"
                        />
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onDecide(cr.id, "accept", response[cr.id])}
                            className="inline-flex items-center gap-1 h-6 px-2 rounded-sm bg-[var(--bos-success)] text-white text-[10px] font-medium hover:opacity-90"
                          >
                            <ThumbsUp className="w-2.5 h-2.5" aria-hidden="true" /> Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => onDecide(cr.id, "decline", response[cr.id])}
                            className="inline-flex items-center gap-1 h-6 px-2 rounded-sm bg-[var(--bos-error)] text-white text-[10px] font-medium hover:opacity-90"
                          >
                            <ThumbsDown className="w-2.5 h-2.5" aria-hidden="true" /> Decline
                          </button>
                          <button
                            type="button"
                            onClick={() => onDecide(cr.id, "clarification", response[cr.id])}
                            className="inline-flex items-center gap-1 h-6 px-2 rounded-sm border border-[var(--bos-line)] text-[10px] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)]"
                          >
                            <Mail className="w-2.5 h-2.5" aria-hidden="true" /> Clarify
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Versions */}
          <div>
            <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--bos-text-tertiary)] mb-2">Versions</div>
            <div className="space-y-1.5">
              {delivery.versions.map((v) => (
                <div key={v.id} className="flex items-center gap-2 rounded-sm border border-[var(--bos-line)] px-3 py-2">
                  <span className="font-mono text-[10px] text-[var(--bos-text-tertiary)]">v{v.version}</span>
                  <StatusChip status={v.status} />
                  {v.basedOnVersion && <span className="text-[10px] text-[var(--bos-text-tertiary)]">based on v{v.basedOnVersion}</span>}
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] text-[var(--bos-text-tertiary)]">
                    {v.finalizedAt && <span className="flex items-center gap-1"><FileText className="w-2.5 h-2.5" aria-hidden="true" />{v.pdfPages ?? ""}p</span>}
                    {v.sentAt && <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" aria-hidden="true" />{formatDateTime(v.sentAt)}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

