"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { AlertTriangle, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProposalBlock, ProposalDoc, ProposalSection, InternalNote, SectionComment, ProposalAdminAnswer } from "@/lib/proposal-doc";
import { blockText, computeProposalQuality, computeProposalReadiness, computeRequirementCoverage, deriveSectionStatus, normalizeDoc, parseGeneratedTextToBlocks, sectionCompletion } from "@/lib/proposal-doc";
import type { ProposalDeliveryBundle } from "@/lib/proposal-delivery";
import { CommandBar, type ProposalHealthMetrics } from "./studio/command-bar";
import { Navigator } from "./studio/navigator";
import { CanvasPage, type SelectedBlock } from "./studio/canvas";
import { IntelPanel, type IntelTab } from "./studio/intel-panel";
import { CommandPalette, ShortcutsDialog, type PaletteEntry } from "./studio/command-palette";
import { CompareDialog, DeliveryPanel, FinalCheck, GeneratingOverlay, ReadyOverlay, SendDialog } from "./studio/dialogs";
import { blankBlock, type InsertItem } from "./studio/block-fields";
import type { SaveState, StudioInitial } from "./studio/types";

/* ────────────────────────────────────────────────────────────────
   PROPOSAL STUDIO — the proposal operating system.
   Command bar · Proposal navigator · Live A4 document canvas ·
   Contextual intelligence panel · Document status bar.

   The document is the same structure that finalizes into the PDF —
   what you see is what ships. Edits autosave (debounced), undo/redo
   is document-level, and every structural change persists. The AI
   copilot drafts from the proposal's real data only.
──────────────────────────────────────────────────────────────── */

export const GENERATION_STEPS = [
  "Preparing content",
  "Applying Business OS template",
  "Rendering pages",
  "Validating layout",
  "Generating PDF",
  "Saving document",
];

export function ProposalStudio({ initial }: { initial: StudioInitial }) {
  const [doc, setDoc] = useState<ProposalDoc>(initial.document);
  const [proposalMeta, setProposalMeta] = useState(initial.proposal);
  const [activeSection, setActiveSection] = useState<string>("cover");
  const [selectedBlock, setSelectedBlock] = useState<SelectedBlock>(null);
  const [panelTab, setPanelTab] = useState<IntelTab>("intel");
  const [zoom, setZoom] = useState(0.75);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set(["COMMERCIAL", "CLOSING"]));
  const [insertMenu, setInsertMenu] = useState<{ sectionId: string; index: number } | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  const [finalize, setFinalize] = useState<null | "check" | "generating" | "ready">(null);
  const [finalizeInfo, setFinalizeInfo] = useState<{ reference: string | null; pages: number; generatedAt: string } | null>(null);
  const [genStep, setGenStep] = useState(0);
  const [delivery, setDelivery] = useState<ProposalDeliveryBundle>(initial.delivery);
  const [deliveryPanel, setDeliveryPanel] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const [aiInstruction, setAiInstruction] = useState("");
  const [aiDepth, setAiDepth] = useState("Detailed");
  const [aiState, setAiState] = useState<"idle" | "streaming" | "draft">("idle");
  const [aiText, setAiText] = useState("");
  const [aiReasoning, setAiReasoning] = useState("");
  const [aiStep, setAiStep] = useState(0);
  const [isApplyingAi, setIsApplyingAi] = useState(false);
  const [pdfOutdated, setPdfOutdated] = useState(!initial.proposal.pdfPath);

  const docRef = useRef(doc);
  const historyRef = useRef<ProposalDoc[]>([]);
  const futureRef = useRef<ProposalDoc[]>([]);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiStepTimer = useRef<number | null>(null);

  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  /* ── Derived intelligence — from real data, never invented ── */

  const quality = useMemo(() => computeProposalQuality(doc), [doc]);
  const coverage = useMemo(() => computeRequirementCoverage(doc, initial.requirement?.features ?? []), [doc, initial.requirement]);
  const readiness = useMemo(() => computeProposalReadiness(doc, coverage), [doc, coverage]);
  const wordCount = useMemo(() => doc.sections.reduce((n, s) => n + s.blocks.reduce((m, b) => m + blockText(b).split(/\s+/).filter(Boolean).length, 0), 0), [doc]);

  const health = useMemo<ProposalHealthMetrics>(() => {
    const visibleSections = doc.sections.filter((s) => s.visible);
    const contentPercent = visibleSections.length > 0
      ? Math.round(visibleSections.reduce((acc, s) => acc + sectionCompletion(s), 0) / visibleSections.length)
      : 100;
    const requirementPercent = coverage.percent;
    const clientDataOk = Boolean(initial.client?.companyName);
    const brandingOk = Boolean(initial.workspace?.companyName);
    const pdfStatus: "Ready" | "Outdated" | "Draft" = proposalMeta.finalizedAt && !pdfOutdated ? "Ready" : pdfOutdated ? "Outdated" : "Draft";
    const deliveryStatus = delivery.deliveries.length > 0 ? delivery.deliveries[delivery.deliveries.length - 1].status : "Draft";
    const clientReviewStatus = proposalMeta.status === "APPROVED"
      ? "Approved"
      : proposalMeta.status === "CHANGES_REQUESTED"
        ? "Changes Requested"
        : delivery.views.length > 0
          ? "Viewed"
          : delivery.deliveries.length > 0
            ? "Awaiting Client"
            : "Draft";

    return {
      contentPercent,
      requirementPercent,
      clientDataOk,
      brandingOk,
      pdfStatus,
      deliveryStatus,
      clientReviewStatus,
    };
  }, [doc.sections, coverage.percent, initial.client?.companyName, initial.workspace?.companyName, proposalMeta.finalizedAt, proposalMeta.status, pdfOutdated, delivery]);

  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [projectCreated, setProjectCreated] = useState(Boolean(initial.delivery?.projects?.length));

  const pages = useMemo(() => doc.sections.filter((s) => s.visible), [doc.sections]);
  const pageIdx = Math.max(0, pages.findIndex((s) => s.id === activeSection));
  const activeDef = doc.sections.find((s) => s.id === activeSection) ?? doc.sections[0];

  const selectSection = useCallback((id: string) => {
    setActiveSection(id);
    setSelectedBlock(null);
    setInsertMenu(null);
  }, []);

  const goToPage = useCallback(
    (idx: number) => {
      const target = pages[Math.max(0, Math.min(pages.length - 1, idx))];
      if (target) selectSection(target.id);
    },
    [pages, selectSection],
  );

  /* ── Persistence — debounced autosave, never lose edits ───── */

  const doPersist = useCallback(
    async (label?: string) => {
      const next = docRef.current;
      setSaveState("saving");
      try {
        const res = await fetch(`/api/proposals/${initial.proposal.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ document: next }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.message ?? "Save failed");
        setSaveState("saved");
      } catch {
        setSaveState("error");
        setError("We couldn't save this change. Your work is still on screen — it will retry automatically.");
      }
      void label;
    },
    [initial.proposal.id],
  );

  const persistSoon = useCallback(() => {
    setSaveState("unsaved");
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => void doPersist(), 700);
  }, [doPersist]);

  /** The single mutation path: push undo history, apply, autosave. */
  const updateDoc = useCallback(
    (updater: (d: ProposalDoc) => ProposalDoc) => {
      const prev = docRef.current;
      const next = updater(prev);
      if (next === prev) return;
      historyRef.current = [...historyRef.current.slice(-59), prev];
      futureRef.current = [];
      docRef.current = next;
      setDoc(next);
      persistSoon();
    },
    [persistSoon],
  );

  const undo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    futureRef.current.push(docRef.current);
    docRef.current = prev;
    setDoc(prev);
    setSelectedBlock(null);
    persistSoon();
  }, [persistSoon]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    historyRef.current.push(docRef.current);
    docRef.current = next;
    setDoc(next);
    setSelectedBlock(null);
    persistSoon();
  }, [persistSoon]);

  /* ── Section / block operations ───────────────────────────── */

  const updateSection = useCallback(
    (id: string, patch: Partial<ProposalSection>) => {
      updateDoc((d) => ({
        ...d,
        sections: d.sections.map((s) =>
          s.id === id
            ? { ...s, ...patch, updatedAt: new Date().toISOString(), status: patch.status ?? s.status }
            : s,
        ),
      }));
    },
    [updateDoc],
  );

  const updateBlock = useCallback(
    (sectionId: string, index: number, patch: Record<string, unknown>) => {
      updateDoc((d) => ({
        ...d,
        sections: d.sections.map((s) => {
          if (s.id !== sectionId) return s;
          const blocks = s.blocks.map((b, i) => (i === index ? ({ ...b, ...patch, updatedAt: new Date().toISOString() } as ProposalBlock) : b));
          return { ...s, blocks, updatedAt: new Date().toISOString(), status: deriveSectionStatus({ ...s, blocks }) };
        }),
      }));
    },
    [updateDoc],
  );

  const insertBlock = useCallback(
    (sectionId: string, index: number, type: InsertItem["type"]) => {
      const block = blankBlock(type);
      updateDoc((d) => ({
        ...d,
        sections: d.sections.map((s) => {
          if (s.id !== sectionId) return s;
          const blocks = [...s.blocks];
          blocks.splice(Math.max(0, Math.min(index, blocks.length)), 0, block);
          return { ...s, blocks, updatedAt: new Date().toISOString() };
        }),
      }));
      setInsertMenu(null);
      setSelectedBlock({ sectionId, index });
    },
    [updateDoc],
  );

  const deleteBlock = useCallback(
    (sectionId: string, index: number) => {
      updateDoc((d) => ({
        ...d,
        sections: d.sections.map((s) =>
          s.id === sectionId ? { ...s, blocks: s.blocks.filter((_, i) => i !== index), updatedAt: new Date().toISOString() } : s,
        ),
      }));
      setSelectedBlock(null);
    },
    [updateDoc],
  );

  const duplicateBlock = useCallback(
    (sectionId: string, index: number) => {
      updateDoc((d) => ({
        ...d,
        sections: d.sections.map((s) => {
          if (s.id !== sectionId) return s;
          const src = s.blocks[index];
          if (!src) return s;
          const copy = { ...src, id: `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, updatedAt: new Date().toISOString() } as ProposalBlock;
          const blocks = [...s.blocks];
          blocks.splice(index + 1, 0, copy);
          return { ...s, blocks, updatedAt: new Date().toISOString() };
        }),
      }));
      setSelectedBlock({ sectionId, index: index + 1 });
    },
    [updateDoc],
  );

  const moveBlock = useCallback(
    (fromSectionId: string, fromIndex: number, toSectionId: string, toIndex: number) => {
      if (fromSectionId === toSectionId && fromIndex === toIndex) return;
      updateDoc((d) => {
        const fromSection = d.sections.find((s) => s.id === fromSectionId);
        if (!fromSection) return d;
        const block = fromSection.blocks[fromIndex];
        if (!block) return d;
        const moved = { ...block, updatedAt: new Date().toISOString() } as ProposalBlock;
        const sections = d.sections.map((s) =>
          s.id === fromSectionId ? { ...s, blocks: s.blocks.filter((_, i) => i !== fromIndex), updatedAt: new Date().toISOString() } : s,
        );
        if (fromSectionId === toSectionId) {
          const target = sections.find((s) => s.id === toSectionId);
          if (!target) return d;
          const blocks = [...target.blocks];
          blocks.splice(Math.max(0, Math.min(toIndex, blocks.length)), 0, moved);
          return {
            ...d,
            sections: sections.map((s) => (s.id === toSectionId ? { ...s, blocks, updatedAt: new Date().toISOString() } : s)),
          };
        }
        const targetSection = sections.find((s) => s.id === toSectionId);
        if (!targetSection) return d;
        const targetBlocks = [...targetSection.blocks];
        targetBlocks.splice(Math.max(0, Math.min(toIndex, targetBlocks.length)), 0, moved);
        return {
          ...d,
          sections: sections.map((s) => (s.id === toSectionId ? { ...s, blocks: targetBlocks, updatedAt: new Date().toISOString() } : s)),
        };
      });
    },
    [updateDoc],
  );

  const addSection = useCallback(() => {
    const id = `custom-${Date.now().toString(36)}`;
    const section: ProposalSection = {
      id,
      number: String(docRef.current.sections.length + 1),
      title: "New section",
      kicker: "",
      source: "MANUAL",
      visible: true,
      blocks: [blankBlock("paragraph")],
      group: "OVERVIEW",
      status: "DRAFT",
      updatedAt: new Date().toISOString(),
    };
    updateDoc((d) => ({ ...d, sections: [...d.sections, section] }));
    selectSection(id);
    setPanelTab("section");
  }, [updateDoc, selectSection]);

  const addRequirementReference = useCallback(
    (reference: string, title: string) => {
      if (!activeDef) return;
      insertBlock(activeDef.id, activeDef.blocks.length, "requirement_reference");
      updateDoc((d) => ({
        ...d,
        sections: d.sections.map((s) => {
          if (s.id !== activeDef.id) return s;
          const blocks = s.blocks.map((b, i) =>
            i === s.blocks.length - 1 && b.type === "requirement_reference"
              ? ({ ...b, reference, title, status: "Covered", source: "REQUIREMENT", sourceRequirementIds: [] } as ProposalBlock)
              : b,
          );
          return { ...s, blocks };
        }),
      }));
    },
    [activeDef, insertBlock, updateDoc],
  );

  const toggleVisibility = useCallback(
    (id: string) => {
      const s = docRef.current.sections.find((x) => x.id === id);
      if (s) updateSection(id, { visible: !s.visible });
    },
    [updateSection],
  );

  const saveProposalMeta = useCallback(
    (patch: { title?: string; amount?: number | null }) => {
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
          setSaveState("saved");
        } catch {
          setSaveState("error");
        }
      })();
    },
    [initial.proposal.id],
  );

  const handleTitleChange = useCallback(
    (title: string) => {
      updateDoc((d) => ({ ...d, meta: { ...d.meta, title } }));
      saveProposalMeta({ title });
    },
    [updateDoc, saveProposalMeta],
  );

  /* ── Internal Notes & Comments Handlers (Spec 45 & 46) ───── */

  const addInternalNote = useCallback(
    (content: string) => {
      const note: InternalNote = {
        id: `note-${Date.now().toString(36)}`,
        content,
        authorName: "Admin",
        createdAt: new Date().toISOString(),
      };
      updateDoc((d) => ({
        ...d,
        internalNotes: [...(d.internalNotes || []), note],
      }));
      setNotice("Internal note saved (team only).");
    },
    [updateDoc],
  );

  const addComment = useCallback(
    (sectionId: string, message: string) => {
      const comment: SectionComment = {
        id: `cmt-${Date.now().toString(36)}`,
        sectionId,
        authorName: "Admin",
        message,
        status: "OPEN",
        createdAt: new Date().toISOString(),
      };
      updateDoc((d) => ({
        ...d,
        comments: [...(d.comments || []), comment],
      }));
      setNotice("Comment added to section.");
    },
    [updateDoc],
  );

  const toggleComment = useCallback(
    (commentId: string) => {
      updateDoc((d) => ({
        ...d,
        comments: (d.comments || []).map((c) =>
          c.id === commentId
            ? { ...c, status: c.status === "OPEN" ? "RESOLVED" : "OPEN", resolvedAt: c.status === "OPEN" ? new Date().toISOString() : undefined }
            : c,
        ),
      }));
    },
    [updateDoc],
  );

  const saveAdminAnswer = useCallback(
    (answer: ProposalAdminAnswer) => {
      updateDoc((d) => {
        const existing = d.adminAnswers ?? [];
        const filtered = existing.filter((a) => !(a.sectionId === answer.sectionId && a.questionId === answer.questionId));
        return {
          ...d,
          adminAnswers: [...filtered, answer],
        };
      });
    },
    [updateDoc],
  );

  /* ── AI copilot ───────────────────────────────────────────── */

  const runAi = useCallback(
    async (customAnswers?: ProposalAdminAnswer[]) => {
      if (!aiInstruction.trim()) return;
      const targetSection = activeDef && activeDef.id !== "contents" && activeDef.id !== "cover"
        ? activeDef
        : doc.sections.find((s) => s.id === "executive-summary") ?? activeDef;

      setPanelTab("ai");
      setAiState("streaming");
      setAiText("");
      setAiReasoning("");
      setAiStep(0);
      setError(null);
      aiStepTimer.current = window.setInterval(() => setAiStep((s) => Math.min(s + 1, 6)), 900);

      try {
        const answersToSend = customAnswers ?? doc.adminAnswers ?? [];
        const res = await fetch(`/api/proposals/${initial.proposal.id}/assist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionId: targetSection?.id || "executive-summary",
            instruction: `${aiInstruction} (depth: ${aiDepth})`,
            depth: aiDepth,
            adminAnswers: answersToSend,
          }),
        });

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message ?? "AI assist failed.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let rawBuffer = "";
        let draftText = "";
        let thoughtsText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const decoded = decoder.decode(value, { stream: true });
          rawBuffer += decoded;
          const lines = rawBuffer.split("\n");
          rawBuffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const item = JSON.parse(trimmed) as { type: "thinking" | "content"; text: string };
              if (item.type === "thinking") {
                thoughtsText += item.text;
                setAiReasoning(thoughtsText);
              } else if (item.type === "content") {
                draftText += item.text;
                // Strip think tags if any slipped through
                const clean = draftText.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/<\/?think>/g, "");
                setAiText(clean);
              }
            } catch {
              draftText += trimmed;
              setAiText(draftText);
            }
          }
        }

        if (rawBuffer.trim()) {
          try {
            const item = JSON.parse(rawBuffer.trim()) as { type: "thinking" | "content"; text: string };
            if (item.type === "content") {
              draftText += item.text;
            } else if (item.type === "thinking") {
              thoughtsText += item.text;
              setAiReasoning(thoughtsText);
            }
          } catch {
            draftText += rawBuffer.trim();
          }
        }

        // Clean final draft text
        let finalDraft = draftText.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/<\/?think>/g, "").trim();

        // If draft is empty but thoughts had text, salvage it
        if (!finalDraft && thoughtsText.trim()) {
          const thinkClean = thoughtsText.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/<\/?think>/g, "").trim();
          if (thinkClean) {
            finalDraft = thinkClean;
          }
        }

        // Guaranteed requirement-anchored consulting draft fallback if still empty
        if (!finalDraft) {
          const reqFeaturesList = initial.requirement?.features?.length
            ? initial.requirement.features.map((f) => `- **${f.name}** (Priority: ${f.priority})`).join("\n")
            : `- Core system architecture & operational consulting deliverables\n- Client requirement alignment & workflow governance`;

          finalDraft = `### ${targetSection?.title || "Executive Summary"}\n\n` +
            `This section establishes the strategic foundation and delivery roadmap for **${initial.proposal.title}**, prepared for **${initial.client?.companyName || doc.meta.clientName || "the Client"}**.\n\n` +
            `### Key Objectives & Verified Capabilities\n\n` +
            `${reqFeaturesList}\n\n` +
            `### Implementation & Commercial Terms\n\n` +
            `- **Investment Budget:** ${doc.meta.amountLabel || "Standard Schedule"}\n` +
            `- **Target Timeline:** ${doc.meta.timelineLabel || "Standard Phase Plan"}\n` +
            `- **Reference Alignment:** ${initial.proposal.reference || "PROP"}`;
        }

        setAiText(finalDraft);
        setAiState("draft");
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "AI assist failed.");
        setAiState("idle");
      } finally {
        if (aiStepTimer.current) window.clearInterval(aiStepTimer.current);
      }
    },
    [activeDef, aiInstruction, aiDepth, doc.sections, doc.adminAnswers, doc.meta.clientName, doc.meta.amountLabel, doc.meta.timelineLabel, initial.proposal.id, initial.proposal.title, initial.proposal.reference, initial.client?.companyName, initial.requirement?.features],
  );

  const applyAiDraft = useCallback(async () => {
    const targetSection = activeDef && activeDef.id !== "cover" && activeDef.id !== "contents"
      ? activeDef
      : doc.sections.find((s) => s.id === "executive-summary") ?? activeDef ?? doc.sections[0];

    if (!targetSection || !aiText.trim()) return;
    setIsApplyingAi(true);
    setError(null);

    try {
      const generatedBlocks = parseGeneratedTextToBlocks(aiText, targetSection.id);
      const res = await fetch(`/api/proposals/${initial.proposal.id}/apply-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalVersion: proposalMeta.version,
          sectionId: targetSection.id,
          generatedText: aiText,
          generatedBlocks,
          adminAnswers: doc.adminAnswers ?? [],
          currentDocument: doc,
          metadata: { depth: aiDepth, instruction: aiInstruction },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message ?? "Could not apply AI draft to proposal.");
      }

      // 1. Synchronize authoritative document state from backend
      const normalized = normalizeDoc(data.document);
      docRef.current = normalized;
      setDoc(normalized);

      // 2. Increment version & proposal metadata
      setProposalMeta((prev) => ({
        ...prev,
        version: data.version,
        updatedAt: new Date().toISOString(),
        pdfPath: null,
        pdfPages: 0,
      }));

      // 3. Flag PDF as outdated
      setPdfOutdated(true);

      // 4. Reset AI preview states
      setAiState("idle");
      setAiText("");
      setAiReasoning("");

      // 5. Select section to focus page on canvas
      selectSection(targetSection.id);

      // 6. Positive notification
      setNotice(`✓ Approved & Applied to Proposal. Document updated to v${data.version} with ${generatedBlocks.length} structured blocks. Canvas updated.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply AI changes.");
    } finally {
      setIsApplyingAi(false);
    }
  }, [activeDef, aiText, initial.proposal.id, proposalMeta.version, doc, aiDepth, aiInstruction, selectSection]);

  /* ── Finalize ─────────────────────────────────────────────── */

  const runFinalize = useCallback(async () => {
    setFinalize("generating");
    setGenStep(0);
    const timer = window.setInterval(() => {
      setGenStep((s) => Math.min(s + 1, GENERATION_STEPS.length - 1));
    }, 320);
    try {
      const res = await fetch(`/api/proposals/${initial.proposal.id}/finalize`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Finalization failed.");
      setFinalizeInfo({ reference: data.proposal?.reference ?? null, pages: data.pages ?? 0, generatedAt: new Date().toISOString() });
      setProposalMeta((p) => ({
        ...p,
        pdfPath: data.proposal?.pdfPath ?? null,
        pdfPages: data.pages ?? null,
        finalizedAt: data.proposal?.finalizedAt ?? null,
        status: data.proposal?.status ?? p.status,
      }));
      setPdfOutdated(false);
      setFinalize("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Finalization failed.");
      setFinalize("check");
    } finally {
      window.clearInterval(timer);
    }
  }, [initial.proposal.id]);

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

  const runSend = useCallback(async (customEmail?: string) => {
    setSending(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch(`/api/proposals/${initial.proposal.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail: customEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message ?? "The proposal could not be sent.");
      if (data.dev) {
        setSendOpen(false);
        setNotice(`⚠ ${data.message}`);
      } else if (data.sent) {
        setSendOpen(false);
        setNotice("The proposal was sent to the client.");
      } else {
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
  }, [initial.proposal.id, refreshDelivery]);

  const decideChange = useCallback(
    async (crId: string, action: "accept" | "decline" | "clarification", response?: string) => {
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
    },
    [refreshDelivery],
  );

  const createRevision = useCallback(async () => {
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
  }, [initial.proposal.id, refreshDelivery]);

  const createProject = useCallback(async () => {
    setIsCreatingProject(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/proposals/${initial.proposal.id}/create-project`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message ?? "The project could not be created.");
      setProjectCreated(true);
      setNotice(`✓ Project "${data.project?.name || "Client Project"}" successfully created from approved proposal!`);
      await refreshDelivery();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The project could not be created.");
    } finally {
      setIsCreatingProject(false);
    }
  }, [initial.proposal.id, refreshDelivery]);

  /* ── Keyboard shortcuts ─────────────────────────────────────── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement | null;
      const editing = target?.isContentEditable || target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT";

      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void doPersist();
        return;
      }
      if (mod && e.key.toLowerCase() === "p") {
        e.preventDefault();
        if (proposalMeta.finalizedAt) window.open(`/api/proposals/${initial.proposal.id}/pdf`, "_blank");
        else setFinalize("check");
        return;
      }
      if (mod && e.key.toLowerCase() === "z" && !editing) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (e.key === "Escape") {
        if (paletteOpen) setPaletteOpen(false);
        else if (shortcutsOpen) setShortcutsOpen(false);
        else if (compareOpen) setCompareOpen(false);
        else if (insertMenu) setInsertMenu(null);
        else if (selectedBlock) setSelectedBlock(null);
        else if (deliveryPanel) setDeliveryPanel(false);
        else setPanelTab("intel");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doPersist, undo, redo, paletteOpen, shortcutsOpen, compareOpen, insertMenu, selectedBlock, deliveryPanel, proposalMeta.finalizedAt, initial.proposal.id]);

  /* ── Command palette entries ────────────────────────────────── */

  const paletteEntries = useMemo<PaletteEntry[]>(() => {
    const entries: PaletteEntry[] = [];
    for (const s of doc.sections.filter((x) => x.visible)) {
      entries.push({
        id: `goto-${s.id}`,
        label: `Go to ${s.title}`,
        hint: `Section ${s.number}`,
        group: "Navigate",
        keywords: s.title,
        run: () => {
          selectSection(s.id);
          setPaletteOpen(false);
        },
      });
    }
    entries.push(
      {
        id: "ai",
        label: "AI Proposal Copilot",
        hint: "Improve, expand or add detail to the current section",
        group: "AI",
        run: () => {
          setPanelTab("ai");
          setPaletteOpen(false);
        },
      },
      {
        id: "compare",
        label: "Compare proposal versions",
        hint: "Compare v(X) vs v(Y) diff and word count",
        group: "Document",
        run: () => {
          setCompareOpen(true);
          setPaletteOpen(false);
        },
      },
      {
        id: "save",
        label: "Save document",
        hint: "Persist the current document",
        group: "Document",
        run: () => {
          void doPersist();
          setPaletteOpen(false);
        },
      },
      {
        id: "add-block",
        label: "Add block",
        hint: "Insert a block at the end of the current section",
        group: "Document",
        run: () => {
          if (activeDef) {
            insertBlock(activeDef.id, activeDef.blocks.length, "paragraph");
            selectSection(activeDef.id);
          }
          setPaletteOpen(false);
        },
      },
      {
        id: "preview",
        label: proposalMeta.finalizedAt ? "Preview PDF" : "Run final check",
        hint: proposalMeta.finalizedAt ? "Open the generated PDF" : "Validate before finalizing",
        group: "PDF",
        run: () => {
          if (proposalMeta.finalizedAt) window.open(`/api/proposals/${initial.proposal.id}/pdf`, "_blank");
          else setFinalize("check");
          setPaletteOpen(false);
        },
      },
    );
    if (proposalMeta.finalizedAt) {
      entries.push({
        id: "download",
        label: "Download PDF",
        hint: "Download the finalized PDF",
        group: "PDF",
        run: () => {
          window.open(`/api/proposals/${initial.proposal.id}/pdf`, "_blank");
          setPaletteOpen(false);
        },
      });
      entries.push({
        id: "send",
        label: "Send to client",
        hint: "Email the finalized proposal",
        group: "Delivery",
        run: () => {
          setSendOpen(true);
          setPaletteOpen(false);
        },
      });
    } else {
      entries.push({
        id: "finalize",
        label: "Finalize proposal",
        hint: "Generate the PDF and lock the version",
        group: "PDF",
        run: () => {
          setFinalize("check");
          setPaletteOpen(false);
        },
      });
    }
    entries.push({
      id: "shortcuts",
      label: "Keyboard shortcuts",
      hint: "See the shortcut reference",
      group: "Help",
      run: () => {
        setShortcutsOpen(true);
        setPaletteOpen(false);
      },
    });
    return entries;
  }, [doc.sections, activeDef, proposalMeta.finalizedAt, initial.proposal.id, selectSection, doPersist, insertBlock]);

  /* ── Render ───────────────────────────────────────────────── */

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col overflow-hidden">
      <CommandBar
        reference={proposalMeta.reference}
        title={doc.meta.title}
        onTitleChange={handleTitleChange}
        status={proposalMeta.status}
        version={proposalMeta.version}
        saveState={saveState}
        zoom={zoom}
        onZoom={(z) => setZoom(z)}
        pageIdx={pageIdx}
        totalPages={pages.length}
        onPrevPage={() => goToPage(pageIdx - 1)}
        onNextPage={() => goToPage(pageIdx + 1)}
        searchQuery={searchQuery}
        onSearchQuery={setSearchQuery}
        reviewMode={reviewMode}
        onToggleReviewMode={() => setReviewMode((v) => !v)}
        onCompare={() => setCompareOpen(true)}
        onAiAssist={() => setPanelTab("ai")}
        pdfOutdated={pdfOutdated}
        delivery={delivery}
        health={health}
        onCreateProject={createProject}
        isCreatingProject={isCreatingProject}
        projectCreated={projectCreated}
        onPreview={() => {
          if (pdfOutdated || !proposalMeta.finalizedAt) setFinalize("check");
          else window.open(`/api/proposals/${initial.proposal.id}/pdf`, "_blank");
        }}
        onShare={() => setDeliveryPanel(true)}
        onFinalize={() => setFinalize("check")}
        finalized={Boolean(proposalMeta.finalizedAt)}
        canSend={!["APPROVED", "REJECTED"].includes(proposalMeta.status)}
        onSend={() => setSendOpen(true)}
        onMore={(action) => {
          switch (action) {
            case "save":
              void doPersist();
              break;
            case "view-pdf":
              window.open(`/api/proposals/${initial.proposal.id}/pdf`, "_blank");
              break;
            case "download":
              window.open(`/api/proposals/${initial.proposal.id}/pdf`, "_blank");
              break;
            case "send":
              setSendOpen(true);
              break;
            case "compare":
              setCompareOpen(true);
              break;
            case "finalize":
              setFinalize("check");
              break;
            case "delivery":
              setDeliveryPanel(true);
              break;
            case "shortcuts":
              setShortcutsOpen(true);
              break;
          }
        }}
      />

      {notice && (
        <div className="mx-3 mt-2 shrink-0 rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)]/50 px-3 py-2 text-[11px] text-[var(--bos-text-secondary)] flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-[var(--bos-accent)] shrink-0" aria-hidden="true" />
          {notice}
          <button type="button" onClick={() => setNotice(null)} className="ml-auto text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]">
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>
      )}
      {error && (
        <div className="mx-3 mt-2 shrink-0 rounded-sm border border-[var(--bos-warning)]/30 bg-[var(--bos-warning)]/6 px-3 py-2 text-[11px] text-[var(--bos-text-secondary)] flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-[var(--bos-warning)] shrink-0" aria-hidden="true" />
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-auto text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]">
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Three-pane body */}
      <div className="flex-1 min-h-0 flex">
        <Navigator
          doc={doc}
          activeSection={activeSection}
          searchQuery={searchQuery}
          collapsedGroups={collapsedGroups}
          onSelect={selectSection}
          onToggleGroup={(key) =>
            setCollapsedGroups((prev) => {
              const next = new Set(prev);
              if (next.has(key)) next.delete(key);
              else next.add(key);
              return next;
            })
          }
          onToggleVisibility={toggleVisibility}
          onAddSection={addSection}
        />

        {/* A4 canvas — the real document */}
        <main className={cn("flex-1 min-w-0 overflow-y-auto bg-[var(--bos-surface)]/40 px-6 py-8", reviewMode && "bg-[#f5f2eb]/70")}>
          {reviewMode && (
            <div className="max-w-[720px] mx-auto mb-6 p-3 rounded-sm border border-[var(--bos-info)]/30 bg-[var(--bos-info)]/10 text-[11.5px] text-[var(--bos-text-secondary)] flex items-center justify-between">
              <span className="flex items-center gap-2 font-medium text-[var(--bos-info)]">
                Review Mode Active — Visual inspection layout without editing handles.
              </span>
              <button
                type="button"
                onClick={() => setReviewMode(false)}
                className="px-2 py-0.5 rounded-sm bg-white border border-[var(--bos-line)] text-[10px] text-[var(--bos-text-primary)] hover:border-[var(--bos-info)]"
              >
                Exit Review Mode
              </button>
            </div>
          )}

          <div className="flex flex-col items-center gap-10">
            {pages.map((s, i) => (
              <CanvasPage
                key={s.id}
                section={s}
                doc={doc}
                pageNumber={i + 1}
                totalPages={pages.length}
                active={s.id === activeSection}
                insertOpen={insertMenu?.sectionId === s.id}
                selectedBlock={selectedBlock}
                onSelect={() => selectSection(s.id)}
                onPatchBlock={updateBlock}
                onRequestInsert={(sectionId) => setInsertMenu({ sectionId, index: 0 })}
                onCloseInsert={() => setInsertMenu(null)}
                onInsert={insertBlock}
                onDeleteBlock={deleteBlock}
                onDuplicateBlock={duplicateBlock}
                onMoveBlock={moveBlock}
                onSelectBlock={(sectionId, index) => setSelectedBlock({ sectionId, index })}
              />
            ))}
            {pages.length === 0 && (
              <div className="w-[660px] bg-white shadow-[0_2px_4px_rgba(26,23,20,0.06),0_12px_40px_rgba(26,23,20,0.1)] px-12 py-24 text-center text-[12px] text-[var(--bos-text-tertiary)]">
                This proposal has no visible sections yet. Rebuild it from the approved requirement.
              </div>
            )}
          </div>
        </main>

        <IntelPanel
          tab={panelTab}
          onTabChange={setPanelTab}
          doc={doc}
          proposalMeta={proposalMeta}
          activeSection={activeDef}
          selectedBlock={selectedBlock}
          coverage={coverage}
          readiness={readiness}
          onUpdateSection={updateSection}
          onPatchBlock={updateBlock}
          onAddRequirementReference={addRequirementReference}
          aiInstruction={aiInstruction}
          onAiInstruction={setAiInstruction}
          aiDepth={aiDepth}
          onAiDepth={setAiDepth}
          aiState={aiState}
          aiText={aiText}
          aiReasoning={aiReasoning}
          aiStep={aiStep}
          isApplyingAi={isApplyingAi}
          onRunAi={(customAnswers) => void runAi(customAnswers)}
          onInsertAi={() => void applyAiDraft()}
          onSaveAdminAnswer={saveAdminAnswer}
          onRejectAi={() => {
            setAiState("idle");
            setAiText("");
            setAiReasoning("");
          }}
          onAddNote={addInternalNote}
          onAddComment={addComment}
          onToggleComment={toggleComment}
          onSelectSection={selectSection}
          aiError={error}
          onClearAiError={() => setError(null)}
        />
      </div>

      {/* Document status bar (spec: bottom) */}
      <div className="shrink-0 border-t border-[var(--bos-line)] bg-[var(--bos-bg)] px-4 py-1.5 flex items-center gap-4 text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--bos-text-tertiary)]">
        <span className="flex items-center gap-1.5">
          <span className={cn("w-1.5 h-1.5 rounded-full", saveState === "saved" ? "bg-[var(--bos-success)]" : saveState === "error" ? "bg-[var(--bos-error)]" : "bg-[var(--bos-warning)]")} aria-hidden="true" />
          {saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving…" : saveState === "error" ? "Save failed" : "Unsaved"}
        </span>
        <span>Page {pageIdx + 1} / {pages.length}</span>
        <span>{Math.round(zoom * 100)}%</span>
        <span className="hidden sm:inline">{wordCount.toLocaleString()} words</span>
        <span className="hidden md:inline">Coverage {coverage.percent}%</span>
        <span className="hidden md:inline">Ready {readiness.percent}</span>
        {reviewMode && <span className="text-[var(--bos-info)] font-semibold">● Review Mode</span>}
        <button type="button" onClick={() => setPaletteOpen(true)} className="ml-auto flex items-center gap-1 hover:text-[var(--bos-text-primary)] transition-colors duration-150">
          <span className="rounded-[3px] border border-[var(--bos-line)] px-1 py-px text-[8px]">Ctrl</span>
          <span className="rounded-[3px] border border-[var(--bos-line)] px-1 py-px text-[8px]">K</span>
          Commands
        </button>
      </div>

      {/* ═══ Overlays ═══ */}
      <AnimatePresence>
        {finalize === "check" && <FinalCheck quality={quality} onClose={() => setFinalize(null)} onFinalize={() => void runFinalize()} />}
        {finalize === "generating" && <GeneratingOverlay step={genStep} />}
        {finalize === "ready" && finalizeInfo && <ReadyOverlay info={finalizeInfo} proposalId={initial.proposal.id} onClose={() => setFinalize(null)} />}
        {compareOpen && <CompareDialog proposalId={initial.proposal.id} currentVersion={proposalMeta.version} onClose={() => setCompareOpen(false)} />}
        {sendOpen && <SendDialog proposal={proposalMeta} client={initial.client} delivery={delivery} busy={sending} onClose={() => setSendOpen(false)} onSend={(email) => void runSend(email)} />}
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

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} entries={paletteEntries} />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
