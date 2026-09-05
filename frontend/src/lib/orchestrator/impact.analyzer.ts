import { db } from "@/lib/db";

/* ────────────────────────────────────────────────────────────────
   CHANGE IMPACT ANALYZER
   When an approved requirement changes:
   DO NOT regenerate the entire project.
   Analyze only the affected graph:
   Frontend impact, Backend impact, Database impact, API impact,
   Testing impact, Existing work affected.
──────────────────────────────────────────────────────────────── */

export type ImpactReport = {
  requirementId: string;
  requirementTitle?: string;
  affectedFrontendCapabilities: Array<{ id: string; name: string; route?: string | null }>;
  affectedBackendApis: Array<{ id: string; method: string; path: string }>;
  affectedDatabaseEntities: Array<{ id: string; name: string; tableName: string }>;
  affectedTests: Array<{ id: string; name: string; testType: string }>;
  affectedWorkItems: Array<{ id: string; code?: string | null; title: string; status: string; assigneeName?: string | null }>;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  summary: string;
};

export async function analyzeRequirementImpact(params: {
  projectId: string;
  requirementId: string;
}): Promise<ImpactReport> {
  const { projectId, requirementId } = params;

  // 1. Fetch active approved blueprint
  const blueprint = await db.engineeringBlueprint.findFirst({
    where: { projectId },
    orderBy: { version: "desc" },
    include: {
      frontendCapabilities: { where: { requirementId } },
      backendApis: { where: { requirementId } },
      databaseEntities: { where: { requirementId } },
      testSpecifications: { where: { requirementId } },
    },
  });

  // 2. Fetch affected execution tasks
  const affectedTasks = await db.clientTask.findMany({
    where: {
      projectId,
      OR: [
        { sourceRequirementId: requirementId },
        { code: { contains: requirementId } },
      ],
    },
  });

  const fe = blueprint?.frontendCapabilities || [];
  const be = blueprint?.backendApis || [];
  const dbs = blueprint?.databaseEntities || [];
  const tests = blueprint?.testSpecifications || [];

  let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
  if (dbs.length > 0) riskLevel = "HIGH";
  if (affectedTasks.some((t) => t.status === "IN_PROGRESS" || t.status === "DONE")) {
    riskLevel = "CRITICAL";
  } else if (be.length > 1 || fe.length > 1) {
    riskLevel = "MEDIUM";
  }

  const summary = `Modification to ${requirementId} directly impacts ${fe.length} frontend capabilities, ${be.length} backend API contracts, ${dbs.length} database entities, ${tests.length} automated test specifications, and ${affectedTasks.length} active work items.`;

  return {
    requirementId,
    affectedFrontendCapabilities: fe.map((f) => ({ id: f.id, name: f.name, route: f.route })),
    affectedBackendApis: be.map((b) => ({ id: b.id, method: b.method, path: b.path })),
    affectedDatabaseEntities: dbs.map((d) => ({ id: d.id, name: d.name, tableName: d.tableName })),
    affectedTests: tests.map((t) => ({ id: t.id, name: t.name, testType: t.testType })),
    affectedWorkItems: affectedTasks.map((t) => ({
      id: t.id,
      code: t.code,
      title: t.title,
      status: t.status,
      assigneeName: t.assigneeName,
    })),
    riskLevel,
    summary,
  };
}
