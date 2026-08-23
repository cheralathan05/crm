"use client";

import { Check, CloudOff, Loader2, Save } from "lucide-react";
import type { SaveState } from "./types";

/* ── Autosave status — every state is real, driven by the save engine ── */

export function SaveIndicator({ state, lastSavedAt }: { state: SaveState; lastSavedAt: number | null }) {
  if (state === "idle") return null;

  const label =
    state === "dirty" ? "Unsaved changes"
    : state === "saving" ? "Saving…"
    : state === "saved" ? "Saved just now"
    : "Unable to sync — retrying";

  return (
    <div
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-sm border border-[var(--bos-line)] bg-[var(--bos-bg)]/80 text-[11px] tabular-nums"
    >
      {state === "saving" && <Loader2 className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)] animate-spin" aria-hidden="true" />}
      {state === "saved" && <Check className="w-3.5 h-3.5 text-[var(--bos-success)]" aria-hidden="true" />}
      {state === "offline" && <CloudOff className="w-3.5 h-3.5 text-[var(--bos-warning)]" aria-hidden="true" />}
      {state === "dirty" && <Save className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)]" aria-hidden="true" />}
      <span
        className={
          state === "saved"
            ? "text-[var(--bos-success)]"
            : state === "offline"
              ? "text-[var(--bos-warning)]"
              : "text-[var(--bos-text-secondary)]"
        }
      >
        {label}
      </span>
      {state === "saved" && lastSavedAt ? (
        <span className="text-[var(--bos-text-tertiary)]">
          · {new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      ) : null}
    </div>
  );
}
