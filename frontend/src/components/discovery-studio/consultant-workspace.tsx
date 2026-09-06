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
  Cpu,
  Info,
  ShieldCheck,
  FileSpreadsheet,
  Image as ImageIcon,
  FileText,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  DiscoveryMessageDto,
  StructuredOption,
  InlineConfirmationData,
  WhyWeAskData,
  IDontKnowAction,
} from "@/lib/discovery/discovery.types";

/* ────────────────────────────────────────────────────────────────────────────
   CENTER PANEL — INTELLIGENT CONSULTANT WORKSPACE (Screens 08, 09, 15, 18, 20, 21)
   Not a questionnaire or chatbot — an intelligent Business Consultant workspace.
   ──────────────────────────────────────────────────────────────────────────── */

interface ConsultantWorkspaceProps {
  messages: DiscoveryMessageDto[];
  onSendMessage: (message: string, selectedOption?: string) => Promise<void>;
  onConfirmInline: (confirmed: boolean, statement: string, changeNote?: string) => Promise<void>;
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
  onUploadReference,
  onSwitchToReview,
  onSwitchToTechnical,
  isSending,
  activeTopicLabel,
}: ConsultantWorkspaceProps) {
  const [inputText, setInputText] = useState("");
  const [editingConfirmationId, setEditingConfirmationId] = useState<string | null>(null);
  const [changeNote, setChangeNote] = useState("");
  const [expandedWhyId, setExpandedWhyId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleOptionClick = async (option: StructuredOption) => {
    if (isSending) return;
    await onSendMessage(option.label, option.label);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await onUploadReference(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full h-full flex flex-col bg-[var(--bos-bg)] min-w-0">
      {/* Studio Header */}
      <div className="px-5 py-3 border-b border-[var(--bos-line)] flex items-center justify-between gap-3 bg-[var(--bos-surface)]/20 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-accent)] font-semibold">
              Project Discovery Studio
            </span>
            <span className="text-[11px] text-[var(--bos-text-tertiary)]">·</span>
            <span className="text-[11px] font-medium text-[var(--bos-text-secondary)]">
              Focus: {activeTopicLabel}
            </span>
          </div>
          <div className="text-[13px] font-semibold text-[var(--bos-text-primary)]">
            Business OS Consultant
          </div>
        </div>

        {/* AI & Navigation Action Bar */}
        <div className="flex items-center gap-2">
          {/* AI Inference Pill */}
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--bos-line)] bg-[var(--bos-surface)] text-[11px] font-mono text-[var(--bos-text-secondary)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Ollama Active</span>
          </div>

          <button
            type="button"
            onClick={onSwitchToReview}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-sm border border-[var(--bos-line-strong)] bg-transparent text-[12px] font-medium text-[var(--bos-text-primary)] hover:border-[var(--bos-border-strong)] hover:bg-[var(--bos-surface)] transition-colors"
          >
            Review Project Blueprint
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

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
        {messages.map((msg, idx) => {
          const isConsultant = msg.role === "consultant";
          const isSystem = msg.role === "system";

          if (isSystem) {
            return (
              <div key={msg.id || idx} className="text-center my-4">
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
              {/* Message Bubble Container */}
              <div
                className={cn(
                  "max-w-xl rounded-sm p-4 sm:p-5 text-[14px] leading-relaxed transition-all",
                  isConsultant
                    ? "bg-[var(--bos-surface)]/80 border border-[var(--bos-line)] text-[var(--bos-text-primary)] shadow-sm"
                    : "bg-[var(--bos-accent)] text-white shadow-sm font-medium",
                )}
              >
                {/* Consultant Identifier Header */}
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

                {/* Inline Confirmation Card (Screen 15) */}
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
                            placeholder="What should be changed? e.g. We also need offline orders..."
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

                {/* "Why Are You Asking?" Drawer (Screen 20) */}
                {isConsultant && msg.structuredData?.whyWeAsk && (
                  <div className="mt-3 pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedWhyId(expandedWhyId === msg.id ? null : msg.id)
                      }
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--bos-text-tertiary)] hover:text-[var(--bos-accent)] transition-colors"
                    >
                      <Info className="w-3 h-3" />
                      <span>Why are you asking this?</span>
                      {expandedWhyId === msg.id ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>

                    {expandedWhyId === msg.id && (
                      <div className="mt-2 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface-panel)] p-3 text-[12px] text-[var(--bos-text-secondary)] leading-relaxed">
                        <div className="font-medium text-[var(--bos-text-primary)] mb-0.5">
                          Architectural & Scope Rationale:
                        </div>
                        {msg.structuredData.whyWeAsk.rationale}
                      </div>
                    )}
                  </div>
                )}

                {/* "I Don't Know" & AI Recommendation Layer (Screen 18 & 21) */}
                {isConsultant && msg.structuredData?.iDontKnow?.helpMeDecide && (
                  <div className="mt-3 rounded-sm border border-blue-500/20 bg-blue-500/5 p-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-blue-600 font-semibold">
                      <Sparkles className="w-3 h-3" />
                      <span>AI Recommendation</span>
                    </div>
                    <div className="text-[12px] font-medium text-[var(--bos-text-primary)] mt-1">
                      {msg.structuredData.iDontKnow.helpMeDecide.recommendationTitle}
                    </div>
                    <p className="text-[11px] text-[var(--bos-text-secondary)] mt-0.5">
                      {msg.structuredData.iDontKnow.helpMeDecide.rationale}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {msg.structuredData.iDontKnow.helpMeDecide.options.map((opt, oIdx) => (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => void onSendMessage(opt, opt)}
                          className="h-6 px-2.5 rounded-sm bg-blue-600 text-white text-[10px] font-medium hover:bg-blue-700 transition-colors"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Structured Choice Pills (Screen 08) */}
              {isConsultant &&
                idx === messages.length - 1 &&
                msg.structuredData?.options &&
                msg.structuredData.options.length > 0 && (
                  <div className="mt-3 max-w-xl flex flex-wrap gap-2">
                    {msg.structuredData.options.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={isSending}
                        onClick={() => void handleOptionClick(opt)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-medium transition-all",
                          opt.isRecommended
                            ? "border-[var(--bos-accent)]/60 bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] hover:bg-[var(--bos-accent)] hover:text-white"
                            : "border-[var(--bos-line-strong)] bg-[var(--bos-surface)]/60 text-[var(--bos-text-primary)] hover:border-[var(--bos-border-strong)] hover:bg-[var(--bos-surface-panel)]",
                        )}
                      >
                        {opt.isRecommended && <Sparkles className="w-3 h-3" />}
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                )}
            </div>
          );
        })}

        {/* Typing / Loading indicator */}
        {isSending && (
          <div className="flex items-center gap-2 text-[12px] text-[var(--bos-text-tertiary)] py-2">
            <Loader2 className="w-4 h-4 animate-spin text-[var(--bos-accent)]" />
            <span className="font-mono">Ollama consultant is modeling your project...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-[var(--bos-line)] bg-[var(--bos-surface)]/40 shrink-0">
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
              title="Upload reference screenshot, Excel, or specification"
              className="w-10 h-10 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] flex items-center justify-center text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:border-[var(--bos-border-strong)] transition-colors shrink-0"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <textarea
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Explain what you want to build or answer the consultant..."
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
            <span>You can upload screenshots, wireframes, Excel or PDFs anytime</span>
          </div>
        </form>
      </div>
    </div>
  );
}
