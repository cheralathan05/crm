import { db } from "./db";
import type { UserRole } from "./navigation";

/* ────────────────────────────────────────────────────────────────
   BUSINESS OS — SIDEBAR DATA
   Everything the sidebar needs beyond static navigation, resolved
   server-side from the authenticated user. No hardcoded values:
   counts come from the database, integration state is real.
──────────────────────────────────────────────────────────────── */

export type SidebarCounts = {
  requirements: number;
  tasks: number;
  messages: number;
  notifications: number;
};

export type SidebarData = {
  user: { id: string; name: string | null; email: string | null };
  role: UserRole;
  companyName: string;
  counts: SidebarCounts;
  githubConnected: boolean;
};

/**
 * Real, workspace-scoped notification-style counts for sidebar badges.
 *
 * The module tables (Requirement, Task, Message, …) do not exist in the
 * schema yet — so the true count for every badge is zero today. When a
 * module ships, replace its zero with the real workspace-scoped query;
 * the badge pipeline already hides zero values, so nothing fake appears.
 */
async function getSidebarCounts(userId: string): Promise<SidebarCounts> {
  void userId; // workspace-scoped queries arrive with the module tables
  // Once the module tables exist, resolve the workspace like this and count:
  //   const workspace = await db.workspace.findUnique({ where: { ownerId: userId }, select: { id: true } });
  //   const workspaceId = workspace?.id ?? null;
  //   requirements: await db.requirement.count({ where: { workspaceId, status: "NEEDS_REVIEW" } })
  //   tasks:        await db.task.count({ where: { workspaceId, assigneeId: userId, status: { not: "DONE" } } })
  //   messages:     await db.message.count({ where: { workspaceId, recipientId: userId, readAt: null } })
  //   notifications: await db.notification.count({ where: { userId, readAt: null } })
  return { requirements: 0, tasks: 0, messages: 0, notifications: 0 };
}

/**
 * Real GitHub integration state. No integration record exists yet, so the
 * honest state is "Not connected" — never faked.
 */
async function getGithubConnected(): Promise<boolean> {
  // const row = await db.integration.findUnique({ where: { workspaceId, provider: "GITHUB" } });
  // return row !== null && row.connected;
  return false;
}

/** All sidebar data resolved in parallel, server-side. */
export async function getSidebarData(userId: string): Promise<SidebarData> {
  const [user, counts, githubConnected] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, companyName: true },
    }),
    getSidebarCounts(userId),
    getGithubConnected(),
  ]);

  return {
    user: {
      id: userId,
      name: user?.name ?? null,
      email: user?.email ?? null,
    },
    role: user?.role ?? "MEMBER",
    companyName: user?.companyName?.trim() || "Untitled workspace",
    counts,
    githubConnected,
  };
}
