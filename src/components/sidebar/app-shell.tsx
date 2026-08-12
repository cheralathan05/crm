"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, PanelLeft, PanelLeftClose } from "lucide-react";
import { BusinessOSLogo } from "@/components/business-os-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import type { UserRole } from "@/lib/navigation";
import type { SidebarCounts } from "@/lib/sidebar-data";
import { cn } from "@/lib/utils";
import { CommandMenu } from "./command-menu";
import { Sidebar } from "./sidebar";

interface AppShellProps {
  user: { id: string; name: string | null; email: string | null };
  role: UserRole;
  companyName: string;
  counts: SidebarCounts;
  githubConnected: boolean;
  children: React.ReactNode;
}

const EXPANDED_WIDTH = "w-[272px]";
const COLLAPSED_WIDTH = "w-[72px]";

/**
 * The authenticated application shell:
 *   slim top bar (brand · system · theme · sign out)
 *   permanent left sidebar (fixed desktop / collapsible tablet / drawer mobile)
 *   content area that resizes with the sidebar.
 *
 * Collapse preference is persisted per user in localStorage.
 */
export function AppShell({
  user,
  role,
  companyName,
  counts,
  githubConnected,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const storageKey = useMemo(() => `bos:sidebar:collapsed:${user.id}`, [user.id]);

  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  /* ── Collapse persistence + tablet default ─────────── */
  useEffect(() => {
    // One-time hydration sync from localStorage — mirrors the established
    // theme-provider pattern (never a cascading render).
    const stored = window.localStorage.getItem(storageKey);
    if (stored === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration sync
      setCollapsed(true);
    } else if (stored === "0") {
      setCollapsed(false);
    } else {
      setCollapsed(window.matchMedia("(min-width: 768px) and (max-width: 1023px)").matches);
    }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey, collapsed ? "1" : "0");
  }, [collapsed, hydrated, storageKey]);

  /* ── Close drawer on route change ──────────────────── */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- route-change sync
    setDrawerOpen(false);
  }, [pathname]);

  /* ── ⌘K / Ctrl+K search · Escape closes overlays ───── */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
      if (e.key === "Escape") {
        setCommandOpen(false);
        setDrawerOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /* ── Lock body scroll while the drawer is open ─────── */
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), []);

  return (
    <div className="min-h-screen bg-[var(--bos-bg)]">
      {/* ── Slim top bar ─────────────────────────────── */}
      <header className="sticky top-0 z-40 h-14 border-b border-[var(--bos-line)] bg-[var(--bos-bg)]/85 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 sm:px-6 h-full">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            className="flex items-center justify-center w-8 h-8 -ml-1.5 rounded-sm text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)] transition-colors duration-150 md:hidden"
          >
            <Menu className="w-4.5 h-4.5" aria-hidden="true" />
          </button>

          <div className="md:hidden">
            <BusinessOSLogo size="sm" />
          </div>

          {/* Desktop: page context — "where am I" */}
          <div className="hidden md:flex items-center gap-2 min-w-0">
            <BusinessOSLogo size="sm" className="opacity-90" />
            <span className="w-px h-4 bg-[var(--bos-line-strong)]" aria-hidden="true" />
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)] truncate">
              {pathname === "/dashboard" ? "Overview" : (pathname.split("/")[1] ?? "Overview").replace(/-/g, " ")}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
            <div className="hidden lg:flex items-center gap-2 text-[9px] tracking-[0.14em] uppercase text-[var(--bos-text-tertiary)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--bos-success)] animate-pulse" />
              <span>System online</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ── Body: sidebar + content ───────────────────── */}
      <div className="flex items-start">
        {/* Desktop / tablet sidebar */}
        <aside
          className={cn(
            "sticky top-14 z-30 hidden md:block h-[calc(100vh-3.5rem)] shrink-0",
            "border-r border-[var(--bos-line)] overflow-y-auto overflow-x-hidden",
            "transition-[width] duration-200 ease-out",
            hydrated ? (collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH) : EXPANDED_WIDTH,
          )}
          aria-label="Business OS navigation"
        >
          <Sidebar
            user={user}
            role={role}
            companyName={companyName}
            counts={counts}
            githubConnected={githubConnected}
            collapsed={collapsed}
            onExpand={toggleCollapsed}
            onOpenCommand={() => setCommandOpen(true)}
          />

          {/* Collapse toggle */}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "sticky bottom-0 flex items-center justify-center w-full h-9 border-t border-[var(--bos-line)]",
              "bg-[var(--bos-bg)] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)]",
              "transition-colors duration-150",
            )}
          >
            {collapsed ? (
              <PanelLeft className="w-4 h-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* ── Mobile drawer ─────────────────────────────── */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="md:hidden">
            <motion.button
              aria-label="Close navigation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-[rgba(26,23,20,0.45)]"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-[290px] max-w-[85vw] bg-[var(--bos-bg)] border-r border-[var(--bos-line)] shadow-[var(--bos-shadow-lg)]"
            >
              <Sidebar
                user={user}
                role={role}
                companyName={companyName}
                counts={counts}
                githubConnected={githubConnected}
                collapsed={false}
                mobile
                onOpenCommand={() => {
                  setDrawerOpen(false);
                  setCommandOpen(true);
                }}
                onCloseDrawer={() => setDrawerOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Global command menu ───────────────────────── */}
      <CommandMenu open={commandOpen} onClose={() => setCommandOpen(false)} role={role} />
    </div>
  );
}
