"use client";

import { useEffect, useRef } from "react";

/**
 * Subtle ambient background with slow-moving gradient and light.
 *
 * The motion is almost subconscious — the user notices the quality,
 * not the animation itself.
 */
export function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      time += 0.002;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Warm ambient gradient — very subtle
      const isDark = document.documentElement.classList.contains("dark");
      const accentColor = isDark ? "212, 106, 78" : "181, 69, 42";
      const bgColor = isDark ? "20, 18, 16" : "255, 253, 249";

      // Slow-moving radial gradient
      const cx = 50 + Math.sin(time * 0.3) * 15;
      const cy = 40 + Math.cos(time * 0.2) * 10;

      const gradient = ctx.createRadialGradient(
        (w * cx) / 100,
        (h * cy) / 100,
        0,
        (w * cx) / 100,
        (h * cy) / 100,
        w * 0.6,
      );

      gradient.addColorStop(0, `rgba(${accentColor}, 0.03)`);
      gradient.addColorStop(0.5, `rgba(${accentColor}, 0.01)`);
      gradient.addColorStop(1, `rgba(${bgColor}, 0)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[1]"
      aria-hidden="true"
    />
  );
}