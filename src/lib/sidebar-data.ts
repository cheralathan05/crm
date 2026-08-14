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
 * Requirements badge: submissions that need attention — newly submitted,
 * awaiting re-review after changes, or resubmitted. All other module
 * tables (Task, Message, …) do not exist in the schema yet, so their
 * true count is zero today; the badge pipeline hides zero values.
 */
async function getSidebarCounts(userId: string): Promise<SidebarCounts> {
  const workspace = await db.workspace.findUnique({ where: { ownerId: userId }, select: { id: true } });
  const workspaceId = workspace?.id ?? null;
  const [requirements] = await Promise.all([
    workspaceId
      ? db.requirementRequest.count({
          where: {
            workspaceId,
            status: { in: ["SUBMITTED", "CHANGES_REQUESTED", "REVISION_SUBMITTED"] },
          },
        })
      : Promise.resolve(0),
  ]);
  return { requirements, tasks: 0, messages: 0, notifications: 0 };
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
