"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  MessageSquare,
  Search,
  Send,
  Loader2,
  Sparkles,
  AlertOctagon,
  CheckCircle2,
  ExternalLink,
  Shield,
  Clock,
  ArrowRight,
  ChevronRight,
  Filter,
  Layers,
  FileCheck2,
  Tag,
  Lightbulb,
} from "lucide-react";
import { WorkMessageType } from "@/lib/messages/work-messages.service";

interface EmployeeMessagesViewProps {
  initialThreadId?: string | null;
  onNavigateTab: (tab: string, context?: any) => void;
}

export function EmployeeMessagesView({
  initialThreadId,
  onNavigateTab,
}: EmployeeMessagesViewProps) {
  const [tabFilter, setTabFilter] = useState<"INBOX" | "PROJECT" | "TEAM" | "DIRECT" | "INTERNAL" | "SENT">("INBOX");
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentActor, setCurrentActor] = useState<any | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(initialThreadId || null);
  const [activeConversation, setActiveConversation] = useState<any | null>(null);
  const [loadingHub, setLoadingHub] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);

  // Composer State
  const [messageText, setMessageText] = useState("");
  const [selectedType, setSelectedType] = useState<WorkMessageType>("TEXT");
  const [sending, setSending] = useState(false);

  // AI Summary State
  const [aiSummary, setAiSummary] = useState<{ summary: string; openItems: string[] } | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  // Decision Modal/State
  const [markingDecisionId, setMarkingDecisionId] = useState<string | null>(null);
  const [decisionFeedback, setDecisionFeedback] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch Hub Data (Conversations List)
  const fetchHub = useCallback(async () => {
    try {
      setLoadingHub(true);
      const res = await fetch("/api/messages/conversations");
      const json = await res.json();
      if (json.ok) {
        setConversations(json.conversations || []);
        setCurrentActor(json.currentActor || null);
        if (!activeConversationId && json.conversations?.length > 0) {
          setActiveConversationId(json.conversations[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load messages hub:", err);
    } finally {
      setLoadingHub(false);
    }
  }, [activeConversationId]);

  // Fetch Specific Conversation Stream
  const fetchConversation = useCallback(async (conversationId: string) => {
    try {
      setLoadingChat(true);
      setAiSummary(null);
      const res = await fetch(`/api/messages/conversations/${conversationId}`);
      const json = await res.json();
      if (json.ok) {
        setActiveConversation(json.conversation);
      }
    } catch (err) {
      console.error("Failed to load conversation:", err);
    } finally {
      setLoadingChat(false);
    }
  }, []);

  useEffect(() => {
    fetchHub();
  }, [fetchHub]);

  useEffect(() => {
    if (activeConversationId) {
      fetchConversation(activeConversationId);
    }
  }, [activeConversationId, fetchConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  // Auto-infer message type from typed content
  const handleTextChange = (text: string) => {
    setMessageText(text);
    const lower = text.toLowerCase();
    if (
      (lower.includes("block") || lower.includes("500") || lower.includes("broken") || lower.includes("error")) &&
      selectedType === "TEXT"
    ) {
      setSelectedType("BLOCKER");
    } else if (lower.includes("?") && selectedType === "TEXT") {
      setSelectedType("QUESTION");
    }
  };

  // Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConversationId) return;

    try {
      setSending(true);
      const res = await fetch(`/api/messages/conversations/${activeConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: messageText.trim(),
          messageType: selectedType,
          metadata: {
            projectId: activeConversation?.projectId,
            taskId: activeConversation?.taskId,
            taskTitle: activeConversation?.task?.title,
            dependencyLabel: activeConversation?.dependencyLabel,
          },
        }),
      });

      if (res.ok) {
        setMessageText("");
        setSelectedType("TEXT");
        await fetchConversation(activeConversationId);
        fetchHub();
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  // AI Summary Handler
  const handleSummarize = async () => {
    if (!activeConversationId) return;
    try {
      setSummarizing(true);
      const res = await fetch("/api/employee/conversations/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeConversationId }),
      });
      const json = await res.json();
      if (json.ok && json.data) {
        setAiSummary(json.data);
      }
    } catch (err) {
      console.error("Failed to summarize:", err);
    } finally {
      setSummarizing(false);
    }
  };

  // Mark Message as Decision
  const handleMarkAsDecision = async (messageId: string, content: string) => {
    try {
      setMarkingDecisionId(messageId);
      const res = await fetch("/api/employee/work/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          decisionText: content,
          reason: `Recorded from work conversation in ${activeConversation?.title}`,
        }),
      });

      if (res.ok) {
        setDecisionFeedback("Decision recorded and saved to project memory.");
        setTimeout(() => setDecisionFeedback(null), 4000);
        await fetchConversation(activeConversationId!);
      }
    } catch (err) {
      console.error("Failed to mark as decision:", err);
    } finally {
      setMarkingDecisionId(null);
    }
  };

  // Filter Conversations
  const filteredConversations = conversations.filter((c) => {
    // Type tab filter
    if (tabFilter === "PROJECT" && (!c.projectId && c.type !== "PROJECT" && c.type !== "WORK_ITEM")) return false;
    if (tabFilter === "DIRECT" && c.type !== "DIRECT") return false;
    if (tabFilter === "TEAM" && c.type !== "TEAM" && c.type !== "DEPARTMENT" && c.type !== "WORKSTREAM") return false;
    if (tabFilter === "INTERNAL" && (c.projectId !== null || c.type === "PROJECT" || c.type === "WORK_ITEM")) return false;
    if (tabFilter === "SENT") {
      const lastMsg = c.messages?.[0];
      const isSentByMe =
        (currentActor?.employeeId && lastMsg?.senderEmployeeId === currentActor.employeeId) ||
        (currentActor?.userId && lastMsg?.senderUserId === currentActor.userId);
      if (!isSentByMe) return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = c.title?.toLowerCase().includes(q);
      const matchProject = c.project?.name?.toLowerCase().includes(q);
      const matchTask = c.task?.title?.toLowerCase().includes(q);
      const matchParticipant = c.participants?.some((p: any) =>
        (p.employee?.fullName || p.user?.name || "").toLowerCase().includes(q),
      );
      return matchTitle || matchProject || matchTask || matchParticipant;
    }

    return true;
  });

  return (
    <div className="h-[calc(100vh-140px)] min-h-[600px] flex flex-col md:flex-row rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] overflow-hidden shadow-2xl animate-in fade-in duration-300">
      {/* ── LEFT SIDEBAR: CONVERSATION LIST ────────────────────────── */}
      <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-[var(--bos-border)] flex flex-col bg-[var(--bos-surface)]/40 shrink-0">
        {/* Sidebar Header & Filters */}
        <div className="p-4 border-b border-[var(--bos-border)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[var(--bos-accent)]" />
              <span className="font-mono text-xs font-bold text-[var(--bos-text-primary)] uppercase tracking-wider">
                Work Conversations
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[10px] font-mono text-[var(--bos-text-secondary)]">
              {conversations.length}
            </span>
          </div>

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search work, project, peer..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs font-mono text-[var(--bos-text-primary)] placeholder-[var(--bos-text-tertiary)] focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Tabs: Inbox | Project Messages | My Team | Direct | Internal | Sent */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 font-mono text-[11px] no-scrollbar">
            {[
              { id: "INBOX", label: "Inbox" },
              { id: "PROJECT", label: "Project Messages" },
              { id: "TEAM", label: "My Team" },
              { id: "DIRECT", label: "Direct" },
              { id: "INTERNAL", label: "Internal" },
              { id: "SENT", label: "Sent" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTabFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap font-medium text-xs ${
                  tabFilter === tab.id
                    ? "bg-[var(--bos-accent)] text-white font-bold shadow-sm"
                    : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--bos-border)]">
          {loadingHub ? (
            <div className="p-8 text-center text-xs font-mono text-[var(--bos-text-tertiary)] flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--bos-accent)]" />
              <span>Loading conversations...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-[var(--bos-text-tertiary)] space-y-2">
              <div>No conversations found.</div>
              <p className="text-[11px] text-[var(--bos-text-tertiary)]">
                Click [CONTACT TEAM] or [Message] from any work item to open a conversation.
              </p>
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isSelected = activeConversationId === c.id;
              const hasUnread = c.participants?.some(
                (p: any) =>
                  p.unreadCount > 0 &&
                  (p.employeeId === currentActor?.employeeId || p.userId === currentActor?.userId),
              );
              const lastMsg = c.messages?.[0];

              return (
                <button
                  key={c.id}
                  onClick={() => setActiveConversationId(c.id)}
                  className={`w-full p-3.5 text-left transition-all flex flex-col gap-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-[var(--bos-accent)]/10 border-l-4 border-l-[var(--bos-accent)]"
                      : "hover:bg-[var(--bos-surface)]/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[var(--bos-text-primary)] truncate max-w-[200px]">
                      {c.title}
                    </span>
                    {hasUnread && (
                      <span className="w-2 h-2 rounded-full bg-[var(--bos-accent)] animate-pulse" />
                    )}
                  </div>

                  {c.project && (
                    <div className="text-[10px] font-mono text-[var(--bos-text-tertiary)] truncate">
                      {c.project.code}: {c.project.name}
                    </div>
                  )}

                  {c.dependencyLabel && (
                    <div className="text-[10px] font-mono text-amber-400 truncate">
                      Dep: {c.dependencyLabel}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 text-[11px] text-[var(--bos-text-secondary)] font-mono">
                    <span className="truncate max-w-[180px]">
                      {lastMsg?.content || c.lastMessagePreview || "No messages yet"}
                    </span>
                    {c.isBlocker && (
                      <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 text-[9px] font-bold">
                        BLOCKER
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── RIGHT MAIN PANEL: ACTIVE WORK CONVERSATION ────────────── */}
      <div className="flex-1 flex flex-col bg-[var(--bos-surface-panel)] overflow-hidden">
        {loadingChat ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 font-mono text-xs text-[var(--bos-text-tertiary)]">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--bos-accent)]" />
            <span>CONNECTING WORK CONTEXT...</span>
          </div>
        ) : !activeConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center text-xs font-mono text-[var(--bos-text-tertiary)]">
            <MessageSquare className="w-10 h-10 text-[var(--bos-border)]" />
            <span>Select a conversation from the sidebar or initiate one from My Work.</span>
          </div>
        ) : (
          <>
            {/* ── 1. AUTOMATIC MESSAGE CONTEXT CARD (PROMPT MANDATED) ─────────────────── */}
            <div className="p-4 sm:p-5 border-b border-[var(--bos-border)] bg-[var(--bos-surface)]/80 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-[var(--bos-text-primary)] tracking-tight">
                    {activeConversation.title}
                  </h2>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      activeConversation.isBlocker
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        : activeConversation.isHandoff
                        ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    }`}
                  >
                    {activeConversation.isBlocker
                      ? "BLOCKER ACTIVE"
                      : activeConversation.isHandoff
                      ? "HANDOFF PENDING"
                      : "IN EXECUTION"}
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <button
                    onClick={handleSummarize}
                    disabled={summarizing}
                    className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Generate factual AI summary and open items"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{summarizing ? "Summarizing..." : "AI Summary"}</span>
                  </button>

                  {activeConversation.taskId && (
                    <button
                      onClick={() =>
                        onNavigateTab("MY_WORK", { highlightTaskId: activeConversation.taskId })
                      }
                      className="px-3 py-1.5 rounded-xl bg-[var(--bos-accent)] text-white font-bold hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>OPEN WORK</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Message Context Card: PROJECT, MY ROLE, WORK, DEPENDENCY, STATUS */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] font-mono text-[11px] shadow-sm">
                <div className="space-y-0.5">
                  <div className="text-[9px] uppercase tracking-wider text-[var(--bos-text-tertiary)] font-bold">PROJECT:</div>
                  <div className="font-bold text-[var(--bos-text-primary)] truncate" title={activeConversation.project?.name || "General"}>
                    {activeConversation.project?.name || "General"}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[9px] uppercase tracking-wider text-[var(--bos-text-tertiary)] font-bold">MY ROLE:</div>
                  <div className="font-bold text-sky-400 truncate" title={currentActor?.role || "Specialist"}>
                    {currentActor?.role || "Specialist"}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[9px] uppercase tracking-wider text-[var(--bos-text-tertiary)] font-bold">WORK:</div>
                  <div className="font-bold text-[var(--bos-accent)] truncate" title={activeConversation.task?.title || "Active Discussion"}>
                    {activeConversation.task ? `${activeConversation.task.code || "TASK"}: ${activeConversation.task.title}` : activeConversation.title}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[9px] uppercase tracking-wider text-[var(--bos-text-tertiary)] font-bold">DEPENDENCY:</div>
                  <div className="font-bold text-amber-400 truncate" title={activeConversation.linkedDependency?.name || activeConversation.dependencyLabel || "None"}>
                    {activeConversation.linkedDependency?.name || activeConversation.dependencyLabel || "None"}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[9px] uppercase tracking-wider text-[var(--bos-text-tertiary)] font-bold">STATUS:</div>
                  <div className="font-bold text-emerald-400 truncate">
                    {activeConversation.task?.status || (activeConversation.isBlocker ? "BLOCKED" : "ACTIVE")}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Summary Banner (if requested) */}
            {aiSummary && (
              <div className="p-4 bg-purple-500/5 border-b border-purple-500/20 space-y-2 font-mono text-xs animate-in slide-in-from-top-2">
                <div className="flex items-center justify-between text-purple-400 font-bold">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Conversation Intelligence (Factual Summary)</span>
                  </div>
                  <button
                    onClick={() => setAiSummary(null)}
                    className="text-[10px] text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] cursor-pointer"
                  >
                    Close
                  </button>
                </div>
                <p className="text-[var(--bos-text-primary)] leading-relaxed font-sans text-xs">
                  {aiSummary.summary}
                </p>
                {aiSummary.openItems?.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">
                      Open Action Items:
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-purple-300">
                      {aiSummary.openItems.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Decision Confirmation Alert */}
            {decisionFeedback && (
              <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 font-mono text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>{decisionFeedback}</span>
              </div>
            )}

            {/* ── 2. MESSAGE STREAM ───────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {activeConversation.messages?.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-xs font-mono text-[var(--bos-text-tertiary)]">
                  <span>No messages sent in this thread yet. Say hello or ask for verification.</span>
                </div>
              ) : (
                activeConversation.messages.map((msg: any) => {
                  const isYou =
                    (currentActor?.employeeId && msg.senderEmployeeId === currentActor.employeeId) ||
                    (currentActor?.userId && msg.senderUserId === currentActor.userId);

                  const isDecision = msg.messageType === "DECISION";
                  const isBlocker = msg.messageType === "BLOCKER";
                  const isHandoff = msg.messageType === "HANDOFF";
                  const isQuestion = msg.messageType === "QUESTION";

                  let metadataObj: any = {};
                  try {
                    metadataObj = JSON.parse(msg.metadata || "{}");
                  } catch {}

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isYou ? "items-end" : "items-start"} space-y-1.5`}
                    >
                      {/* Sender metadata info */}
                      <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--bos-text-tertiary)] px-1">
                        <span className="font-bold text-[var(--bos-text-primary)]">{msg.senderName}</span>
                        <span>•</span>
                        <span>{msg.senderRole || "Specialist"}</span>
                        <span>•</span>
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {msg.messageType && msg.messageType !== "TEXT" && (
                          <span
                            className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ${
                              isDecision
                                ? "bg-amber-500/20 text-amber-400"
                                : isBlocker
                                ? "bg-rose-500/20 text-rose-400"
                                : isHandoff
                                ? "bg-purple-500/20 text-purple-400"
                                : isQuestion
                                ? "bg-sky-500/20 text-sky-400"
                                : "bg-[var(--bos-accent)]/20 text-[var(--bos-accent)]"
                            }`}
                          >
                            {msg.messageType}
                          </span>
                        )}
                      </div>

                      {/* Message Bubble */}
                      <div
                        className={`max-w-xl rounded-3xl p-4 sm:p-5 border transition-all text-sm leading-relaxed ${
                          isYou
                            ? "bg-[var(--bos-accent)] text-white border-[var(--bos-accent)] rounded-tr-sm shadow-md"
                            : "bg-[var(--bos-surface)] text-[var(--bos-text-primary)] border-[var(--bos-border)] rounded-tl-sm shadow-sm"
                        }`}
                      >
                        {msg.content}

                        {/* Attached Work Context Preview if present */}
                        {metadataObj?.taskTitle && (
                          <div
                            className={`mt-3 p-2.5 rounded-2xl border font-mono text-xs space-y-1.5 ${
                              isYou
                                ? "bg-black/20 border-white/20 text-white"
                                : "bg-[var(--bos-surface-panel)] border-[var(--bos-border)] text-[var(--bos-text-secondary)]"
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] uppercase font-bold">
                              <span>Work Attached</span>
                              <span>{metadataObj.taskCode || "TASK"}</span>
                            </div>
                            <div className="font-bold">{metadataObj.taskTitle}</div>
                            <button
                              type="button"
                              onClick={() => onNavigateTab("MY_WORK", { highlightTaskId: metadataObj.taskId || activeConversation.taskId })}
                              className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/30 hover:bg-black/50 border border-white/20 text-[11px] font-mono font-bold transition-all cursor-pointer"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>VIEW WORK</span>
                            </button>
                          </div>
                        )}

                        {!metadataObj?.taskTitle && (metadataObj?.taskId || activeConversation.taskId) && (
                          <div className="mt-2.5">
                            <button
                              type="button"
                              onClick={() => onNavigateTab("MY_WORK", { highlightTaskId: metadataObj?.taskId || activeConversation.taskId })}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                                isYou
                                  ? "bg-black/30 hover:bg-black/40 text-white border border-white/20"
                                  : "bg-[var(--bos-accent)]/10 hover:bg-[var(--bos-accent)]/20 text-[var(--bos-accent)] border border-[var(--bos-accent)]/20"
                              }`}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>VIEW WORK</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Message Actions: [MARK AS DECISION] */}
                      {!isDecision && (
                        <div className="flex items-center gap-2 px-2 pt-0.5">
                          <button
                            disabled={markingDecisionId === msg.id}
                            onClick={() => handleMarkAsDecision(msg.id, msg.content)}
                            className="text-[10px] font-mono text-[var(--bos-text-tertiary)] hover:text-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
                            title="Preserve this message as an official project decision in database"
                          >
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>Mark as Decision</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ── 3. MESSAGE COMPOSER ─────────────────────────────────── */}
            <div className="p-4 border-t border-[var(--bos-border)] bg-[var(--bos-surface)]/40 space-y-3">
              {/* Message Type Selector & Smart Mentions */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto font-mono text-[10px]">
                  <span className="text-[var(--bos-text-tertiary)] uppercase mr-1 font-bold">Type:</span>
                  {(["TEXT", "QUESTION", "UPDATE", "HELP", "BLOCKER", "HANDOFF", "DECISION"] as WorkMessageType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedType(t)}
                      className={`px-2.5 py-0.5 rounded-lg border transition-all cursor-pointer font-medium ${
                        selectedType === t
                          ? "bg-[var(--bos-accent)] border-[var(--bos-accent)] text-white font-bold"
                          : "bg-[var(--bos-surface)] border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Quick Mentions Bar */}
                <div className="flex items-center gap-1 font-mono text-[10px] text-[var(--bos-text-tertiary)]">
                  <span className="hidden sm:inline">Mention:</span>
                  {["@Admin", "@Frontend", "@Backend", "@QA"].map((mention) => (
                    <button
                      key={mention}
                      type="button"
                      onClick={() => setMessageText((prev) => (prev ? `${prev} ${mention} ` : `${mention} `))}
                      className="px-1.5 py-0.5 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)] hover:border-[var(--bos-accent)] hover:text-[var(--bos-accent)] transition-colors cursor-pointer"
                    >
                      {mention}
                    </button>
                  ))}
                  {activeConversation.project?.staffAllocations?.slice(0, 2).map((s: any) => {
                    const firstName = s.employee?.fullName?.split(" ")[0];
                    if (!firstName) return null;
                    return (
                      <button
                        key={s.employee.id}
                        type="button"
                        onClick={() => setMessageText((prev) => (prev ? `${prev} @${s.employee.fullName} ` : `@${s.employee.fullName} `))}
                        className="px-1.5 py-0.5 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)] hover:border-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                      >
                        @{firstName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Composer Form */}
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder={`Write your message (auto-recording context for ${activeConversation.task?.title || activeConversation.title})...`}
                  className="flex-1 px-4 py-3 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-sm text-[var(--bos-text-primary)] placeholder-[var(--bos-text-tertiary)] focus:outline-none focus:border-[var(--bos-accent)] transition-colors"
                />

                <button
                  type="submit"
                  disabled={sending || !messageText.trim()}
                  className="px-5 py-3 rounded-2xl bg-[var(--bos-accent)] text-white font-bold hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span className="hidden sm:inline font-mono text-xs">Send</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
