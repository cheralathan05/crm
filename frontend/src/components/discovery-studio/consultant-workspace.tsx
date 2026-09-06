"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  Paperclip,
  RotateCcw,
  Loader2,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  CornerDownLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  DiscoveryMessageDto,
  StructuredOption,
  InlineConfirmationData,
  WhyWeAskData,
  ContradictionNotice,
} from "@/lib/discovery/discovery.types";

/* ────────────────────────────────────────────────────────────────────────────
   CENTER PANEL — INTELLIGENT CONSULTANT WORKSPACE (Rule 49: Discovery Screen)
   - CONVERSATION stream
   - CURRENT QUESTION focal card
   - ANSWER AREA (Suggested choices, "Other / I'll explain", "I don't know", "Decide later")
   - WHY ARE YOU ASKING? expandable explanation
   - Contradiction & Requirement change notices
   ──────────────────────────────────────────────────────────────────────────── */

interface ConsultantWorkspaceProps {
  messages: DiscoveryMessageDto[];
  onSendMessage: (message: string, selectedOption?: string) => Promise<void>;
  onConfirmInline: (confirmed: boolean, statement: string, changeNote?: string) => Promise<void>;
  onIDontKnow: (currentQuestion: string) => Promise<void>;
  onDecideLater: (currentQuestion: string) => Promise<void>;
  onConfirmContradiction: (contradictionId: string) => Promise<void>;
  onUploadReference: (file: File) => Promise<void>;
  onSwitchToReview: () => void;
  onSwitchToTechnical: () => void;
  isSending: boolean;
  activeTopicLabel: string;
}

export function ConsultantWorkspace({
  messages,
  onSendMessage,
  onConfirmInline,
  onIDontKnow,
  onDecideLater,
  onConfirmContradiction,
  onUploadReference,
  onSwitchToReview,
  onSwitchToTechnical,
  isSending,
  activeTopicLabel,
}: ConsultantWorkspaceProps) {
  const [inputText, setInputText] = useState("");
  const [editingConfirmationId, setEditingConfirmationId] = useState<string | null>(null);
  const [changeNote, setChangeNote] = useState("");
  const [expandedWhy, setExpandedWhy] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasClientSpoken = messages.some((m) => m.role === "user");

  const lastConsultantMsg = [...messages].reverse().find((m) => m.role === "consultant");
  const rawCurrentQ = lastConsultantMsg?.structuredData?.currentQuestion;

  // IMPORTANT FIRST-QUESTION BEHAVIOR:
  // The opening welcome message and Current Question are distinct concepts.
  // Before the client provides their initial explanation, show the welcome message and input area.
  // The Current Question must NOT duplicate the opening welcome message.
  const isWelcomePrompt =
    rawCurrentQ?.question &&
    (rawCurrentQ.question.toLowerCase().includes("tell me what you're trying to build") ||
      rawCurrentQ.question.toLowerCase().includes("welcome to business os") ||
      rawCurrentQ.question.toLowerCase().includes("what problem you're trying to solve"));

  const currentQ = hasClientSpoken && !isWelcomePrompt ? rawCurrentQ : undefined;
  const whyWeAsk = hasClientSpoken && !isWelcomePrompt ? lastConsultantMsg?.structuredData?.whyWeAsk : undefined;
  const options = hasClientSpoken ? lastConsultantMsg?.structuredData?.options || [] : [];
  const contradiction = lastConsultantMsg?.structuredData?.contradiction;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;
    const msg = inputText.trim();
    setInputText("");
    await onSendMessage(msg);
  };

  const handleOptionClick = async (opt: StructuredOption) => {
    if (isSending) return;
    if (opt.id === "opt_other" || opt.label.toLowerCase().includes("other")) {
      textInputRef.current?.focus();
      return;
    }
    await onSendMessage(opt.label, opt.label);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await onUploadReference(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full h-full flex flex-col bg-[var(--bos-bg)] min-w-0">
      {/* Studio Top Bar */}
      <div className="px-5 py-3 border-b border-[var(--bos-line)] flex items-center justify-between gap-3 bg-[var(--bos-surface)]/20 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-accent)] font-semibold">
              Project Discovery Studio
            </span>
            <span className="text-[11px] text-[var(--bos-text-tertiary)]">·</span>
            <span className="text-[11px] font-medium text-[var(--bos-text-secondary)]">
              {activeTopicLabel}
            </span>
          </div>
          <div className="text-[13px] font-semibold text-[var(--bos-text-primary)]">
            Business OS Consultant Workspace
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--bos-line)] bg-[var(--bos-surface)] text-[11px] font-mono text-[var(--bos-text-secondary)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Consultant Active</span>
          </div>

          <button
            type="button"
            onClick={onSwitchToReview}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-sm border border-[var(--bos-line-strong)] bg-transparent text-[12px] font-medium text-[var(--bos-text-primary)] hover:border-[var(--bos-border-strong)] hover:bg-[var(--bos-surface)] transition-colors"
          >
            Review Project Definition
          </button>

          <button
            type="button"
            onClick={onSwitchToTechnical}
            className="hidden md:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-sm text-[11px] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-secondary)] transition-colors"
          >
            Technical Intake
          </button>
        </div>
      </div>

      {/* Messages Stream (CONVERSATION) */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
        {messages.map((msg, idx) => {
          const isConsultant = msg.role === "consultant";
          const isSystem = msg.role === "system";

          if (isSystem) {
            return (
              <div key={msg.id || idx} className="text-center my-3">
                <span className="inline-block px-3 py-1 rounded-full bg-[var(--bos-surface)] border border-[var(--bos-line)] text-[11px] text-[var(--bos-text-tertiary)]">
                  {msg.content}
                </span>
              </div>
            );
          }

          return (
            <div
              key={msg.id || idx}
              className={cn("flex flex-col", isConsultant ? "items-start" : "items-end")}
            >
              <div
                className={cn(
                  "max-w-xl rounded-sm p-4 sm:p-5 text-[14px] leading-relaxed transition-all",
                  isConsultant
                    ? "bg-[var(--bos-surface)]/80 border border-[var(--bos-line)] text-[var(--bos-text-primary)] shadow-xs"
                    : "bg-[var(--bos-accent)] text-white shadow-xs font-medium",
                )}
              >
                {/* Consultant Header */}
                {isConsultant && (
                  <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[var(--bos-line)]">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--bos-accent)] font-semibold uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Business OS Consultant</span>
                    </div>
                    {msg.modelUsed && (
                      <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">
                        {msg.modelUsed}
                      </span>
                    )}
                  </div>
                )}

                <div className="whitespace-pre-line">{msg.content}</div>

                {/* Inline Contradiction / Revision Card (Rules 28 & 29) */}
                {isConsultant && msg.structuredData?.contradiction && (
                  <div className="mt-4 pt-3 border-t border-[var(--bos-line)]">
                    <div className="rounded-sm border border-amber-500/40 bg-amber-500/10 p-3.5 space-y-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-amber-600 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Requirement Revision Acknowledged</span>
                      </div>
                      <div className="text-[12px] space-y-1 text-[var(--bos-text-secondary)]">
                        <div>
                          <strong className="text-[var(--bos-text-primary)]">Previous understanding:</strong>{" "}
                          {msg.structuredData.contradiction.previousUnderstanding}
                        </div>
                        <div>
                          <strong className="text-[var(--bos-text-primary)]">New understanding:</strong>{" "}
                          {msg.structuredData.contradiction.newUnderstanding}
                        </div>
                        <div className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                          {msg.structuredData.contradiction.whatChanged}
                        </div>
                      </div>
                      <div className="pt-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void onConfirmContradiction(msg.structuredData?.contradiction?.id || "")}
                          className="h-7 px-3 rounded-sm bg-amber-600 text-white text-[11px] font-medium hover:bg-amber-700 transition-colors"
                        >
                          Confirm Revision
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Inline Confirmation Card */}
                {isConsultant && msg.structuredData?.inlineConfirmation && (
                  <div className="mt-4 pt-3 border-t border-[var(--bos-line)]">
                    <div className="rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)]/50 p-3.5">
                      <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[var(--bos-accent)] font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm Understanding</span>
                      </div>
                      <p className="mt-1 text-[13px] font-medium text-[var(--bos-text-primary)]">
                        {msg.structuredData.inlineConfirmation.statement}
                      </p>

                      {editingConfirmationId === msg.id ? (
                        <div className="mt-3 space-y-2">
                          <input
                            type="text"
                            value={changeNote}
                            onChange={(e) => setChangeNote(e.target.value)}
                            placeholder="What should be changed? e.g. Customer can also request refund..."
                            className="w-full h-8 px-2.5 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[12px] text-[var(--bos-text-primary)] outline-none focus:border-[var(--bos-accent)]"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                void onConfirmInline(
                                  false,
                                  msg.structuredData?.inlineConfirmation?.statement || "",
                                  changeNote,
                                );
                                setEditingConfirmationId(null);
                                setChangeNote("");
                              }}
                              className="h-7 px-3 rounded-sm bg-[var(--bos-accent)] text-white text-[11px] font-medium hover:bg-[var(--bos-accent-hover)]"
                            >
                              Save Adjustment
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingConfirmationId(null)}
                              className="h-7 px-2.5 text-[11px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void onConfirmInline(
                                true,
                                msg.structuredData?.inlineConfirmation?.statement || "",
                              )
                            }
                            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-sm bg-[var(--bos-accent)] text-white text-[11px] font-medium hover:bg-[var(--bos-accent-hover)] transition-colors"
                          >
                            Yes, that&apos;s right
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingConfirmationId(msg.id)}
                            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border border-[var(--bos-line-strong)] text-[11px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:border-[var(--bos-border-strong)] transition-colors"
                          >
                            Change this
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isSending && (
          <div className="flex items-center gap-2 text-[12px] text-[var(--bos-text-tertiary)] py-2">
            <Loader2 className="w-4 h-4 animate-spin text-[var(--bos-accent)]" />
            <span className="font-mono">Consultant is modeling your project...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* CURRENT QUESTION FOCAL CARD (Rule 49: CURRENT QUESTION & WHY ARE YOU ASKING) */}
      {/* CRITICAL FIRST-QUESTION BEHAVIOR: Never duplicate welcome message, only render when client has spoken */}
      {currentQ && (
        <div className="px-4 py-3 border-t border-[var(--bos-line)] bg-[var(--bos-surface)]/60 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--bos-accent)] font-semibold">
                  Current Question
                </span>
                <button
                  type="button"
                  onClick={() => setExpandedWhy(!expandedWhy)}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--bos-text-tertiary)] hover:text-[var(--bos-accent)] transition-colors"
                >
                  <Info className="w-3 h-3" />
                  <span>Why are you asking this?</span>
                  {expandedWhy ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              <h4 className="mt-1 text-[14px] font-semibold text-[var(--bos-text-primary)] leading-snug">
                {currentQ.question}
              </h4>

              {expandedWhy && (
                <div className="mt-2 p-2.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] text-[12px] text-[var(--bos-text-secondary)] leading-relaxed">
                  <span className="font-medium text-[var(--bos-text-primary)] block mb-0.5">
                    Project Rationale:
                  </span>
                  {whyWeAsk?.rationale || currentQ.contextWhy}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Initial Guidance Bar before client gives first explanation */}
      {!hasClientSpoken && (
        <div className="px-4 py-3 border-t border-[var(--bos-line)] bg-[var(--bos-surface)]/40 flex items-start gap-3 shrink-0">
          <div className="w-8 h-8 rounded-sm bg-[var(--bos-accent)]/10 border border-[var(--bos-accent)]/30 flex items-center justify-center text-[var(--bos-accent)] shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--bos-accent)] font-semibold block">
              Start In Your Own Words
            </span>
            <p className="text-[12px] text-[var(--bos-text-secondary)] mt-0.5">
              Tell me what you&apos;re trying to build, what problem you&apos;re solving, and how you want your business to work after completion.
            </p>
          </div>
        </div>
      )}

      {/* ANSWER AREA (Rule 49: Smart options, Other, I don't know, Decide later, Input) */}
      <div className="p-4 border-t border-[var(--bos-line)] bg-[var(--bos-surface)]/40 shrink-0 space-y-3">
        {/* Suggested Choices Pills (Rule 33) — Only after client has spoken */}
        {hasClientSpoken && options.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={isSending}
                onClick={() => void handleOptionClick(opt)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-medium transition-all",
                  opt.isRecommended
                    ? "border-[var(--bos-accent)]/60 bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] hover:bg-[var(--bos-accent)] hover:text-white"
                    : "border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[var(--bos-text-primary)] hover:border-[var(--bos-border-strong)] hover:bg-[var(--bos-surface)]",
                )}
              >
                {opt.isRecommended && <Sparkles className="w-3 h-3" />}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Quick Action Buttons (Rules 26 & 27) — Only active once client has begun discovery */}
        {hasClientSpoken && (
          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            <button
              type="button"
              disabled={isSending}
              onClick={() => void onIDontKnow(currentQ?.question || "Current detail")}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:border-[var(--bos-line-strong)] transition-colors"
            >
              <HelpCircle className="w-3 h-3" />
              <span>I don&apos;t know</span>
            </button>

            <button
              type="button"
              disabled={isSending}
              onClick={() => void onDecideLater(currentQ?.question || "Current detail")}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:border-[var(--bos-line-strong)] transition-colors"
            >
              <Clock className="w-3 h-3" />
              <span>We&apos;ll decide later</span>
            </button>

            <button
              type="button"
              onClick={() => textInputRef.current?.focus()}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:border-[var(--bos-line-strong)] transition-colors"
            >
              <span>Other / I&apos;ll explain</span>
            </button>
          </div>
        )}

        {/* Text Input & Attachment Bar */}
        <form onSubmit={handleSend} className="space-y-2">
          <div className="relative flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,.pdf,.xlsx,.csv,.doc,.docx"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Upload reference screenshot, Excel, wireframe, or document"
              className="w-10 h-10 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] flex items-center justify-center text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:border-[var(--bos-border-strong)] transition-colors shrink-0"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <textarea
              ref={textInputRef}
              rows={hasClientSpoken ? 1 : 2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder={
                hasClientSpoken
                  ? "Answer the question, provide more context, or explain in your own words..."
                  : "Explain what you want to build in your own words (business problem, goals, how it should work)..."
              }
              className="flex-1 min-h-[40px] max-h-[120px] py-2 px-3 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] text-[13px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] outline-none focus:border-[var(--bos-accent)] transition-colors resize-none"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="w-10 h-10 rounded-sm bg-[var(--bos-accent)] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[var(--bos-accent-hover)] transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[var(--bos-text-tertiary)] px-1">
            <span>Press Enter to send · Shift+Enter for newline</span>
            <span>You can upload documents, spreadsheets, or wireframes anytime</span>
          </div>
        </form>
      </div>
    </div>
  );
}
