"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowUp,
  Bot,
  Check,
  ChevronRight,
  Circle,
  ClipboardList,
  Loader2,
  Maximize2,
  Mic,
  Minimize2,
  Plus,
  Sparkles,
  SquareCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { leadCode } from "@/lib/lead-intel";
import {
  actionLabel,
  actionListUrl,
  actionMatchField,
  actionRequest,
  parseActions,
  stripActions,
  type CopilotAction,
} from "@/lib/copilot-actions";
import { VoiceSurface } from "./voice-surface";

type Msg = { role: "USER" | "ASSISTANT"; content: string; via?: "text" | "voice"; createdAt?: string };

const ACTION_ICON: Record<CopilotAction["type"], React.ReactNode> = {
  open_requirement: <ClipboardList className="w-3 h-3" aria-hidden="true" />,
  create_task: <SquareCheck className="w-3 h-3" aria-hidden="true" />,
  create_activity: <Plus className="w-3 h-3" aria-hidden="true" />,
  create_note: <Plus className="w-3 h-3" aria-hidden="true" />,
  create_proposal: <Plus className="w-3 h-3" aria-hidden="true" />,
};

const SUGGESTIONS = [
  "What does this lead need?",
  "What information is missing?",
  "What should I do next?",
  "Summarize the activity",
  "Analyze this opportunity",
  "Draft a follow-up message",
];

const MODEL = "Qwen3:8B";
const LOCAL = "Local";

export function LeadCopilot({
  clientId,
  clientName,
  className,
  isFullscreen: propFullscreen,
  onFullscreenChange,
  onChanged,
  onVoiceModeChange,
}: {
  clientId: string;
  clientName: string;
  className?: string;
  isFullscreen?: boolean;
  onFullscreenChange?: (fullscreen: boolean) => void;
  /** Called after an action chip creates a record — lets the workspace refresh. */
  onChanged?: () => void;
  /** Called when voice mode starts/ends — lets the workspace widen the panel. */
  onVoiceModeChange?: (active: boolean) => void;
}) {
  const reduced = useReducedMotion();
  const [online, setOnline] = useState<boolean | null>(null); // null = checking
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [doneActions, setDoneActions] = useState<Set<string>>(new Set());
  const [voiceMode, setVoiceMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [internalFullscreen, setInternalFullscreen] = useState(false);
  const isFullscreen = propFullscreen !== undefined ? propFullscreen : internalFullscreen;
  const setFullscreen = useCallback(
    (val: boolean) => {
      if (propFullscreen === undefined) {
        setInternalFullscreen(val);
      }
      onFullscreenChange?.(val);
    },
    [propFullscreen, onFullscreenChange],
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, setFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullscreen]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/copilot`);
      const data = await res.json();
      if (data.ok) {
        setOnline(data.online);
        setMessages(data.messages ?? []);
      } else {
        setOnline(false);
      }
    } catch {
      setOnline(false);
    }
  }, [clientId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 45_000);
    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streamText, streaming, isFullscreen]);

  /* ── Send — text and voice share one conversation ───────── */

  /**
   * Send one turn (text or voice). Resolves `true` when a response was
   * received, `false` when the request failed or was skipped — lets the
   * voice surface react to failures instead of waiting out a timeout.
   */
  const send = useCallback(
    async (
      text: string,
      opts?: { via?: "text" | "voice"; onAssistantText?: (full: string) => void },
    ): Promise<boolean> => {
      const message = text.trim();
      if (!message || streaming) return false;
      const via = opts?.via ?? "text";
      setDraft("");
      setError(null);
      setMessages((m) => [...m, { role: "USER", content: message, via }]);
      setStreaming(true);
      setStreamText("");

      try {
        const res = await fetch(`/api/clients/${clientId}/copilot`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, via }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(
            res.status === 503
              ? "Local AI is offline. Start Ollama to continue."
              : (data.message ?? "Unable to reach the copilot."),
          );
          return false;
        }
        if (!res.body) {
          setError("No response from the copilot.");
          return false;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setStreamText(acc);
        }
        const full = acc.trim();
        if (full) opts?.onAssistantText?.(full);
        // Reload from the server — the persisted assistant message (with its
        // stable id) becomes the source of truth, so the 45s poll and local
        // state can never render the same message twice.
        await load();
        return true;
      } catch {
        setError("Network error — check your connection and retry.");
        return false;
      } finally {
        setStreaming(false);
        setStreamText("");
      }
    },
    [clientId, streaming, load],
  );

  const onlineState = online === null ? "checking" : online ? "online" : "offline";

  const executeAction = useCallback(
    async (action: CopilotAction, actionKey: string) => {
      if (runningAction || doneActions.has(actionKey)) return;
      if (action.type === "open_requirement") {
        document.getElementById("requirement")?.scrollIntoView({ behavior: "smooth", block: "start" });
        setDoneActions((d) => new Set(d).add(actionKey));
        return;
      }
      const { url, body } = actionRequest(action, clientId);
      if (!url) return;
      setRunningAction(actionKey);
      setError(null);
      try {
        // Dedupe: if the exact record already exists (e.g. the chip was clicked
        // before a reload reset the in-memory done-markers), mark done instead
        // of creating a duplicate.
        const listUrl = actionListUrl(action, clientId);
        const match = actionMatchField(action);
        if (listUrl && match) {
          const listRes = await fetch(listUrl);
          if (listRes.ok) {
            const listData = await listRes.json();
            const rows: { title?: string | null; content?: string | null }[] = listData.rows ?? [];
            const exists = rows.some((r) => r.title === match || r.content === match);
            if (exists) {
              setDoneActions((d) => new Set(d).add(actionKey));
              onChanged?.();
              return;
            }
          }
        }
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body ?? {}),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.message ?? "Unable to complete the action.");
          return;
        }
        setDoneActions((d) => new Set(d).add(actionKey));
        onChanged?.();
      } catch {
        setError("Network error — the action could not be completed.");
      } finally {
        setRunningAction(null);
      }
    },
    [clientId, runningAction, doneActions, onChanged],
  );

  const enterVoice = useCallback(() => {
    setError(null);
    setVoiceMode(true);
    onVoiceModeChange?.(true);
  }, [onVoiceModeChange]);

  const exitVoice = useCallback(() => {
    setVoiceMode(false);
    onVoiceModeChange?.(false);
  }, [onVoiceModeChange]);

  const copilotInner = (
    <div className={cn("flex-1 min-h-0 flex flex-col", isFullscreen && "w-full")}>
      {/* Body — text conversation ⇄ voice surface */}
      <div className="mt-3 flex-1 min-h-0 flex flex-col">
        <AnimatePresence mode="wait" initial={false}>
          {voiceMode ? (
            <motion.div
              key="voice"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <VoiceSurface
                clientName={clientName}
                online={online}
                streaming={streaming}
                streamText={streamText}
                send={send}
                executeAction={executeAction}
                onClose={exitVoice}
              />
            </motion.div>
          ) : (
            <motion.div
              key="text"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col"
            >
              <p className={cn("text-[11px] text-[var(--bos-text-tertiary)]", isFullscreen && "text-[12.5px]")}>
                Ask about this lead.
              </p>

              {/* Conversation */}
              <div
                ref={scrollRef}
                className={cn(
                  "mt-3 flex-1 overflow-y-auto min-h-0",
                  isFullscreen ? "pr-3 space-y-4 text-[13px]" : "pr-0.5 space-y-3",
                )}
              >
                {messages.length === 0 && streamText === "" && (
                  <div className={cn("py-2", isFullscreen && "py-6 max-w-2xl")}>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)]">
                      <Sparkles className="w-3 h-3" aria-hidden="true" />
                      Understand this lead
                    </div>
                    <div className={cn("mt-2 flex flex-wrap", isFullscreen ? "gap-2" : "gap-1.5")}>
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => void send(s)}
                          disabled={streaming}
                          className={cn(
                            "rounded-sm border border-[var(--bos-line)] text-[var(--bos-text-secondary)] hover:border-[var(--bos-border-strong)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)] transition-colors duration-150 disabled:opacity-40",
                            isFullscreen ? "px-3 py-2 text-[12px] rounded-md" : "px-2.5 py-1.5 text-[11px]",
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <p className={cn("mt-3 text-[var(--bos-text-tertiary)] leading-relaxed", isFullscreen ? "text-[12.5px] max-w-xl" : "text-[11px]")}>
                      The copilot reads this lead&apos;s records — requirements, proposals, activity and
                      notes — and answers like a business analyst. Everything stays in this workspace.
                    </p>
                  </div>
                )}

                {messages.map((m, i) => {
                  const isUser = m.role === "USER";
                  const actions = isUser ? [] : parseActions(m.content);
                  const text = isUser ? m.content : stripActions(m.content);
                  return (
                    <div
                      key={m.createdAt ? `srv-${m.createdAt}` : `loc-${i}`}
                      className={cn("flex flex-col", isUser ? "items-end" : "items-start")}
                    >
                      <div
                        className={cn(
                          "leading-relaxed whitespace-pre-wrap break-words",
                          isUser
                            ? cn(
                                "rounded-sm bg-[var(--bos-accent)] text-white",
                                isFullscreen ? "max-w-[75%] px-4 py-2.5 text-[13.5px] rounded-lg shadow-sm" : "max-w-[92%] px-3 py-2 text-[12.5px]",
                              )
                            : cn(
                                "text-[var(--bos-text-primary)] px-0.5",
                                isFullscreen ? "max-w-[85%] text-[13.5px]" : "max-w-[92%] text-[12.5px]",
                              ),
                        )}
                      >
                        {isUser && m.via === "voice" && (
                          <Mic className="inline w-2.5 h-2.5 mr-1.5 opacity-70 align-baseline" aria-label="Asked by voice" />
                        )}
                        {text}
                      </div>
                      {actions.length > 0 && (
                        <div className={cn("mt-1.5 flex flex-col gap-1.5", isFullscreen ? "max-w-[80%]" : "max-w-[92%]")}>
                          {actions.map((a, ai) => {
                            const key = `${m.createdAt ?? "loc"}-${i}-${ai}`;
                            const running = runningAction === key;
                            const done = doneActions.has(key);
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => void executeAction(a, key)}
                                disabled={running || done || streaming}
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 font-medium transition-colors duration-150",
                                  isFullscreen ? "text-[12px] px-3 py-2 rounded-md" : "text-[11px]",
                                  done
                                    ? "border-[var(--bos-success)]/25 bg-[var(--bos-success)]/8 text-[var(--bos-success)]"
                                    : "border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] hover:bg-[var(--bos-accent)] hover:text-white",
                                  (running || done) && "cursor-default",
                                )}
                              >
                                {running ? (
                                  <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                                ) : done ? (
                                  <Check className="w-3 h-3" aria-hidden="true" />
                                ) : (
                                  ACTION_ICON[a.type]
                                )}
                                {done ? "Done" : actionLabel(a)}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Streaming assistant bubble */}
                <AnimatePresence>
                  {(streaming || streamText) && (
                    <motion.div
                      initial={reduced ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className={cn(
                        "leading-relaxed text-[var(--bos-text-primary)] whitespace-pre-wrap break-words",
                        isFullscreen ? "text-[13.5px] max-w-[85%]" : "text-[12.5px]",
                      )}
                    >
                      {stripActions(streamText)}
                      {streamText === "" && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--bos-text-tertiary)]">
                          <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                          {MODEL} is responding…
                        </span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {error && (
                  <div className="rounded-sm border border-[var(--bos-error)]/25 bg-[var(--bos-error)]/5 px-3 py-2 text-[11px] text-[var(--bos-error)]">
                    {error}
                    <button type="button" onClick={() => setError(null)} className="ml-2 underline underline-offset-2">
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Context indicator */}
      <div className={cn("mt-3 flex items-center gap-2 text-[10px] text-[var(--bos-text-tertiary)]", isFullscreen && "text-[11px]")}>
        <span className="font-mono uppercase tracking-[0.12em]">Context</span>
        <span className="flex items-center gap-1 font-medium text-[var(--bos-text-secondary)]">
          <Circle className="w-1 h-1 fill-[var(--bos-accent)] text-[var(--bos-accent)]" aria-hidden="true" />
          {clientName}
          <span className="font-mono text-[var(--bos-text-tertiary)]">{leadCode(clientId)}</span>
        </span>
      </div>

      {/* Talk control — the door into voice mode */}
      {!voiceMode && (
        <button
          type="button"
          onClick={enterVoice}
          className={cn(
            "group mt-2 flex w-full items-center justify-between gap-2 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-surface)]/40 px-3 py-2 transition-all duration-150 hover:border-[var(--bos-accent-ring)] hover:bg-[var(--bos-accent-subtle)]/40",
            isFullscreen && "px-4 py-2.5 rounded-md",
          )}
        >
          <span className="flex items-center gap-2 min-w-0">
            <Mic className="w-3.5 h-3.5 text-[var(--bos-accent)] shrink-0" aria-hidden="true" />
            <span className={cn("text-[var(--bos-text-secondary)] group-hover:text-[var(--bos-text-primary)] transition-colors duration-150 truncate", isFullscreen ? "text-[12.5px]" : "text-[11.5px]")}>
              Talk to <span className="font-medium text-[var(--bos-text-primary)]">{clientName}</span>
            </span>
          </span>
          <ChevronRight
            className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 shrink-0"
            aria-hidden="true"
          />
        </button>
      )}

      {/* Input — voice and text share the same conversation */}
      <form
        className="mt-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
      >
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] px-2.5 py-1.5 focus-within:border-[var(--bos-accent)] transition-colors duration-150",
            isFullscreen && "px-3.5 py-2.5 rounded-md border-[var(--bos-border)] shadow-sm focus-within:ring-1 focus-within:ring-[var(--bos-accent)]",
          )}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={voiceMode ? "Or type instead…" : "Ask about this lead…"}
            aria-label="Ask about this lead"
            disabled={streaming}
            autoFocus={isFullscreen}
            className={cn(
              "flex-1 bg-transparent outline-none placeholder:text-[var(--bos-text-tertiary)] disabled:opacity-40 min-w-0",
              isFullscreen ? "text-[13.5px]" : "text-[12.5px]",
            )}
          />
          <button
            type="submit"
            disabled={!draft.trim() || streaming}
            aria-label="Send"
            className={cn(
              "flex items-center justify-center rounded-sm text-[var(--bos-text-tertiary)] hover:text-[var(--bos-accent)] hover:bg-[var(--bos-overlay)] disabled:opacity-30 transition-colors duration-150",
              isFullscreen ? "w-7 h-7" : "w-6 h-6",
            )}
          >
            <ArrowUp className={cn(isFullscreen ? "w-4 h-4" : "w-3.5 h-3.5")} aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );

  if (isFullscreen && mounted) {
    return (
      <>
        {/* Placeholder in original location */}
        <div
          className={cn(
            "h-full flex flex-col items-center justify-center text-center p-4 rounded-sm border border-dashed border-[var(--bos-line)] text-[var(--bos-text-tertiary)]",
            className,
          )}
        >
          <Bot className="w-6 h-6 mb-2 text-[var(--bos-accent)] opacity-60" aria-hidden="true" />
          <p className="text-[12px] font-medium text-[var(--bos-text-secondary)]">Lead Copilot is in full screen</p>
          <p className="text-[10px] mt-1 mb-3">Focus is on the expanded conversation view.</p>
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm border border-[var(--bos-line)] text-[11px] text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)] transition-colors"
          >
            <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
            Restore to panel
          </button>
        </div>

        {/* Portalled full screen overlay */}
        {createPortal(
          <div
            className="fixed inset-0 z-[60] bg-[var(--bos-bg)] flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Lead Copilot Full Screen"
          >
            {/* Fullscreen Header Bar */}
            <div className="border-b border-[var(--bos-line)] px-5 sm:px-8 py-3 bg-[var(--bos-surface)]/60 backdrop-blur-sm flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-2.5">
                {voiceMode ? (
                  <Mic className="w-4 h-4 text-[var(--bos-accent)]" aria-hidden="true" />
                ) : (
                  <Bot className="w-4 h-4 text-[var(--bos-accent)]" aria-hidden="true" />
                )}
                <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-primary)] font-medium">
                  Lead Copilot
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono tracking-wider uppercase bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] border border-[var(--bos-accent-ring)]">
                  Full Screen
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 text-[11px] text-[var(--bos-text-tertiary)] tabular-nums">
                <span className="font-medium text-[var(--bos-text-secondary)]">{MODEL}</span>
                <span aria-hidden="true">·</span>
                <span>{LOCAL}</span>
                <span
                  className={cn(
                    "flex items-center gap-1",
                    onlineState === "online" && "text-[var(--bos-success)]",
                    onlineState === "offline" && "text-[var(--bos-error)]",
                    onlineState === "checking" && "text-[var(--bos-text-tertiary)]",
                  )}
                  title={onlineState === "offline" ? "Start Ollama to continue" : "Local AI online"}
                >
                  <Circle
                    className={cn(
                      "w-1.5 h-1.5 fill-current",
                      onlineState === "checking" && "animate-pulse",
                    )}
                    aria-hidden="true"
                  />
                  {onlineState === "online" ? "Online" : onlineState === "offline" ? "Offline" : "Checking"}
                </span>
                <span className="w-px h-3.5 bg-[var(--bos-line-strong)]" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => setFullscreen(false)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-[var(--bos-line)] text-[11px] font-medium text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)] transition-colors duration-150"
                  title="Exit full screen (ESC)"
                  aria-label="Exit full screen"
                >
                  <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Exit full screen</span>
                  <kbd className="hidden sm:inline-block text-[9px] font-mono px-1 py-0.5 rounded bg-[var(--bos-overlay)] text-[var(--bos-text-tertiary)] border border-[var(--bos-line)]">
                    ESC
                  </kbd>
                </button>
                <button
                  type="button"
                  onClick={() => setFullscreen(false)}
                  className="p-1 -mr-1 rounded-sm text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)] transition-colors duration-150"
                  title="Close full screen"
                  aria-label="Close full screen"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Fullscreen Body Container */}
            <div className="flex-1 min-h-0 w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 flex flex-col">
              {copilotInner}
            </div>
          </div>,
          document.body,
        )}
      </>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {voiceMode ? (
            <Mic className="w-3.5 h-3.5 text-[var(--bos-accent)]" aria-hidden="true" />
          ) : (
            <Bot className="w-3.5 h-3.5 text-[var(--bos-accent)]" aria-hidden="true" />
          )}
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-secondary)]">
            Lead Copilot
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[var(--bos-text-tertiary)] tabular-nums">
          <span className="font-medium text-[var(--bos-text-secondary)]">{MODEL}</span>
          <span aria-hidden="true">·</span>
          <span>{LOCAL}</span>
          <span
            className={cn(
              "flex items-center gap-1",
              onlineState === "online" && "text-[var(--bos-success)]",
              onlineState === "offline" && "text-[var(--bos-error)]",
              onlineState === "checking" && "text-[var(--bos-text-tertiary)]",
            )}
            title={onlineState === "offline" ? "Start Ollama to continue" : "Local AI online"}
          >
            <Circle
              className={cn(
                "w-1.5 h-1.5 fill-current",
                onlineState === "checking" && "animate-pulse",
              )}
              aria-hidden="true"
            />
            {onlineState === "online" ? "Online" : onlineState === "offline" ? "Offline" : "Checking"}
          </span>
          <span className="w-px h-3 bg-[var(--bos-line)]" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="p-1 -mr-1 rounded-sm text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)] transition-colors duration-150"
            title="Full screen"
            aria-label="Enter full screen"
          >
            <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {copilotInner}
    </div>
  );
}
