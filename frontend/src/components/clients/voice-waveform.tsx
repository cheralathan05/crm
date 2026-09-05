"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/* ────────────────────────────────────────────────────────────────
   AUDIO PRESENCE — a small, precise waveform for the Lead Copilot
   voice surface. Thin asymmetric hairlines that react to real mic
   amplitude while listening and settle into a smooth rhythm while
   speaking. No orb, no glow, no neon — the accent is restrained.
──────────────────────────────────────────────────────────────── */

export type WaveformMode = "idle" | "listen" | "think" | "speak";

export function VoiceWaveform({
  mode,
  amplitude,
  className,
}: {
  mode: WaveformMode;
  /** Live sampler returning 0..1 — used while listening. */
  amplitude?: () => number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const amplitudeRef = useRef(amplitude);
  useEffect(() => {
    amplitudeRef.current = amplitude;
  }, [amplitude]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let raf = 0;
    let running = true;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Resolve the accent color from the design system (restrained, muted).
    const accent =
      getComputedStyle(document.documentElement).getPropertyValue("--bos-accent").trim() || "#2f6f5e";
    const accentDim = `${accent}55`; // ~33% alpha

    // Smooth envelope for amplitude — keeps the motion organic.
    let envelope = 0;
    const BARS = 44;

    const draw = (now: number) => {
      if (!running) return;
      // prefers-reduced-motion renders a single static frame, no loop.
      if (!reduced) raf = requestAnimationFrame(draw);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (w === 0 || h === 0) return;

      const midY = h / 2;
      const gap = w / BARS;
      const barW = Math.max(1, gap * 0.42 * dpr);
      const maxH = h * 0.82;

      let level = 0.02;
      if (mode === "listen") {
        const raw = amplitudeRef.current?.() ?? 0.02;
        envelope += (Math.max(0.03, raw) - envelope) * 0.35;
        level = envelope;
      } else if (mode === "speak") {
        // Gentle, steady rhythm synced to speech cadence.
        const t = now / 1000;
        level = 0.28 + 0.16 * Math.sin(t * 2.1) * Math.sin(t * 0.9 + 1.3);
      } else if (mode === "think") {
        // Slow contraction — the assistant is working.
        const t = now / 1000;
        level = 0.1 + 0.05 * Math.sin(t * 1.4);
      }

      // Deterministic asymmetric seed so the shape is stable per frame but
      // never mechanical: a soft layered sine.
      const seed = (i: number) => {
        const t = now / 1000;
        const organic =
          0.55 + 0.45 * Math.sin(i * 1.73 + (mode === "listen" ? now / 180 : 0)) * Math.sin(i * 0.41 + 2.1);
        if (mode === "speak") return organic;
        return 0.5 + 0.5 * Math.sin(i * 1.73 + 1.1 + (mode === "listen" ? now / 240 : t * 0.4));
      };

      for (let i = 0; i < BARS; i++) {
        const x = i * gap + gap / 2;
        const s = seed(i);
        // Most bars short, few tall — asymmetric, editorial.
        const hgt = Math.max(1, maxH * level * (0.25 + s * 0.75) * (0.6 + ((i * 7) % 5) * 0.12));
        const half = hgt / 2;
        const barAlpha = mode === "idle" ? 0.25 : 0.5 + level * 0.4;

        ctx.fillStyle = i % 7 === 0 ? accent : accentDim;
        ctx.globalAlpha = barAlpha;
        ctx.fillRect(x - barW / 2, midY - half, barW, half * 2);
        ctx.globalAlpha = 1;
      }

      // A whisper of a baseline during idle so the surface never feels empty.
      if (mode === "idle") {
        ctx.fillStyle = accentDim;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(0, midY - 0.5 * dpr, w, dpr);
        ctx.globalAlpha = 1;
      }
    };

    draw(0);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [mode, reduced]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      role="img"
      aria-label={
        mode === "listen"
          ? "Listening — microphone is active"
          : mode === "speak"
            ? "Speaking — reading the response aloud"
            : mode === "think"
              ? "Processing your question"
              : "Voice assistant idle"
      }
    />
  );
}
