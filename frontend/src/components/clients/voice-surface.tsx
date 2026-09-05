"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  Circle,
  Mic,
  MoreHorizontal,
  RotateCcw,
  Square,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  availableVoices,
  createRecognition,
  loadVoiceSettings,
  openMicAnalyser,
  saveVoiceSettings,
  speakText,
  speechRecognitionSupported,
  speechSynthesisSupported,
  splitSentences,
  stopSpeaking,
  type MicAnalyser,
  type SpeechHandle,
  type VoiceSettings,
} from "@/lib/voice";
import { actionLabel, parseActions, stripActions, type CopilotAction } from "@/lib/copilot-actions";
import { VoiceWaveform } from "./voice-waveform";

/* ────────────────────────────────────────────────────────────────
   VOICE SURFACE — the temporary conversational state of the Lead
   Copilot. Not a modal, not a chatbot: the panel itself transforms.
   IDLE → LISTENING → UNDERSTANDING → RESPONDING → SPEAKING → READY.
──────────────────────────────────────────────────────────────── */

const MODEL = "Qwen3:8B";

type VoiceState =
  | "idle"
  | "listening"
  | "understanding"
  | "responding"
  | "speaking"
  | "ready"
  | "mic-denied"
  | "ai-offline"
  | "no-response"
  | "stt-failed"
  | "tts-failed"
  | "unsupported";

const STATE_LABEL: Record<VoiceState, { main: string; sub: string }> = {
  idle: { main: "Ready", sub: "Tap to talk" },
  listening: { main: "Listening", sub: "Speak naturally" },
  understanding: { main: "Understanding", sub: MODEL },
  responding: { main: "Responding", sub: MODEL },
  speaking: { main: MODEL, sub: "Speaking" },
  ready: { main: "Ready", sub: "Ask another question" },
  "mic-denied": { main: "Microphone access", sub: "Allow microphone access to talk to your Lead Copilot" },
  "ai-offline": { main: "Local AI unavailable", sub: `${MODEL} is offline. Start Ollama to continue.` },
  "no-response": { main: "No response", sub: "The local model did not answer. Try again." },
  "stt-failed": { main: "I didn't catch that", sub: "Try again, or use text instead." },
  "tts-failed": { main: "Voice unavailable", sub: "The answer is below — read it or try voice again." },
  unsupported: { main: "Voice input unavailable", sub: "This browser doesn't support speech recognition." },
};

type Props = {
  clientName: string;
  online: boolean | null;
  streaming: boolean;
  streamText: string;
  send: (
    text: string,
    opts?: { via?: "text" | "voice"; onAssistantText?: (full: string) => void },
  ) => Promise<boolean>;
  executeAction: (a: CopilotAction, key: string) => Promise<void>;
  onClose: () => void;
};

export function VoiceSurface({ clientName, online, streaming, streamText, send, executeAction, onClose }: Props) {
  const reduced = useReducedMotion();
  const [state, setState] = useState<VoiceState>("idle");
  const [settings, setSettings] = useState<VoiceSettings>(() => loadVoiceSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [assistantText, setAssistantText] = useState("");
  const [sentenceIndex, setSentenceIndex] = useState(-1);
  const [ttsFailed, setTtsFailed] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ action: CopilotAction; key: string } | null>(null);
  const [actionDone, setActionDone] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [voices] = useState(() => availableVoices());

  const micRef = useRef<MicAnalyser | null>(null);
  const recRef = useRef<ReturnType<typeof createRecognition>>(null);
  const speechRef = useRef<SpeechHandle | null>(null);
  const finalTextRef = useRef("");
  const processingRef = useRef(false);
  const stateRef = useRef<VoiceState>("idle");
  const settingsRef = useRef(settings);
  // Breaks the handleEnd ⇄ startListening cycle without stale closures.
  const startListeningRef = useRef<() => void>(() => undefined);
  const mountedRef = useRef(true);
  const timeoutRef = useRef<number | null>(null);
  // Refs may only be written in effects, not during render.
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const setStateBoth = useCallback((s: VoiceState) => {
    stateRef.current = s;
    setState(s);
  }, []);

  /* ── Session timer ─────────────────────────────────────── */
  useEffect(() => {
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  /* ── Cleanup on unmount ────────────────────────────────── */
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      stopSpeaking();
      recRef.current?.abort();
      micRef.current?.close();
    };
  }, []);

  const fmtTime = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  /* ── Listen ────────────────────────────────────────────── */

  const handleEnd = useCallback(() => {
    if (processingRef.current) return;
    const text = finalTextRef.current.trim();
    if (!text) {
      setStateBoth("stt-failed");
      return;
    }
    processingRef.current = true;
    setStateBoth("understanding");
    let gotText = false;
    // Fallback if the model never answers (Ollama hang) — surface it.
    timeoutRef.current = window.setTimeout(() => {
      if (stateRef.current === "understanding" || stateRef.current === "responding") {
        setStateBoth("no-response");
      }
    }, 75_000);
    void send(text, {
      via: "voice",
      onAssistantText: (full) => {
        const clean = full.trim();
        if (!clean) return;
        gotText = true;
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setAssistantText(stripActions(clean));
        const actions = parseActions(clean);
        setConfirmAction(actions.length > 0 ? { action: actions[0], key: `voice-${Date.now()}` } : null);
        setTtsFailed(false);
        const s = settingsRef.current;
        if (s.autoSpeak && speechSynthesisSupported() && !muted) {
          setStateBoth("speaking");
          setSentenceIndex(0);
          speechRef.current?.cancel();
          speechRef.current = speakText({
            text: stripActions(clean),
            rate: s.rate,
            voiceName: s.voiceName,
            onSentence: (i) => setSentenceIndex(i),
            onEnd: () => {
              speechRef.current = null;
              if (settingsRef.current.continuous) {
                window.setTimeout(() => {
                  setStateBoth("listening");
                  startListeningRef.current();
                }, 700);
              } else {
                setStateBoth("ready");
              }
            },
            onError: () => {
              speechRef.current = null;
              setTtsFailed(true);
              setStateBoth("tts-failed");
            },
          });
        } else {
          setStateBoth("ready");
        }
      },
    }).then(() => {
      // send() swallows 503/network errors internally — if no assistant text
      // arrived, surface it now instead of waiting out the full timeout.
      if (!gotText) {
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setStateBoth("no-response");
      }
    });
  }, [muted, send, setStateBoth]);

  // Create + start a recognition session bound to the shared handlers.
  const beginRecognition = useCallback(() => {
    const rec = createRecognition({
      onResult: (text, isFinal) => {
        if (isFinal) {
          finalTextRef.current = text;
          setTranscript(text);
        } else {
          setTranscript(text);
        }
      },
      onError: (err) => {
        if (err === "not-allowed" || err === "service-not-allowed" || err === "security") {
          setStateBoth("mic-denied");
        } else if (err === "no-speech" || err === "audio-capture") {
          setStateBoth("stt-failed");
        }
      },
      onEnd: () => {
        handleEnd();
      },
    });
    if (!rec) {
      setStateBoth("unsupported");
      return;
    }
    recRef.current?.abort();
    recRef.current = rec;
    try {
      rec.start();
      setStateBoth("listening");
    } catch {
      setStateBoth("stt-failed");
    }
  }, [handleEnd, setStateBoth]);

  const startListening = useCallback(() => {
    if (stateRef.current === "listening" || stateRef.current === "understanding" || stateRef.current === "responding") {
      return;
    }
    // Barge-in: if the assistant is speaking, stop it immediately.
    if (speechRef.current) {
      speechRef.current.cancel();
      speechRef.current = null;
    }
    setAssistantText("");
    setConfirmAction(null);
    setActionDone(false);
    setTtsFailed(false);
    setTranscript("");
    finalTextRef.current = "";
    processingRef.current = false;

    if (!speechRecognitionSupported()) {
      setStateBoth("unsupported");
      return;
    }
    if (!micRef.current) {
      void openMicAnalyser().then((mic) => {
        if (!mountedRef.current) return; // unmounted during the permission prompt
        if (!mic) {
          setStateBoth("mic-denied");
          return;
        }
        micRef.current = mic;
        beginRecognition();
      });
      return;
    }
    beginRecognition();
  }, [beginRecognition, setStateBoth]);

  const stopListening = useCallback(() => {
    const rec = recRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    }
    // onend → handleEnd will process the final text.
  }, []);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  /* ── Auto-start on mount (the "waking up" sequence) ────── */
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    if (online === null) return; // wait for the Ollama status probe to resolve
    startedRef.current = true;
    const t = window.setTimeout(() => {
      if (online === false) {
        setStateBoth("ai-offline");
        return;
      }
      startListening();
    }, 500);
    return () => window.clearTimeout(t);
  }, [online, setStateBoth, startListening]);

  /* ── Push to talk (hold Space) ─────────────────────────── */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "BUTTON" ||
          t.tagName === "SELECT" ||
          t.isContentEditable ||
          t.getAttribute("role") === "switch")
      )
        return;
      e.preventDefault();
      if (stateRef.current === "speaking" || stateRef.current === "ready" || stateRef.current === "idle") {
        startListening();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      if (stateRef.current === "listening") stopListening();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [startListening, stopListening]);

  /* ── Settings ──────────────────────────────────────────── */

  const updateSetting = (patch: Partial<VoiceSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveVoiceSettings(next);
  };

  const retry = () => {
    setSettingsOpen(false);
    setStateBoth("idle");
    startListening();
  };

  const exitVoice = () => {
    stopSpeaking();
    speechRef.current?.cancel();
    recRef.current?.abort();
    onClose();
  };

  const waveformMode =
    state === "listening" ? "listen" : state === "speaking" ? "speak" : state === "understanding" || state === "responding" ? "think" : "idle";
  const stateInfo = STATE_LABEL[state];
  const errorState = state === "mic-denied" || state === "ai-offline" || state === "no-response" || state === "stt-failed" || state === "tts-failed" || state === "unsupported";
  const isActive = state === "listening";

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Header: session identity ─────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Mic className="w-3.5 h-3.5 text-[var(--bos-accent)]" aria-hidden="true" />
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-secondary)] truncate">
            Voice session
          </span>
          <span className="text-[10px] font-mono tabular-nums text-[var(--bos-text-tertiary)]">{fmtTime}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex items-center gap-1 text-[9px] font-mono uppercase tracking-[0.12em]",
              isActive ? "text-[var(--bos-success)]" : "text-[var(--bos-text-tertiary)]",
            )}
          >
            <Circle className="w-1 h-1 fill-current" aria-hidden="true" />
            Mic {isActive ? "on" : "off"}
          </span>
          <button
            type="button"
            onClick={exitVoice}
            aria-label="Close voice mode"
            className="p-1 text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] transition-colors duration-150"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── Trust layer ──────────────────────────────────── */}
      <div className="mt-2 flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)]">
        <span>Based on</span>
        <span className="text-[var(--bos-text-secondary)]">{clientName}</span>
        <span aria-hidden="true">·</span>
        <span className="hidden sm:inline">Requirements · Activity · Contacts</span>
      </div>

      {/* ── Waveform ─────────────────────────────────────── */}
      <div className="mt-4 flex items-center justify-center">
        <VoiceWaveform mode={waveformMode} amplitude={() => micRef.current?.sample() ?? 0} className="w-full h-24 max-w-[340px]" />
      </div>

      {/* ── State label (crossfade) ──────────────────────── */}
      <div className="mt-3 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={state}
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
          >
            <div
              className={cn(
                "text-[11px] font-mono uppercase tracking-[0.18em]",
                state === "listening" && "text-[var(--bos-accent)]",
                state === "speaking" && "text-[var(--bos-accent)]",
                errorState && "text-[var(--bos-error)]",
                !errorState && state !== "listening" && state !== "speaking" && "text-[var(--bos-text-secondary)]",
              )}
            >
              {stateInfo.main}
            </div>
            <div className="mt-0.5 text-[10px] text-[var(--bos-text-tertiary)]">{stateInfo.sub}</div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Transcript / response ────────────────────────── */}
      <div className="mt-3 flex-1 min-h-0 overflow-y-auto pr-0.5">
        {errorState ? (
          <ErrorCard
            state={state}
            onRetry={retry}
            onUseText={exitVoice}
            onRetryTts={() => {
              setTtsFailed(false);
              setStateBoth("speaking");
              speechRef.current = speakText({
                text: assistantText,
                rate: settings.rate,
                voiceName: settings.voiceName,
                onSentence: (i) => setSentenceIndex(i),
                onEnd: () => {
                  speechRef.current = null;
                  setStateBoth("ready");
                },
                onError: () => {
                  speechRef.current = null;
                  setTtsFailed(true);
                  setStateBoth("tts-failed");
                },
              });
            }}
          />
        ) : (
          <div className="space-y-3">
            {/* User's live words — fade upward as they arrive */}
            <AnimatePresence>
              {transcript && (
                <motion.div
                  key={`u-${transcript.length}`}
                  initial={reduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="text-right"
                >
                  <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)] mb-1">
                    You
                  </div>
                  <p className="text-[15px] leading-snug text-[var(--bos-text-primary)]">{transcript}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Assistant response — large, readable, spoken */}
            <AnimatePresence>
              {assistantText && (
                <motion.div
                  key="a"
                  initial={reduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)] mb-1.5">
                    {MODEL}
                    {(state === "speaking" || ttsFailed) && (
                      <span className="flex items-center gap-1 text-[var(--bos-accent)]">
                        <Circle className="w-1 h-1 fill-current animate-pulse" aria-hidden="true" />
                        {ttsFailed ? "voice failed" : "speaking"}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 text-[14px] leading-relaxed text-[var(--bos-text-primary)]">
                    {splitSentences(assistantText).map((sentence, i) => {
                      const spoken = state === "speaking" && !ttsFailed;
                      return (
                        <p
                          key={`${i}-${sentence.slice(0, 12)}`}
                          className={cn(
                            "transition-opacity duration-200",
                            spoken && i === sentenceIndex && "text-[var(--bos-text-primary)]",
                            spoken && i < sentenceIndex && "opacity-70",
                            spoken && i > sentenceIndex && "opacity-45",
                          )}
                        >
                          {sentence}
                          {spoken && i === sentenceIndex && (
                            <span className="ml-1 inline-block w-1 h-3 align-middle bg-[var(--bos-accent)]/60" aria-hidden="true" />
                          )}
                        </p>
                      );
                    })}
                  </div>
                  {ttsFailed && (
                    <button
                      type="button"
                      onClick={() => {
                        setTtsFailed(false);
                        setStateBoth("speaking");
                        speechRef.current = speakText({
                          text: assistantText,
                          rate: settings.rate,
                          onSentence: (i) => setSentenceIndex(i),
                          onEnd: () => {
                            speechRef.current = null;
                            setStateBoth("ready");
                          },
                          onError: () => {
                            speechRef.current = null;
                            setTtsFailed(true);
                            setStateBoth("tts-failed");
                          },
                        });
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 text-[10px] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] transition-colors duration-150"
                    >
                      <RotateCcw className="w-3 h-3" aria-hidden="true" />
                      Voice unavailable — try again
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Live streaming while the model answers */}
            {(state === "understanding" || state === "responding") && (
              <motion.div initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="text-[13px] leading-relaxed text-[var(--bos-text-secondary)] whitespace-pre-wrap break-words">
                {streaming && streamText ? stripActions(streamText) : "…"}
              </motion.div>
            )}

            {/* Action confirmation — voice actions need consent */}
            {confirmAction && !actionDone && (
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-1 rounded-sm border border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)]/50 px-3.5 py-3"
              >
                <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-accent)]">
                  {confirmAction.action.type === "create_task" ? "Create task" : actionLabel(confirmAction.action)}
                </div>
                <div className="mt-1 text-[12.5px] text-[var(--bos-text-primary)]">
                  {confirmAction.action.type === "create_task"
                    ? confirmAction.action.title
                    : confirmAction.action.type === "create_note"
                      ? confirmAction.action.content
                      : confirmAction.action.title}
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void executeAction(confirmAction.action, confirmAction.key);
                      setActionDone(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-sm bg-[var(--bos-accent)] px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-[var(--bos-accent-hover)] transition-colors duration-150"
                  >
                    <Check className="w-3 h-3" aria-hidden="true" />
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmAction(null)}
                    className="rounded-sm border border-[var(--bos-line)] px-2.5 py-1.5 text-[11px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] transition-colors duration-150"
                  >
                    Cancel
                  </button>
                  <span className="text-[9px] text-[var(--bos-text-tertiary)]">for {clientName}</span>
                </div>
              </motion.div>
            )}
            {actionDone && (
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--bos-success)]">
                <Check className="w-3 h-3" aria-hidden="true" />
                Done — {clientName} updated.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Controls ──────────────────────────────────────── */}
      <div className="mt-3 pt-3 border-t border-[var(--bos-line)]">
        {state === "ready" && !errorState && (
          <div className="mb-2.5 text-center text-[11px] text-[var(--bos-text-tertiary)]">
            Anything else about <span className="text-[var(--bos-text-secondary)]">{clientName}</span>?
          </div>
        )}
        {state === "ready" && !errorState && settings.pushToTalk && (
          <div className="mb-2.5 text-center text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)]">
            Hold space to talk
          </div>
        )}
        <div className="flex items-center justify-center gap-2">
          {/* Primary talk/stop control */}
          {errorState ? (
            <button
              type="button"
              onClick={retry}
              className="inline-flex items-center gap-2 rounded-sm bg-[var(--bos-accent)] px-4 py-2 text-[12px] font-medium text-white hover:bg-[var(--bos-accent-hover)] transition-colors duration-150"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Try again
            </button>
          ) : (
            <button
              type="button"
              onPointerDown={
                settings.pushToTalk
                  ? (e) => {
                      e.preventDefault();
                      if (stateRef.current === "speaking" || stateRef.current === "ready" || stateRef.current === "idle") startListening();
                    }
                  : undefined
              }
              onPointerUp={
                settings.pushToTalk
                  ? (e) => {
                      e.preventDefault();
                      if (stateRef.current === "listening") stopListening();
                    }
                  : undefined
              }
              onClick={
                settings.pushToTalk
                  ? undefined
                  : () => {
                      if (stateRef.current === "listening") stopListening();
                      else if (stateRef.current === "speaking") {
                        // Barge-in — stop the assistant and take the mic.
                        speechRef.current?.cancel();
                        speechRef.current = null;
                        startListening();
                      } else startListening();
                    }
              }
              className={cn(
                "inline-flex items-center gap-2 rounded-sm px-5 py-2 text-[12px] font-medium transition-all duration-150 active:scale-[0.98]",
                state === "listening"
                  ? "bg-[var(--bos-accent)] text-white hover:bg-[var(--bos-accent-hover)]"
                  : "border border-[var(--bos-line-strong)] text-[var(--bos-text-primary)] hover:border-[var(--bos-accent-ring)] hover:text-[var(--bos-accent)]",
              )}
              aria-label={state === "listening" ? "Stop listening" : state === "speaking" ? "Interrupt and talk" : "Talk"}
            >
              {state === "listening" ? (
                <>
                  <Square className="w-3 h-3 fill-current" aria-hidden="true" />
                  Stop
                </>
              ) : state === "speaking" ? (
                <>
                  <Mic className="w-3.5 h-3.5" aria-hidden="true" />
                  Interrupt
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" aria-hidden="true" />
                  Talk again
                </>
              )}
            </button>
          )}

          {/* Mute */}
          {speechSynthesisSupported() && (
            <button
              type="button"
              onClick={() => {
                const next = !muted;
                setMuted(next);
                if (next && stateRef.current === "speaking") {
                  // Muting mid-speech — stop the audio, keep the text, settle.
                  speechRef.current?.cancel();
                  speechRef.current = null;
                  setStateBoth("ready");
                }
              }}
              aria-label={muted ? "Unmute voice" : "Mute voice"}
              title={muted ? "Unmute" : "Mute"}
              className={cn(
                "inline-flex items-center justify-center h-8 w-8 rounded-sm border transition-colors duration-150",
                muted
                  ? "border-[var(--bos-error)]/30 text-[var(--bos-error)]"
                  : "border-[var(--bos-line)] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]",
              )}
            >
              {muted ? <VolumeX className="w-3.5 h-3.5" aria-hidden="true" /> : <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />}
            </button>
          )}

          {/* Settings */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setSettingsOpen((o) => !o)}
              aria-label="Voice settings"
              aria-expanded={settingsOpen}
              className="inline-flex items-center justify-center h-8 w-8 rounded-sm border border-[var(--bos-line)] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] transition-colors duration-150"
            >
              <MoreHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            {settingsOpen && (
              <div className="absolute bottom-10 right-0 z-40 w-56 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)] shadow-[var(--bos-shadow-lg)] p-3">
                <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-tertiary)] mb-2">
                  Voice settings
                </div>
                <label className="block mb-2">
                  <span className="bos-label">Speed</span>
                  <div className="mt-1 flex gap-1">
                    {[0.75, 1, 1.25].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => updateSetting({ rate: r })}
                        className={cn(
                          "flex-1 h-7 rounded-sm border text-[11px] transition-colors duration-150",
                          settings.rate === r
                            ? "border-[var(--bos-accent-ring)] bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)]"
                            : "border-[var(--bos-line)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]",
                        )}
                      >
                        {r === 1 ? "Normal" : `${r}x`}
                      </button>
                    ))}
                  </div>
                </label>
                {voices.length > 0 && (
                  <label className="block mb-2">
                    <span className="bos-label">Voice</span>
                    <select
                      value={settings.voiceName ?? ""}
                      onChange={(e) => updateSetting({ voiceName: e.target.value || null })}
                      className="mt-1 w-full h-7 rounded-sm border border-[var(--bos-line-strong)] bg-[var(--bos-bg)] px-2 text-[11px] outline-none focus:border-[var(--bos-accent)]"
                    >
                      <option value="">Default</option>
                      {voices.slice(0, 12).map((v) => (
                        <option key={v.name} value={v.name}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {(
                  [
                    { key: "autoSpeak", label: "Auto speak" },
                    { key: "continuous", label: "Continuous conversation" },
                    { key: "pushToTalk", label: "Push to talk (hold space)" },
                  ] as const
                ).map((t) => (
                  <label key={t.key} className="flex items-center justify-between py-1 cursor-pointer">
                    <span className="text-[11px] text-[var(--bos-text-secondary)]">{t.label}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings[t.key]}
                      onClick={() => updateSetting({ [t.key]: !settings[t.key] })}
                      className={cn(
                        "relative w-8 h-4 rounded-full transition-colors duration-150",
                        settings[t.key] ? "bg-[var(--bos-accent)]" : "bg-[var(--bos-line-strong)]",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-150",
                          settings[t.key] && "translate-x-4",
                        )}
                      />
                    </button>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Offline notice (non-blocking) ─────────────────── */}
      {online === false && state !== "ai-offline" && (
        <div className="mt-2 flex items-center gap-1.5 text-[9px] text-[var(--bos-warning)]">
          <AlertTriangle className="w-3 h-3" aria-hidden="true" />
          {MODEL} is offline — answers won&apos;t stream until Ollama is running.
        </div>
      )}
    </div>
  );
}

/* ── Designed error states ─────────────────────────────────── */

function ErrorCard({
  state,
  onRetry,
  onUseText,
  onRetryTts,
}: {
  state: VoiceState;
  onRetry: () => void;
  onUseText: () => void;
  onRetryTts: () => void;
}) {
  const desc: Record<string, string> = {
    "mic-denied":
      "The browser needs microphone access for voice. You can grant it in the site permissions, then try again — or keep working in text.",
    "ai-offline": "Start Ollama (http://localhost:11434) to bring the copilot back online. The lead page keeps working either way.",
    "no-response": "The local model didn't answer this time. Try the question again, or use text.",
    "stt-failed": "No speech was recognised. Check the microphone and try again.",
    "tts-failed": "The answer was generated — the voice playback failed. Read it below or try voice again.",
    unsupported: "This browser doesn't provide speech recognition. Use text, or open the lead in Chrome or Edge.",
  };
  return (
    <div className="rounded-sm border border-[var(--bos-error)]/25 bg-[var(--bos-error)]/5 px-4 py-4 text-center">
      <div className="text-[12px] font-medium text-[var(--bos-error)]">{desc[state]}</div>
      <div className="mt-3 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={state === "tts-failed" ? onRetryTts : onRetry}
          className="inline-flex items-center gap-1.5 rounded-sm bg-[var(--bos-accent)] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-[var(--bos-accent-hover)] transition-colors duration-150"
        >
          <RotateCcw className="w-3 h-3" aria-hidden="true" />
          {state === "tts-failed" ? "Try voice again" : "Try again"}
        </button>
        <button
          type="button"
          onClick={onUseText}
          className="rounded-sm border border-[var(--bos-line)] px-3 py-1.5 text-[11px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] transition-colors duration-150"
        >
          Use text instead
        </button>
      </div>
    </div>
  );
}
