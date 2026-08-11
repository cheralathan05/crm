"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { BusinessOSMark } from "@/components/business-os-mark";
import { Tag } from "./kit";

export function WorkspaceSetup({ prefill }: { prefill: string }) {
  const router = useRouter();
  const [name, setName] = useState(prefill);
  const [focused, setFocused] = useState(false);
  const [state, setState] = useState<"idle" | "creating" | "ready" | "error">("idle");
  const [error, setError] = useState("");
  const busyRef = useRef(false);

  const trimmed = name.trim();
  const displayName = trimmed || "YOUR COMPANY";

  const handleCreate = useCallback(async () => {
    // Guard against double-invocation (button click + Enter in the same tick).
    if (busyRef.current || state === "creating" || state === "ready") return;
    if (trimmed.length < 2) {
      setError("Enter your company name.");
      return;
    }
    busyRef.current = true;
    setError("");
    setState("creating");
    try {
      const res = await fetch("/api/onboarding/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: trimmed }),
      });
      const data = await res.json();
      if (!data.ok) {
        busyRef.current = false;
        setState("error");
        setError(data.message ?? "Unable to create your workspace. Please try again.");
        return;
      }
      setState("ready");
    } catch {
      busyRef.current = false;
      setState("error");
      setError("Unable to create your workspace. Please try again.");
    }
  }, [trimmed, state]);

  // Navigate once the ready state settles (cleaned up on unmount).
  useEffect(() => {
    if (state !== "ready") return;
    const t = window.setTimeout(() => router.push("/dashboard"), 1100);
    return () => window.clearTimeout(t);
  }, [state, router]);

  // Enter key submits.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") handleCreate();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleCreate]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <AnimatePresence mode="wait">
          {state === "ready" ? (
            <motion.div
              key="ready"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center text-center"
            >
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 18 }}
                className="w-14 h-14 rounded-full bg-[var(--bos-success)]/10 flex items-center justify-center mb-6"
              >
                <Check className="w-6 h-6 text-[var(--bos-success)]" />
              </motion.div>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--bos-text-primary)] mb-2">
                Workspace ready
              </h1>
              <p className="text-sm text-[var(--bos-text-secondary)]">
                {displayName} is connected. Entering your workspace…
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-md"
            >
              <Tag className="mb-4">
                Workspace setup <span className="opacity-40">/ 01</span>
              </Tag>

              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--bos-text-primary)] leading-tight mb-2">
                One last thing.
              </h1>
              <p className="text-sm text-[var(--bos-text-secondary)] mb-8">
                What&apos;s your company called?
              </p>

              {/* Live workspace preview */}
              <motion.div
                className="mb-8 border border-[var(--bos-border)] bg-[var(--bos-surface)] rounded-sm overflow-hidden"
                animate={{ borderColor: focused ? "var(--bos-accent)" : "var(--bos-border)" }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--bos-line)]">
                  <BusinessOSMark size="sm" className="text-[var(--bos-accent)]" />
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={displayName}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[var(--bos-text-primary)]"
                    >
                      {displayName}
                    </motion.span>
                  </AnimatePresence>
                  <span className="ml-auto text-[9px] tracking-[0.18em] uppercase text-[var(--bos-text-tertiary)] font-mono">
                    Business OS workspace
                  </span>
                </div>
                <div className="px-4 py-3 grid grid-cols-3 gap-2">
                  <div className="rounded-sm border border-[var(--bos-line)] p-2">
                    <div className="text-[8px] tracking-[0.12em] uppercase text-[var(--bos-text-tertiary)] mb-1">Clients</div>
                    <div className="text-sm font-semibold text-[var(--bos-text-primary)]">—</div>
                  </div>
                  <div className="rounded-sm border border-[var(--bos-line)] p-2">
                    <div className="text-[8px] tracking-[0.12em] uppercase text-[var(--bos-text-tertiary)] mb-1">Projects</div>
                    <div className="text-sm font-semibold text-[var(--bos-text-primary)]">—</div>
                  </div>
                  <div className="rounded-sm border border-[var(--bos-line)] p-2">
                    <div className="text-[8px] tracking-[0.12em] uppercase text-[var(--bos-text-tertiary)] mb-1">Tasks</div>
                    <div className="text-sm font-semibold text-[var(--bos-text-primary)]">—</div>
                  </div>
                </div>
              </motion.div>

              {/* The single input */}
              <div className="mb-6">
                <label
                  htmlFor="company-name"
                  className="bos-label"
                  style={{ color: focused ? "var(--bos-accent)" : undefined }}
                >
                  Company name
                </label>
                <input
                  id="company-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="e.g. Acme Technologies"
                  autoComplete="organization"
                  maxLength={80}
                  className={`bos-input${error ? " error" : ""}`}
                  autoFocus
                  disabled={state === "creating"}
                  aria-invalid={error ? "true" : "false"}
                />
                {error && (
                  <p className="mt-2 text-xs text-[var(--bos-error)]" role="alert">
                    {error}
                  </p>
                )}
              </div>

              <button
                onClick={handleCreate}
                disabled={state === "creating"}
                className="bos-btn bos-btn--primary w-full"
              >
                {state === "creating" ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Creating workspace
                  </>
                ) : (
                  <>
                    Create workspace
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="mt-8 flex items-center justify-between text-[9px] tracking-[0.16em] uppercase text-[var(--bos-text-tertiary)] font-mono">
                <span>Private workspace</span>
                <span>Step 01</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
