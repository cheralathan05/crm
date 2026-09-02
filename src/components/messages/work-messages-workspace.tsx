"use client";

import { useState, useEffect, useRef } from "react";
import {
  Inbox,
  FolderKanban,
  Users,
  MessageSquare,
  AlertOctagon,
  ArrowRight,
  Send,
  Plus,
  Paperclip,
  CheckCircle2,
  ExternalLink,
  Shield,
  Clock,
  Layers,
  Sparkles,
  Search,
  ChevronRight,
  ChevronDown,
  X,
  Loader2,
  UserCheck,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function WorkMessagesWorkspace() {
  const [loading, setLoading] = useState(true);
  const [hubData, setHubData] = useState<any>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threadDetails, setThreadDetails] = useState<any>(null);
  const [threadLoading, setThreadLoading] = useState(false);

  // Left sidebar active navigation
  const [navSection, setNavSection] = useState<"inbox" | "projects" | "team" | "direct" | "blockers">("inbox");
  const [expandedProjectIds, setExpandedProjectIds] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");

  // Composer state
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);

  // Modals state
  const [showBlockerModal, setShowBlockerModal] = useState(false);
  const [blockerReason, setBlockerReason] = useState("");
  const [waitingOnRole, setWaitingOnRole] = useState("BACKEND");
  const [submittingBlocker, setSubmittingBlocker] = useState(false);

  const [showHandoffModal, setShowHandoffModal] = useState(false);
  const [handoffNote, setHandoffNote] = useState("");
  const [submittingHandoff, setSubmittingHandoff] = useState(false);

  const [showLinkWorkModal, setShowLinkWorkModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load hub data
  const loadHubData = async (preferredThreadId?: string) => {
    try {
      const res = await fetch("/api/messages/conversations");
      const json = await res.json();
      if (json.ok) {
        setHubData(json);
        if (preferredThreadId) {
          setSelectedThreadId(preferredThreadId);
        } else if (!selectedThreadId && json.conversations?.length > 0) {
          setSelectedThreadId(json.conversations[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load messages hub", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHubData();
  }, []);

  // Load conversation details when selectedThreadId changes
  useEffect(() => {
    if (!selectedThreadId) return;

    let isMounted = true;
    setThreadLoading(true);

    const fetchThread = async () => {
      try {
        const res = await fetch(`/api/messages/conversations/${selectedThreadId}`);
        const json = await res.json();
        if (json.ok && isMounted) {
          setThreadDetails(json.conversation);
          // Decrement unread in local state
          if (hubData?.conversations) {
            setHubData((prev: any) => ({
              ...prev,
              conversations: prev.conversations.map((c: any) =>
                c.id === selectedThreadId
                  ? {
                      ...c,
                      participants: c.participants.map((p: any) =>
                        p.employeeId === hubData.currentActor?.employeeId || p.userId === hubData.currentActor?.userId
                          ? { ...p, unreadCount: 0 }
                          : p,
                      ),
                    }
                  : c,
              ),
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load thread details", err);
      } finally {
        if (isMounted) setThreadLoading(false);
      }
    };

    fetchThread();

    return () => {
      isMounted = false;
    };
  }, [selectedThreadId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadDetails?.messages]);

  // Toggle project accordion
  const toggleProject = (projectId: string) => {
    setExpandedProjectIds((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  // Start direct conversation with an employee
  const handleStartDirect = async (
    targetEmployeeId: string,
    projectId?: string,
    taskId?: string,
    dependencyWorkstream?: string,
    dependencyLabel?: string,
  ) => {
    try {
      const res = await fetch("/api/messages/start-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetEmployeeId,
          projectId,
          taskId,
          dependencyWorkstream,
          dependencyLabel,
        }),
      });
      const json = await res.json();
      if (json.ok && json.threadId) {
        await loadHubData(json.threadId);
      }
    } catch (err) {
      console.error("Failed to start direct conversation", err);
    }
  };

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !selectedThreadId || sending) return;

    setSending(true);
    const content = inputText.trim();
    setInputText("");

    try {
      const res = await fetch(`/api/messages/conversations/${selectedThreadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          messageType: "TEXT",
        }),
      });
      const json = await res.json();
      if (json.ok && json.message) {
        setThreadDetails((prev: any) => ({
          ...prev,
          messages: [...(prev?.messages || []), json.message],
        }));
      }
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setSending(false);
    }
  };

  // Submit Blocker
  const handleSubmitBlocker = async () => {
    if (!blockerReason.trim() || submittingBlocker) return;
    setSubmittingBlocker(true);

    const projectId = threadDetails?.projectId || hubData?.myActiveTasks?.[0]?.projectId || hubData?.projects?.[0]?.id;
    const taskId = threadDetails?.taskId || hubData?.myActiveTasks?.[0]?.id;

    if (!projectId || !taskId) {
      alert("Please select an active project task first.");
      setSubmittingBlocker(false);
      return;
    }

    try {
      const res = await fetch("/api/messages/blocker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          taskId,
          blockerReason: blockerReason.trim(),
          waitingOnWorkstream: waitingOnRole,
          waitingOnLabel: `${waitingOnRole} API & Implementation`,
        }),
      });
      const json = await res.json();
      if (json.ok && json.threadId) {
        setShowBlockerModal(false);
        setBlockerReason("");
        await loadHubData(json.threadId);
      }
    } catch (err) {
      console.error("Failed to report blocker", err);
    } finally {
      setSubmittingBlocker(false);
    }
  };

  // Submit QA Handoff
  const handleSubmitHandoff = async () => {
    if (submittingHandoff) return;
    setSubmittingHandoff(true);

    const projectId = threadDetails?.projectId || hubData?.myActiveTasks?.[0]?.projectId;
    const taskId = threadDetails?.taskId || hubData?.myActiveTasks?.[0]?.id;

    if (!projectId || !taskId) {
      alert("No active task selected for handoff.");
      setSubmittingHandoff(false);
      return;
    }

    try {
      const res = await fetch("/api/messages/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          taskId,
          proofSummary: handoffNote.trim() || "Work completed and self-verified. Ready for QA testing.",
        }),
      });
      const json = await res.json();
      if (json.ok && json.threadId) {
        setShowHandoffModal(false);
        setHandoffNote("");
        await loadHubData(json.threadId);
      }
    } catch (err) {
      console.error("Failed to submit handoff", err);
    } finally {
      setSubmittingHandoff(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-[var(--bos-bg)]">
        <div className="flex items-center gap-3 text-xs font-mono text-[var(--bos-text-secondary)]">
          <Loader2 className="w-4 h-4 animate-spin text-[var(--bos-accent)]" />
          <span>Connecting to Real Work Communication Layer...</span>
        </div>
      </div>
    );
  }

  const actor = hubData?.currentActor;
  const conversations = hubData?.conversations || [];
  const projects = hubData?.projects || [];
  const allEmployees = hubData?.allEmployees || [];
  const myTasks = hubData?.myActiveTasks || [];

  // Filtered conversations
  const filteredConversations = conversations.filter((c: any) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.title?.toLowerCase().includes(q) ||
        c.project?.name?.toLowerCase().includes(q) ||
        c.task?.title?.toLowerCase().includes(q) ||
        c.lastMessagePreview?.toLowerCase().includes(q)
      );
    }
    if (navSection === "blockers") {
      return c.isBlocker || c.isHandoff;
    }
    return true;
  });

  return (
    <div className="h-[calc(100vh-3.8rem)] flex overflow-hidden bg-[var(--bos-bg)] text-[var(--bos-text-primary)] border-t border-[var(--bos-border)]">
      {/* ── COLUMN 1: LEFT SIDEBAR (WORK HUBS & ROSTERS) ──────────────────────── */}
      <aside className="w-80 shrink-0 border-r border-[var(--bos-border)] bg-[var(--bos-surface)] flex flex-col justify-between overflow-hidden">
        {/* Top Header & Search */}
        <div className="p-4 border-b border-[var(--bos-border)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--bos-accent)]/10 text-[var(--bos-accent)] flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-[13px] font-bold tracking-tight">Work Messages</h2>
                <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] block">
                  {actor?.isAdmin ? "Executive & Team Communication" : `${actor?.fullName} • ${actor?.department}`}
                </span>
              </div>
            </div>

            {hubData?.summary?.activeBlockersCount > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20 font-mono text-[10px] font-bold flex items-center gap-1">
                <AlertOctagon className="w-3 h-3" />
                {hubData.summary.activeBlockersCount}
              </span>
            )}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--bos-text-tertiary)]" />
            <input
              type="text"
              placeholder="Search work, projects, messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-xs placeholder:text-[var(--bos-text-tertiary)] focus:outline-hidden focus:border-[var(--bos-accent)]"
            />
          </div>
        </div>

        {/* Navigation Categories */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Main Views */}
          <div className="space-y-1 font-mono text-xs">
            <button
              onClick={() => setNavSection("inbox")}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-left",
                navSection === "inbox"
                  ? "bg-[var(--bos-accent)]/10 text-[var(--bos-accent)] font-bold"
                  : "text-[var(--bos-text-secondary)] hover:bg-[var(--bos-bg)] hover:text-[var(--bos-text-primary)]",
              )}
            >
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4" />
                <span>Inbox ({filteredConversations.length})</span>
              </div>
              {hubData?.summary?.totalUnread > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[var(--bos-accent)] text-white text-[10px] font-bold">
                  {hubData.summary.totalUnread}
                </span>
              )}
            </button>

            <button
              onClick={() => setNavSection("blockers")}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-left",
                navSection === "blockers"
                  ? "bg-rose-500/10 text-rose-500 font-bold"
                  : "text-[var(--bos-text-secondary)] hover:bg-[var(--bos-bg)] hover:text-[var(--bos-text-primary)]",
              )}
            >
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4" />
                <span>Blockers & Handoffs</span>
              </div>
              {hubData?.summary?.activeBlockersCount > 0 && (
                <span className="text-[10px] font-bold text-rose-500">
                  {hubData.summary.activeBlockersCount} Active
                </span>
              )}
            </button>
          </div>

          {/* Active Conversation Threads List */}
          {filteredConversations.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-tertiary)] block px-2 pt-1">
                ACTIVE CONVERSATIONS ({filteredConversations.length})
              </span>
              <div className="space-y-1">
                {filteredConversations.map((c: any) => {
                  const isSelected = selectedThreadId === c.id;
                  const myParticipant = c.participants?.find(
                    (p: any) =>
                      (actor?.employeeId && p.employeeId === actor.employeeId) ||
                      (actor?.userId && p.userId === actor.userId),
                  );
                  const unread = myParticipant?.unreadCount || 0;

                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedThreadId(c.id)}
                      className={cn(
                        "w-full p-2.5 rounded-xl border text-left transition-all block space-y-1 group cursor-pointer",
                        isSelected
                          ? "bg-[var(--bos-accent-subtle)] border-[var(--bos-accent)] shadow-xs"
                          : "bg-[var(--bos-bg)] border-[var(--bos-border)]/60 hover:border-[var(--bos-accent)]/50",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-[12px] truncate block text-[var(--bos-text-primary)]">
                          {c.title}
                        </strong>
                        {unread > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-[var(--bos-accent)] text-white font-mono text-[9px] font-bold shrink-0">
                            {unread}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
                        {c.project && (
                          <span className="text-[var(--bos-accent)] font-semibold truncate max-w-[120px]">
                            {c.project.name}
                          </span>
                        )}
                        {c.isBlocker && (
                          <span className="px-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                            BLOCKER
                          </span>
                        )}
                        {c.isHandoff && (
                          <span className="px-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                            QA
                          </span>
                        )}
                      </div>

                      {c.lastMessagePreview && (
                        <p className="text-[11px] text-[var(--bos-text-secondary)] line-clamp-1">
                          {c.lastMessagePreview}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section: REAL PROJECTS & ENGINEERING ROSTERS */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-2 pt-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-tertiary)]">
                REAL PROJECTS & ROSTERS
              </span>
              <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">{projects.length} Active</span>
            </div>

            <div className="space-y-1">
              {projects.map((p: any) => {
                const isExpanded = !!expandedProjectIds[p.id];

                return (
                  <div key={p.id} className="rounded-xl border border-[var(--bos-border)]/60 bg-[var(--bos-bg)]/40 overflow-hidden">
                    <button
                      onClick={() => toggleProject(p.id)}
                      className="w-full flex items-center justify-between p-2.5 hover:bg-[var(--bos-bg)] transition-colors text-left"
                    >
                      <div className="space-y-0.5 truncate pr-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-mono text-[9px] px-1 rounded bg-[var(--bos-accent)]/10 text-[var(--bos-accent)] font-bold">
                            {p.code || "PRJ"}
                          </span>
                          <strong className="text-[12px] truncate">{p.name}</strong>
                        </div>
                        <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] block">
                          Client: {p.clientName} · {p.stage}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-[var(--bos-text-tertiary)] shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[var(--bos-text-tertiary)] shrink-0" />
                      )}
                    </button>

                    {/* Expanded Real Discipline Roster */}
                    {isExpanded && (
                      <div className="p-2.5 pt-0 space-y-2 border-t border-[var(--bos-border)]/40 bg-[var(--bos-surface)]/60 text-xs font-mono">
                        {/* FRONTEND */}
                        <div className="space-y-1">
                          <span className="text-[9.5px] font-bold text-sky-400 block uppercase">
                            FRONTEND ({p.roster.frontend.length})
                          </span>
                          {p.roster.frontend.length > 0 ? (
                            p.roster.frontend.map((emp: any) => (
                              <button
                                key={emp.id}
                                onClick={() => handleStartDirect(emp.id, p.id)}
                                className="w-full flex items-center justify-between p-1.5 rounded hover:bg-[var(--bos-bg)] text-left group"
                              >
                                <span className="text-[11px] truncate group-hover:text-[var(--bos-accent)]">
                                  • {emp.name}
                                </span>
                                <span className="text-[9px] text-[var(--bos-text-tertiary)]">Contact →</span>
                              </button>
                            ))
                          ) : (
                            <span className="text-[10px] text-[var(--bos-text-tertiary)] italic pl-2 block">
                              Not assigned
                            </span>
                          )}
                        </div>

                        {/* BACKEND */}
                        <div className="space-y-1">
                          <span className="text-[9.5px] font-bold text-emerald-400 block uppercase">
                            BACKEND ({p.roster.backend.length})
                          </span>
                          {p.roster.backend.length > 0 ? (
                            p.roster.backend.map((emp: any) => (
                              <button
                                key={emp.id}
                                onClick={() => handleStartDirect(emp.id, p.id)}
                                className="w-full flex items-center justify-between p-1.5 rounded hover:bg-[var(--bos-bg)] text-left group"
                              >
                                <span className="text-[11px] truncate group-hover:text-[var(--bos-accent)]">
                                  • {emp.name}
                                </span>
                                <span className="text-[9px] text-[var(--bos-text-tertiary)]">Contact →</span>
                              </button>
                            ))
                          ) : (
                            <span className="text-[10px] text-[var(--bos-text-tertiary)] italic pl-2 block">
                              Not assigned
                            </span>
                          )}
                        </div>

                        {/* DATABASE */}
                        <div className="space-y-1">
                          <span className="text-[9.5px] font-bold text-purple-400 block uppercase">
                            DATABASE ({p.roster.database.length})
                          </span>
                          {p.roster.database.length > 0 ? (
                            p.roster.database.map((emp: any) => (
                              <button
                                key={emp.id}
                                onClick={() => handleStartDirect(emp.id, p.id)}
                                className="w-full flex items-center justify-between p-1.5 rounded hover:bg-[var(--bos-bg)] text-left group"
                              >
                                <span className="text-[11px] truncate group-hover:text-[var(--bos-accent)]">
                                  • {emp.name}
                                </span>
                                <span className="text-[9px] text-[var(--bos-text-tertiary)]">Contact →</span>
                              </button>
                            ))
                          ) : (
                            <span className="text-[10px] text-[var(--bos-text-tertiary)] italic pl-2 block">
                              Not assigned
                            </span>
                          )}
                        </div>

                        {/* QA */}
                        <div className="space-y-1">
                          <span className="text-[9.5px] font-bold text-amber-400 block uppercase">
                            QA ({p.roster.qa.length})
                          </span>
                          {p.roster.qa.length > 0 ? (
                            p.roster.qa.map((emp: any) => (
                              <button
                                key={emp.id}
                                onClick={() => handleStartDirect(emp.id, p.id)}
                                className="w-full flex items-center justify-between p-1.5 rounded hover:bg-[var(--bos-bg)] text-left group"
                              >
                                <span className="text-[11px] truncate group-hover:text-[var(--bos-accent)]">
                                  • {emp.name}
                                </span>
                                <span className="text-[9px] text-[var(--bos-text-tertiary)]">Contact →</span>
                              </button>
                            ))
                          ) : (
                            <span className="text-[10px] text-[var(--bos-text-tertiary)] italic pl-2 block">
                              Not assigned
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {projects.length === 0 && (
                <div className="p-3 text-center rounded-lg bg-[var(--bos-bg)] text-[11px] text-[var(--bos-text-tertiary)]">
                  No active projects found.
                </div>
              )}
            </div>
          </div>

          {/* Section: DIRECT TEAMMATES */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-tertiary)] block px-2 pt-2">
              TEAMMATES ({allEmployees.length})
            </span>

            <div className="space-y-1">
              {allEmployees.map((emp: any) => (
                <button
                  key={emp.id}
                  onClick={() => handleStartDirect(emp.id)}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[var(--bos-bg)] text-left transition-colors group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-6 h-6 rounded-full bg-[var(--bos-accent)]/10 text-[var(--bos-accent)] font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                      {emp.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <span className="text-[12px] font-medium block truncate group-hover:text-[var(--bos-accent)]">
                        {emp.fullName}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] block truncate">
                        {emp.role?.name || emp.department}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-mono text-[var(--bos-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity">
                    Chat →
                  </span>
                </button>
              ))}

              {allEmployees.length === 0 && (
                <div className="p-3 text-center rounded-lg bg-[var(--bos-bg)] text-[11px] text-[var(--bos-text-tertiary)]">
                  No team members assigned.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="p-3 border-t border-[var(--bos-border)] bg-[var(--bos-surface)] flex items-center justify-between">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 rounded-full bg-[var(--bos-accent)] text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
              {actor?.fullName ? actor.fullName.slice(0, 2).toUpperCase() : "AD"}
            </div>
            <div className="truncate">
              <strong className="text-xs truncate block">{actor?.fullName}</strong>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Work Connection
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── COLUMN 2: CENTER (CONVERSATION STREAM) ───────────────────────────── */}
      <main className="flex-1 flex flex-col justify-between overflow-hidden bg-[var(--bos-bg)]">
        {selectedThreadId && threadDetails ? (
          <>
            {/* Conversation Header */}
            <div className="p-3.5 px-6 border-b border-[var(--bos-border)] bg-[var(--bos-surface)]/80 backdrop-blur-md flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-[14px] font-bold text-[var(--bos-text-primary)]">
                    {threadDetails.title}
                  </h3>
                  {threadDetails.isBlocker && (
                    <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono text-[10px] font-bold uppercase">
                      BLOCKER ACTIVE
                    </span>
                  )}
                  {threadDetails.isHandoff && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono text-[10px] font-bold uppercase">
                      QA HANDOFF
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--bos-text-tertiary)] flex-wrap">
                  <span>Project: <strong className="text-[var(--bos-text-primary)]">{threadDetails.project?.name || "Workspace"}</strong></span>
                  {threadDetails.task && (
                    <>
                      <span>•</span>
                      <span>Task: <strong className="text-[var(--bos-text-primary)]">{threadDetails.task.code} · {threadDetails.task.title}</strong></span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {threadDetails.taskId && (
                  <Link
                    href={`/tasks?selected=${threadDetails.taskId}`}
                    className="px-3 py-1.5 rounded-lg border border-[var(--bos-border)] hover:bg-[var(--bos-surface)] font-mono text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <span>Open Work</span>
                    <ExternalLink className="w-3 h-3 text-[var(--bos-text-tertiary)]" />
                  </Link>
                )}
              </div>
            </div>

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {threadDetails.messages?.map((msg: any) => {
                const isMe =
                  (actor?.employeeId && msg.senderEmployeeId === actor.employeeId) ||
                  (actor?.userId && msg.senderUserId === actor.userId);

                let meta: any = {};
                try {
                  meta = JSON.parse(msg.metadata || "{}");
                } catch {}

                return (
                  <div
                    key={msg.id}
                    className={cn("flex flex-col max-w-xl space-y-1", isMe ? "ml-auto items-end" : "mr-auto items-start")}
                  >
                    <div className="flex items-center gap-2 px-1 text-[10.5px] font-mono text-[var(--bos-text-tertiary)]">
                      <strong className={cn(isMe ? "text-[var(--bos-accent)]" : "text-[var(--bos-text-primary)]")}>
                        {msg.senderName}
                      </strong>
                      <span>•</span>
                      <span>{msg.senderRole || "Specialist"}</span>
                      <span>•</span>
                      <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={cn(
                        "p-3.5 rounded-2xl text-[12.5px] leading-relaxed shadow-xs space-y-2",
                        msg.messageType === "BLOCKER"
                          ? "bg-rose-500/10 border border-rose-500/30 text-rose-200"
                          : msg.messageType === "HANDOFF"
                          ? "bg-amber-500/10 border border-amber-500/30 text-amber-200"
                          : msg.messageType === "WORK_LINK"
                          ? "bg-sky-500/10 border border-sky-500/30 text-sky-200"
                          : isMe
                          ? "bg-[var(--bos-accent)] text-white"
                          : "bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-primary)]",
                      )}
                    >
                      {/* Special Banner if Blocker/Handoff */}
                      {msg.messageType === "BLOCKER" && (
                        <div className="flex items-center gap-1.5 text-[10.5px] font-mono font-bold text-rose-400 uppercase tracking-wider pb-1 border-b border-rose-500/20">
                          <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                          <span>Reported Work Blocker</span>
                        </div>
                      )}

                      {msg.messageType === "HANDOFF" && (
                        <div className="flex items-center gap-1.5 text-[10.5px] font-mono font-bold text-amber-400 uppercase tracking-wider pb-1 border-b border-amber-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Handoff Ready For QA Verification</span>
                        </div>
                      )}

                      <p className="whitespace-pre-wrap">{msg.content}</p>

                      {/* Work DNA Links */}
                      {meta?.taskCode && (
                        <div className="p-2 rounded-lg bg-black/20 border border-white/10 text-[11px] font-mono flex items-center justify-between gap-2 mt-2">
                          <span>Task: {meta.taskCode} · {meta.taskTitle}</span>
                          <Link
                            href={`/tasks?selected=${meta.taskId || ""}`}
                            className="text-white hover:underline flex items-center gap-1 shrink-0 font-bold"
                          >
                            <span>Open Work</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {(!threadDetails.messages || threadDetails.messages.length === 0) && (
                <div className="h-full flex items-center justify-center text-xs font-mono text-[var(--bos-text-tertiary)]">
                  No messages yet.
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Composer Bar */}
            <div className="p-4 border-t border-[var(--bos-border)] bg-[var(--bos-surface)] space-y-2">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                {/* [ + ] Action Menu */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowActionMenu(!showActionMenu)}
                    className="p-2 rounded-xl border border-[var(--bos-border)] hover:bg-[var(--bos-bg)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] transition-colors cursor-pointer"
                    title="Work Actions"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  {showActionMenu && (
                    <div className="absolute bottom-12 left-0 w-52 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-xl shadow-xl p-1.5 space-y-1 font-mono text-xs z-50 animate-in fade-in slide-in-from-bottom-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionMenu(false);
                          setShowBlockerModal(true);
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-rose-500/10 text-rose-400 text-left transition-colors cursor-pointer"
                      >
                        <AlertOctagon className="w-3.5 h-3.5" />
                        <span>Report Blocker</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowActionMenu(false);
                          setShowHandoffModal(true);
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-amber-500/10 text-amber-400 text-left transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Send to QA</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowActionMenu(false);
                          setShowLinkWorkModal(true);
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--bos-bg)] text-[var(--bos-text-primary)] text-left transition-colors cursor-pointer"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Link Active Work</span>
                      </button>
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Type message regarding this work context..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 px-4 py-2 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl text-xs placeholder:text-[var(--bos-text-tertiary)] focus:outline-hidden focus:border-[var(--bos-accent)]"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="px-4 py-2 bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white font-mono text-xs font-bold rounded-xl transition-all disabled:opacity-40 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Send</span>
                </button>
              </form>

              <div className="flex items-center justify-between text-[10.5px] font-mono text-[var(--bos-text-tertiary)] px-1">
                <span>Direct real-time update • Linked to live project state</span>
                <span>Press Enter to send</span>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3 text-[var(--bos-text-tertiary)]">
            <div className="w-12 h-12 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[var(--bos-text-primary)]">Select a Work Conversation</h3>
              <p className="text-xs max-w-sm">
                Choose a project room, teammate direct thread, or open a dependency to begin real-time work communication.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* ── COLUMN 3: RIGHT WORK CONTEXT PANEL ──────────────────────────────── */}
      {selectedThreadId && threadDetails && (
        <aside className="w-72 shrink-0 border-l border-[var(--bos-border)] bg-[var(--bos-surface)] flex flex-col justify-between overflow-y-auto p-4 space-y-4">
          <div className="space-y-4">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-tertiary)] block">
              WORK CONTEXT
            </span>

            {/* PROJECT CARD */}
            <div className="p-3.5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] space-y-1.5">
              <span className="text-[9.5px] font-mono text-[var(--bos-text-tertiary)] uppercase font-bold block">
                PROJECT
              </span>
              <strong className="text-xs block text-[var(--bos-text-primary)] leading-snug">
                {threadDetails.project?.name || "Workspace Delivery"}
              </strong>
              <span className="text-[10.5px] font-mono text-[var(--bos-accent)] block">
                Stage: {threadDetails.project?.stage || "DEVELOPMENT"}
              </span>
            </div>

            {/* WORK ITEM CARD */}
            <div className="p-3.5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] space-y-1.5">
              <span className="text-[9.5px] font-mono text-[var(--bos-text-tertiary)] uppercase font-bold block">
                WORK
              </span>
              <strong className="text-xs block text-[var(--bos-text-primary)] leading-snug">
                {threadDetails.task?.title || "Project Milestone & Scope"}
              </strong>
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold">
                  {threadDetails.task?.layer || "ENGINEERING"}
                </span>
                <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">
                  {threadDetails.task?.status || "ACTIVE"}
                </span>
              </div>
            </div>

            {/* DEPENDENCY STATUS */}
            <div className="p-3.5 rounded-xl bg-[var(--bos-bg)] border border-[var(--bos-border)] space-y-2">
              <span className="text-[9.5px] font-mono text-[var(--bos-text-tertiary)] uppercase font-bold block">
                WAITING FOR
              </span>
              <strong className="text-xs block text-[var(--bos-text-primary)]">
                {threadDetails.linkedDependency?.name || "Backend API & Services"}
              </strong>

              <div className="pt-1 border-t border-[var(--bos-border)]/60 text-[11px] font-mono space-y-1">
                <div className="flex items-center justify-between text-[var(--bos-text-secondary)]">
                  <span>Assigned:</span>
                  <strong className="text-[var(--bos-text-primary)]">
                    {threadDetails.linkedDependency?.assignedEmployee?.name || "Not assigned"}
                  </strong>
                </div>

                {threadDetails.linkedDependency?.assignedEmployee && (
                  <button
                    onClick={() =>
                      handleStartDirect(
                        threadDetails.linkedDependency.assignedEmployee.id,
                        threadDetails.projectId,
                        threadDetails.taskId,
                        threadDetails.linkedDependency.role,
                        threadDetails.linkedDependency.name,
                      )
                    }
                    className="w-full mt-2 py-1.5 rounded-lg bg-[var(--bos-accent)]/10 hover:bg-[var(--bos-accent)]/20 text-[var(--bos-accent)] font-bold text-[11px] transition-colors cursor-pointer text-center block"
                  >
                    Contact {threadDetails.linkedDependency.role} →
                  </button>
                )}
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="space-y-1.5 pt-2">
              <button
                onClick={() => setShowBlockerModal(true)}
                className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Report Blocker</span>
              </button>

              <button
                onClick={() => setShowHandoffModal(true)}
                className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Send to QA</span>
              </button>
            </div>
          </div>

          <div className="text-[10px] font-mono text-[var(--bos-text-tertiary)] text-center pt-3 border-t border-[var(--bos-border)]">
            Business OS Communication Layer
          </div>
        </aside>
      )}

      {/* ── MODAL 1: REPORT BLOCKER ─────────────────────────────────────────── */}
      {showBlockerModal && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertOctagon className="w-5 h-5" />
                <h3 className="text-sm font-bold">Report Work Blocker</h3>
              </div>
              <button onClick={() => setShowBlockerModal(false)}><X className="w-5 h-5" /></button>
            </div>

            <div className="p-3 bg-[var(--bos-bg)] rounded-xl border border-[var(--bos-border)] text-xs font-mono space-y-1">
              <div>Project: <strong>{threadDetails?.project?.name || hubData?.myActiveTasks?.[0]?.project?.name || "Active Project"}</strong></div>
              <div>Work: <strong>{threadDetails?.task?.title || hubData?.myActiveTasks?.[0]?.title || "Current Task"}</strong></div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-mono text-[11px] text-[var(--bos-text-secondary)]">Waiting On Layer / Role</label>
                <select
                  value={waitingOnRole}
                  onChange={(e) => setWaitingOnRole(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg font-mono text-xs"
                >
                  <option value="BACKEND">Backend API & Implementation</option>
                  <option value="DATABASE">Database Schema & Migrations</option>
                  <option value="DESIGN">UX / Design Deliverables</option>
                  <option value="QA">QA Test Specification</option>
                  <option value="ADMIN">Admin Scope Clarification</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-mono text-[11px] text-[var(--bos-text-secondary)]">What is blocking you?</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Product API returns 500 error on POST /api/products."
                  value={blockerReason}
                  onChange={(e) => setBlockerReason(e.target.value)}
                  className="w-full p-3 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-xs focus:outline-hidden focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--bos-border)] font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setShowBlockerModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--bos-border)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!blockerReason.trim() || submittingBlocker}
                  onClick={handleSubmitBlocker}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {submittingBlocker ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertOctagon className="w-3.5 h-3.5" />}
                  <span>Submit Blocker</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: SEND TO QA ──────────────────────────────────────────────── */}
      {showHandoffModal && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="text-sm font-bold">Handoff Work to QA</h3>
              </div>
              <button onClick={() => setShowHandoffModal(false)}><X className="w-5 h-5" /></button>
            </div>

            <div className="p-3 bg-[var(--bos-bg)] rounded-xl border border-[var(--bos-border)] text-xs font-mono space-y-1">
              <div>Project: <strong>{threadDetails?.project?.name || hubData?.myActiveTasks?.[0]?.project?.name || "Active Project"}</strong></div>
              <div>Work: <strong>{threadDetails?.task?.title || hubData?.myActiveTasks?.[0]?.title || "Current Task"}</strong></div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-mono text-[11px] text-[var(--bos-text-secondary)]">Handoff Verification Note (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. All UI components completed, API integration tested against staging endpoints."
                  value={handoffNote}
                  onChange={(e) => setHandoffNote(e.target.value)}
                  className="w-full p-3 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-xs focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--bos-border)] font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setShowHandoffModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--bos-border)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingHandoff}
                  onClick={handleSubmitHandoff}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {submittingHandoff ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Dispatch to QA</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: LINK ACTIVE WORK ────────────────────────────────────────── */}
      {showLinkWorkModal && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Link Active Work Task</h3>
              <button onClick={() => setShowLinkWorkModal(false)}><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {myTasks.map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setShowLinkWorkModal(false);
                    handleSendMessage();
                  }}
                  className="w-full p-3 rounded-xl border border-[var(--bos-border)] bg-[var(--bos-bg)] hover:border-[var(--bos-accent)] text-left space-y-1 transition-colors block"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-[var(--bos-accent)] font-bold">{t.code}</span>
                    <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)]">{t.layer}</span>
                  </div>
                  <strong className="text-xs block text-[var(--bos-text-primary)]">{t.title}</strong>
                </button>
              ))}

              {myTasks.length === 0 && (
                <div className="p-4 text-center text-xs text-[var(--bos-text-tertiary)]">
                  No active assigned tasks.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
