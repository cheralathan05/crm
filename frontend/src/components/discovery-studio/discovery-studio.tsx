"use client";

import { useState, useCallback, useEffect } from "react";
import { DiscoveryMap } from "./discovery-map";
import { ConsultantWorkspace } from "./consultant-workspace";
import { LiveProjectModelView } from "./live-project-model";
import { ProjectBlueprintReview } from "./project-blueprint-review";
import { ChangeImpactModal } from "./change-impact-modal";
import type {
  DiscoverySessionDto,
  TopicAreaKey,
  ScopeTier,
} from "@/lib/discovery/discovery.types";
import { Loader2 } from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────────
   BUSINESS OS INTELLIGENT PROJECT DISCOVERY STUDIO — MASTER WORKSPACE (Screen 05)
   Sophisticated Three-Part Workspace:
   LEFT: DISCOVERY MAP · CENTER: CONSULTANT · RIGHT: LIVE PROJECT MODEL
   ──────────────────────────────────────────────────────────────────────────── */

interface DiscoveryStudioProps {
  token?: string;
  requirementId?: string;
  apiBase?: string;
  initialSession: DiscoverySessionDto;
  onSwitchToTechnical?: () => void;
}

export function DiscoveryStudio({
  token,
  requirementId,
  apiBase,
  initialSession,
  onSwitchToTechnical,
}: DiscoveryStudioProps) {
  const [session, setSession] = useState<DiscoverySessionDto>(initialSession);
  const [isSending, setIsSending] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [activeAreaKey, setActiveAreaKey] = useState<TopicAreaKey>(session.currentArea || "BUSINESS");
  const [mobileTab, setMobileTab] = useState<"map" | "consultant" | "model">("consultant");
  const [changeImpactOpen, setChangeImpactOpen] = useState(false);

  const endpoint = apiBase || (requirementId ? `/api/requirements/${requirementId}/discovery` : `/api/public/requirements/${encodeURIComponent(token || "")}/discovery`);

  // Poll / refresh session if needed or on focus
  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch(endpoint);
      const data = await res.json();
      if (res.ok && data.ok) {
        setSession(data.session);
      }
    } catch {
      /* ignore transient network issues */
    }
  }, [endpoint]);

  // Send message or quick choice to consultant turn engine
  const handleSendMessage = async (message: string, selectedOption?: string) => {
    setIsSending(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SEND_MESSAGE",
          message,
          selectedOption,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSession(data.session);
        setActiveAreaKey(data.session.currentArea);
      }
    } catch (err) {
      console.error("[DiscoveryStudio] Send failed:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Confirm or adjust inline discovery statement
  const handleConfirmInline = async (confirmed: boolean, statement: string, changeNote?: string) => {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CONFIRM_INLINE",
          confirmed,
          statement,
          changeNote,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSession(data.session);
      }
    } catch (err) {
      console.error("[DiscoveryStudio] Inline confirmation failed:", err);
    }
  };

  // Handle "I don't know" turn (Rule 26)
  const handleIDontKnow = async (currentQuestion: string) => {
    setIsSending(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "I_DONT_KNOW",
          currentQuestion,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSession(data.session);
        setActiveAreaKey(data.session.currentArea);
      }
    } catch (err) {
      console.error("[DiscoveryStudio] I don't know failed:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Handle "Decide later" turn (Rule 27)
  const handleDecideLater = async (currentQuestion: string) => {
    setIsSending(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DECIDE_LATER",
          title: currentQuestion,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSession(data.session);
        setActiveAreaKey(data.session.currentArea);
      }
    } catch (err) {
      console.error("[DiscoveryStudio] Decide later failed:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Confirm contradiction revision (Rules 28 & 29)
  const handleConfirmContradiction = async (contradictionId: string) => {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CONFIRM_CONTRADICTION",
          contradictionId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSession(data.session);
      }
    } catch (err) {
      console.error("[DiscoveryStudio] Confirm contradiction failed:", err);
    }
  };

  // Upload reference screenshot, Excel, or PDF
  const handleUploadReference = async (file: File) => {
    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${endpoint}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSession(data.session);
      }
    } catch (err) {
      console.error("[DiscoveryStudio] Upload failed:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Toggle scope item tier in Scope Radar (Core, Out of scope, etc.)
  const handleToggleScope = async (scopeItemId: string, targetTier: ScopeTier) => {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_SCOPE",
          scopeItemId,
          targetTier,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSession(data.session);
      }
    } catch (err) {
      console.error("[DiscoveryStudio] Toggle scope failed:", err);
    }
  };

  // Record a formal decision
  const handleRecordDecision = async (title: string, choice: string) => {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECORD_DECISION",
          title,
          choice,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSession(data.session);
      }
    } catch (err) {
      console.error("[DiscoveryStudio] Record decision failed:", err);
    }
  };

  // Edit journey steps
  const handleEditJourney = async (journeyId: string, steps: string[]) => {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_JOURNEY",
          journeyId,
          steps,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSession(data.session);
      }
    } catch (err) {
      console.error("[DiscoveryStudio] Edit journey failed:", err);
    }
  };

  // Switch between Discovery Mode and Review Mode
  const handleSwitchMode = async (mode: "DISCOVERY" | "REVIEW") => {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SWITCH_MODE",
          mode,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSession(data.session);
      }
    } catch (err) {
      console.error("[DiscoveryStudio] Switch mode failed:", err);
    }
  };

  // Formal sign-off on Project Understanding
  const handleApprove = async (approverName: string, approverEmail?: string) => {
    setIsApproving(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "APPROVE_UNDERSTANDING",
          approverName,
          approverEmail,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSession(data.session);
      }
    } catch (err) {
      console.error("[DiscoveryStudio] Approval failed:", err);
    } finally {
      setIsApproving(false);
    }
  };

  // If in Review Mode or Approved, render the Executive Project Blueprint Review screen
  if (session.mode === "REVIEW" || session.mode === "APPROVED") {
    return (
      <ProjectBlueprintReview
        session={session}
        token={token}
        onBackToDiscovery={() => void handleSwitchMode("DISCOVERY")}
        onApprove={handleApprove}
        onSendMessage={handleSendMessage}
        onSwitchToTechnical={onSwitchToTechnical}
        isApproving={isApproving}
      />
    );
  }

  const activeArea = session.areas.find((a) => a.key === activeAreaKey);
  const activeTopicLabel = activeArea?.label || "Business Context";

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-[var(--bos-bg)] overflow-hidden">
      {/* Mobile Navigation Tabs */}
      <div className="md:hidden flex items-center border-b border-[var(--bos-line)] bg-[var(--bos-surface)] shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab("map")}
          className={`flex-1 py-2.5 text-[11px] font-mono uppercase text-center border-b-2 transition-colors ${
            mobileTab === "map"
              ? "border-[var(--bos-accent)] text-[var(--bos-accent)] font-semibold"
              : "border-transparent text-[var(--bos-text-tertiary)]"
          }`}
        >
          Map ({session.completeness}%)
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("consultant")}
          className={`flex-1 py-2.5 text-[11px] font-mono uppercase text-center border-b-2 transition-colors ${
            mobileTab === "consultant"
              ? "border-[var(--bos-accent)] text-[var(--bos-accent)] font-semibold"
              : "border-transparent text-[var(--bos-text-tertiary)]"
          }`}
        >
          Consultant
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("model")}
          className={`flex-1 py-2.5 text-[11px] font-mono uppercase text-center border-b-2 transition-colors ${
            mobileTab === "model"
              ? "border-[var(--bos-accent)] text-[var(--bos-accent)] font-semibold"
              : "border-transparent text-[var(--bos-text-tertiary)]"
          }`}
        >
          Live Model
        </button>
      </div>

      {/* Three-Panel Studio Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-hidden">
        {/* LEFT PANEL: Discovery Map (col-span-3 on desktop) */}
        <div
          className={`md:col-span-3 lg:col-span-3 h-full overflow-hidden ${
            mobileTab === "map" ? "block" : "hidden md:block"
          }`}
        >
          <DiscoveryMap
            areas={session.areas}
            coverage={session.model.coverage}
            activeAreaKey={activeAreaKey}
            onSelectArea={(key) => {
              setActiveAreaKey(key);
              setMobileTab("consultant");
            }}
            completeness={session.completeness}
          />
        </div>

        {/* CENTER PANEL: Consultant Workspace (col-span-6 on desktop) */}
        <div
          className={`md:col-span-5 lg:col-span-5 h-full overflow-hidden ${
            mobileTab === "consultant" ? "block" : "hidden md:block"
          }`}
        >
          <ConsultantWorkspace
            messages={session.messages}
            onSendMessage={handleSendMessage}
            onConfirmInline={handleConfirmInline}
            onIDontKnow={handleIDontKnow}
            onDecideLater={handleDecideLater}
            onConfirmContradiction={handleConfirmContradiction}
            onUploadReference={handleUploadReference}
            onSwitchToReview={() => void handleSwitchMode("REVIEW")}
            onSwitchToTechnical={onSwitchToTechnical}
            isSending={isSending}
            activeTopicLabel={activeTopicLabel}
          />
        </div>

        {/* RIGHT PANEL: Live Project Model (col-span-4 on desktop) */}
        <div
          className={`md:col-span-4 lg:col-span-4 h-full overflow-hidden ${
            mobileTab === "model" ? "block" : "hidden md:block"
          }`}
        >
          <LiveProjectModelView
            model={session.model}
            onToggleScope={handleToggleScope}
            onRecordDecision={handleRecordDecision}
            onEditJourney={handleEditJourney}
          />
        </div>
      </div>

      {/* Change Impact Modal */}
      <ChangeImpactModal
        isOpen={changeImpactOpen}
        onClose={() => setChangeImpactOpen(false)}
        requirementId={session.requirementId}
      />
    </div>
  );
}
