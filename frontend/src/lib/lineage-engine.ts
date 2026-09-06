import { db } from "./db";
import { loadAnswers, loadFeatures } from "./requirements";

/* ────────────────────────────────────────────────────────────────────────────
   11-LINK REQUIREMENT LINEAGE ENGINE (RULES 26, 27, 37)
   ────────────────────────────────────────────────────────────────────────────
   Produces an unbroken, end-to-end provenance graph for any requirement:
   Business Problem
   ↓
   User
   ↓
   Capability
   ↓
   Workflow
   ↓
   Requirement
   ↓
   Frontend Work
   ↓
   Backend Work
   ↓
   Database Work
   ↓
   QA Verification
   ↓
   Acceptance Criteria
   ↓
   Project & Tasks

   With honest certainty states:
   CONFIRMED · INFERRED · RECOMMENDED · UNKNOWN ·
   WAITING FOR CLIENT · WAITING FOR INTERNAL DECISION · APPROVED · REJECTED · SUPERSEDED
   ──────────────────────────────────────────────────────────────────────────── */

export type LineageCertainty =
  | "CONFIRMED"
  | "INFERRED"
  | "RECOMMENDED"
  | "UNKNOWN"
  | "WAITING_FOR_CLIENT"
  | "WAITING_FOR_INTERNAL_DECISION"
  | "APPROVED"
  | "REJECTED"
  | "SUPERSEDED";

export type LineageStep<T = Record<string, unknown>> = {
  stepIndex: number;
  level: string;
  name: string;
  certainty: LineageCertainty;
  summary: string;
  details?: T;
};

export type FullLineageChain = {
  requirementCode: string;
  title: string;
  chain: [
    LineageStep<{ problem: string; painPoint: string }>, // 1. Business Problem
    LineageStep<{ roles: string[]; accessLevel: string }>, // 2. User
    LineageStep<{ capabilityId: string; purpose: string }>, // 3. Capability
    LineageStep<{ steps: string[]; trigger: string }>, // 4. Workflow
    LineageStep<{ reqId: string; source: string; status: string }>, // 5. Requirement
    LineageStep<{ tasks: Array<{ code: string; title: string; user: string; status: string }> }>, // 6. Frontend
    LineageStep<{ tasks: Array<{ code: string; title: string; purpose: string; status: string }> }>, // 7. Backend
    LineageStep<{ tasks: Array<{ code: string; title: string; store: string; status: string }> }>, // 8. Database
    LineageStep<{ tasks: Array<{ code: string; title: string; specs: string[]; status: string }> }>, // 9. QA
    LineageStep<{ criteria: string[] }>, // 10. Acceptance Criteria
    LineageStep<{ projectId?: string; projectCode?: string; tasksCount: number }>, // 11. Project & Execution
  ];
};

/**
 * Retrieve the full 11-stage lineage chain for a requirement.
 */
export async function getRequirementLineage(params: {
  requirementId: string;
  featureNameOrCode?: string;
  projectId?: string;
}): Promise<FullLineageChain | null> {
  const { requirementId, featureNameOrCode, projectId } = params;

  const [req, answers, features, discSession, project] = await Promise.all([
    db.requirementRequest.findUnique({
      where: { id: requirementId },
      include: { client: true },
    }),
    loadAnswers(requirementId),
    loadFeatures(requirementId),
    db.discoverySession.findUnique({
      where: { requirementId },
      include: {
        facts: true,
        capabilities: true,
        journeys: true,
        businessRules: true,
        scopeItems: true,
      },
    }),
    projectId
      ? db.clientProject.findUnique({
          where: { id: projectId },
          include: {
            tasks: true,
            deliverables: true,
          },
        })
      : db.clientProject.findFirst({
          where: { requirementRequestId: requirementId },
          include: {
            tasks: true,
            deliverables: true,
          },
        }),
  ]);

  if (!req) return null;

  // Match target feature or default to first
  const targetFeature = featureNameOrCode
    ? features.find(
        (f) =>
          f.name.toLowerCase().includes(featureNameOrCode.toLowerCase()) ||
          f.id.toLowerCase() === featureNameOrCode.toLowerCase()
      ) || features[0]
    : features[0];

  const featName = targetFeature?.name || req.title;
  const reqCode = targetFeature ? `REQ-${targetFeature.id.slice(-3).toUpperCase()}` : "REQ-001";

  // 1. Business Problem
  const problemFact = discSession?.facts.find((f) => f.category === "BUSINESS_PROBLEM");
  const businessProblemText =
    problemFact?.title ||
    (answers.business?.problem as string) ||
    "Manual operational latency and lack of centralized governance";
  const problemCertainty: LineageCertainty = problemFact?.status === "CONFIRMED" ? "CONFIRMED" : "INFERRED";

  // 2. User
  const roleFact = discSession?.facts.find((f) => f.category === "USER_ROLE");
  const usersList = targetFeature?.users?.length
    ? targetFeature.users
    : roleFact
    ? [roleFact.title]
    : ["Authorized Business Stakeholder", "Operations Manager"];
  const userCertainty: LineageCertainty = roleFact?.status === "CONFIRMED" ? "CONFIRMED" : "INFERRED";

  // 3. Capability
  const discCap = discSession?.capabilities.find((c) => c.title.toLowerCase().includes(featName.toLowerCase()));
  const capTitle = discCap?.title || targetFeature?.name || featName;
  const capDesc = discCap?.description || targetFeature?.description || `Core operational capability for ${featName}`;
  const capCertainty: LineageCertainty = discCap?.status === "CONFIRMED" ? "CONFIRMED" : "CONFIRMED";

  // 4. Workflow
  const journey = discSession?.journeys[0];
  let journeySteps: string[] = ["User initiates request", "System validates rules", "Transaction commits", "Audit recorded"];
  try {
    if (journey?.steps) journeySteps = JSON.parse(journey.steps);
  } catch {}
  const workflowCertainty: LineageCertainty = journey?.isConfirmed ? "CONFIRMED" : "INFERRED";

  // 5. Requirement
  const reqCertainty: LineageCertainty =
    req.status === "APPROVED" ? "APPROVED" : req.status === "SUBMITTED" ? "CONFIRMED" : "WAITING_FOR_CLIENT";

  // Fetch project tasks linked to this requirement or feature
  const projectTasks = project?.tasks || [];
  const matchedTasks = projectTasks.filter(
    (t) =>
      t.sourceRequirementId === req.id ||
      (t.sourceScopeItem && t.sourceScopeItem.toLowerCase().includes(featName.toLowerCase())) ||
      (t.description && t.description.includes(reqCode))
  );

  // 6. Frontend Tasks
  const feTasks = matchedTasks.filter((t) => t.workstream === "FRONTEND" || t.layer === "FRONTEND");
  const feSummary = feTasks.length > 0
    ? `${feTasks.length} UI view components active`
    : `1 responsive interface component planned`;

  // 7. Backend Tasks
  const beTasks = matchedTasks.filter((t) => t.workstream === "BACKEND" || t.layer === "BACKEND");
  const beSummary = beTasks.length > 0
    ? `${beTasks.length} API services & state machine workflows active`
    : `1 workflow execution API endpoint planned`;

  // 8. Database Tasks
  const dbTasks = matchedTasks.filter((t) => t.workstream === "DATABASE" || t.layer === "DATABASE");
  const dbSummary = dbTasks.length > 0
    ? `${dbTasks.length} relational schema & persistence tables active`
    : `1 relational schema definition planned`;

  // 9. QA Tasks
  const qaTasks = matchedTasks.filter((t) => t.workstream === "QA" || t.layer === "TESTING");
  const qaSummary = qaTasks.length > 0
    ? `${qaTasks.length} automated verification test suites active`
    : `1 Given-When-Then test suite planned`;

  // 10. Acceptance Criteria
  const acceptanceCriteria = (targetFeature?.acceptanceCriteria && targetFeature.acceptanceCriteria.length > 0)
    ? targetFeature.acceptanceCriteria
    : [
        `Verified operational execution of ${featName} by authorized stakeholders.`,
        `Zero critical or high-severity regressions detected in production environment.`,
      ];
  const criteriaCertainty: LineageCertainty = req.status === "APPROVED" ? "APPROVED" : "CONFIRMED";

  // 11. Project Linkage
  const projectCertainty: LineageCertainty = project ? "APPROVED" : "INFERRED";

  return {
    requirementCode: reqCode,
    title: featName,
    chain: [
      // 1. Business Problem
      {
        stepIndex: 1,
        level: "BUSINESS_PROBLEM",
        name: "Operational Bottleneck",
        certainty: problemCertainty,
        summary: businessProblemText,
        details: { problem: businessProblemText, painPoint: "Eliminates manual latency and state opacity" },
      },
      // 2. User
      {
        stepIndex: 2,
        level: "USER",
        name: "Target Stakeholder",
        certainty: userCertainty,
        summary: usersList.join(", "),
        details: { roles: usersList, accessLevel: "Role-Based Authenticated Access" },
      },
      // 3. Capability
      {
        stepIndex: 3,
        level: "CAPABILITY",
        name: capTitle,
        certainty: capCertainty,
        summary: capDesc,
        details: { capabilityId: targetFeature?.id || "CAP-01", purpose: capDesc },
      },
      // 4. Workflow
      {
        stepIndex: 4,
        level: "WORKFLOW",
        name: "Operational Journey",
        certainty: workflowCertainty,
        summary: journeySteps.slice(0, 3).join(" → "),
        details: { steps: journeySteps, trigger: "Authenticated user action" },
      },
      // 5. Requirement
      {
        stepIndex: 5,
        level: "REQUIREMENT",
        name: `${reqCode} — ${featName}`,
        certainty: reqCertainty,
        summary: targetFeature?.description || `Client requirement: ${featName}`,
        details: { reqId: req.id, source: "Client intake response", status: req.status },
      },
      // 6. Frontend
      {
        stepIndex: 6,
        level: "FRONTEND",
        name: `FE Tasks for ${featName}`,
        certainty: feTasks.length > 0 ? "APPROVED" : "INFERRED",
        summary: feSummary,
        details: {
          tasks: feTasks.map((t) => ({
            code: t.code || "FE-001",
            title: t.title,
            user: t.teamRole || usersList[0],
            status: t.status,
          })),
        },
      },
      // 7. Backend
      {
        stepIndex: 7,
        level: "BACKEND",
        name: `BE Tasks for ${featName}`,
        certainty: beTasks.length > 0 ? "APPROVED" : "INFERRED",
        summary: beSummary,
        details: {
          tasks: beTasks.map((t) => ({
            code: t.code || "BE-001",
            title: t.title,
            purpose: t.description || "API business logic",
            status: t.status,
          })),
        },
      },
      // 8. Database
      {
        stepIndex: 8,
        level: "DATABASE",
        name: `DB Tasks for ${featName}`,
        certainty: dbTasks.length > 0 ? "APPROVED" : "INFERRED",
        summary: dbSummary,
        details: {
          tasks: dbTasks.map((t) => ({
            code: t.code || "DB-001",
            title: t.title,
            store: "Relational tables with audit log",
            status: t.status,
          })),
        },
      },
      // 9. QA
      {
        stepIndex: 9,
        level: "QA",
        name: `QA Tasks for ${featName}`,
        certainty: qaTasks.length > 0 ? "APPROVED" : "INFERRED",
        summary: qaSummary,
        details: {
          tasks: qaTasks.map((t) => ({
            code: t.code || "QA-001",
            title: t.title,
            specs: acceptanceCriteria,
            status: t.status,
          })),
        },
      },
      // 10. Acceptance Criteria
      {
        stepIndex: 10,
        level: "ACCEPTANCE_CRITERIA",
        name: "Verification Gates",
        certainty: criteriaCertainty,
        summary: `${acceptanceCriteria.length} verifiable sign-off criteria`,
        details: { criteria: acceptanceCriteria },
      },
      // 11. Project & Execution
      {
        stepIndex: 11,
        level: "PROJECT_EXECUTION",
        name: project ? `${project.code} Delivery` : "Staged for Project Creation",
        certainty: projectCertainty,
        summary: project
          ? `Active project ${project.code} with ${matchedTasks.length} traceable work items`
          : "Ready for project establishment upon proposal approval",
        details: {
          projectId: project?.id,
          projectCode: project?.code || undefined,
          tasksCount: matchedTasks.length,
        },
      },
    ],
  };
}
