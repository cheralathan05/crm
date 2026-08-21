import { db } from "@/lib/db";

/* ────────────────────────────────────────────────────────────────
   ENGINEERING READINESS ENGINE
   Calculates honest, actionable readiness across:
   - DATABASE READINESS
   - BACKEND READINESS
   - FRONTEND READINESS
   - TESTING READINESS
   - DELIVERABLE READINESS
   - CLIENT READINESS
   NEVER displays a meaningless "72%".
   Always explains EXACT BLOCKERS and WHY.
──────────────────────────────────────────────────────────────── */

export type LayerReadiness = {
  layer: "DATABASE" | "BACKEND" | "FRONTEND" | "TESTING" | "DELIVERABLES" | "CLIENT";
  status: "READY" | "IN_PROGRESS" | "BLOCKED" | "NOT_STARTED" | "COMPLETED";
  summary: string;
  blockers: string[];
  totalItems: number;
  completedItems: number;
  blockedItems: number;
};

export type ProjectEngineeringReadiness = {
  overallState: "OPERATIONAL" | "BLOCKED" | "IN_FLIGHT" | "AWAITING_REVIEW";
  layers: {
    database: LayerReadiness;
    backend: LayerReadiness;
    frontend: LayerReadiness;
    testing: LayerReadiness;
    deliverables: LayerReadiness;
    client: LayerReadiness;
  };
  primaryBlockerText: string | null;
  activeDriftCount: number;
  openClarificationCount: number;
};

export async function computeProjectEngineeringReadiness(projectId: string): Promise<ProjectEngineeringReadiness> {
  const project = await db.clientProject.findUnique({
    where: { id: projectId },
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
      deliverables: {
        include: {
          evidenceRecords: true,
          tasks: true,
        },
      },
      tasks: {
        include: {
          evidenceRecords: true,
        },
      },
      clarifications: { where: { status: "OPEN" } },
      drifts: { where: { status: "FLAGGED" } },
    },
  });

  if (!project) {
    throw new Error("Project not found.");
  }

  const blueprint = project.blueprints[0];
  const tasks = project.tasks || [];
  const deliverables = project.deliverables || [];
  const dbTasks = tasks.filter((t) => t.layer === "DATABASE" || t.workstream === "DATABASE");
  const beTasks = tasks.filter((t) => t.layer === "BACKEND" || t.workstream === "BACKEND");
  const feTasks = tasks.filter((t) => t.layer === "FRONTEND" || t.workstream === "FRONTEND");
  const qaTasks = tasks.filter((t) => t.layer === "TESTING" || t.workstream === "TESTING" || t.workstream === "QA");

  // 1. Database Readiness
  const dbBlockers: string[] = [];
  const dbEntities = blueprint?.databaseEntities || [];
  const dbCompleted = dbTasks.filter((t) => t.status === "DONE" || t.status === "COMPLETED").length;
  const dbBlocked = dbTasks.filter((t) => t.status === "BLOCKED").length;

  if (!blueprint) {
    dbBlockers.push("Engineering Blueprint has not been generated or approved.");
  }
  if (dbEntities.some((d) => d.status === "REVIEW_REQUIRED")) {
    dbBlockers.push("Database schema has pending entities requiring structural review.");
  }
  if (dbBlocked > 0) {
    dbBlockers.push(`${dbBlocked} database migration tasks are actively blocked.`);
  }

  let dbStatus: LayerReadiness["status"] = "READY";
  if (!blueprint) dbStatus = "NOT_STARTED";
  else if (dbBlockers.length > 0) dbStatus = "BLOCKED";
  else if (dbTasks.length > 0 && dbCompleted === dbTasks.length) dbStatus = "COMPLETED";
  else if (dbTasks.length > 0) dbStatus = "IN_PROGRESS";

  const dbReadiness: LayerReadiness = {
    layer: "DATABASE",
    status: dbStatus,
    summary: dbEntities.length > 0 ? `${dbEntities.length} entities planned (${dbCompleted}/${dbTasks.length || dbEntities.length} provisioned)` : "No database entities planned",
    blockers: dbBlockers,
    totalItems: dbEntities.length || dbTasks.length,
    completedItems: dbCompleted,
    blockedItems: dbBlocked,
  };

  // 2. Backend Readiness
  const beBlockers: string[] = [];
  const beApis = blueprint?.backendApis || [];
  const beCompleted = beTasks.filter((t) => t.status === "DONE" || t.status === "COMPLETED").length;
  const beBlocked = beTasks.filter((t) => t.status === "BLOCKED").length;

  if (dbStatus === "BLOCKED") {
    beBlockers.push("Blocked by pending Database schema migrations.");
  }
  if (beBlocked > 0) {
    beBlockers.push(`${beBlocked} backend service implementations are marked BLOCKED.`);
  }

  let beStatus: LayerReadiness["status"] = "READY";
  if (!blueprint) beStatus = "NOT_STARTED";
  else if (beBlockers.length > 0) beStatus = "BLOCKED";
  else if (beTasks.length > 0 && beCompleted === beTasks.length) beStatus = "COMPLETED";
  else if (beTasks.length > 0) beStatus = "IN_PROGRESS";

  const beReadiness: LayerReadiness = {
    layer: "BACKEND",
    status: beStatus,
    summary: beApis.length > 0 ? `${beApis.length} API contracts (${beCompleted}/${beTasks.length || beApis.length} implemented)` : "No backend APIs planned",
    blockers: beBlockers,
    totalItems: beApis.length || beTasks.length,
    completedItems: beCompleted,
    blockedItems: beBlocked,
  };

  // 3. Frontend Readiness
  const feBlockers: string[] = [];
  const feCaps = blueprint?.frontendCapabilities || [];
  const feCompleted = feTasks.filter((t) => t.status === "DONE" || t.status === "COMPLETED").length;
  const feBlocked = feTasks.filter((t) => t.status === "BLOCKED").length;

  if (beStatus === "BLOCKED") {
    feBlockers.push("Waiting on Backend API contracts and services.");
  }
  if (feBlocked > 0) {
    feBlockers.push(`${feBlocked} frontend capability tasks are currently blocked.`);
  }

  let feStatus: LayerReadiness["status"] = "READY";
  if (!blueprint) feStatus = "NOT_STARTED";
  else if (feBlockers.length > 0) feStatus = "BLOCKED";
  else if (feTasks.length > 0 && feCompleted === feTasks.length) feStatus = "COMPLETED";
  else if (feTasks.length > 0) feStatus = "IN_PROGRESS";

  const feReadiness: LayerReadiness = {
    layer: "FRONTEND",
    status: feStatus,
    summary: feCaps.length > 0 ? `${feCaps.length} capabilities (${feCompleted}/${feTasks.length || feCaps.length} completed)` : "No frontend capabilities planned",
    blockers: feBlockers,
    totalItems: feCaps.length || feTasks.length,
    completedItems: feCompleted,
    blockedItems: feBlocked,
  };

  // 4. Testing Readiness
  const qaBlockers: string[] = [];
  const tests = blueprint?.testSpecifications || [];
  const qaCompleted = qaTasks.filter((t) => t.status === "DONE" || t.status === "COMPLETED").length;
  const qaBlocked = qaTasks.filter((t) => t.status === "BLOCKED").length;

  const failingTests = tests.filter((t) => t.status === "FAILING");
  if (failingTests.length > 0) {
    qaBlockers.push(`${failingTests.length} automated tests are currently FAILING.`);
  }
  if (feStatus !== "COMPLETED" && feStatus !== "IN_PROGRESS" && tests.length > 0) {
    qaBlockers.push("Waiting for Frontend and Backend implementations before running full test suite.");
  }

  let qaStatus: LayerReadiness["status"] = "READY";
  if (!blueprint) qaStatus = "NOT_STARTED";
  else if (qaBlockers.length > 0) qaStatus = "BLOCKED";
  else if (tests.length > 0 && tests.every((t) => t.status === "PASSED")) qaStatus = "COMPLETED";
  else if (qaTasks.length > 0) qaStatus = "IN_PROGRESS";

  const qaReadiness: LayerReadiness = {
    layer: "TESTING",
    status: qaStatus,
    summary: tests.length > 0 ? `${tests.length} tests planned (${tests.filter((t) => t.status === "PASSED").length} passed, ${failingTests.length} failing)` : "No test specifications",
    blockers: qaBlockers,
    totalItems: tests.length,
    completedItems: tests.filter((t) => t.status === "PASSED").length,
    blockedItems: failingTests.length,
  };

  // 5. Deliverable Readiness
  const delivBlockers: string[] = [];
  const acceptedDelivs = deliverables.filter((d) => d.status === "ACCEPTED").length;
  const delivsInReview = deliverables.filter((d) => d.status === "INTERNAL_REVIEW" || d.status === "CLIENT_REVIEW").length;

  deliverables.forEach((d) => {
    if (d.status === "DRAFT" && d.tasks.length > 0 && d.tasks.every((t) => t.status === "DONE")) {
      delivBlockers.push(`Deliverable "${d.title}" is ready for internal review.`);
    }
  });

  const delivReadiness: LayerReadiness = {
    layer: "DELIVERABLES",
    status: acceptedDelivs === deliverables.length && deliverables.length > 0 ? "COMPLETED" : delivsInReview > 0 ? "IN_PROGRESS" : "READY",
    summary: `${acceptedDelivs}/${deliverables.length} Deliverables formally accepted`,
    blockers: delivBlockers,
    totalItems: deliverables.length,
    completedItems: acceptedDelivs,
    blockedItems: 0,
  };

  // 6. Client Acceptance Readiness
  const clientBlockers: string[] = [];
  const clientReviewCount = deliverables.filter((d) => d.status === "CLIENT_REVIEW" || d.status === "DELIVERED_TO_CLIENT").length;
  if (clientReviewCount > 0) {
    clientBlockers.push(`${clientReviewCount} deliverables currently awaiting client sign-off.`);
  }

  const clientReadiness: LayerReadiness = {
    layer: "CLIENT",
    status: clientReviewCount > 0 ? "IN_PROGRESS" : acceptedDelivs === deliverables.length && deliverables.length > 0 ? "COMPLETED" : "NOT_STARTED",
    summary: clientReviewCount > 0 ? `${clientReviewCount} awaiting review` : acceptedDelivs === deliverables.length ? "All accepted" : "Pending completion",
    blockers: clientBlockers,
    totalItems: deliverables.length,
    completedItems: acceptedDelivs,
    blockedItems: 0,
  };

  // Determine Overall State & Primary Blocker Text
  let overallState: ProjectEngineeringReadiness["overallState"] = "OPERATIONAL";
  let primaryBlockerText: string | null = null;

  if (dbBlockers.length > 0) {
    overallState = "BLOCKED";
    primaryBlockerText = `Database Layer Blocked: ${dbBlockers[0]}`;
  } else if (beBlockers.length > 0) {
    overallState = "BLOCKED";
    primaryBlockerText = `Backend Layer Blocked: ${beBlockers[0]}`;
  } else if (qaBlockers.length > 0) {
    overallState = "BLOCKED";
    primaryBlockerText = `Testing Blocked: ${qaBlockers[0]}`;
  } else if (clientReviewCount > 0) {
    overallState = "AWAITING_REVIEW";
    primaryBlockerText = `Client Review: ${clientReviewCount} deliverables awaiting sign-off.`;
  }

  return {
    overallState,
    layers: {
      database: dbReadiness,
      backend: beReadiness,
      frontend: feReadiness,
      testing: qaReadiness,
      deliverables: delivReadiness,
      client: clientReadiness,
    },
    primaryBlockerText,
    activeDriftCount: project.drifts.length,
    openClarificationCount: project.clarifications.length,
  };
}
