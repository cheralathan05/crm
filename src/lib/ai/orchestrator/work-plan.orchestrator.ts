import { db } from "@/lib/db";
import { askOllamaJson, isOllamaAvailable, OLLAMA_MODEL } from "../ollama/ollama.client";
import {
  ProposedWorkPlanOutputSchema,
  type ProposedWorkPlanOutput,
  type ProposedWorkItem,
} from "../schemas/blueprint.schema";
import { buildWorkPlanPrompt } from "../prompts/blueprint.prompts";

/* ────────────────────────────────────────────────────────────────
   AI WORK PLAN ORCHESTRATOR
   FLOW:
   APPROVED BLUEPRINT
          ↓
   AI WORK PLAN PROPOSAL (Reviewable)
          ↓
   HUMAN REVIEW & APPROVAL
          ↓
   PERSISTED EXECUTION WORK ITEMS (ClientTask with layer & Work DNA)
   NO ORPHAN WORK ALLOWED.
──────────────────────────────────────────────────────────────── */

export async function generateProposedWorkPlan(params: {
  projectId: string;
}): Promise<{ ok: boolean; plan?: ProposedWorkPlanOutput; error?: string }> {
  const project = await db.clientProject.findUnique({
    where: { id: params.projectId },
    include: {
      blueprints: {
        orderBy: { version: "desc" },
        take: 1,
        include: {
          frontendCapabilities: true,
          backendApis: true,
          databaseEntities: true,
          testSpecifications: true,
          dependencies: true,
        },
      },
    },
  });

  if (!project) {
    return { ok: false, error: "Project not found." };
  }

  const blueprint = project.blueprints[0];
  if (!blueprint) {
    return { ok: false, error: "No engineering blueprint found. Please generate a blueprint before generating work plans." };
  }

  const isUp = await isOllamaAvailable();
  if (isUp) {
    const prompt = buildWorkPlanPrompt({
      projectTitle: project.name,
      blueprint: {
        frontend: blueprint.frontendCapabilities,
        backendApis: blueprint.backendApis,
        database: blueprint.databaseEntities,
        testing: blueprint.testSpecifications,
        dependencies: blueprint.dependencies,
      },
    });

    const aiRes = await askOllamaJson({
      systemPrompt: "You are a Principal Engineering Lead. Generate a structured JSON engineering work plan from the approved blueprint.",
      userPrompt: prompt,
      model: OLLAMA_MODEL,
    });

    if (aiRes.ok && aiRes.content) {
      try {
        const parsed = ProposedWorkPlanOutputSchema.safeParse(JSON.parse(aiRes.content));
        if (parsed.success) {
          return { ok: true, plan: parsed.data };
        }
      } catch {}
    }
  }

  // Deterministic work plan from approved blueprint assets
  const workItems: ProposedWorkItem[] = [];

  // 1. Database layer
  blueprint.databaseEntities.forEach((dbEntity, idx) => {
    workItems.push({
      workId: `DB-${String(idx + 1).padStart(3, "0")}`,
      title: `Provision ${dbEntity.name} schema & indexes`,
      description: `Define table ${dbEntity.tableName}, constraints, and migration script for ${dbEntity.purpose}`,
      layer: "DATABASE",
      requirementId: dbEntity.requirementId || "REQ-001",
      dependencies: [],
      estimatedHours: 4,
      priority: "HIGH",
      expectedResult: `Table ${dbEntity.tableName} active with foreign keys and verified indices`,
      suggestedRole: "Database Architect",
    });
  });

  // 2. Backend layer
  blueprint.backendApis.forEach((api, idx) => {
    const dbDep = blueprint.databaseEntities.find((d) => d.requirementId === api.requirementId);
    const dbWorkId = dbDep ? `DB-${String(blueprint.databaseEntities.indexOf(dbDep) + 1).padStart(3, "0")}` : "";

    workItems.push({
      workId: `BE-${String(idx + 1).padStart(3, "0")}`,
      title: `Implement ${api.method} ${api.path}`,
      description: `Build controller, service handler (${api.service}), validation schema and auth guard for ${api.purpose}`,
      layer: "BACKEND",
      requirementId: api.requirementId || "REQ-001",
      acceptanceCriterionId: api.acceptanceCriterionId || undefined,
      dependencies: dbWorkId ? [dbWorkId] : [],
      estimatedHours: 6,
      priority: "HIGH",
      expectedResult: `Endpoint returns 200/201 on valid input and passes status code contracts`,
      suggestedRole: "Backend Engineer",
    });
  });

  // 3. Frontend layer
  blueprint.frontendCapabilities.forEach((fe, idx) => {
    const beDep = blueprint.backendApis.find((b) => b.requirementId === fe.requirementId);
    const beWorkId = beDep ? `BE-${String(blueprint.backendApis.indexOf(beDep) + 1).padStart(3, "0")}` : "";

    workItems.push({
      workId: `FE-${String(idx + 1).padStart(3, "0")}`,
      title: `Build ${fe.name}`,
      description: `Implement responsive UI route (${fe.route || "N/A"}), state hooks, error states, and wire up APIs`,
      layer: "FRONTEND",
      requirementId: fe.requirementId || "REQ-001",
      acceptanceCriterionId: fe.acceptanceCriterionId || undefined,
      dependencies: beWorkId ? [beWorkId] : [],
      estimatedHours: 8,
      priority: "MEDIUM",
      expectedResult: `Interactive screen with loading, empty, and optimistic update states`,
      suggestedRole: "Frontend Engineer",
    });
  });

  // 4. Testing layer
  blueprint.testSpecifications.forEach((t, idx) => {
    const feDep = blueprint.frontendCapabilities.find((f) => f.requirementId === t.requirementId);
    const feWorkId = feDep ? `FE-${String(blueprint.frontendCapabilities.indexOf(feDep) + 1).padStart(3, "0")}` : "";

    workItems.push({
      workId: `QA-${String(idx + 1).padStart(3, "0")}`,
      title: `Automate ${t.name}`,
      description: t.description,
      layer: "TESTING",
      requirementId: t.requirementId || "REQ-001",
      acceptanceCriterionId: t.acceptanceCriterionId || undefined,
      dependencies: feWorkId ? [feWorkId] : [],
      estimatedHours: 4,
      priority: "HIGH",
      expectedResult: t.expectedOutcome,
      suggestedRole: "QA Automation Engineer",
    });
  });

  const totalHours = workItems.reduce((sum, item) => sum + item.estimatedHours, 0);

  return {
    ok: true,
    plan: {
      planSummary: `Executable Engineering Plan containing ${workItems.length} work items derived from Blueprint v${blueprint.version}.`,
      totalEstimatedHours: totalHours,
      executionPhases: [
        {
          phaseName: "Phase 1: Database & Foundation Layer",
          description: "Schema validation, migrations, and database indexing",
          workIds: workItems.filter((w) => w.layer === "DATABASE").map((w) => w.workId),
        },
        {
          phaseName: "Phase 2: Core API & Service Layer",
          description: "REST controllers, services, authentication, and validation",
          workIds: workItems.filter((w) => w.layer === "BACKEND").map((w) => w.workId),
        },
        {
          phaseName: "Phase 3: Frontend Capability Implementation",
          description: "Page assembly, components, state management, and API integration",
          workIds: workItems.filter((w) => w.layer === "FRONTEND").map((w) => w.workId),
        },
        {
          phaseName: "Phase 4: Automated Verification & Sign-off",
          description: "Integration, API, and E2E test execution with evidence capture",
          workIds: workItems.filter((w) => w.layer === "TESTING").map((w) => w.workId),
        },
      ],
      workItems,
    },
  };
}

/**
 * Commits approved work plan items into real database ClientTask records.
 */
export async function commitWorkPlanToTasks(params: {
  projectId: string;
  workItems: ProposedWorkItem[];
  userId?: string;
  userName?: string;
}): Promise<{ ok: boolean; count: number; error?: string }> {
  const project = await db.clientProject.findUnique({
    where: { id: params.projectId },
    include: {
      client: true,
      milestones: { orderBy: { order: "asc" } },
      deliverables: true,
      blueprints: { orderBy: { version: "desc" }, take: 1 },
    },
  });

  if (!project) return { ok: false, count: 0, error: "Project not found." };
  const blueprint = project.blueprints[0];

  const createdCount = await db.$transaction(async (tx) => {
    let count = 0;
    const defaultMilestone = project.milestones[0];

    for (let i = 0; i < params.workItems.length; i++) {
      const item = params.workItems[i];

      // Match milestone based on layer
      let matchedMilestone = defaultMilestone;
      if (item.layer === "DATABASE") matchedMilestone = project.milestones[0] || defaultMilestone;
      else if (item.layer === "BACKEND") matchedMilestone = project.milestones[1] || project.milestones[0] || defaultMilestone;
      else if (item.layer === "FRONTEND") matchedMilestone = project.milestones[1] || project.milestones[0] || defaultMilestone;
      else if (item.layer === "TESTING") matchedMilestone = project.milestones[2] || project.milestones[0] || defaultMilestone;

      // Match deliverable
      const matchedDeliv = project.deliverables.find(
        (d) => d.title.toLowerCase().includes(item.title.toLowerCase()) || d.description?.toLowerCase().includes(item.requirementId.toLowerCase()),
      ) || project.deliverables[0] || null;

      await tx.clientTask.create({
        data: {
          code: item.workId,
          clientId: project.clientId,
          projectId: project.id,
          milestoneId: matchedMilestone?.id || null,
          deliverableId: matchedDeliv?.id || null,
          blueprintId: blueprint?.id || null,
          title: item.title,
          description: item.description,
          expectedResult: item.expectedResult,
          workstream: item.layer,
          layer: item.layer,
          workId: item.workId,
          status: "TODO",
          priority: item.priority as any,
          teamRole: item.suggestedRole,
          estimatedHours: item.estimatedHours,
          order: i + 1,
          sourceType: "REQUIREMENT",
          sourceRequirementId: item.requirementId,
          sourceRequirementTitle: `Requirement ${item.requirementId}`,
          sourceDeliverableTitle: matchedDeliv?.title || null,
        },
      });

      count++;
    }

    await tx.projectActivity.create({
      data: {
        projectId: project.id,
        type: "WORK_PLAN_COMMITTED",
        title: `${count} Engineering Tasks Created from Approved Blueprint`,
        detail: `Committed work across Database, Backend, Frontend, and QA layers.`,
        actorName: params.userName || "Technical Lead",
      },
    });

    return count;
  });

  return { ok: true, count: createdCount };
}
