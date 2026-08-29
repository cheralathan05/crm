import { db } from "@/lib/db";
import { getOrGenerateEmployeeProjectBrief } from "./employee-project-brief.service";

/* ════════════════════════════════════════════════════════════════════
   WORKSTREAM ASSIGNMENT SERVICE
   
   Responsibility-first assignment engine. Admin selects project →
   employee → responsibility → system discovers real work → assigns.
   
   ZERO MOCK DATA. Every value computed from the real database.
   ════════════════════════════════════════════════════════════════════ */

// ── Workstream Constants ────────────────────────────────────────────

export type Workstream =
  | "FRONTEND"
  | "BACKEND"
  | "DATABASE"
  | "QA"
  | "INTEGRATION"
  | "DESIGN"
  | "DEPLOYMENT"
  | "DISCOVERY"
  | "CLIENT_REVIEW";

export const WORKSTREAM_LABELS: Record<string, string> = {
  FRONTEND: "Frontend Development",
  BACKEND: "Backend & API Development",
  DATABASE: "Database & Data Models",
  QA: "QA & Verification",
  INTEGRATION: "Integration & API Connections",
  DESIGN: "Design & UX",
  DEPLOYMENT: "Deployment & Infrastructure",
  DISCOVERY: "Discovery & Requirements",
  CLIENT_REVIEW: "Client Review & Delivery",
};

export const WORKSTREAM_DESCRIPTIONS: Record<string, string> = {
  FRONTEND: "UI pages, components, responsive implementation, state management, API integration, loading & error states, validation",
  BACKEND: "API endpoints, business logic services, authentication, authorization, data processing",
  DATABASE: "Data models, schema design, migrations, query optimization, relationships, indexes",
  QA: "Test specifications, acceptance criteria verification, regression testing, performance validation",
  INTEGRATION: "External API connections, webhooks, third-party services, data synchronization",
  DESIGN: "UI/UX design, wireframes, prototypes, design system components",
  DEPLOYMENT: "CI/CD pipelines, infrastructure, monitoring, deployment automation",
  DISCOVERY: "Requirements analysis, scope definition, feasibility studies",
  CLIENT_REVIEW: "Client demos, feedback collection, acceptance sign-off",
};

/** Maps role codes → allowed workstreams. Role safety enforcement. */
const ROLE_WORKSTREAM_MAP: Record<string, Workstream[]> = {
  "ROLE-ENG-FRONTEND": ["FRONTEND", "INTEGRATION"],
  "ROLE-ENG-BACKEND": ["BACKEND", "DATABASE", "INTEGRATION"],
  "ROLE-ENG-STAFF": ["FRONTEND", "BACKEND", "DATABASE", "INTEGRATION", "DEPLOYMENT"],
  "ROLE-QA-LEAD": ["QA"],
  "ROLE-PROD-LEAD": ["FRONTEND", "BACKEND", "DATABASE", "QA", "INTEGRATION", "DESIGN", "DEPLOYMENT", "DISCOVERY", "CLIENT_REVIEW"],
};

/** Maps workstreams → task layer values that match */
const WORKSTREAM_LAYER_MAP: Record<string, string[]> = {
  FRONTEND: ["FRONTEND"],
  BACKEND: ["BACKEND"],
  DATABASE: ["DATABASE"],
  QA: ["TESTING"],
  INTEGRATION: ["INTEGRATION"],
  DESIGN: ["FRONTEND"],
  DEPLOYMENT: ["DEPLOYMENT"],
};

/** Maps workstreams → task.workstream values that match */
const WORKSTREAM_TASK_MAP: Record<string, string[]> = {
  FRONTEND: ["FRONTEND"],
  BACKEND: ["BACKEND"],
  DATABASE: ["DATABASE"],
  QA: ["QA"],
  INTEGRATION: ["INTEGRATION"],
  DESIGN: ["DESIGN"],
  DEPLOYMENT: ["DEPLOYMENT"],
  DISCOVERY: ["DISCOVERY"],
  CLIENT_REVIEW: ["CLIENT_REVIEW"],
};

// ── Type Definitions ────────────────────────────────────────────────

export type ProjectForAssignment = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  stage: string;
  health: string;
  clientName: string;
  clientId: string;
  proposalId: string | null;
  startedAt: string | null;
  deadline: string | null;
  scope: {
    pages: number;
    components: number;
    apis: number;
    databaseEntities: number;
    deliverables: number;
    tasks: number;
    testSpecs: number;
  };
  teamSize: number;
  progress: number;
};

export type EmployeeForAssignment = {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  avatar: string | null;
  status: string;
  department: string;
  roleName: string | null;
  roleCode: string | null;
  teamName: string | null;
  skills: string[];
  currentWorkload: {
    activeTaskCount: number;
    assignedHours: number;
    capacityHours: number;
    utilizationPercent: number;
  };
  currentProjects: Array<{
    id: string;
    name: string;
    code: string | null;
    workstream: string | null;
  }>;
  alreadyOnProject: boolean;
  existingWorkstream: string | null;
};

export type ResponsibilityOption = {
  workstream: Workstream;
  label: string;
  description: string;
  isCompatible: boolean;
  reason: string;
};

export type DiscoveredWork = {
  projectId: string;
  projectName: string;
  projectDescription: string | null;
  workstream: string;
  workstreamLabel: string;
  scope: {
    pages: number;
    components: number;
    forms: number;
    tables: number;
    dialogs: number;
    apis: number;
    databaseEntities: number;
    testSpecs: number;
    deliverables: number;
    existingTasks: number;
  };
  pages: Array<{
    id: string;
    name: string;
    type: string;
    route: string | null;
    description: string | null;
    status: string;
    components: string[];
    apiDependencies: string[];
    order: number;
  }>;
  apis: Array<{
    id: string;
    method: string;
    path: string;
    purpose: string;
    status: string;
  }>;
  databaseEntities: Array<{
    id: string;
    name: string;
    tableName: string;
    purpose: string;
    fieldCount: number;
    status: string;
  }>;
  testSpecs: Array<{
    id: string;
    name: string;
    testType: string;
    description: string;
    status: string;
  }>;
  deliverables: Array<{
    id: string;
    title: string;
    category: string | null;
    status: string;
  }>;
  existingTasks: Array<{
    id: string;
    code: string | null;
    title: string;
    status: string;
    priority: string;
    assigneeId: string | null;
    assigneeName: string | null;
    estimatedHours: number | null;
  }>;
  dependencyChain: DependencyNode[];
  capabilities: string[];
};

export type DependencyNode = {
  layer: string;
  label: string;
  items: Array<{
    sourceId: string;
    sourceName: string;
    targetId: string;
    targetName: string;
    targetLayer: string;
    dependencyType: string;
  }>;
};

export type AssignmentAnalysis = {
  roleMatch: { score: "EXCELLENT" | "GOOD" | "PARTIAL" | "INCOMPATIBLE"; reason: string };
  skillMatch: { score: "EXCELLENT" | "GOOD" | "PARTIAL" | "NONE"; matchedSkills: string[]; reason: string };
  currentWorkload: { activeTaskCount: number; assignedHours: number; capacityHours: number; utilizationPercent: number };
  availableCapacity: { hoursAvailable: number; capacityPercent: number; status: "AVAILABLE" | "MODERATE" | "LIMITED" | "OVERLOADED" };
  projectAssignments: { activeCount: number; projects: string[] };
  dependencyRisks: string[];
  deadlinePressure: { level: "LOW" | "MEDIUM" | "HIGH"; nearestDeadline: string | null };
  recommendation: { recommended: boolean; reason: string };
  warnings: string[];
};

// ── 1. Get Projects for Assignment ──────────────────────────────────

export async function getProjectsForAssignment(workspaceId: string): Promise<ProjectForAssignment[]> {
  const projects = await db.clientProject.findMany({
    where: {
      client: { workspaceId },
      stage: { not: "COMPLETED" },
    },
    include: {
      client: { select: { id: true, companyName: true } },
      deliverables: { select: { id: true } },
      tasks: { select: { id: true, status: true } },
      team: { select: { id: true } },
      blueprints: {
        take: 1,
        orderBy: { version: "desc" },
        include: {
          frontendCapabilities: { select: { id: true, type: true } },
          backendApis: { select: { id: true } },
          databaseEntities: { select: { id: true } },
          testSpecifications: { select: { id: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return projects.map((p) => {
    const bp = p.blueprints[0];
    const pages = bp?.frontendCapabilities.filter((f) => f.type === "PAGE").length || 0;
    const components = bp?.frontendCapabilities.filter((f) => f.type !== "PAGE").length || 0;
    const apis = bp?.backendApis.length || 0;
    const dbEntities = bp?.databaseEntities.length || 0;
    const testSpecs = bp?.testSpecifications.length || 0;

    const totalTasks = p.tasks.length;
    const completedTasks = p.tasks.filter(
      (t) => t.status === "DONE" || t.status === "COMPLETED"
    ).length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      id: p.id,
      name: p.name,
      code: p.code,
      description: p.description,
      stage: p.stage,
      health: p.health,
      clientName: p.client.companyName,
      clientId: p.clientId,
      proposalId: p.proposalId,
      startedAt: p.startedAt?.toISOString() || null,
      deadline: p.deadline?.toISOString() || null,
      scope: {
        pages,
        components,
        apis,
        databaseEntities: dbEntities,
        deliverables: p.deliverables.length,
        tasks: totalTasks,
        testSpecs,
      },
      teamSize: p.team.length,
      progress,
    };
  });
}

// ── 2. Get Employees for Project Assignment ─────────────────────────

export async function getEmployeesForProject(
  workspaceId: string,
  projectId: string
): Promise<EmployeeForAssignment[]> {
  const employees = await db.employee.findMany({
    where: {
      workspaceId,
      status: { in: ["ACTIVE", "INVITED"] },
    },
    include: {
      role: true,
      team: true,
      projectAllocations: {
        where: { releasedAt: null },
        include: {
          project: { select: { id: true, name: true, code: true } },
        },
      },
    },
    orderBy: { fullName: "asc" },
  });

  const enriched = await Promise.all(
    employees.map(async (emp) => {
      const activeTasks = await db.clientTask.findMany({
        where: {
          assigneeId: emp.id,
          status: { in: ["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW"] },
        },
      });

      const assignedHours = activeTasks.reduce((sum, t) => sum + (t.estimatedHours || 4), 0);
      const capacityHours = emp.capacityTargetHours || 40;
      const utilizationPercent = Math.round((assignedHours / capacityHours) * 100);

      let skills: string[] = [];
      try {
        const caps = JSON.parse(emp.capabilities || "[]");
        skills = caps.map((c: any) => (typeof c === "string" ? c : c.skill || c.name || "")).filter(Boolean);
      } catch {}

      const existingAllocation = emp.projectAllocations.find(
        (a) => a.projectId === projectId
      );

      return {
        id: emp.id,
        employeeCode: emp.employeeCode,
        fullName: emp.fullName,
        email: emp.email,
        avatar: emp.avatar,
        status: emp.status,
        department: emp.department,
        roleName: emp.role?.name || null,
        roleCode: emp.role?.code || null,
        teamName: emp.team?.name || null,
        skills,
        currentWorkload: {
          activeTaskCount: activeTasks.length,
          assignedHours,
          capacityHours,
          utilizationPercent,
        },
        currentProjects: emp.projectAllocations.map((a) => ({
          id: a.project.id,
          name: a.project.name,
          code: a.project.code,
          workstream: a.workstream,
        })),
        alreadyOnProject: !!existingAllocation,
        existingWorkstream: existingAllocation?.workstream || null,
      };
    })
  );

  return enriched;
}

// ── 3. Get Responsibilities Compatible with Employee Role ───────────

export function getResponsibilitiesForEmployee(
  roleCode: string | null,
  roleName: string | null
): ResponsibilityOption[] {
  const allWorkstreams: Workstream[] = [
    "FRONTEND",
    "BACKEND",
    "DATABASE",
    "QA",
    "INTEGRATION",
  ];

  // Determine allowed workstreams from role
  let allowed: Workstream[] = [];

  if (roleCode && ROLE_WORKSTREAM_MAP[roleCode]) {
    allowed = ROLE_WORKSTREAM_MAP[roleCode];
  } else if (roleName) {
    // Infer from role name if no code match
    const lower = roleName.toLowerCase();
    if (lower.includes("frontend") || lower.includes("ui") || lower.includes("ux")) {
      allowed = ["FRONTEND", "INTEGRATION"];
    } else if (lower.includes("backend") || lower.includes("database") || lower.includes("api")) {
      allowed = ["BACKEND", "DATABASE", "INTEGRATION"];
    } else if (lower.includes("full-stack") || lower.includes("fullstack") || lower.includes("full stack")) {
      allowed = ["FRONTEND", "BACKEND", "DATABASE", "INTEGRATION", "DEPLOYMENT"];
    } else if (lower.includes("qa") || lower.includes("test") || lower.includes("verification")) {
      allowed = ["QA"];
    } else if (lower.includes("product") || lower.includes("lead") || lower.includes("manager")) {
      allowed = allWorkstreams;
    } else {
      // Default: allow common workstreams for unrecognized roles
      allowed = ["FRONTEND", "BACKEND", "DATABASE", "QA", "INTEGRATION"];
    }
  } else {
    // No role assigned — restrict to none
    allowed = [];
  }

  return allWorkstreams.map((ws) => {
    const isCompatible = allowed.includes(ws);
    return {
      workstream: ws,
      label: WORKSTREAM_LABELS[ws] || ws,
      description: WORKSTREAM_DESCRIPTIONS[ws] || "",
      isCompatible,
      reason: isCompatible
        ? `Compatible with ${roleName || "assigned role"}`
        : !roleCode && !roleName
          ? "No organization role assigned — assign a role first"
          : `Not compatible with ${roleName || "current role"}`,
    };
  });
}

// ── 4. Discover Work for a Responsibility ───────────────────────────

export async function discoverWorkForResponsibility(
  projectId: string,
  workstream: string
): Promise<DiscoveredWork> {
  const project = await db.clientProject.findUnique({
    where: { id: projectId },
    include: {
      client: { select: { companyName: true } },
    },
  });

  if (!project) throw new Error("Project not found.");

  // Get the latest approved blueprint
  const blueprint = await db.engineeringBlueprint.findFirst({
    where: { projectId },
    orderBy: { version: "desc" },
  });

  // ── Frontend Capabilities (pages, components) ────────────────
  let pages: DiscoveredWork["pages"] = [];
  let pageCount = 0;
  let componentCount = 0;
  let formCount = 0;
  let tableCount = 0;
  let dialogCount = 0;

  if (blueprint && (workstream === "FRONTEND" || workstream === "INTEGRATION")) {
    const capabilities = await db.frontendCapability.findMany({
      where: { blueprintId: blueprint.id },
      orderBy: { order: "asc" },
    });

    pages = capabilities.map((cap) => {
      let components: string[] = [];
      let apiDeps: string[] = [];
      try { components = JSON.parse(cap.components || "[]"); } catch {}
      try { apiDeps = JSON.parse(cap.apiDependencies || "[]"); } catch {}

      return {
        id: cap.id,
        name: cap.name,
        type: cap.type,
        route: cap.route,
        description: cap.description,
        status: cap.status,
        components,
        apiDependencies: apiDeps,
        order: cap.order,
      };
    });

    pageCount = capabilities.filter((c) => c.type === "PAGE").length;
    componentCount = capabilities.filter((c) => c.type === "COMPONENT").length;
    formCount = capabilities.filter((c) => c.type === "FORM").length;
    tableCount = capabilities.filter((c) => c.type === "TABLE").length;
    dialogCount = capabilities.filter((c) => c.type === "DIALOG" || c.type === "DRAWER").length;
  }

  // ── Backend APIs ─────────────────────────────────────────────
  let apis: DiscoveredWork["apis"] = [];
  if (blueprint && (workstream === "BACKEND" || workstream === "INTEGRATION" || workstream === "FRONTEND")) {
    const backendApis = await db.backendApi.findMany({
      where: { blueprintId: blueprint.id },
      orderBy: { order: "asc" },
    });

    apis = backendApis.map((api) => ({
      id: api.id,
      method: api.method,
      path: api.path,
      purpose: api.purpose,
      status: api.status,
    }));
  }

  // ── Database Entities ────────────────────────────────────────
  let databaseEntities: DiscoveredWork["databaseEntities"] = [];
  if (blueprint && (workstream === "DATABASE" || workstream === "BACKEND")) {
    const entities = await db.databaseEntity.findMany({
      where: { blueprintId: blueprint.id },
      orderBy: { order: "asc" },
    });

    databaseEntities = entities.map((e) => {
      let fields: any[] = [];
      try { fields = JSON.parse(e.fields || "[]"); } catch {}
      return {
        id: e.id,
        name: e.name,
        tableName: e.tableName,
        purpose: e.purpose,
        fieldCount: fields.length,
        status: e.status,
      };
    });
  }

  // ── Test Specifications ──────────────────────────────────────
  let testSpecs: DiscoveredWork["testSpecs"] = [];
  if (blueprint && workstream === "QA") {
    const specs = await db.testSpecification.findMany({
      where: { blueprintId: blueprint.id },
      orderBy: { order: "asc" },
    });

    testSpecs = specs.map((s) => ({
      id: s.id,
      name: s.name,
      testType: s.testType,
      description: s.description,
      status: s.status,
    }));
  }

  // ── Deliverables ─────────────────────────────────────────────
  const deliverables = await db.projectDeliverable.findMany({
    where: { projectId },
  });

  const filteredDeliverables = deliverables.map((d) => ({
    id: d.id,
    title: d.title,
    category: d.category,
    status: d.status,
  }));

  // ── Existing Tasks (matching workstream/layer) ───────────────
  const wsTaskFilters = WORKSTREAM_TASK_MAP[workstream] || [workstream];
  const wsLayerFilters = WORKSTREAM_LAYER_MAP[workstream] || [workstream];

  const existingTasks = await db.clientTask.findMany({
    where: {
      projectId,
      OR: [
        { workstream: { in: wsTaskFilters } },
        { layer: { in: wsLayerFilters } },
      ],
    },
    orderBy: [{ priority: "asc" }, { order: "asc" }],
  });

  const tasksList = existingTasks.map((t) => ({
    id: t.id,
    code: t.code,
    title: t.title,
    status: t.status,
    priority: t.priority,
    assigneeId: t.assigneeId,
    assigneeName: t.assigneeName,
    estimatedHours: t.estimatedHours,
  }));

  // ── Dependency Chain ─────────────────────────────────────────
  const dependencyChain = await getDependencyChain(projectId, workstream, blueprint?.id || null);

  // ── Capabilities list (what this responsibility includes) ────
  const capabilities = buildCapabilitiesList(workstream, {
    pages: pageCount,
    components: componentCount,
    forms: formCount,
    apis: apis.length,
    dbEntities: databaseEntities.length,
    testSpecs: testSpecs.length,
  });

  return {
    projectId: project.id,
    projectName: project.name,
    projectDescription: project.description,
    workstream,
    workstreamLabel: WORKSTREAM_LABELS[workstream] || workstream,
    scope: {
      pages: pageCount,
      components: componentCount,
      forms: formCount,
      tables: tableCount,
      dialogs: dialogCount,
      apis: apis.length,
      databaseEntities: databaseEntities.length,
      testSpecs: testSpecs.length,
      deliverables: filteredDeliverables.length,
      existingTasks: tasksList.length,
    },
    pages,
    apis,
    databaseEntities,
    testSpecs,
    deliverables: filteredDeliverables,
    existingTasks: tasksList,
    dependencyChain,
    capabilities,
  };
}

// ── 5. Get Assignment Analysis ──────────────────────────────────────

export async function getAssignmentAnalysis(
  employeeId: string,
  projectId: string,
  workstream: string
): Promise<AssignmentAnalysis> {
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: {
      role: true,
      projectAllocations: {
        where: { releasedAt: null },
        include: { project: { select: { name: true, deadline: true } } },
      },
    },
  });

  if (!employee) throw new Error("Employee not found.");

  // Role match
  const roleCode = employee.role?.code || null;
  const roleName = employee.role?.name || null;
  const allowedWorkstreams = roleCode && ROLE_WORKSTREAM_MAP[roleCode]
    ? ROLE_WORKSTREAM_MAP[roleCode]
    : [];

  let roleMatch: AssignmentAnalysis["roleMatch"];
  if (allowedWorkstreams.includes(workstream as Workstream)) {
    const isPrimary = allowedWorkstreams[0] === workstream;
    roleMatch = {
      score: isPrimary ? "EXCELLENT" : "GOOD",
      reason: isPrimary
        ? `${workstream} is the primary responsibility for ${roleName}`
        : `${roleName} includes ${workstream} as a compatible workstream`,
    };
  } else if (roleName) {
    // Infer from name
    const lower = roleName.toLowerCase();
    const wsLower = workstream.toLowerCase();
    if (lower.includes(wsLower) || lower.includes("full-stack") || lower.includes("lead")) {
      roleMatch = { score: "GOOD", reason: `Role name suggests compatibility with ${workstream}` };
    } else {
      roleMatch = { score: "INCOMPATIBLE", reason: `${roleName} is not typically assigned ${workstream} work` };
    }
  } else {
    roleMatch = { score: "INCOMPATIBLE", reason: "No organization role assigned" };
  }

  // Skill match
  let skills: string[] = [];
  try {
    const caps = JSON.parse(employee.capabilities || "[]");
    skills = caps.map((c: any) => (typeof c === "string" ? c : c.skill || c.name || "")).filter(Boolean);
  } catch {}

  let roleRequiredCaps: string[] = [];
  try {
    roleRequiredCaps = JSON.parse(employee.role?.requiredCapabilities || "[]");
  } catch {}

  const matchedSkills = skills.filter((s) => {
    const sLower = s.toLowerCase();
    if (workstream === "FRONTEND") return sLower.includes("react") || sLower.includes("next") || sLower.includes("typescript") || sLower.includes("css") || sLower.includes("tailwind") || sLower.includes("html") || sLower.includes("ui") || sLower.includes("frontend");
    if (workstream === "BACKEND") return sLower.includes("node") || sLower.includes("api") || sLower.includes("express") || sLower.includes("typescript") || sLower.includes("backend") || sLower.includes("server");
    if (workstream === "DATABASE") return sLower.includes("sql") || sLower.includes("prisma") || sLower.includes("database") || sLower.includes("postgres") || sLower.includes("sqlite") || sLower.includes("migration");
    if (workstream === "QA") return sLower.includes("test") || sLower.includes("playwright") || sLower.includes("cypress") || sLower.includes("jest") || sLower.includes("vitest") || sLower.includes("qa") || sLower.includes("ci");
    if (workstream === "INTEGRATION") return sLower.includes("api") || sLower.includes("rest") || sLower.includes("graphql") || sLower.includes("webhook") || sLower.includes("integration");
    return false;
  });

  const skillMatch: AssignmentAnalysis["skillMatch"] = {
    score: matchedSkills.length >= 3 ? "EXCELLENT" : matchedSkills.length >= 1 ? "GOOD" : skills.length === 0 ? "NONE" : "PARTIAL",
    matchedSkills,
    reason: matchedSkills.length > 0
      ? `${matchedSkills.length} matching skills: ${matchedSkills.join(", ")}`
      : skills.length === 0
        ? "No capabilities configured for this employee"
        : `No skills directly matching ${workstream} requirements`,
  };

  // Current workload
  const activeTasks = await db.clientTask.findMany({
    where: {
      assigneeId: employee.id,
      status: { in: ["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW"] },
    },
  });

  const assignedHours = activeTasks.reduce((sum, t) => sum + (t.estimatedHours || 4), 0);
  const capacityHours = employee.capacityTargetHours || 40;
  const utilizationPercent = Math.round((assignedHours / capacityHours) * 100);

  const currentWorkload = {
    activeTaskCount: activeTasks.length,
    assignedHours,
    capacityHours,
    utilizationPercent,
  };

  // Available capacity
  const hoursAvailable = Math.max(0, capacityHours - assignedHours);
  const capacityPercent = Math.round((hoursAvailable / capacityHours) * 100);
  const availableCapacity: AssignmentAnalysis["availableCapacity"] = {
    hoursAvailable,
    capacityPercent,
    status: utilizationPercent > 100 ? "OVERLOADED" : utilizationPercent > 80 ? "LIMITED" : utilizationPercent > 50 ? "MODERATE" : "AVAILABLE",
  };

  // Active project assignments
  const projectAssignments = {
    activeCount: employee.projectAllocations.length,
    projects: employee.projectAllocations.map((a) => a.project.name),
  };

  // Dependency risks
  const dependencyRisks: string[] = [];
  const blockedTasks = activeTasks.filter((t) => t.status === "BLOCKED");
  if (blockedTasks.length > 0) {
    dependencyRisks.push(`${blockedTasks.length} currently blocked task(s) on other projects`);
  }
  if (utilizationPercent > 100) {
    dependencyRisks.push(`Currently over capacity at ${utilizationPercent}%`);
  }
  if (employee.projectAllocations.length >= 3) {
    dependencyRisks.push(`Already allocated to ${employee.projectAllocations.length} projects`);
  }

  // Deadline pressure
  const now = new Date();
  const upcomingDeadlines = employee.projectAllocations
    .filter((a) => a.project.deadline && new Date(a.project.deadline) > now)
    .sort((a, b) => new Date(a.project.deadline!).getTime() - new Date(b.project.deadline!).getTime());

  const nearestDeadline = upcomingDeadlines[0]?.project.deadline;
  const daysToDeadline = nearestDeadline ? Math.ceil((new Date(nearestDeadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

  const deadlinePressure: AssignmentAnalysis["deadlinePressure"] = {
    level: daysToDeadline !== null && daysToDeadline < 7 ? "HIGH" : daysToDeadline !== null && daysToDeadline < 21 ? "MEDIUM" : "LOW",
    nearestDeadline: nearestDeadline?.toISOString() || null,
  };

  // Recommendation
  const warnings: string[] = [];
  if (roleMatch.score === "INCOMPATIBLE") warnings.push("Role is not compatible with this workstream");
  if (availableCapacity.status === "OVERLOADED") warnings.push("Employee is currently over capacity");
  if (deadlinePressure.level === "HIGH") warnings.push("Employee has upcoming deadline pressure");

  const recommended = roleMatch.score !== "INCOMPATIBLE" && availableCapacity.status !== "OVERLOADED" && warnings.length === 0;

  return {
    roleMatch,
    skillMatch,
    currentWorkload,
    availableCapacity,
    projectAssignments,
    dependencyRisks,
    deadlinePressure,
    recommendation: {
      recommended,
      reason: recommended
        ? `${employee.fullName}'s role, skills, and current capacity are well-suited for ${WORKSTREAM_LABELS[workstream] || workstream} on this project.`
        : `Assignment possible but review recommended: ${warnings.join("; ")}`,
    },
    warnings,
  };
}

// ── 6. Execute Workstream Assignment ────────────────────────────────

export async function executeWorkstreamAssignment(
  employeeId: string,
  projectId: string,
  workstream: string,
  actorName: string = "Admin"
): Promise<{
  success: boolean;
  allocation: any;
  tasksAssigned: number;
  memberCreated: boolean;
}> {
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: { role: true },
  });
  if (!employee) throw new Error("Employee not found.");

  const project = await db.clientProject.findUnique({
    where: { id: projectId },
    include: { client: { select: { companyName: true } } },
  });
  if (!project) throw new Error("Project not found.");

  // 1. Create or update ProjectStaffAllocation
  const existingAllocation = await db.projectStaffAllocation.findUnique({
    where: {
      employeeId_projectId: { employeeId, projectId },
    },
  });

  let allocation;
  if (existingAllocation) {
    allocation = await db.projectStaffAllocation.update({
      where: { id: existingAllocation.id },
      data: {
        workstream: workstream,
        projectRole: employee.role?.name || "Engineer",
        releasedAt: null,
      },
    });
  } else {
    allocation = await db.projectStaffAllocation.create({
      data: {
        employeeId,
        projectId,
        workstream,
        projectRole: employee.role?.name || "Engineer",
        allocationPercentage: 100,
      },
    });
  }

  // 2. Create ProjectMember if not exists
  const existingMember = await db.projectMember.findFirst({
    where: { projectId, email: employee.email },
  });

  let memberCreated = false;
  if (!existingMember) {
    await db.projectMember.create({
      data: {
        projectId,
        userId: employee.userId,
        name: employee.fullName,
        role: employee.role?.name || "Engineer",
        email: employee.email,
        avatar: employee.avatar,
        allocation: 100,
      },
    });
    memberCreated = true;
  }

  // 3. Auto-assign matching unassigned tasks to this employee
  const wsTaskFilters = WORKSTREAM_TASK_MAP[workstream] || [workstream];
  const wsLayerFilters = WORKSTREAM_LAYER_MAP[workstream] || [workstream];

  const result = await db.clientTask.updateMany({
    where: {
      projectId,
      assigneeId: null,
      OR: [
        { workstream: { in: wsTaskFilters } },
        { layer: { in: wsLayerFilters } },
      ],
      status: { notIn: ["DONE", "COMPLETED", "CANCELLED"] },
    },
    data: {
      assigneeId: employee.id,
      assigneeName: employee.fullName,
    },
  });

  // 4. Write audit event
  await db.employeeAuditEvent.create({
    data: {
      workspaceId: employee.workspaceId,
      employeeId: employee.id,
      action: "PROJECT_ASSIGNED",
      actorName,
      detail: `Assigned ${WORKSTREAM_LABELS[workstream] || workstream} responsibility on project "${project.name}" (${project.code || project.id}). ${result.count} existing tasks auto-assigned.`,
      beforeState: JSON.stringify({ projectAllocations: existingAllocation ? 1 : 0 }),
      afterState: JSON.stringify({ workstream, tasksAssigned: result.count }),
    },
  });

  // 5. Create project activity
  await db.projectActivity.create({
    data: {
      projectId,
      type: "TEAM_MEMBER_ADDED",
      title: `${employee.fullName} assigned to ${WORKSTREAM_LABELS[workstream] || workstream}`,
      detail: `${employee.fullName} (${employee.role?.name || "Engineer"}) assigned ${workstream} responsibility. ${result.count} tasks auto-connected.`,
      actorName,
    },
  });

  // 6. Automatically generate role-tailored Employee Project Brief
  try {
    await getOrGenerateEmployeeProjectBrief(projectId, employeeId, true);
  } catch (briefErr) {
    console.error("[executeWorkstreamAssignment] Error generating brief:", briefErr);
  }

  return {
    success: true,
    allocation,
    tasksAssigned: result.count,
    memberCreated,
  };
}

// ── 7. Get Workstream Progress ──────────────────────────────────────

export async function getWorkstreamProgress(
  projectId: string,
  workstream: string
): Promise<{
  taskProgress: { completed: number; total: number; percent: number };
  pageProgress: { completed: number; total: number; percent: number };
  deliverableProgress: { accepted: number; total: number; percent: number };
  testProgress: { passed: number; total: number; percent: number };
  overallPercent: number;
}> {
  // Task progress
  const wsTaskFilters = WORKSTREAM_TASK_MAP[workstream] || [workstream];
  const wsLayerFilters = WORKSTREAM_LAYER_MAP[workstream] || [workstream];

  const tasks = await db.clientTask.findMany({
    where: {
      projectId,
      OR: [
        { workstream: { in: wsTaskFilters } },
        { layer: { in: wsLayerFilters } },
      ],
    },
  });

  const completedTasks = tasks.filter(
    (t) => t.status === "DONE" || t.status === "COMPLETED"
  ).length;
  const taskPercent = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  // Page progress (for frontend)
  let pagesCompleted = 0;
  let pagesTotal = 0;
  if (workstream === "FRONTEND") {
    const blueprint = await db.engineeringBlueprint.findFirst({
      where: { projectId },
      orderBy: { version: "desc" },
    });
    if (blueprint) {
      const capabilities = await db.frontendCapability.findMany({
        where: { blueprintId: blueprint.id, type: "PAGE" },
      });
      pagesTotal = capabilities.length;
      pagesCompleted = capabilities.filter((c) => c.status === "COMPLETED").length;
    }
  }
  const pagePercent = pagesTotal > 0 ? Math.round((pagesCompleted / pagesTotal) * 100) : 0;

  // Deliverable progress
  const deliverables = await db.projectDeliverable.findMany({
    where: { projectId },
  });
  const acceptedDeliverables = deliverables.filter(
    (d) => d.status === "ACCEPTED"
  ).length;
  const deliverablePercent = deliverables.length > 0
    ? Math.round((acceptedDeliverables / deliverables.length) * 100) : 0;

  // Test progress
  let testsPassed = 0;
  let testsTotal = 0;
  if (workstream === "QA") {
    const blueprint = await db.engineeringBlueprint.findFirst({
      where: { projectId },
      orderBy: { version: "desc" },
    });
    if (blueprint) {
      const specs = await db.testSpecification.findMany({
        where: { blueprintId: blueprint.id },
      });
      testsTotal = specs.length;
      testsPassed = specs.filter((s) => s.status === "PASSED").length;
    }
  }
  const testPercent = testsTotal > 0 ? Math.round((testsPassed / testsTotal) * 100) : 0;

  // Overall: weighted by available data
  let weights: { value: number; weight: number }[] = [];
  if (tasks.length > 0) weights.push({ value: taskPercent, weight: 3 });
  if (pagesTotal > 0) weights.push({ value: pagePercent, weight: 2 });
  if (deliverables.length > 0) weights.push({ value: deliverablePercent, weight: 1 });
  if (testsTotal > 0) weights.push({ value: testPercent, weight: 1 });

  const totalWeight = weights.reduce((s, w) => s + w.weight, 0);
  const overallPercent = totalWeight > 0
    ? Math.round(weights.reduce((s, w) => s + w.value * w.weight, 0) / totalWeight)
    : 0;

  return {
    taskProgress: { completed: completedTasks, total: tasks.length, percent: taskPercent },
    pageProgress: { completed: pagesCompleted, total: pagesTotal, percent: pagePercent },
    deliverableProgress: { accepted: acceptedDeliverables, total: deliverables.length, percent: deliverablePercent },
    testProgress: { passed: testsPassed, total: testsTotal, percent: testPercent },
    overallPercent,
  };
}

// ── 8. Get Dependency Chain ─────────────────────────────────────────

async function getDependencyChain(
  projectId: string,
  workstream: string,
  blueprintId: string | null
): Promise<DependencyNode[]> {
  if (!blueprintId) return [];

  const dependencies = await db.engineeringDependency.findMany({
    where: { blueprintId },
  });

  if (dependencies.length === 0) return [];

  // Build chain starting from the selected workstream layer
  const layerOrder = ["FRONTEND", "BACKEND", "DATABASE", "TESTING"];
  const relevantLayers = new Set<string>();
  relevantLayers.add(workstream === "QA" ? "TESTING" : workstream);

  // Add connected layers from dependency records
  for (const dep of dependencies) {
    if (dep.sourceLayer === workstream || dep.sourceLayer === (workstream === "QA" ? "TESTING" : workstream)) {
      relevantLayers.add(dep.targetLayer);
    }
    if (dep.targetLayer === workstream || dep.targetLayer === (workstream === "QA" ? "TESTING" : workstream)) {
      relevantLayers.add(dep.sourceLayer);
    }
  }

  const chain: DependencyNode[] = [];

  for (const layer of layerOrder) {
    if (!relevantLayers.has(layer)) continue;

    const layerDeps = dependencies.filter(
      (d) => d.sourceLayer === layer
    );

    chain.push({
      layer,
      label: WORKSTREAM_LABELS[layer === "TESTING" ? "QA" : layer] || layer,
      items: layerDeps.map((d) => ({
        sourceId: d.sourceId,
        sourceName: d.sourceName,
        targetId: d.targetId,
        targetName: d.targetName,
        targetLayer: d.targetLayer,
        dependencyType: d.dependencyType,
      })),
    });
  }

  return chain;
}

// ── Helpers ─────────────────────────────────────────────────────────

function buildCapabilitiesList(
  workstream: string,
  counts: {
    pages: number;
    components: number;
    forms: number;
    apis: number;
    dbEntities: number;
    testSpecs: number;
  }
): string[] {
  const list: string[] = [];

  if (workstream === "FRONTEND") {
    if (counts.pages > 0) list.push("Frontend pages");
    if (counts.components > 0) list.push("Components");
    list.push("Responsive implementation");
    list.push("Frontend state management");
    if (counts.apis > 0) list.push("API integration");
    list.push("Loading states");
    list.push("Error states");
    if (counts.forms > 0) list.push("Form validation");
  } else if (workstream === "BACKEND") {
    if (counts.apis > 0) list.push("API endpoints");
    list.push("Business logic services");
    list.push("Authentication & authorization");
    list.push("Data validation");
    list.push("Error handling");
  } else if (workstream === "DATABASE") {
    if (counts.dbEntities > 0) list.push("Data models");
    list.push("Schema design");
    list.push("Migrations");
    list.push("Query optimization");
    list.push("Relationships & indexes");
  } else if (workstream === "QA") {
    if (counts.testSpecs > 0) list.push("Test specifications");
    list.push("Acceptance criteria verification");
    list.push("Regression testing");
    list.push("Performance validation");
  } else if (workstream === "INTEGRATION") {
    if (counts.apis > 0) list.push("API connections");
    list.push("Third-party integrations");
    list.push("Data synchronization");
    list.push("Webhook handling");
  }

  return list;
}
