/**
 * Business OS — Task Operating System: Shared Types & Constants
 *
 * This file is BROWSER-SAFE. It has ZERO imports from db, prisma, or
 * any Node.js-only module. It is the single source of truth for all
 * task-related constants and types that need to be shared across
 * both client components and server-side code.
 */

/* ── Workstream Definitions ────────────────────────────────────── */
export type WorkstreamType =
  | "DISCOVERY"
  | "DESIGN"
  | "FRONTEND"
  | "BACKEND"
  | "DATABASE"
  | "INTEGRATION"
  | "QA"
  | "DEPLOYMENT"
  | "CLIENT_REVIEW";

export const ALL_WORKSTREAMS: { id: WorkstreamType; label: string; color: string }[] = [
  { id: "DISCOVERY", label: "Discovery & Arch", color: "#6366f1" },
  { id: "DESIGN", label: "UI / UX Design", color: "#ec4899" },
  { id: "FRONTEND", label: "Frontend", color: "#0ea5e9" },
  { id: "BACKEND", label: "Backend API", color: "#10b981" },
  { id: "DATABASE", label: "Database & Models", color: "#8b5cf6" },
  { id: "INTEGRATION", label: "Integration & Auth", color: "#f59e0b" },
  { id: "QA", label: "QA & Testing", color: "#ef4444" },
  { id: "DEPLOYMENT", label: "Deployment & DevOps", color: "#14b8a6" },
  { id: "CLIENT_REVIEW", label: "Client Review & UAT", color: "#b5452a" },
];

/* ── Task Status Config ─────────────────────────────────────────── */
export type TaskStatusType =
  | "BACKLOG"
  | "READY"
  | "TODO"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "IN_REVIEW"
  | "CHANGES_REQUESTED"
  | "READY_FOR_CLIENT"
  | "CLIENT_REVIEW"
  | "CLIENT_APPROVED"
  | "COMPLETED"
  | "DONE"
  | "CANCELLED";

export const TASK_STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; category: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "BLOCKED" }
> = {
  BACKLOG: { label: "Backlog", bg: "rgba(154, 148, 138, 0.12)", text: "var(--bos-text-secondary)", border: "var(--bos-border)", category: "TODO" },
  READY: { label: "Ready", bg: "rgba(59, 130, 246, 0.1)", text: "#2563eb", border: "rgba(59, 130, 246, 0.25)", category: "TODO" },
  TODO: { label: "To Do", bg: "rgba(154, 148, 138, 0.12)", text: "var(--bos-text-primary)", border: "var(--bos-border)", category: "TODO" },
  IN_PROGRESS: { label: "In Progress", bg: "rgba(181, 69, 42, 0.12)", text: "var(--bos-accent)", border: "var(--bos-accent-ring)", category: "IN_PROGRESS" },
  BLOCKED: { label: "Blocked", bg: "rgba(196, 58, 49, 0.12)", text: "var(--bos-error)", border: "rgba(196, 58, 49, 0.3)", category: "BLOCKED" },
  IN_REVIEW: { label: "In Review", bg: "rgba(166, 124, 46, 0.14)", text: "var(--bos-warning)", border: "rgba(166, 124, 46, 0.3)", category: "REVIEW" },
  CHANGES_REQUESTED: { label: "Changes Requested", bg: "rgba(220, 38, 38, 0.12)", text: "#dc2626", border: "rgba(220, 38, 38, 0.3)", category: "REVIEW" },
  READY_FOR_CLIENT: { label: "Ready for Client", bg: "rgba(139, 92, 246, 0.12)", text: "#7c3aed", border: "rgba(139, 92, 246, 0.3)", category: "REVIEW" },
  CLIENT_REVIEW: { label: "Client Review", bg: "rgba(99, 102, 241, 0.14)", text: "#4f46e5", border: "rgba(99, 102, 241, 0.3)", category: "REVIEW" },
  CLIENT_APPROVED: { label: "Client Approved", bg: "rgba(43, 122, 75, 0.14)", text: "var(--bos-success)", border: "rgba(43, 122, 75, 0.3)", category: "DONE" },
  COMPLETED: { label: "Completed", bg: "rgba(43, 122, 75, 0.14)", text: "var(--bos-success)", border: "rgba(43, 122, 75, 0.3)", category: "DONE" },
  DONE: { label: "Done", bg: "rgba(43, 122, 75, 0.14)", text: "var(--bos-success)", border: "rgba(43, 122, 75, 0.3)", category: "DONE" },
  CANCELLED: { label: "Cancelled", bg: "rgba(100, 116, 139, 0.12)", text: "#64748b", border: "rgba(100, 116, 139, 0.25)", category: "TODO" },
};

/* ── Command Center Metrics (returned by /api/tasks/command-center) */
export type CommandCenterMetrics = {
  totalTasks?: number;
  total?: number;
  activeWork: number;
  inProgress: number;
  blocked: number;
  overdue: number;
  inReview: number;
  dueToday: number;
  completed: number;
  whatNeedsAttention: Array<{
    id: string;
    taskId?: string;
    type: string;
    priority: "CRITICAL" | "HIGH" | "MEDIUM";
    title: string;
    reason: string;
    affectedProject: string;
    affectedMilestone?: string;
    owner?: string;
    nextAction: string;
    projectId?: string;
    deliverableId?: string;
    changeRequestId?: string;
  }>;
  workHappeningNow: Array<{
    id: string;
    code: string | null;
    title: string;
    status: string;
    workstream: string;
    priority?: string;
    owner: string;
    progress: number;
    dueLabel: string;
    projectName?: string;
    projectId?: string;
  }>;
  activeWorkstreams: Array<{
    id: string;
    label: string;
    color: string;
    taskCount: number;
    completedCount: number;
    blockedCount?: number;
    progress: number;
  }>;
  employeeWorkloads: Array<{
    id: string;
    name: string;
    role: string;
    activeTasks: number;
    dueToday?: number;
    overdue: number;
    blocked?: number;
    inReview?: number;
    capacity: number;
  }>;
};

/* ── Smart Layer & Requirement Resolvers ────────────────────────── */
export type TechnicalLayerType = "DATABASE" | "BACKEND" | "FRONTEND" | "TESTING" | "DEVOPS";

export function resolveTaskLayer(t: any): TechnicalLayerType {
  if (!t) return "FRONTEND";

  // Check workstream first (most specific business intent)
  if (t.workstream) {
    const ws = String(t.workstream).toUpperCase();
    if (ws === "DATABASE") return "DATABASE";
    if (ws === "BACKEND" || ws === "INTEGRATION") return "BACKEND";
    if (ws === "QA" || ws === "TESTING") return "TESTING";
    if (ws === "DEPLOYMENT") return "DEVOPS";
  }

  // Robust contextual heuristics based on task title and description
  const text = `${t.title || ""} ${t.description || ""}`.toLowerCase();
  if (text.includes("database") || text.includes("schema") || text.includes("prisma") || text.includes("migration") || text.includes("relational model") || text.includes("table")) {
    return "DATABASE";
  }
  if (text.includes("api route") || text.includes("rest endpoint") || text.includes("backend") || text.includes("auth") || text.includes("session token") || text.includes("middleware") || text.includes("security guard") || text.includes("controller") || text.includes("handler")) {
    return "BACKEND";
  }
  if (text.includes("test") || text.includes("qa") || text.includes("acceptance") || text.includes("regression") || text.includes("verification") || text.includes("audit")) {
    return "TESTING";
  }
  if (text.includes("deploy") || text.includes("ci/cd") || text.includes("cutover") || text.includes("repository") || text.includes("dns") || text.includes("pipeline") || text.includes("staging")) {
    return "DEVOPS";
  }

  // Check explicit layer field if valid
  if (t.layer) {
    const l = String(t.layer).toUpperCase();
    if (l.includes("DATA") || l.includes("SCHEMA") || l === "DB") return "DATABASE";
    if (l.includes("BACK") || l.includes("API") || l.includes("SERVICE")) return "BACKEND";
    if (l.includes("TEST") || l.includes("QA") || l.includes("VERIF")) return "TESTING";
    if (l.includes("DEV") || l.includes("INFRA") || l.includes("DEPLOY") || l.includes("PIPELINE")) return "DEVOPS";
    if (l.includes("FRONT") || l.includes("UI") || l.includes("DESIGN") || l.includes("WEB")) return "FRONTEND";
  }

  return "FRONTEND";
}

export function resolveTaskRequirement(t: any, defaultIndex = 1): { reqId: string; title: string } {
  if (!t) return { reqId: `REQ-00${defaultIndex}`, title: "Core Requirement" };

  if (t.sourceRequirementId && t.sourceRequirementId !== "TSK") {
    return {
      reqId: t.sourceRequirementId,
      title: t.sourceRequirementTitle || t.deliverable?.title || `Requirement ${t.sourceRequirementId}`,
    };
  }

  if (t.sourceRequirementTitle) {
    return {
      reqId: `REQ-${String(defaultIndex).padStart(3, "0")}`,
      title: t.sourceRequirementTitle,
    };
  }

  if (t.deliverable?.title) {
    return {
      reqId: `REQ-${String(defaultIndex).padStart(3, "0")}`,
      title: t.deliverable.title,
    };
  }

  if (t.sourceDeliverableTitle) {
    return {
      reqId: `REQ-${String(defaultIndex).padStart(3, "0")}`,
      title: t.sourceDeliverableTitle,
    };
  }

  // Extract from title (e.g. "for Pages & content" -> "Pages & Content")
  const forMatch = (t.title || "").match(/for\s+["']?([^"']+)["']?$/i);
  if (forMatch && forMatch[1]) {
    const cleanTitle = forMatch[1].trim();
    return {
      reqId: `REQ-${String(defaultIndex).padStart(3, "0")}`,
      title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
    };
  }

  return {
    reqId: `REQ-${String(defaultIndex).padStart(3, "0")}`,
    title: t.milestone?.title || "System Foundation & Architecture",
  };
}
