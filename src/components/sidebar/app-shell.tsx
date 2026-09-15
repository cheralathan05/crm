"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import {
  CheckSquare,
  LayoutDashboard,
  Menu,
  MessageSquare,
  PanelLeft,
  PanelLeftClose,
  Users,
  FolderKanban,
} from "lucide-react";
import { BusinessOSLogo } from "@/components/business-os-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import type { UserRole } from "@/lib/navigation";
import type { SidebarCounts } from "@/lib/sidebar-data";
import { cn } from "@/lib/utils";
import { CommandMenu } from "./command-menu";
import { Sidebar } from "./sidebar";
import Link from "next/link";

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

/** Mobile bottom nav — 5 key destinations for quick thumb access. */
const BOTTOM_NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/clients",   icon: Users,           label: "Clients"  },
  { href: "/tasks",     icon: CheckSquare,     label: "Tasks"    },
  { href: "/projects",  icon: FolderKanban,    label: "Projects" },
  { href: "/messages",  icon: MessageSquare,   label: "Messages" },
] as const;

/** Returns a human-friendly page name from the current path. */
function pageLabel(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean)[0] ?? "overview";
  if (seg === "dashboard") return "Overview";
  return seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * The authenticated application shell:
 *   slim top bar (brand · system · theme · sign out)
 *   permanent left sidebar (fixed desktop / collapsible tablet / drawer mobile)
 *   mobile bottom navigation bar (5 core modules + More drawer)
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

  /* ── Swipe-left to close the mobile drawer ──────────── */
  const drawerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  useEffect(() => {
    const el = drawerRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0]?.clientX ?? 0;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
      if (dx < -60) setDrawerOpen(false);
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [drawerOpen]);

  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), []);
  const currentPage = pageLabel(pathname);

  return (
    <div className="min-h-screen bg-[var(--bos-bg)] w-full max-w-[100vw] overflow-x-hidden">
      {/* ── Slim top bar ─────────────────────────────── */}
      <header className="sticky top-0 z-40 h-14 border-b border-[var(--bos-line)] bg-[var(--bos-bg)]/85 backdrop-blur-sm">
        <div className="flex items-center gap-2 px-2 sm:px-6 h-full">
          {/* Hamburger — 44×44 touch target (mobile only) */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            className="flex items-center justify-center w-11 h-11 rounded-xl text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-overlay)] active:scale-95 transition-all duration-150 md:hidden cursor-pointer touch-fast shrink-0"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Mobile: logo + current page name */}
          <div className="md:hidden flex items-center gap-2 min-w-0">
            <BusinessOSLogo size="sm" />
            <span className="w-px h-4 bg-[var(--bos-line-strong)]" aria-hidden="true" />
            <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--bos-text-secondary)] truncate">
              {currentPage}
            </span>
          </div>

          {/* Desktop: logo + page context */}
          <div className="hidden md:flex items-center gap-2 min-w-0">
            <BusinessOSLogo size="sm" className="opacity-90" />
            <span className="w-px h-4 bg-[var(--bos-line-strong)]" aria-hidden="true" />
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--bos-text-tertiary)] truncate">
              {currentPage}
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
      <div className="flex items-start w-full max-w-full overflow-x-hidden">
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

        {/* Content — extra bottom padding on mobile to clear the bottom nav bar */}
        <main className="flex-1 min-w-0 max-w-full overflow-x-hidden md:pb-0 pb-[calc(56px+env(safe-area-inset-bottom,0px))]">
          {children}
        </main>
      </div>

      {/* ── Mobile drawer ─────────────────────────────── */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="md:hidden">
            {/* Backdrop */}
            <motion.button
              aria-label="Close navigation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-[rgba(26,23,20,0.52)] backdrop-blur-[2px]"
            />
            {/* Drawer panel */}
            <motion.div
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-[300px] max-w-[88vw] bg-[var(--bos-bg)] border-r border-[var(--bos-line)] shadow-[var(--bos-shadow-lg)]"
              style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
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

      {/* ── Mobile bottom navigation bar ──────────────── */}
      <nav aria-label="Quick navigation" className="mobile-bottom-nav md:hidden">
        <div className="relative flex items-stretch h-[56px]">
          {BOTTOM_NAV.map(({ href, icon: Icon, label }) => {
            const isActive =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex-1 flex flex-col items-center justify-center gap-[3px] touch-fast transition-colors duration-150",
                  isActive
                    ? "text-[var(--bos-accent)]"
                    : "text-[var(--bos-text-tertiary)]",
                )}
              >
                {/* Active indicator bar at top */}
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-[2px] rounded-b-full bg-[var(--bos-accent)]" />
                )}
                <Icon className="w-[19px] h-[19px] shrink-0" aria-hidden="true" />
                <span className="text-[8.5px] font-medium tracking-[0.06em] leading-none">
                  {label}
                </span>
              </Link>
            );
          })}

          {/* "More" opens the full sidebar drawer */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="All modules"
            className="flex-1 flex flex-col items-center justify-center gap-[3px] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-secondary)] touch-fast transition-colors duration-150"
          >
            <Menu className="w-[19px] h-[19px] shrink-0" aria-hidden="true" />
            <span className="text-[8.5px] font-medium tracking-[0.06em] leading-none">More</span>
          </button>
        </div>
      </nav>

      {/* ── Global command menu ───────────────────────── */}
      <CommandMenu open={commandOpen} onClose={() => setCommandOpen(false)} role={role} />
    </div>
  );
}
