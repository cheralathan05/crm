import { db } from "@/lib/db";
import { recordAudit } from "@/lib/clients";

/* ────────────────────────────────────────────────────────────────
   BLUEPRINT SERVICE
   Manages:
   - Blueprint retrieval and version history
   - Human review & approval workflow
   - Technical version diffing
   - Attaching immutable evidence records
──────────────────────────────────────────────────────────────── */

export async function getActiveBlueprint(projectId: string) {
  return db.engineeringBlueprint.findFirst({
    where: { projectId },
    orderBy: { version: "desc" },
    include: {
      frontendCapabilities: { orderBy: { order: "asc" } },
      backendApis: { orderBy: { order: "asc" } },
      backendServices: true,
      databaseEntities: { orderBy: { order: "asc" } },
      integrations: true,
      securityRequirements: true,
      testSpecifications: { orderBy: { order: "asc" } },
      dependencies: true,
      clarifications: true,
      drifts: true,
    },
  });
}

export async function getBlueprintVersions(projectId: string) {
  return db.engineeringBlueprint.findMany({
    where: { projectId },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      status: true,
      model: true,
      approvedAt: true,
      approvedByName: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function approveEngineeringBlueprint(params: {
  blueprintId: string;
  userId: string;
  userName: string;
  comment?: string;
}) {
  const bp = await db.engineeringBlueprint.findUnique({
    where: { id: params.blueprintId },
    include: { project: true },
  });

  if (!bp) throw new Error("Blueprint not found.");

  // Freeze current version as APPROVED
  const updated = await db.engineeringBlueprint.update({
    where: { id: params.blueprintId },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      approvedById: params.userId,
      approvedByName: params.userName,
      approvalComment: params.comment || "Approved for engineering execution",
    },
  });

  // Mark older versions as SUPERSEDED
  await db.engineeringBlueprint.updateMany({
    where: {
      projectId: bp.projectId,
      id: { not: params.blueprintId },
      status: "APPROVED",
    },
    data: { status: "SUPERSEDED" },
  });

  // Log activity
  await db.projectActivity.create({
    data: {
      projectId: bp.projectId,
      type: "BLUEPRINT_APPROVED",
      title: `Engineering Blueprint v${bp.version} Approved`,
      detail: `Approved by ${params.userName}. Ready to generate production work plan.`,
      actorName: params.userName,
    },
  });

  await recordAudit({
    clientId: bp.project.clientId,
    entity: "PROJECT",
    action: "STATUS_CHANGED",
    entityId: bp.projectId,
    actorId: params.userId,
    actorName: params.userName,
    after: { blueprintId: bp.id, version: bp.version, status: "APPROVED" },
  });

  return updated;
}

export async function compareBlueprintVersions(projectId: string, v1: number, v2: number) {
  const [bp1, bp2] = await Promise.all([
    db.engineeringBlueprint.findUnique({
      where: { projectId_version: { projectId, version: v1 } },
      include: {
        frontendCapabilities: true,
        backendApis: true,
        databaseEntities: true,
        testSpecifications: true,
      },
    }),
    db.engineeringBlueprint.findUnique({
      where: { projectId_version: { projectId, version: v2 } },
      include: {
        frontendCapabilities: true,
        backendApis: true,
        databaseEntities: true,
        testSpecifications: true,
      },
    }),
  ]);

  if (!bp1 || !bp2) throw new Error("One or both blueprint versions could not be found.");

  // Database diff
  const addedDb = bp2.databaseEntities.filter((d2) => !bp1.databaseEntities.some((d1) => d1.name === d2.name));
  const removedDb = bp1.databaseEntities.filter((d1) => !bp2.databaseEntities.some((d2) => d2.name === d1.name));

  // Backend diff
  const addedBe = bp2.backendApis.filter((b2) => !bp1.backendApis.some((b1) => b1.path === b2.path && b1.method === b2.method));
  const removedBe = bp1.backendApis.filter((b1) => !bp2.backendApis.some((b2) => b2.path === b1.path && b2.method === b1.method));

  // Frontend diff
  const addedFe = bp2.frontendCapabilities.filter((f2) => !bp1.frontendCapabilities.some((f1) => f1.name === f2.name));
  const removedFe = bp1.frontendCapabilities.filter((f1) => !bp2.frontendCapabilities.some((f2) => f2.name === f1.name));

  // Testing diff
  const addedTests = bp2.testSpecifications.filter((t2) => !bp1.testSpecifications.some((t1) => t1.name === t2.name));
  const removedTests = bp1.testSpecifications.filter((t1) => !bp2.testSpecifications.some((t2) => t2.name === t1.name));

  return {
    version1: v1,
    version2: v2,
    database: { added: addedDb.map((d) => d.name), removed: removedDb.map((d) => d.name) },
    backend: { added: addedBe.map((b) => `${b.method} ${b.path}`), removed: removedBe.map((b) => `${b.method} ${b.path}`) },
    frontend: { added: addedFe.map((f) => f.name), removed: removedFe.map((f) => f.name) },
    testing: { added: addedTests.map((t) => t.name), removed: removedTests.map((t) => t.name) },
  };
}

export async function attachEvidenceRecord(params: {
  taskId?: string;
  deliverableId?: string;
  requirementId?: string;
  type: "GIT_COMMIT" | "PULL_REQUEST" | "CI_TEST" | "MIGRATION_RESULT" | "DEPLOYMENT_URL" | "SCREENSHOT" | "REVIEW_SIGNOFF" | "CLIENT_ACCEPTANCE";
  title: string;
  url?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  verifiedBy?: string;
}) {
  const evidence = await db.evidenceRecord.create({
    data: {
      taskId: params.taskId || null,
      deliverableId: params.deliverableId || null,
      requirementId: params.requirementId || null,
      type: params.type,
      title: params.title,
      url: params.url || null,
      description: params.description || null,
      metadata: JSON.stringify(params.metadata || {}),
      verifiedBy: params.verifiedBy || "Automated Pipeline",
      verifiedAt: new Date(),
    },
  });

  return evidence;
}
