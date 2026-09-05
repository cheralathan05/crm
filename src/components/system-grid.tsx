"use client";

import { useEffect, useRef } from "react";

export interface SystemGridProps {
  showMarkers?: boolean;
}

/**
 * Architectural system grid background.
 *
 * Renders the structural grid pattern with accent lines.
 * Markers are disabled by default to prevent overlapping page typography.
 */
export function SystemGrid({ showMarkers = false }: SystemGridProps) {
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

      {/* Section coordinate markers — only rendered if explicitly requested */}
      {showMarkers && (
        <>
          <div
            className="section-number opacity-40 select-none"
            style={{ position: "absolute", top: 24, left: 24 }}
          >
            <span className="opacity-30">—</span> SYS.01
          </div>
          <div
            className="section-number opacity-40 select-none"
            style={{ position: "absolute", top: 24, right: 24, textAlign: "right" }}
          >
            SYS.02 <span className="opacity-30">—</span>
          </div>
          <div
            className="section-number opacity-40 select-none"
            style={{ position: "absolute", bottom: 24, left: 24 }}
          >
            <span className="opacity-30">—</span> SYS.03
          </div>
          <div
            className="section-number opacity-40 select-none"
            style={{ position: "absolute", bottom: 24, right: 24, textAlign: "right" }}
          >
            SYS.04 <span className="opacity-30">—</span>
          </div>
        </>
      )}
    </div>
  );
}