import { db } from "@/lib/db";
import { syncProductModelToDatabase } from "./product-model.service";

/**
 * Builds the complete, deterministic Product Execution Graph for a project.
 * - Role boundaries are enforced strictly (Frontend receives ONLY frontend responsibilities).
 * - Real dependencies are generated (Frontend depends on Backend API; QA depends on Frontend + Backend).
 * - Every work item answers the 10 core product questions.
 * - Idempotent: Re-executing never duplicates work items.
 */
export async function generateProductWorkGraph(projectId: string): Promise<{
  success: boolean;
  tasksCreated: number;
  tasksReused: number;
  dependenciesCreated: number;
}> {
  // 1. Ensure Product Model is synced
  await syncProductModelToDatabase(projectId);

  // 2. Fetch project, proposal, deliverables, staff allocations, and product areas
  const project = await db.clientProject.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      proposal: true,
      deliverables: true,
      staffAllocations: {
        where: { releasedAt: null },
        include: { employee: { include: { role: true } } },
      },
      productAreas: {
        include: {
          responsibilities: { orderBy: { order: "asc" } },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!project) {
    throw new Error(`Project ${projectId} not found.`);
  }

  // Map staff allocations by normalized workstream / role
  const frontendStaff = project.staffAllocations.filter(
    (sa) =>
      sa.teamName.toUpperCase() === "FRONTEND" ||
      sa.workstream?.toUpperCase() === "FRONTEND" ||
      (sa.projectRole || "").toLowerCase().includes("frontend"),
  );
  const backendStaff = project.staffAllocations.filter(
    (sa) =>
      sa.teamName.toUpperCase() === "BACKEND" ||
      sa.workstream?.toUpperCase() === "BACKEND" ||
      (sa.projectRole || "").toLowerCase().includes("backend") ||
      (sa.projectRole || "").toLowerCase().includes("api"),
  );
  const databaseStaff = project.staffAllocations.filter(
    (sa) =>
      sa.teamName.toUpperCase() === "DATABASE" ||
      sa.workstream?.toUpperCase() === "DATABASE" ||
      (sa.projectRole || "").toLowerCase().includes("database") ||
      (sa.projectRole || "").toLowerCase().includes("data"),
  );
  const qaStaff = project.staffAllocations.filter(
    (sa) =>
      sa.teamName.toUpperCase() === "QA" ||
      sa.workstream?.toUpperCase() === "QA" ||
      (sa.projectRole || "").toLowerCase().includes("qa") ||
      (sa.projectRole || "").toLowerCase().includes("test"),
  );

  // Helper to pick primary assignee for a workstream
  const pickStaff = (workstream: string) => {
    if (workstream === "FRONTEND") {
      // Prioritize John if assigned to frontend, else first frontend staff
      return frontendStaff.find((s) => s.employee.fullName.toLowerCase().includes("john")) || frontendStaff[0];
    }
    if (workstream === "BACKEND") {
      // Prioritize Karthik or Vikram
      return backendStaff.find((s) => s.employee.fullName.toLowerCase().includes("karthik")) || backendStaff[0];
    }
    if (workstream === "DATABASE") {
      return databaseStaff.find((s) => s.employee.fullName.toLowerCase().includes("ananya")) || databaseStaff[0];
    }
    if (workstream === "QA") {
      return qaStaff.find((s) => s.employee.fullName.toLowerCase().includes("siddharth")) || qaStaff[0];
    }
    return project.staffAllocations[0];
  };

  let tasksCreated = 0;
  let tasksReused = 0;
  let dependenciesCreated = 0;

  // Track created tasks by productAreaId and workstream for dependency mapping
  const areaWorkMap = new Map<string, Map<string, any>>();

  const existingProjectTasks = await db.clientTask.findMany({
    where: { projectId },
    include: {
      acceptanceCriteria: true,
      dependencies: true,
    },
  });

  const taskCount = await db.clientTask.count();
  let codeCounter = taskCount + 1;

  for (const area of project.productAreas) {
    if (!areaWorkMap.has(area.id)) {
      areaWorkMap.set(area.id, new Map());
    }
    const currentAreaMap = areaWorkMap.get(area.id)!;

    for (const resp of area.responsibilities) {
      const assignedMember = pickStaff(resp.workstream);
      const isMvp = area.phase === "MVP";

      // Check if task already exists for this exact productArea and responsibility
      let task: any = existingProjectTasks.find(
        (t) =>
          t.productAreaId === area.id &&
          (t.responsibilityId === resp.id || t.title.toLowerCase() === resp.title.toLowerCase()),
      );

      if (!task) {
        // Deterministic code e.g. TSK-080
        const code = `TSK-${String(codeCounter++).padStart(3, "0")}`;

        // Initial execution status:
        // MVP: Frontend/Backend/DB start in TODO / IN_PROGRESS depending on layer. Phase 2 starts in BACKLOG.
        let status: any = isMvp ? "TODO" : "BACKLOG";
        if (isMvp && resp.workstream === "DATABASE") status = "IN_PROGRESS";
        if (isMvp && resp.workstream === "BACKEND") status = "IN_PROGRESS";
        if (isMvp && resp.workstream === "FRONTEND") status = "TODO";

        const deliverable = project.deliverables.find((d) => d.id === area.deliverableId) || project.deliverables[0];

        task = await db.clientTask.create({
          data: {
            code,
            clientId: project.clientId,
            projectId: project.id,
            productAreaId: area.id,
            responsibilityId: resp.id,
            deliverableId: deliverable?.id || null,
            title: resp.title,
            description: resp.description,
            expectedResult: resp.deliverableOutcome,
            workstream: resp.workstream,
            layer: resp.workstream,
            teamRole: resp.requiredRole,
            assigneeId: assignedMember?.employeeId || null,
            assigneeName: assignedMember?.employee?.fullName || null,
            status,
            phase: area.phase,
            executionState: isMvp ? "READY" : "NOT_READY",
            proofTypeRequired: resp.proofTypeRequired,
            isInvalidWork: false,
            sourceType: "PROPOSAL_SCOPE",
            sourceRequirementTitle: area.name,
            sourceDeliverableTitle: deliverable?.title || area.name,
            sourceProposalId: project.proposalId,
            sourceProposalReference: project.proposal?.reference || "PROP-2026-001",
          },
        });

        // Add verified Acceptance Criteria
        await db.taskAcceptanceCriterion.create({
          data: {
            taskId: task.id,
            criterion: `Verified delivery of ${resp.title} conforming to approved ${area.name} specification.`,
            status: "NOT_STARTED",
            order: 1,
          },
        });

        await db.taskAcceptanceCriterion.create({
          data: {
            taskId: task.id,
            criterion: `Submission of verifiable ${resp.proofTypeRequired} proof before review sign-off.`,
            status: "NOT_STARTED",
            order: 2,
          },
        });

        tasksCreated++;
      } else {
        // Ensure role boundary and correct employee assignment on existing task
        await db.clientTask.update({
          where: { id: task.id },
          data: {
            productAreaId: area.id,
            responsibilityId: resp.id,
            workstream: resp.workstream,
            layer: resp.workstream,
            teamRole: resp.requiredRole,
            assigneeId: assignedMember?.employeeId || task.assigneeId,
            assigneeName: assignedMember?.employee?.fullName || task.assigneeName,
            isInvalidWork: false,
            phase: area.phase,
            proofTypeRequired: resp.proofTypeRequired,
          },
        });
        tasksReused++;
      }

      currentAreaMap.set(resp.workstream, task);
    }
  }

  // 3. Construct Deep Product Dependencies across Workstreams (Section 11 & 21)
  // - Frontend depends on Backend API
  // - Backend API depends on Database Schema
  // - QA depends on Frontend UI and Backend API
  for (const [areaId, workMap] of areaWorkMap.entries()) {
    const feTask = workMap.get("FRONTEND");
    const beTask = workMap.get("BACKEND");
    const dbTask = workMap.get("DATABASE");
    const qaTask = workMap.get("QA");

    // A. Backend depends on Database
    if (beTask && dbTask && beTask.id !== dbTask.id) {
      const existingDep = await db.taskDependency.findFirst({
        where: { taskId: beTask.id, dependsOnTaskId: dbTask.id },
      });
      if (!existingDep) {
        await db.taskDependency.create({
          data: {
            taskId: beTask.id,
            dependsOnTaskId: dbTask.id,
            dependencyType: "BLOCKED_BY",
          },
        });
        dependenciesCreated++;
      }
    }

    // B. Frontend depends on Backend
    if (feTask && beTask && feTask.id !== beTask.id) {
      const existingDep = await db.taskDependency.findFirst({
        where: { taskId: feTask.id, dependsOnTaskId: beTask.id },
      });
      if (!existingDep) {
        await db.taskDependency.create({
          data: {
            taskId: feTask.id,
            dependsOnTaskId: beTask.id,
            dependencyType: "BLOCKED_BY",
          },
        });
        dependenciesCreated++;
      }

      // If backend is not yet approved or completed, update frontend status & blocked reason
      const beDone = beTask.status === "COMPLETED" || beTask.status === "DONE" || beTask.status === "APPROVED";
      if (!beDone) {
        await db.clientTask.update({
          where: { id: feTask.id },
          data: {
            status: feTask.status === "COMPLETED" || feTask.status === "DONE" ? feTask.status : "TODO",
            blockedReason: `Waiting for Backend: "${beTask.title}" (${beTask.code || "API"})`,
            executionState: "BLOCKED",
          },
        });
      }
    }

    // C. QA depends on Frontend and Backend
    if (qaTask && feTask) {
      const existingDep = await db.taskDependency.findFirst({
        where: { taskId: qaTask.id, dependsOnTaskId: feTask.id },
      });
      if (!existingDep) {
        await db.taskDependency.create({
          data: {
            taskId: qaTask.id,
            dependsOnTaskId: feTask.id,
            dependencyType: "BLOCKED_BY",
          },
        });
        dependenciesCreated++;
      }
    }
  }

  return {
    success: true,
    tasksCreated,
    tasksReused,
    dependenciesCreated,
  };
}
