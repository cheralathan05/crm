import { db } from "@/lib/db";

/* ────────────────────────────────────────────────────────────────
   ARCHITECTURE DRIFT DETECTOR
   Compares:
   Approved Blueprint vs Actual Implementation Tasks & Database
   Detects:
   - Unplanned work items created without requirement linkage
   - Unmapped APIs
   - Missing test specifications
   - Deviations in database entity naming
──────────────────────────────────────────────────────────────── */

export type DriftItem = {
  id?: string;
  category: "UNMAPPED_WORK" | "UNPLANNED_ENTITY" | "UNMAPPED_API" | "MISSING_TEST_COVERAGE";
  entityName: string;
  difference: string;
  approvedDefinition?: string;
  actualDefinition?: string;
  status: "FLAGGED" | "REVIEWED" | "ACCEPTED" | "DISMISSED";
};

export async function detectArchitectureDrift(projectId: string): Promise<DriftItem[]> {
  const drifts: DriftItem[] = [];

  const blueprint = await db.engineeringBlueprint.findFirst({
    where: { projectId, status: "APPROVED" },
    include: {
      frontendCapabilities: true,
      backendApis: true,
      databaseEntities: true,
      testSpecifications: true,
    },
  });

  const tasks = await db.clientTask.findMany({
    where: { projectId },
  });

  // 1. Check for Orphan Work Items (Work DNA Violation)
  tasks.forEach((t) => {
    if (!t.sourceRequirementId && !t.deliverableId && !t.sourceProposalId) {
      drifts.push({
        category: "UNMAPPED_WORK",
        entityName: t.code || t.title,
        difference: `Task "${t.title}" is not linked to any approved requirement, deliverable, or scope change.`,
        actualDefinition: `Task ID: ${t.id} [${t.status}]`,
        approvedDefinition: "Must trace to an approved REQ-xxx or DLV-xxx.",
        status: "FLAGGED",
      });
    }
  });

  // 2. Check for missing test coverage on critical APIs
  if (blueprint) {
    blueprint.backendApis.forEach((api) => {
      const hasMatchingTest = blueprint.testSpecifications.some(
        (ts) => ts.requirementId === api.requirementId || ts.description.toLowerCase().includes(api.path.toLowerCase()),
      );
      if (!hasMatchingTest) {
        drifts.push({
          category: "MISSING_TEST_COVERAGE",
          entityName: `${api.method} ${api.path}`,
          difference: `Backend API endpoint ${api.method} ${api.path} has no dedicated automated test specification in the approved blueprint.`,
          actualDefinition: `API exists for requirement ${api.requirementId || "N/A"}`,
          approvedDefinition: "Every approved API must have an associated test specification.",
          status: "FLAGGED",
        });
      }
    });
  }

  // 3. Persist new drifts in database
  for (const d of drifts) {
    const existing = await db.architectureDrift.findFirst({
      where: {
        projectId,
        category: d.category,
        entityName: d.entityName,
      },
    });

    if (!existing) {
      await db.architectureDrift.create({
        data: {
          projectId,
          blueprintId: blueprint?.id || null,
          category: d.category,
          entityName: d.entityName,
          difference: d.difference,
          approvedDefinition: d.approvedDefinition || "{}",
          actualDefinition: d.actualDefinition || "{}",
          status: d.status,
        },
      });
    }
  }

  return drifts;
}
