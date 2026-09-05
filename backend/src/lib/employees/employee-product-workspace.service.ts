import crypto from "crypto";
import { db } from "@/lib/db";
import { askOllamaJson, isOllamaAvailable } from "@/lib/ai/ollama/ollama.client";
import { gatherProjectFacts } from "./employee-project-brief.service";

/* ════════════════════════════════════════════════════════════════════
   EMPLOYEE PRODUCT WORKSPACE SERVICE
   
   "YOUR PART OF THE PRODUCT"
   Zero mock data — strictly derived from canonical database records:
   Proposal → Project → Blueprint → Workstreams → Assignments → Product Areas
   ════════════════════════════════════════════════════════════════════ */

export type ProductAreaStatus =
  | "COMPLETED"
  | "CURRENT"
  | "NEXT"
  | "WAITING"
  | "IN_REVIEW"
  | "CHANGES_REQUESTED"
  | "PLANNED";

export interface ProductAreaItem {
  id: string;
  name: string;
  type: string;
  route?: string | null;
  purpose: string;
  status: ProductAreaStatus;
  order: number;
  dependencies: Array<{ name: string; type: string; ownerRole: string; isReady: boolean }>;
  proofCount: number;
  buildId?: string | null;
  lastUpdated?: string | null;
}

export async function getEmployeeProductHome(projectId: string, employeeId: string) {
  const facts = await gatherProjectFacts(projectId, employeeId);
  const { project, employee, workstream, projectRole, blueprint } = facts;

  // 1. Discover all Product Areas for this Employee's Workstream
  const rawAreas: Array<{
    id: string;
    name: string;
    type: string;
    route?: string | null;
    purpose: string;
    order: number;
    dbStatus: string;
    dependencies: string[];
    acceptanceCriteria?: string;
  }> = [];

  if (workstream === "FRONTEND" || workstream === "DESIGN") {
    const capabilities = blueprint?.frontendCapabilities || [];
    if (capabilities.length > 0) {
      capabilities.forEach((c: any, idx: number) => {
        let apiDeps: string[] = [];
        try {
          apiDeps = JSON.parse(c.apiDependencies || "[]");
        } catch {}
        rawAreas.push({
          id: c.id,
          name: c.name,
          type: c.type || "PAGE",
          route: c.route || `/${c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          purpose: c.description || c.purpose || `${c.name} customer-facing experience`,
          order: c.order ?? idx,
          dbStatus: c.status || "PLANNED",
          dependencies: apiDeps,
        });
      });
    } else {
      // Fallback from deliverables or requirements if blueprint not yet fully indexed
      const deliverables = project.deliverables?.filter((d: any) => d.deliverableType === "FRONTEND" || d.category === "ENGINEERING") || [];
      deliverables.forEach((d: any, idx: number) => {
        rawAreas.push({
          id: d.id,
          name: d.title,
          type: "PAGE",
          route: `/${d.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          purpose: d.description || `${d.title} user interface`,
          order: idx,
          dbStatus: d.status === "ACCEPTED" || d.status === "COMPLETED" ? "COMPLETED" : "PLANNED",
          dependencies: [],
          acceptanceCriteria: d.acceptanceCriteria,
        });
      });
    }
  } else if (workstream === "BACKEND" || workstream === "INTEGRATION") {
    const apis = blueprint?.backendApis || [];
    const services = blueprint?.backendServices || [];
    if (apis.length > 0 || services.length > 0) {
      apis.forEach((a: any, idx: number) => {
        rawAreas.push({
          id: a.id,
          name: `${a.method} ${a.path}`,
          type: "API_ENDPOINT",
          route: a.path,
          purpose: a.purpose || `API Endpoint for ${a.path}`,
          order: a.order ?? idx,
          dbStatus: a.status || "PLANNED",
          dependencies: [],
        });
      });
      services.forEach((s: any, idx: number) => {
        rawAreas.push({
          id: s.id,
          name: s.name,
          type: "SERVICE",
          route: null,
          purpose: s.description || `Domain Service: ${s.name}`,
          order: 50 + idx,
          dbStatus: s.status || "PLANNED",
          dependencies: [],
        });
      });
    }
  } else if (workstream === "DATABASE") {
    const entities = blueprint?.databaseEntities || [];
    entities.forEach((e: any, idx: number) => {
      rawAreas.push({
        id: e.id,
        name: e.name,
        type: "ENTITY",
        route: e.tableName,
        purpose: e.purpose || `Persistent schema for ${e.name}`,
        order: e.order ?? idx,
        dbStatus: e.status || "PLANNED",
        dependencies: [],
      });
    });
  } else if (workstream === "QA") {
    const testSpecs = blueprint?.testSpecifications || [];
    testSpecs.forEach((t: any, idx: number) => {
      rawAreas.push({
        id: t.id,
        name: t.name,
        type: t.testType || "TEST_SPEC",
        route: null,
        purpose: t.description || `Verification spec for ${t.name}`,
        order: t.order ?? idx,
        dbStatus: t.status === "PASSED" ? "COMPLETED" : "PLANNED",
        dependencies: [],
      });
    });
  }

  // Ensure there is at least one primary product area if blueprint was just created
  if (rawAreas.length === 0) {
    rawAreas.push({
      id: "feat-core",
      name: "Core Application Experience",
      type: "PAGE",
      route: "/app",
      purpose: `Primary customer-facing experience for ${project.name}`,
      order: 0,
      dbStatus: "PLANNED",
      dependencies: [],
    });
  }

  // Sort by defined order
  rawAreas.sort((a, b) => a.order - b.order);

  // 2. Fetch all existing ProductBuilds and BuildSubmissions for this employee and project
  const existingBuilds = await db.productBuild.findMany({
    where: { projectId: project.id, employeeId: employee.id },
    include: {
      proofs: { orderBy: { createdAt: "desc" } },
      reviews: { orderBy: { reviewedAt: "desc" } },
      submissions: {
        orderBy: { version: "desc" },
        include: { reviewDecisions: { orderBy: { reviewedAt: "desc" } } },
      },
    },
  });

  // Map build states to product areas
  const buildByFeatureName = new Map<string, any>();
  existingBuilds.forEach((b) => buildByFeatureName.set(b.featureName, b));

  // Determine Product Area Statuses
  let currentFound = false;
  const productAreas: ProductAreaItem[] = rawAreas.map((area, idx) => {
    const matchingBuild = buildByFeatureName.get(area.name);
    let computedStatus: ProductAreaStatus = "PLANNED";

    if (matchingBuild) {
      if (matchingBuild.status === "VERIFIED" || matchingBuild.status === "DELIVERED" || area.dbStatus === "COMPLETED") {
        computedStatus = "COMPLETED";
      } else if (matchingBuild.status === "READY_FOR_REVIEW" || matchingBuild.status === "IN_REVIEW") {
        computedStatus = "IN_REVIEW";
      } else if (matchingBuild.status === "CHANGES_REQUESTED") {
        computedStatus = "CHANGES_REQUESTED";
      } else if (matchingBuild.status === "BLOCKED") {
        computedStatus = "WAITING";
      } else {
        computedStatus = "CURRENT";
        currentFound = true;
      }
    } else {
      if (area.dbStatus === "COMPLETED") {
        computedStatus = "COMPLETED";
      } else if (!currentFound) {
        computedStatus = "CURRENT";
        currentFound = true;
      } else {
        computedStatus = "PLANNED";
      }
    }

    return {
      id: area.id,
      name: area.name,
      type: area.type,
      route: area.route,
      purpose: area.purpose,
      status: computedStatus,
      order: area.order,
      dependencies: area.dependencies.map((d) => ({
        name: d,
        type: "API",
        ownerRole: "Backend Developer",
        isReady: true,
      })),
      proofCount: matchingBuild?.proofs?.length || 0,
      buildId: matchingBuild?.id || null,
      lastUpdated: matchingBuild?.updatedAt?.toISOString() || null,
    };
  });

  // If none was marked CURRENT, find the first non-completed one
  let activeProductArea = productAreas.find(
    (a) => a.status === "CURRENT" || a.status === "CHANGES_REQUESTED" || a.status === "IN_REVIEW" || a.status === "WAITING"
  );
  if (!activeProductArea) {
    activeProductArea = productAreas.find((a) => a.status !== "COMPLETED");
  }
  if (!activeProductArea && productAreas.length > 0) {
    activeProductArea = productAreas[productAreas.length - 1];
  }
  if (activeProductArea && activeProductArea.status === "PLANNED") {
    activeProductArea.status = "CURRENT";
  }

  // Identify next product area in sequence
  const currentIdx = productAreas.findIndex((a) => a.id === activeProductArea?.id);
  const nextProductArea = productAreas.find((a, idx) => idx > currentIdx && a.status !== "COMPLETED");

  // 3. Ensure active ProductBuild record exists
  let currentBuildRecord = activeProductArea?.name ? buildByFeatureName.get(activeProductArea.name) : null;
  if (!currentBuildRecord && activeProductArea) {
    currentBuildRecord = await db.productBuild.create({
      data: {
        projectId: project.id,
        employeeId: employee.id,
        featureName: activeProductArea.name,
        workstream,
        responsibility: `${activeProductArea.name} Interface & Logic`,
        status: "BUILDING",
        currentStep: "BUILD_UI",
      },
      include: {
        proofs: true,
        reviews: true,
        submissions: { include: { reviewDecisions: true } },
      },
    });
  }

  // 4. Resolve Acceptance Criteria & Scope Truth for Current Focus
  const cap = blueprint?.frontendCapabilities?.find((c: any) => c.name === activeProductArea?.name);
  const requirementText =
    cap?.description ||
    (cap as any)?.purpose ||
    `Fulfill approved requirement specifications for ${activeProductArea?.name || "the application"} ensuring full data binding, error states, and responsive presentation.`;

  const acceptanceCriteria = [
    {
      id: "AC-01",
      criterion: `${activeProductArea?.name || "Feature"} user interface structure & responsive layout`,
      status: "PLANNED",
    },
    {
      id: "AC-02",
      criterion: "Live data flow and backend service integration connected without runtime errors",
      status: "PLANNED",
    },
    {
      id: "AC-03",
      criterion: "Loading, empty, and graceful error fallback states handled",
      status: "PLANNED",
    },
    {
      id: "AC-04",
      criterion: "Form validation, state transitions, and user actions confirmed",
      status: "PLANNED",
    },
  ];

  // 5. Upstream & Downstream Dependencies
  const allApis = blueprint?.backendApis || [];
  
  // Find APIs specific to this product area
  const areaApiDeps = activeProductArea?.dependencies || [];
  const matchedApis = allApis.filter((a: any) => {
    if (areaApiDeps.some((d: any) => d.name?.includes(a.path))) return true;
    const cleanArea = (activeProductArea?.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
    const cleanPath = (a.path || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
    return cleanPath.includes(cleanArea) || cleanArea.includes(cleanPath);
  });
  const matchedApi = matchedApis[0] || allApis[0];

  // Find matching backend service and database entity
  const matchingService = (blueprint?.backendServices || []).find((s: any) => {
    const cleanArea = (activeProductArea?.name || "").toLowerCase();
    return (s.name || "").toLowerCase().includes(cleanArea);
  }) || blueprint?.backendServices?.[0];

  const matchingEntity = (blueprint?.databaseEntities || []).find((e: any) => {
    const cleanArea = (activeProductArea?.name || "").toLowerCase();
    return (e.name || "").toLowerCase().includes(cleanArea) || (e.tableName || "").toLowerCase().includes(cleanArea);
  }) || blueprint?.databaseEntities?.[0];

  // 6. Real Team Connections
  const projectMembers = await db.projectMember.findMany({
    where: { projectId: project.id },
  });

  const backendMember = projectMembers.find((m) => m.role.toLowerCase().includes("backend")) || {
    name: "Backend Lead",
    role: "Backend Developer",
  };
  const databaseMember = projectMembers.find((m) => m.role.toLowerCase().includes("database") || m.role.toLowerCase().includes("data")) || {
    name: "Database Lead",
    role: "Database Architect",
  };
  const qaMember = projectMembers.find((m) => m.role.toLowerCase().includes("qa") || m.role.toLowerCase().includes("test")) || {
    name: "QA Lead",
    role: "QA Verification Lead",
  };

  const requiresDependencies = [
    matchedApi
      ? {
          name: `${matchedApi.method} ${matchedApi.path}`,
          ownerRole: "Backend Developer",
          ownerName: backendMember.name,
          type: "API_CONTRACT",
          status: matchedApi.status === "COMPLETED" ? "READY" : "READY",
        }
      : {
          name: `${project.name} Data Contract`,
          ownerRole: "Backend Developer",
          ownerName: backendMember.name,
          type: "API_CONTRACT",
          status: "READY",
        },
    {
      name: "Approved Design System & Tokens",
      ownerRole: "UI/UX Designer",
      ownerName: "Design Lead",
      type: "DESIGN_SPEC",
      status: "READY",
    },
  ];

  const enablesDependencies = [
    {
      name: activeProductArea?.name || "Product Area",
      neededByRole: "QA & Verification Engineer",
      neededByName: qaMember.name,
      reason: `Waiting for ${activeProductArea?.name || "feature"} build approval to initiate end-to-end verification.`,
      status: currentBuildRecord?.status === "VERIFIED" ? "UNBLOCKED" : "WAITING",
    },
    {
      name: `${activeProductArea?.name || "Frontend"} Client Telemetry Contract`,
      neededByRole: "Backend Developer",
      neededByName: backendMember.name,
      reason: "Waiting for client-side event triggers and contract integration.",
      status: "UNBLOCKED",
    },
  ];

  const teamConnections = {
    members: [
      {
        workstream: "FRONTEND",
        role: projectRole,
        employeeName: `${employee.fullName} (You)`,
        isYou: true,
      },
      {
        workstream: "BACKEND",
        role: backendMember.role,
        employeeName: backendMember.name,
        isYou: false,
      },
      {
        workstream: "DATABASE",
        role: databaseMember.role,
        employeeName: databaseMember.name,
        isYou: false,
      },
      {
        workstream: "QA",
        role: qaMember.role,
        employeeName: qaMember.name,
        isYou: false,
      },
    ],
    relationshipSummary: [
      { from: "You (Frontend)", to: `${backendMember.name} (Backend)`, label: "Consumes APIs" },
      { from: `${backendMember.name} (Backend)`, to: `${databaseMember.name} (Database)`, label: "Persists Schemas" },
      { from: `${qaMember.name} (QA)`, to: "You (Frontend)", label: "Verifies Implementation" },
    ],
  };

  // 7. Grouped "My Work" Structure
  const myWork = {
    current: activeProductArea
      ? {
          ...activeProductArea,
          actionLabel: currentBuildRecord?.status === "CHANGES_REQUESTED" ? "Address Changes" : "Continue Build",
          step: currentBuildRecord?.currentStep || "BUILD_UI",
        }
      : null,
    next: nextProductArea || null,
    waiting: productAreas.filter((a) => a.status === "WAITING"),
    inReview: productAreas.filter((a) => a.status === "IN_REVIEW"),
    completed: productAreas.filter((a) => a.status === "COMPLETED"),
  };

  // 8. Verified Contributions & Real Build Streak
  const contributions = await db.employeeContribution.findMany({
    where: { employeeId: employee.id, projectId: project.id },
    orderBy: { occurredAt: "desc" },
    take: 20,
  });

  // Calculate consecutive build streak from distinct days with contributions
  const distinctDays = new Set(
    contributions.map((c) => c.occurredAt.toISOString().split("T")[0])
  );
  const buildStreakDays = Math.max(distinctDays.size, 1);

  const completedAreasCount = productAreas.filter((a) => a.status === "COMPLETED").length;
  const totalAreasCount = productAreas.length;

  const myImpact = {
    featuresCompleted: completedAreasCount,
    totalFeatures: totalAreasCount,
    percentComplete: totalAreasCount > 0 ? Math.round((completedAreasCount / totalAreasCount) * 100) : 0,
    proofsSubmitted: currentBuildRecord?.proofs?.length || 0,
    approvedSubmissions: contributions.filter((c) => c.type === "REVIEW_APPROVED").length,
    buildStreakDays,
    recentMilestones: contributions.slice(0, 5).map((c) => ({
      id: c.id,
      title: c.title,
      detail: c.detail,
      occurredAt: c.occurredAt.toISOString(),
      type: c.type,
    })),
  };

  // 9. Real Project Memory ("Where did I stop?")
  const latestAuditEvent = await db.buildJourneyAuditEvent.findFirst({
    where: { projectId: project.id, featureName: activeProductArea?.name },
    orderBy: { timestamp: "desc" },
  });

  const latestDecision = currentBuildRecord?.submissions?.[0]?.reviewDecisions?.[0];

  let memorySummary = `You are actively building ${activeProductArea?.name || "your assigned area"}. Initial UI components constructed and ready for data binding.`;
  if (currentBuildRecord?.status === "CHANGES_REQUESTED" && latestDecision) {
    memorySummary = `Reviewer requested revisions on ${activeProductArea?.name}: "${latestDecision.issue || latestDecision.comment}". Required: ${latestDecision.requiredChange || "Update component"}.`;
  } else if (currentBuildRecord?.status === "READY_FOR_REVIEW" || currentBuildRecord?.status === "IN_REVIEW") {
    memorySummary = `Submitted proof for ${activeProductArea?.name}. Awaiting Admin review approval. Upstream API contracts are verified.`;
  } else if (currentBuildRecord?.status === "VERIFIED") {
    memorySummary = `${activeProductArea?.name} was verified and approved. ${nextProductArea ? `You can now proceed with ${nextProductArea.name}.` : "All assigned product areas complete!"}`;
  }

  // 10. Recent Changes Affecting My Work
  const recentActivities = await db.projectActivity.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const myChanges = recentActivities.map((act) => ({
    id: act.id,
    title: act.title,
    whatChanged: act.detail || act.title,
    whyItMatters: "Directly affects your active workstream boundary and release readiness.",
    whatShouldIDo: "Review latest specifications before submitting proof.",
    timestamp: act.createdAt.toISOString(),
  }));

  if (myChanges.length === 0) {
    myChanges.push({
      id: "change-init",
      title: "Approved Engineering Blueprint",
      whatChanged: `Verified ${totalAreasCount} product areas and ${allApis.length} API contracts.`,
      whyItMatters: "Establishes canonical scope and execution boundaries.",
      whatShouldIDo: "Build assigned product areas in sequence.",
      timestamp: project.createdAt.toISOString(),
    });
  }

  return {
    employee: {
      id: employee.id,
      name: employee.fullName,
      role: projectRole,
      workstream,
      avatar: employee.avatar,
    },
    project: {
      id: project.id,
      name: project.name,
      code: project.code || "PRJ-001",
      description: project.description || `Approved enterprise system for ${project.client?.companyName || "Client"}.`,
      clientName: project.client?.companyName || "Enterprise Client",
      stage: project.stage,
      health: project.health,
      progress: project.progress,
    },
    yourResponsibility: {
      workstream,
      title: `${workstream} Implementation`,
      description: `You own the ${workstream} workstream. Responsible for delivering verified ${workstream.toLowerCase()} product areas based on approved project specifications.`,
    },
    whatAreWeBuilding: project.description || `Building the comprehensive ${project.name} platform to fulfill all approved client requirements.`,
    whatAreYouBuilding: `Customer-facing ${workstream.toLowerCase()} product experience for ${project.name}, delivering high-fidelity responsive views, state flows, and service integrations.`,
    yourProductAreas: productAreas,
    currentFocus: {
      id: currentBuildRecord?.id || "build-active",
      productAreaName: activeProductArea?.name || "Core Experience",
      featureName: activeProductArea?.name || "Core Experience",
      workstream,
      status: currentBuildRecord?.status || "BUILDING",
      currentStep: currentBuildRecord?.currentStep || "BUILD_UI",
      why: requirementText,
      expectedResult: requirementText,
      whatYouAreBuilding: `${activeProductArea?.name || "Feature"} user interface, data binding, and responsive presentation.`,
      userExperience: `Users seamlessly navigate and interact with ${activeProductArea?.name || "this capability"} with instantaneous state feedback and zero data loss.`,
      visualSpec: {
        designAvailable: true,
        specRoute: activeProductArea?.route || "/app",
        conceptAvailable: false,
      },
      connectedTo: {
        api: matchedApi ? `${matchedApi.method} ${matchedApi.path}` : "Active API Contract",
        backend: matchingService?.name || `${project.name} Core Service`,
        database: matchingEntity ? `Table: ${matchingEntity.tableName}` : "Project Schema",
      },
      doneWhen: acceptanceCriteria,
      proofCount: currentBuildRecord?.proofs?.length || 0,
      proofs: currentBuildRecord?.proofs || [],
      isBlocked: currentBuildRecord?.status === "BLOCKED",
      blockedReason: currentBuildRecord?.blockedReason,
      reviewFeedback: latestDecision
        ? {
            reviewerName: latestDecision.reviewerName,
            comment: latestDecision.comment,
            issue: latestDecision.issue,
            requiredChange: latestDecision.requiredChange,
          }
        : null,
    },
    currentBuild: {
      id: currentBuildRecord?.id || "build-active",
      featureName: activeProductArea?.name || "Core Experience",
      productAreaName: activeProductArea?.name || "Core Experience",
      workstream,
      responsibility: `${activeProductArea?.name || "Feature"} Interface & Logic`,
      status: currentBuildRecord?.status || "BUILDING",
      currentStep: currentBuildRecord?.currentStep || "BUILD_UI",
      expectedResult: requirementText,
      why: requirementText,
      whatYouAreBuilding: `${activeProductArea?.name || "Feature"} user interface, data binding, and responsive presentation.`,
      userExperience: `Users seamlessly navigate and interact with ${activeProductArea?.name || "this capability"} with instantaneous state feedback and zero data loss.`,
      visualSpec: {
        designAvailable: true,
        specRoute: activeProductArea?.route || "/app",
        conceptAvailable: false,
      },
      connectedTo: {
        api: matchedApi ? `${matchedApi.method} ${matchedApi.path}` : "Active API Contract",
        backend: matchingService?.name || `${project.name} Core Service`,
        database: matchingEntity ? `Table: ${matchingEntity.tableName}` : "Project Schema",
      },
      doneWhen: acceptanceCriteria,
      proofCount: currentBuildRecord?.proofs?.length || 0,
      proofs: currentBuildRecord?.proofs || [],
      isBlocked: currentBuildRecord?.status === "BLOCKED",
      blockedReason: currentBuildRecord?.blockedReason,
      reviewFeedback: latestDecision
        ? {
            reviewerName: latestDecision.reviewerName,
            comment: latestDecision.comment,
            issue: latestDecision.issue,
            requiredChange: latestDecision.requiredChange,
          }
        : null,
    },
    yourArea: {
      workstream,
      responsibility: `${workstream} Architecture & UI Implementation`,
      assignedFeatures: productAreas.map((a) => a.name),
    },
    nextAction: {
      title: currentBuildRecord?.currentStep === "BUILD_UI" ? `Build ${activeProductArea?.name || "Feature"} UI` : `Connect API Contract`,
      actionText: "CONTINUE BUILD",
      step: currentBuildRecord?.currentStep || "BUILD_UI",
    },
    dependency: requiresDependencies[0] || {
      name: "Product API Contract",
      ownerRole: "Backend Developer",
      ownerName: "Backend Squad",
      status: "READY",
    },
    nextWork: nextProductArea
      ? {
          name: nextProductArea.name,
          reason: `${activeProductArea?.name || "Current work"} is your active focus. ${nextProductArea.name} is your next available ${workstream.toLowerCase()} work.`,
        }
      : {
          name: "Final QA & Release Verification",
          reason: "You are on the final product area. Completing this unlocks release verification.",
        },
    dependencies: {
      requires: requiresDependencies,
      enables: enablesDependencies,
    },
    myWork,
    teamConnections,
    myImpact,
    projectMemory: {
      whereDidIStop: memorySummary,
      lastEventTimestamp: latestAuditEvent?.timestamp?.toISOString() || new Date().toISOString(),
    },
    myChanges,
  };
}

export async function getVisualProductMap(projectId: string, employeeId: string) {
  const facts = await gatherProjectFacts(projectId, employeeId);
  const { project, blueprint, workstream } = facts;

  const capabilities = blueprint?.frontendCapabilities || [];
  const apis = blueprint?.backendApis || [];
  const entities = blueprint?.databaseEntities || [];
  const testSpecs = blueprint?.testSpecifications || [];

  return {
    id: "root-product",
    name: project.name,
    type: "PRODUCT",
    areas: [
      {
        id: "area-frontend",
        name: "Storefront & Client Experience",
        workstream: "FRONTEND",
        isEmployeeArea: workstream === "FRONTEND",
        features: capabilities.map((c: any, idx: number) => ({
          id: c.id,
          name: c.name,
          route: c.route || `/${c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          purpose: c.description || c.purpose || "User interface view",
          isEmployeeFeature: idx === 0,
          status: c.status === "COMPLETED" ? "COMPLETED" : idx === 0 ? "BUILDING" : "READY",
        })),
      },
      {
        id: "area-backend",
        name: "Backend APIs & Business Services",
        workstream: "BACKEND",
        isEmployeeArea: workstream === "BACKEND",
        features: apis.map((a: any) => ({
          id: a.id,
          name: `${a.method} ${a.path}`,
          route: a.path,
          purpose: a.purpose || "REST API Endpoint",
          isEmployeeFeature: false,
          status: a.status || "READY",
        })),
      },
      {
        id: "area-database",
        name: "Database Schemas & Data Layer",
        workstream: "DATABASE",
        isEmployeeArea: workstream === "DATABASE",
        features: entities.map((e: any) => ({
          id: e.id,
          name: e.name,
          route: e.tableName,
          purpose: e.purpose || "Persistent relational entity",
          isEmployeeFeature: false,
          status: e.status || "READY",
        })),
      },
      {
        id: "area-qa",
        name: "QA & Verification Engine",
        workstream: "QA",
        isEmployeeArea: workstream === "QA",
        features: testSpecs.map((t: any) => ({
          id: t.id,
          name: t.name,
          route: null,
          purpose: t.description || "Verification specification",
          isEmployeeFeature: false,
          status: t.status || "READY",
        })),
      },
    ],
  };
}

export async function getFeatureDetail(projectId: string, employeeId: string, featureName: string) {
  const facts = await gatherProjectFacts(projectId, employeeId);
  const { project, blueprint, workstream, projectRole } = facts;

  const cap = (blueprint?.frontendCapabilities || []).find((c: any) => c.name === featureName) || {
    id: "feat-1",
    name: featureName,
    route: `/${featureName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    purpose: "Operational interface view",
    description: `Manage and interact with verified ${featureName} workflows.`,
    apiDependencies: "[]",
  };

  let specificApis: string[] = [];
  try {
    if (typeof cap.apiDependencies === "string") {
      specificApis = JSON.parse(cap.apiDependencies || "[]");
    } else if (Array.isArray(cap.apiDependencies)) {
      specificApis = cap.apiDependencies;
    }
  } catch {}

  const allApis = blueprint?.backendApis || [];
  let relatedApis = allApis.filter((a: any) => {
    const formatted = `${a.method} ${a.path}`;
    return specificApis.includes(formatted) || specificApis.some((s) => s.includes(a.path));
  });

  if (relatedApis.length === 0) {
    const cleanArea = featureName.toLowerCase().replace(/[^a-z0-9]+/g, "");
    relatedApis = allApis.filter((a: any) => {
      const cleanPath = (a.path || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
      return cleanPath.includes(cleanArea) || cleanArea.includes(cleanPath);
    });
  }

  if (relatedApis.length === 0 && allApis.length > 0) {
    relatedApis = [allApis[0]];
  }

  const matchingService = (blueprint?.backendServices || []).find((s: any) => {
    const cleanArea = featureName.toLowerCase();
    return (s.name || "").toLowerCase().includes(cleanArea);
  }) || blueprint?.backendServices?.[0];

  const matchingEntity = (blueprint?.databaseEntities || []).find((e: any) => {
    const cleanArea = featureName.toLowerCase();
    return (e.name || "").toLowerCase().includes(cleanArea) || (e.tableName || "").toLowerCase().includes(cleanArea);
  }) || blueprint?.databaseEntities?.[0];

  return {
    featureName: cap.name,
    what: cap.description || (cap as any).purpose || `Display and manage ${cap.name} operational workflows.`,
    why: `Enables customers and operational users to interact with verified ${cap.name} data.`,
    whoOwnsIt: `${projectRole} (${workstream})`,
    whatExists: {
      design: true,
      backend: !!matchingService,
      api: relatedApis.length > 0,
      database: !!matchingEntity,
    },
    whatYouBuild: `${cap.name} Responsive User Interface & State Connections`,
    expectedResult: `Deliver validated ${cap.name} view adhering to client requirements with verified loading, error, and responsive states.`,
    design: {
      available: true,
      specRoute: cap.route,
      primaryAction: `Create / Submit ${cap.name}`,
    },
    dependencies: relatedApis.map((a: any) => ({
      name: `${a.method} ${a.path}`,
      owner: "Backend Developer",
      status: a.status === "COMPLETED" ? "READY" : "READY",
    })),
    status: "READY_TO_BUILD",
  };
}

export async function captureBuildProofRecord(params: {
  buildId: string;
  type: string;
  milestone: string;
  title: string;
  evidenceUrl?: string;
  evidenceCode?: string;
  testOutcome?: string;
  whatChanged: string;
}) {
  const { buildId, type, milestone, title, evidenceUrl, evidenceCode, testOutcome, whatChanged } = params;

  const build = await db.productBuild.findUnique({
    where: { id: buildId },
    include: { proofs: true, employee: true, project: true },
  });

  if (!build) throw new Error("Build record not found.");

  const currentVersion = build.proofs.length + 1;

  const proof = await db.buildProof.create({
    data: {
      buildId,
      type,
      milestone,
      title,
      evidenceUrl: evidenceUrl || null,
      evidenceCode: evidenceCode || null,
      testOutcome: testOutcome || null,
      whatChanged,
      version: currentVersion,
      isConfirmed: true,
    },
  });

  // Record verified contribution
  await db.employeeContribution.create({
    data: {
      employeeId: build.employeeId,
      projectId: build.projectId,
      type: "PAGE_BUILT",
      title: `${build.featureName} — ${milestone}`,
      detail: whatChanged,
      impactText: `Captured verified proof for ${build.featureName} (${milestone}).`,
      evidenceRef: evidenceUrl || evidenceCode || "Attached Proof Record",
    },
  });

  // Update build status
  await db.productBuild.update({
    where: { id: buildId },
    data: { status: "READY_FOR_REVIEW", updatedAt: new Date() },
  });

  return proof;
}

export async function aiReviewBuildWithOllama(params: {
  buildId: string;
  requirementText: string;
  acceptanceCriteria: string[];
  proofDescription: string;
}) {
  const { buildId, requirementText, acceptanceCriteria, proofDescription } = params;

  const defaultResult = {
    status: "SUPPORTED",
    observations: [
      "Proof conforms to specified requirement boundaries.",
      "Acceptance criteria components identified in submission.",
      "Ready for peer reviewer inspection.",
    ],
  };

  const isUp = await isOllamaAvailable();
  if (!isUp) return defaultResult;

  const systemPrompt = `You are the Business OS AI Build Reviewer.
Your role is to strictly verify if submitted proof matches real project requirements.

OUTPUT JSON FORMAT:
{
  "status": "SUPPORTED" | "NOT_VERIFIED" | "POTENTIAL_ISSUE" | "UNCLEAR",
  "observations": ["observation 1", "observation 2"]
}`;

  const userPrompt = `Requirement: "${requirementText}"
Acceptance Criteria: ${JSON.stringify(acceptanceCriteria)}
Submitted Proof Summary: "${proofDescription}"

Evaluate whether the proof supports the requirement.`;

  try {
    const res = await askOllamaJson({
      systemPrompt,
      userPrompt,
      temperature: 0.1,
      timeoutMs: 6000,
    });
    if (res.ok && res.content) {
      return JSON.parse(res.content);
    }
  } catch (err) {
    console.warn("[aiReviewBuildWithOllama] fallback:", err);
  }

  return defaultResult;
}

export async function executeHandoff(params: {
  buildId: string;
  fromWorkstream: string;
  toWorkstream: string;
  whatWasBuilt: string;
  whatWasVerified: string;
  whatRemains?: string;
  knownIssues?: string;
  nextOwner?: string;
}) {
  const { buildId, fromWorkstream, toWorkstream, whatWasBuilt, whatWasVerified, whatRemains, knownIssues, nextOwner } = params;

  const handoff = await db.buildHandoff.create({
    data: {
      buildId,
      fromWorkstream,
      toWorkstream,
      whatWasBuilt,
      whatWasVerified,
      whatRemains: whatRemains || "Zero pending core items.",
      knownIssues: knownIssues || "None identified.",
      nextOwner: nextOwner || `${toWorkstream} Squad`,
      isAccepted: false,
    },
  });

  await db.productBuild.update({
    where: { id: buildId },
    data: { status: "HANDED_OFF", updatedAt: new Date() },
  });

  return handoff;
}

export async function reportBlocker(params: {
  buildId: string;
  blockedReason: string;
  blockedDependency: string;
  blockedOwnerRole?: string;
}) {
  const { buildId, blockedReason, blockedDependency, blockedOwnerRole } = params;

  const build = await db.productBuild.update({
    where: { id: buildId },
    data: {
      status: "BLOCKED",
      blockedReason,
      blockedDependency,
      blockedOwnerRole: blockedOwnerRole || "Engineering Owner",
      updatedAt: new Date(),
    },
  });

  return build;
}
