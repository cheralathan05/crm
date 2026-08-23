"use client";

import { useEffect, useRef } from "react";

/**
 * Architectural system grid background.
 *
 * Renders the structural grid pattern with accent lines and section markers.
 */
export function SystemGrid() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      el.style.setProperty("--mouse-x", `${x}%`);
      el.style.setProperty("--mouse-y", `${y}%`);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div ref={gridRef} className="system-grid" aria-hidden="true">
      {/* Main grid pattern */}
      <div className="system-grid__pattern" />

      {/* Accent highlight line */}
      <div
        className="system-grid__accent-line"
        style={{
          top: "var(--mouse-y, 50%)",
          opacity: 0.15,
          transform: "translateY(-50%)",
        }}
      />

      {/* Secondary accent lines at fixed positions */}
      <div
        className="system-grid__accent-line"
        style={{ top: "25%", opacity: 0.08 }}
      />
      <div
        className="system-grid__accent-line"
        style={{ top: "75%", opacity: 0.08 }}
      />

      {/* Section coordinate markers */}
      <div
        className="section-number"
        style={{
          position: "absolute",
          top: 32,
          left: 32,
        }}
      >
        <span className="opacity-30">—</span> 01 / ACCESS
      </div>
      <div
        className="section-number"
        style={{
          position: "absolute",
          top: 32,
          right: 32,
          textAlign: "right",
        }}
      >
        ENTER YOUR OS <span className="opacity-30">—</span>
      </div>
      <div
        className="section-number"
        style={{
          position: "absolute",
          bottom: 32,
          left: 32,
        }}
      >
        <span className="opacity-30">—</span> BUSINESS OPERATING SYSTEM
      </div>
      <div
        className="section-number"
        style={{
          position: "absolute",
          bottom: 32,
          right: 32,
          textAlign: "right",
        }}
      >
        SECURE WORKSPACE <span className="opacity-30">—</span>
      </div>
    </div>
  );
}