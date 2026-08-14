/* ────────────────────────────────────────────────────────────────
   VOICE ENGINE — Lead Copilot voice experience.
   Web Speech API (STT + TTS) with a Web Audio analyser for the
   audio-presence visualization. No external dependencies. All
   browser-only — never import this from a server component.
──────────────────────────────────────────────────────────────── */

/* ── Ambient types for the Web Speech API (not in lib.dom) ──── */

type SpeechRecognitionResultLike = {
  readonly length: number;
  isFinal: boolean;
  0: { transcript: string; confidence: number };
};

type SpeechRecognitionEventLike = {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultLike[];
};

type SpeechRecognitionErrorLike = { error: string; message?: string };

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    webkitAudioContext?: typeof AudioContext;
  }
}

/* ── Settings ───────────────────────────────────────────────── */

export type VoiceSettings = {
  /** Speech rate 0.5–1.5. */
  rate: number;
  /** Speak assistant responses aloud. */
  autoSpeak: boolean;
  /** After an answer, listen again automatically. */
  continuous: boolean;
  /** Hold Space to talk instead of tap-to-talk. */
  pushToTalk: boolean;
  /** Preferred TTS voice name (falls back to a good default). */
  voiceName?: string | null;
};

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  rate: 1,
  autoSpeak: true,
  continuous: false,
  pushToTalk: false,
  voiceName: null,
};

const SETTINGS_KEY = "bos.voice.settings.v1";

export function loadVoiceSettings(): VoiceSettings {
  if (typeof window === "undefined") return { ...DEFAULT_VOICE_SETTINGS };
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_VOICE_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<VoiceSettings>;
    return { ...DEFAULT_VOICE_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_VOICE_SETTINGS };
  }
}

export function saveVoiceSettings(s: VoiceSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable — keep in-memory settings */
  }
}

/* ── Support detection ──────────────────────────────────────── */

export function speechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function speechSynthesisSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "speechSynthesis" in window;
}

/** Create a recognition instance bound to the given handlers. */
export function createRecognition(handlers: {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onEnd: () => void;
}): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "en-IN";
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  rec.onresult = (e) => {
    let interim = "";
    let final = "";
    for (let i = 0; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) final += r[0].transcript;
      else interim += r[0].transcript;
    }
    if (final) handlers.onResult(final.trim(), true);
    else if (interim) handlers.onResult(interim.trim(), false);
  };
  rec.onerror = (e) => handlers.onError(e.error);
  rec.onend = () => handlers.onEnd();
  return rec;
}

/* ── Mic + amplitude ────────────────────────────────────────── */

export type MicAnalyser = {
  stream: MediaStream;
  /** Normalized 0..1 RMS amplitude of live mic input. */
  sample: () => number;
  /** Stop tracks and release the AudioContext. */
  close: () => void;
};

/** Request mic access and return an amplitude sampler. Null when denied/unavailable. */
export async function openMicAnalyser(): Promise<MicAnalyser | null> {
  if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) return null;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
      stream.getTracks().forEach((t) => t.stop());
      return null;
    }
    const ctx = new Ctx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.4;
    source.connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);
    const sample = () => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      return Math.min(1, Math.sqrt(sum / buf.length) * 2.4);
    };
    return {
      stream,
      sample,
      close: () => {
        try {
          source.disconnect();
        } catch {
          /* noop */
        }
        try {
          void ctx.close();
        } catch {
          /* noop */
        }
        stream.getTracks().forEach((t) => t.stop());
      },
    };
  } catch {
    return null;
  }
}

/* ── Speech synthesis (chunked per sentence) ────────────────── */

/** Split text into display-ready sentences (keeps the terminator). */
export function splitSentences(text: string): string[] {
  const matches =
    text.match(/[^.!?…]+[.!?…]+["'”)]?/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
  if (matches.length === 0 && text.trim()) return [text.trim()];
  return matches;
}

export type SpeechHandle = {
  cancel: () => void;
  done: Promise<void>;
};

let cachedVoices: SpeechSynthesisVoice[] = [];

function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  if (cachedVoices.length === 0) {
    cachedVoices = window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices();
    };
  }
  return cachedVoices;
}

function pickVoice(preferredName?: string | null): SpeechSynthesisVoice | null {
  const voices = getVoices();
  if (voices.length === 0) return null;
  if (preferredName) {
    const exact = voices.find((v) => v.name === preferredName);
    if (exact) return exact;
  }
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith("en") && v.localService) ??
    voices.find((v) => v.lang.toLowerCase().startsWith("en")) ??
    null
  );
}

export function availableVoices(): { name: string; lang: string }[] {
  return getVoices().map((v) => ({ name: v.name, lang: v.lang }));
}

/**
 * Speak text sentence-by-sentence. `onSentence(index, count)` fires as each
 * sentence starts so the UI can emphasize the currently spoken sentence.
 * Returns a handle that can cancel mid-speech. Null when TTS unavailable.
 */
export function speakText(opts: {
  text: string;
  rate: number;
  voiceName?: string | null;
  muted?: boolean;
  onSentence?: (index: number, count: number) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}): SpeechHandle | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const synth = window.speechSynthesis;
  const sentences = splitSentences(opts.text);
  if (sentences.length === 0) return null;

  let cancelled = false;
  let index = 0;
  let resolveDone: () => void = () => undefined;
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  const speakNext = () => {
    if (cancelled) {
      resolveDone();
      return;
    }
    if (index >= sentences.length) {
      opts.onEnd?.();
      resolveDone();
      return;
    }
    const u = new SpeechSynthesisUtterance(sentences[index]);
    const voice = pickVoice(opts.voiceName);
    if (voice) u.voice = voice;
    u.rate = opts.rate;
    u.volume = opts.muted ? 0 : 1;
    u.onstart = () => {
      opts.onStart?.();
      opts.onSentence?.(index, sentences.length);
    };
    u.onend = () => {
      index++;
      speakNext();
    };
    u.onerror = () => {
      // TTS failure on this sentence — surface it but keep whatever text we have.
      if (!cancelled) opts.onError?.();
      resolveDone();
    };
    synth.speak(u);
  };

  speakNext();
  return {
    cancel: () => {
      cancelled = true;
      try {
        synth.cancel();
      } catch {
        /* noop */
      }
      resolveDone();
    },
    done,
  };
}

/** Stop any current speech (barge-in / exit). */
export function stopSpeaking(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* noop */
    }
  }
}
