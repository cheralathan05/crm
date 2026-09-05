import { db } from "@/lib/db";

/* ────────────────────────────────────────────────────────────────
   TRACEABILITY ENGINE
   Bi-directional lineage queries:
   FORWARD: Requirement -> Deliverable -> Acceptance -> Frontend -> Backend -> Database -> Tests -> Work -> Evidence -> Client Acceptance
   BACKWARD: Database / API / Work -> Requirement -> Proposal
──────────────────────────────────────────────────────────────── */

export type RequirementTraceNode = {
  requirementId: string;
  requirementTitle: string;
  deliverable?: { id: string; title: string; status: string } | null;
  acceptanceCriteria: Array<{ id: string; criterion: string; verified: boolean }>;
  frontendCapabilities: Array<{ id: string; name: string; route?: string | null; status: string }>;
  backendApis: Array<{ id: string; method: string; path: string; status: string }>;
  databaseEntities: Array<{ id: string; name: string; tableName: string; status: string }>;
  testSpecifications: Array<{ id: string; name: string; testType: string; status: string }>;
  workTasks: Array<{ id: string; code?: string | null; title: string; layer?: string | null; status: string; assigneeName?: string | null }>;
  evidenceRecords: Array<{ id: string; type: string; title: string; url?: string | null; verifiedAt: Date }>;
  clientAcceptanceStatus: string;
};

export async function getRequirementTrace(projectId: string, requirementId: string): Promise<RequirementTraceNode | null> {
  const project = await db.clientProject.findUnique({
    where: { id: projectId },
    include: {
      blueprints: {
        orderBy: { version: "desc" },
        take: 1,
        include: {
          frontendCapabilities: { where: { requirementId } },
          backendApis: { where: { requirementId } },
          databaseEntities: { where: { requirementId } },
          testSpecifications: { where: { requirementId } },
        },
      },
      deliverables: {
        include: {
          tasks: true,
        },
      },
      tasks: {
        where: {
          OR: [
            { sourceRequirementId: requirementId },
            { code: { contains: requirementId } },
          ],
        },
        include: {
          evidenceRecords: true,
        },
      },
    },
  });

  if (!project) return null;

  const blueprint = project.blueprints[0];
  const fe = blueprint?.frontendCapabilities || [];
  const be = blueprint?.backendApis || [];
  const dbEntities = blueprint?.databaseEntities || [];
  const tests = blueprint?.testSpecifications || [];
  const tasks = project.tasks || [];

  const matchedDeliv = project.deliverables.find(
    (d) => d.tasks.some((t) => tasks.some((tk) => tk.id === t.id)) || d.title.toLowerCase().includes(requirementId.toLowerCase()),
  ) || project.deliverables[0] || null;

  // Extract criteria
  let acs: Array<{ id: string; criterion: string; verified: boolean }> = [];
  try {
    if (matchedDeliv?.acceptanceCriteria) {
      const parsed = JSON.parse(matchedDeliv.acceptanceCriteria);
      acs = parsed.map((c: string, idx: number) => ({
        id: `AC-${requirementId.replace(/[^0-9]/g, "") || "001"}.${idx + 1}`,
        criterion: c,
        verified: tests.some((t) => t.status === "PASSED"),
      }));
    }
  } catch {}

  const allEvidence = tasks.flatMap((t) => t.evidenceRecords);

  return {
    requirementId,
    requirementTitle: `Requirement ${requirementId}`,
    deliverable: matchedDeliv ? { id: matchedDeliv.id, title: matchedDeliv.title, status: matchedDeliv.status } : null,
    acceptanceCriteria: acs,
    frontendCapabilities: fe.map((f) => ({ id: f.id, name: f.name, route: f.route, status: f.status })),
    backendApis: be.map((b) => ({ id: b.id, method: b.method, path: b.path, status: b.status })),
    databaseEntities: dbEntities.map((d) => ({ id: d.id, name: d.name, tableName: d.tableName, status: d.status })),
    testSpecifications: tests.map((t) => ({ id: t.id, name: t.name, testType: t.testType, status: t.status })),
    workTasks: tasks.map((t) => ({ id: t.id, code: t.code, title: t.title, layer: t.layer, status: t.status, assigneeName: t.assigneeName })),
    evidenceRecords: allEvidence.map((e) => ({ id: e.id, type: e.type, title: e.title, url: e.url, verifiedAt: e.verifiedAt })),
    clientAcceptanceStatus: matchedDeliv?.status === "ACCEPTED" ? "ACCEPTED" : matchedDeliv?.status === "CLIENT_REVIEW" ? "IN_REVIEW" : "PENDING_DELIVERY",
  };
}

export type EntityBackwardTrace = {
  entityType: "DATABASE" | "API" | "FRONTEND" | "TASK";
  id: string;
  name: string;
  sourceRequirementId?: string | null;
  deliverableTitle?: string | null;
  proposalReference?: string | null;
  businessPurpose: string;
  technicalReason?: string | null;
  tests: string[];
  evidence: string[];
};

export async function getEntityBackwardTrace(params: {
  projectId: string;
  type: "DATABASE" | "API" | "FRONTEND" | "TASK";
  id: string;
}): Promise<EntityBackwardTrace | null> {
  const project = await db.clientProject.findUnique({
    where: { id: params.projectId },
    include: {
      proposal: true,
      deliverables: true,
      blueprints: {
        orderBy: { version: "desc" },
        take: 1,
        include: {
          databaseEntities: true,
          backendApis: true,
          frontendCapabilities: true,
          testSpecifications: true,
        },
      },
    },
  });

  if (!project) return null;
  const bp = project.blueprints[0];

  if (params.type === "DATABASE") {
    const dbEntity = bp?.databaseEntities.find((d) => d.id === params.id || d.name === params.id);
    if (!dbEntity) return null;
    const tests = bp?.testSpecifications.filter((t) => t.requirementId === dbEntity.requirementId).map((t) => t.name) || [];
    return {
      entityType: "DATABASE",
      id: dbEntity.id,
      name: dbEntity.name,
      sourceRequirementId: dbEntity.requirementId,
      deliverableTitle: project.deliverables.find((d) => d.id === dbEntity.deliverableId)?.title || null,
      proposalReference: project.proposal?.reference || project.code,
      businessPurpose: dbEntity.purpose,
      technicalReason: dbEntity.technicalReason,
      tests,
      evidence: [],
    };
  }

  if (params.type === "API") {
    const api = bp?.backendApis.find((a) => a.id === params.id || `${a.method} ${a.path}` === params.id);
    if (!api) return null;
    const tests = bp?.testSpecifications.filter((t) => t.requirementId === api.requirementId).map((t) => t.name) || [];
    return {
      entityType: "API",
      id: api.id,
      name: `${api.method} ${api.path}`,
      sourceRequirementId: api.requirementId,
      deliverableTitle: project.deliverables.find((d) => d.id === api.deliverableId)?.title || null,
      proposalReference: project.proposal?.reference || project.code,
      businessPurpose: api.purpose,
      technicalReason: `Executed via ${api.service}`,
      tests,
      evidence: [],
    };
  }

  if (params.type === "FRONTEND") {
    const fe = bp?.frontendCapabilities.find((f) => f.id === params.id || f.name === params.id);
    if (!fe) return null;
    const tests = bp?.testSpecifications.filter((t) => t.requirementId === fe.requirementId).map((t) => t.name) || [];
    return {
      entityType: "FRONTEND",
      id: fe.id,
      name: fe.name,
      sourceRequirementId: fe.requirementId,
      deliverableTitle: project.deliverables.find((d) => d.id === fe.deliverableId)?.title || null,
      proposalReference: project.proposal?.reference || project.code,
      businessPurpose: fe.description || "User interface presentation layer",
      technicalReason: fe.reason,
      tests,
      evidence: [],
    };
  }

  if (params.type === "TASK") {
    const task = await db.clientTask.findUnique({
      where: { id: params.id },
      include: { evidenceRecords: true, deliverable: true },
    });
    if (!task) return null;
    return {
      entityType: "TASK",
      id: task.id,
      name: task.title,
      sourceRequirementId: task.sourceRequirementId,
      deliverableTitle: task.deliverable?.title || null,
      proposalReference: task.sourceProposalReference || project.proposal?.reference || project.code,
      businessPurpose: task.description || task.title,
      technicalReason: `Layer: ${task.layer || task.workstream}`,
      tests: [],
      evidence: task.evidenceRecords.map((e) => `${e.type}: ${e.title}`),
    };
  }

  return null;
}
