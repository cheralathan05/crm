import { db } from "@/lib/db";

export type AuditSummary = {
  totalTasksAudited: number;
  validTasksCount: number;
  invalidTasksCount: number;
  breakdownByReason: Record<string, number>;
  cleanedTasks: Array<{ id: string; code: string | null; title: string; invalidReason: string }>;
};

/**
 * Audits all existing work items across projects according to Section 32 of Business OS:
 * Flags tasks with role mismatch, untraceable scope, or phase contamination.
 * Historical records are preserved but marked isInvalidWork: true so they do NOT affect progress
 * or appear in employee execution queues.
 */
export async function auditAndCleanExistingTasks(projectId?: string): Promise<AuditSummary> {
  const whereClause = projectId ? { projectId } : {};

  const allTasks = await db.clientTask.findMany({
    where: whereClause,
    include: {
      productArea: true,
      responsibility: true,
      project: {
        include: {
          staffAllocations: {
            where: { releasedAt: null },
            include: { employee: true },
          },
        },
      },
    },
  });

  const summary: AuditSummary = {
    totalTasksAudited: allTasks.length,
    validTasksCount: 0,
    invalidTasksCount: 0,
    breakdownByReason: {},
    cleanedTasks: [],
  };

  for (const task of allTasks) {
    let isInvalid = false;
    let invalidReason: string | null = null;

    const titleLower = task.title.toLowerCase();
    const workstream = (task.workstream || "").toUpperCase();
    const layer = (task.layer || "").toUpperCase();

    // 1. Role Mismatch Check
    // If assigned to an employee whose project team/role contradicts the technical nature of the work
    if (task.assigneeId && task.project?.staffAllocations) {
      const allocation = task.project.staffAllocations.find(
        (sa) => sa.employeeId === task.assigneeId || (task.assigneeName && sa.employee.fullName === task.assigneeName),
      );

      if (allocation) {
        const staffTeam = allocation.teamName.toUpperCase();
        const isStaffFrontend = staffTeam === "FRONTEND" || (allocation.projectRole || "").toLowerCase().includes("frontend");

        const isBackendTask =
          titleLower.includes("api route") ||
          titleLower.includes("api service") ||
          titleLower.includes("authentication") ||
          titleLower.includes("database schema") ||
          titleLower.includes("prisma migration") ||
          titleLower.includes("ci/cd pipeline") ||
          workstream === "BACKEND" ||
          workstream === "DATABASE" ||
          layer === "BACKEND" ||
          layer === "DATABASE";

        if (isStaffFrontend && isBackendTask && !task.responsibilityId) {
          isInvalid = true;
          invalidReason = "ROLE_MISMATCH";
        }
      }
    }

    // 2. Untraceable Legacy Mock Scope Check (Section 03 & 32):
    // Real product work MUST trace to an authentic ProductArea and WorkResponsibility.
    // Generic tasks without productAreaId or responsibilityId are legacy unlinked mocks.
    if (!task.productAreaId || !task.responsibilityId) {
      isInvalid = true;
      invalidReason = "UNTRACEABLE_LEGACY_MOCK";
    }

    // 3. Invented Screen / Fluff Scope Check
    const inventedScreens = ["checkout", "cart", "profile settings", "user dashboard", "operations guide", "dns setup", "cutover"];
    if (
      task.project?.name.includes("CRM") &&
      inventedScreens.some((s) => titleLower.includes(s)) &&
      !task.productAreaId
    ) {
      isInvalid = true;
      invalidReason = "INVENTED_SCOPE";
    }

    if (isInvalid && invalidReason) {
      await db.clientTask.update({
        where: { id: task.id },
        data: {
          isInvalidWork: true,
          invalidReason,
        },
      });

      summary.invalidTasksCount++;
      summary.breakdownByReason[invalidReason] = (summary.breakdownByReason[invalidReason] || 0) + 1;
      summary.cleanedTasks.push({
        id: task.id,
        code: task.code,
        title: task.title,
        invalidReason,
      });
    } else {
      // Valid work item
      await db.clientTask.update({
        where: { id: task.id },
        data: {
          isInvalidWork: false,
          invalidReason: null,
        },
      });
      summary.validTasksCount++;
    }
  }

  return summary;
}
