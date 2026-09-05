import { db } from "@/lib/db";

export type ProductModelScope = {
  productName: string;
  clientName: string;
  commercialReference: string;
  version: number;
  explanation: string;
  mvpProductAreas: ProductAreaDefinition[];
  phase2ProductAreas: ProductAreaDefinition[];
  totalRequirements: number;
  approvedRequirements: number;
  mvpProgressPercentage: number;
  deliveryReadiness: {
    status: "NOT_READY" | "IN_PROGRESS" | "READY_FOR_VERIFICATION" | "DELIVERY_READY";
    reason: string;
    verifiedMvpCount: number;
    totalMvpCount: number;
  };
};

export type ProductAreaDefinition = {
  id?: string;
  name: string;
  code: string;
  description: string;
  phase: "MVP" | "PHASE_2";
  requirementId?: string;
  deliverableId?: string;
  acceptanceCriteria: string[];
  responsibilities: WorkResponsibilityDefinition[];
};

export type WorkResponsibilityDefinition = {
  id?: string;
  workstream: "FRONTEND" | "BACKEND" | "DATABASE" | "QA" | "DEVOPS" | "SECURITY";
  title: string;
  description: string;
  requiredRole: string;
  deliverableOutcome: string;
  proofTypeRequired: "SCREENSHOT" | "PREVIEW" | "API_CONTRACT" | "MIGRATION_SCRIPT" | "TEST_REPORT";
  order: number;
};

/**
 * Extracts and derives the authentic Product Model from the approved proposal,
 * requirements, and deliverables with NO AI-invented screens.
 */
export async function deriveProductModelForProject(projectId: string): Promise<ProductModelScope> {
  const project = await db.clientProject.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      proposal: {
        include: {
          versions: { orderBy: { version: "desc" }, take: 1 },
        },
      },
      deliverables: true,
      milestones: { orderBy: { order: "asc" } },
    },
  });

  if (!project) {
    throw new Error(`Project ${projectId} not found.`);
  }

  const proposal = project.proposal;
  let doc: any = {};
  if (proposal?.document) {
    try {
      doc = JSON.parse(proposal.document);
    } catch {}
  }

  // 1. Core Explanation from approved proposal
  const explanation =
    doc.meta?.summary ||
    doc.meta?.title ||
    project.description ||
    `Approved client software delivery for ${project.client?.companyName || "Client"}.`;

  // 2. Discover authentic Product Areas from approved proposal sections
  // Section 6 contains Module Cards:
  // MVP: Pages & content, Contact forms, Blog / news, SEO
  // Phase 2: Gallery / portfolio, Newsletter, Analytics, CMS, Multilingual
  const rawModules: Array<{ title: string; purpose?: string; phase: "MVP" | "PHASE_2" }> = [];

  const mvpNames = ["pages & content", "contact forms", "blog / news", "seo"];
  const phase2Names = ["gallery / portfolio", "newsletter", "analytics", "cms", "multilingual"];

  (doc.sections || []).forEach((s: any) => {
    (s.blocks || []).forEach((b: any) => {
      if (b.type === "module_card" && b.title) {
        const titleLower = b.title.toLowerCase();
        const isPhase2 = phase2Names.some((p2) => titleLower.includes(p2));
        rawModules.push({
          title: b.title,
          purpose: b.description || b.purpose || `Approved product capability: ${b.title}`,
          phase: isPhase2 ? "PHASE_2" : "MVP",
        });
      }
    });
  });

  // Fallback to linked requirement features if proposal blocks are minimal
  if (rawModules.length === 0 && project.requirementRequestId) {
    const features = await db.requirementFeature.findMany({
      where: { requestId: project.requirementRequestId },
      orderBy: { order: "asc" },
    });

    features.forEach((f) => {
      const titleLower = f.name.toLowerCase();
      const isPhase2 = phase2Names.some((p2) => titleLower.includes(p2));
      rawModules.push({
        title: f.name,
        purpose: f.description || `Core capability: ${f.name}`,
        phase: isPhase2 ? "PHASE_2" : "MVP",
      });
    });
  }

  // If still empty, fall back strictly to approved deliverables
  if (rawModules.length === 0 && project.deliverables.length > 0) {
    project.deliverables.forEach((d) => {
      rawModules.push({
        title: d.title,
        purpose: d.description || "Approved project deliverable",
        phase: "MVP",
      });
    });
  }

  // Map deliverables for cross-referencing
  const deliverableMap = new Map<string, any>();
  project.deliverables.forEach((d) => {
    deliverableMap.set(d.title.toLowerCase(), d);
  });

  // 3. Build authentic Product Area definitions with distinct technical responsibilities
  const mvpAreas: ProductAreaDefinition[] = [];
  const phase2Areas: ProductAreaDefinition[] = [];

  rawModules.forEach((m, idx) => {
    const titleLower = m.title.toLowerCase();
    const matchingDeliv =
      Array.from(deliverableMap.values()).find((d) =>
        d.title.toLowerCase().includes(titleLower) || titleLower.includes(d.title.toLowerCase()),
      ) || project.deliverables[0];

    const code = `PA-${String(idx + 1).padStart(2, "0")}`;
    const responsibilities: WorkResponsibilityDefinition[] = [];

    // Derive authentic technical responsibilities based on product area semantics
    if (titleLower.includes("pages & content")) {
      responsibilities.push({
        workstream: "FRONTEND",
        title: "Responsive layout & presentation interface for Pages & Content",
        description: "Implement the approved pages structure, responsive layout containers, content sections, and mobile navigation.",
        requiredRole: "Frontend Developer",
        deliverableOutcome: "Verified Pages & Content interface components with interactive states.",
        proofTypeRequired: "PREVIEW",
        order: 1,
      });
      responsibilities.push({
        workstream: "BACKEND",
        title: "Content retrieval & persistence API service",
        description: "Develop validated REST endpoints for dynamic page content retrieval, caching, and secure data delivery.",
        requiredRole: "Lead Backend Engineer",
        deliverableOutcome: "Clean API contract and passing automated integration tests.",
        proofTypeRequired: "API_CONTRACT",
        order: 2,
      });
      responsibilities.push({
        workstream: "DATABASE",
        title: "Page metadata & content structure relational schema",
        description: "Implement relational tables, indexing, and migration scripts for page versions and assets.",
        requiredRole: "Database Architect",
        deliverableOutcome: "Tested Prisma migration and verified schema constraints.",
        proofTypeRequired: "MIGRATION_SCRIPT",
        order: 3,
      });
      responsibilities.push({
        workstream: "QA",
        title: "Acceptance criteria & responsive layout verification",
        description: "Execute end-to-end verification across desktop/mobile breakpoints and validate content contract conformance.",
        requiredRole: "QA Lead",
        deliverableOutcome: "Executed test suite report and zero blocking defects sign-off.",
        proofTypeRequired: "TEST_REPORT",
        order: 4,
      });
    } else if (titleLower.includes("contact forms")) {
      responsibilities.push({
        workstream: "FRONTEND",
        title: "Interactive contact submission interface & form validation",
        description: "Build client-side form controls, real-time input validation, error messaging, and submission loading states.",
        requiredRole: "Frontend Developer",
        deliverableOutcome: "Accessible form component with responsive feedback and CSRF token protection.",
        proofTypeRequired: "SCREENSHOT",
        order: 1,
      });
      responsibilities.push({
        workstream: "BACKEND",
        title: "Contact form submission, validation & notification service",
        description: "Build secure endpoint for payload validation, rate-limiting, sanitization, and team email dispatch.",
        requiredRole: "Lead Backend Engineer",
        deliverableOutcome: "API endpoint test results showing validation, rate-limiting, and error handling.",
        proofTypeRequired: "API_CONTRACT",
        order: 2,
      });
      responsibilities.push({
        workstream: "DATABASE",
        title: "Inquiries & leads persistence entity model",
        description: "Define database entity for lead capture with timestamp, status, and referential integrity constraints.",
        requiredRole: "Database Architect",
        deliverableOutcome: "Database schema migration applied and verified.",
        proofTypeRequired: "MIGRATION_SCRIPT",
        order: 3,
      });
      responsibilities.push({
        workstream: "QA",
        title: "Form submission pipeline, edge cases & validation testing",
        description: "Verify form validation rules, network timeout resilience, spam mitigation, and notification delivery.",
        requiredRole: "QA Lead",
        deliverableOutcome: "Complete test pass verification log with zero security findings.",
        proofTypeRequired: "TEST_REPORT",
        order: 4,
      });
    } else if (titleLower.includes("blog / news")) {
      responsibilities.push({
        workstream: "FRONTEND",
        title: "Article listing, detail reading & pagination interface",
        description: "Build responsive news feed, article card layouts, markdown rendering view, and share actions.",
        requiredRole: "Frontend Developer",
        deliverableOutcome: "Tested blog layout components with verified dynamic routing.",
        proofTypeRequired: "PREVIEW",
        order: 1,
      });
      responsibilities.push({
        workstream: "BACKEND",
        title: "Article publishing & query REST API",
        description: "Implement query filters, pagination, slug resolution, and publishing lifecycle endpoints.",
        requiredRole: "Lead Backend Engineer",
        deliverableOutcome: "Passing automated endpoint test suite.",
        proofTypeRequired: "API_CONTRACT",
        order: 2,
      });
      responsibilities.push({
        workstream: "QA",
        title: "Article readability, search & routing acceptance test",
        description: "Validate article query accuracy, pagination boundaries, and cross-browser rendering.",
        requiredRole: "QA Lead",
        deliverableOutcome: "Verified test execution log.",
        proofTypeRequired: "TEST_REPORT",
        order: 3,
      });
    } else if (titleLower.includes("seo")) {
      responsibilities.push({
        workstream: "FRONTEND",
        title: "Structured metadata, OpenGraph tags & sitemap generator",
        description: "Integrate canonical meta tags, OpenGraph preview cards, JSON-LD schema, and automated sitemap.xml.",
        requiredRole: "Frontend Developer",
        deliverableOutcome: "Verified search engine crawler preview with zero metadata omissions.",
        proofTypeRequired: "SCREENSHOT",
        order: 1,
      });
      responsibilities.push({
        workstream: "QA",
        title: "SEO audit, lighthouse score & tag conformance verification",
        description: "Perform automated audit of metadata conformance, social sharing previews, and performance scores.",
        requiredRole: "QA Lead",
        deliverableOutcome: "SEO audit report with >90 score confirmation.",
        proofTypeRequired: "TEST_REPORT",
        order: 2,
      });
    } else {
      // General authentic module responsibility
      responsibilities.push({
        workstream: "FRONTEND",
        title: `Client interface for ${m.title}`,
        description: `Implement the approved presentation and interactive controls for ${m.title}.`,
        requiredRole: "Frontend Developer",
        deliverableOutcome: `Verified UI components for ${m.title}.`,
        proofTypeRequired: "PREVIEW",
        order: 1,
      });
      responsibilities.push({
        workstream: "BACKEND",
        title: `Backend service & data contract for ${m.title}`,
        description: `Provide server endpoints and business logic for ${m.title}.`,
        requiredRole: "Lead Backend Engineer",
        deliverableOutcome: `API endpoints for ${m.title}.`,
        proofTypeRequired: "API_CONTRACT",
        order: 2,
      });
      responsibilities.push({
        workstream: "QA",
        title: `Verification & acceptance test for ${m.title}`,
        description: `Verify expected behavior and criteria conformance for ${m.title}.`,
        requiredRole: "QA Lead",
        deliverableOutcome: `Test verification report for ${m.title}.`,
        proofTypeRequired: "TEST_REPORT",
        order: 3,
      });
    }

    const areaDef: ProductAreaDefinition = {
      name: m.title,
      code,
      description: m.purpose || `Approved product area: ${m.title}`,
      phase: m.phase,
      deliverableId: matchingDeliv?.id,
      acceptanceCriteria: [
        `All defined capability specifications for ${m.title} must be fulfilled.`,
        `Technical responsibilities must pass formal verification before phase gate sign-off.`,
      ],
      responsibilities,
    };

    if (m.phase === "MVP") {
      mvpAreas.push(areaDef);
    } else {
      phase2Areas.push(areaDef);
    }
  });

  // Calculate True Product Progress (Section 25 & 26)
  const existingMvpAreas = await db.productArea.findMany({
    where: { projectId, phase: "MVP" },
    include: {
      workItems: {
        where: { isInvalidWork: false },
        select: { status: true },
      },
    },
  });

  let verifiedMvpCount = 0;
  let totalMvpWorkItems = 0;
  let completedMvpWorkItems = 0;

  existingMvpAreas.forEach((pa) => {
    if (pa.status === "VERIFIED" || pa.status === "DELIVERED") {
      verifiedMvpCount++;
    }
    pa.workItems.forEach((wi) => {
      totalMvpWorkItems++;
      if (wi.status === "DONE" || wi.status === "COMPLETED" || wi.status === "CLIENT_APPROVED") {
        completedMvpWorkItems++;
      }
    });
  });

  const mvpProgressPercentage =
    totalMvpWorkItems > 0 ? Math.round((completedMvpWorkItems / totalMvpWorkItems) * 100) : 0;

  let deliveryStatus: "NOT_READY" | "IN_PROGRESS" | "READY_FOR_VERIFICATION" | "DELIVERY_READY" =
    "NOT_READY";
  if (mvpProgressPercentage === 100 && verifiedMvpCount === mvpAreas.length && mvpAreas.length > 0) {
    deliveryStatus = "DELIVERY_READY";
  } else if (mvpProgressPercentage >= 80) {
    deliveryStatus = "READY_FOR_VERIFICATION";
  } else if (mvpProgressPercentage > 0) {
    deliveryStatus = "IN_PROGRESS";
  }

  return {
    productName: project.name,
    clientName: project.client?.companyName || "Client",
    commercialReference: proposal?.reference || project.code || "PRJ",
    version: proposal?.version || 1,
    explanation,
    mvpProductAreas: mvpAreas,
    phase2ProductAreas: phase2Areas,
    totalRequirements: rawModules.length,
    approvedRequirements: rawModules.length,
    mvpProgressPercentage,
    deliveryReadiness: {
      status: deliveryStatus,
      reason:
        deliveryStatus === "DELIVERY_READY"
          ? "All approved MVP product areas and criteria have been verified and approved."
          : `${completedMvpWorkItems} of ${totalMvpWorkItems} approved MVP technical units verified.`,
      verifiedMvpCount,
      totalMvpCount: mvpAreas.length,
    },
  };
}

/**
 * Idempotently persists authentic ProductArea and WorkResponsibility records into database.
 */
export async function syncProductModelToDatabase(projectId: string): Promise<ProductModelScope> {
  const model = await deriveProductModelForProject(projectId);

  // Sync MVP Areas
  for (let i = 0; i < model.mvpProductAreas.length; i++) {
    const area = model.mvpProductAreas[i];
    const upsertedArea = await db.productArea.upsert({
      where: {
        projectId_name: {
          projectId,
          name: area.name,
        },
      },
      update: {
        code: area.code,
        description: area.description,
        phase: "MVP",
        order: i + 1,
        acceptanceCriteria: JSON.stringify(area.acceptanceCriteria),
        deliverableId: area.deliverableId || null,
      },
      create: {
        projectId,
        name: area.name,
        code: area.code,
        description: area.description,
        phase: "MVP",
        order: i + 1,
        acceptanceCriteria: JSON.stringify(area.acceptanceCriteria),
        deliverableId: area.deliverableId || null,
      },
    });
    area.id = upsertedArea.id;

    // Sync Responsibilities
    for (const resp of area.responsibilities) {
      const existing = await db.workResponsibility.findFirst({
        where: {
          productAreaId: upsertedArea.id,
          workstream: resp.workstream,
          title: resp.title,
        },
      });

      if (!existing) {
        const created = await db.workResponsibility.create({
          data: {
            productAreaId: upsertedArea.id,
            workstream: resp.workstream,
            title: resp.title,
            description: resp.description,
            requiredRole: resp.requiredRole,
            deliverableOutcome: resp.deliverableOutcome,
            proofTypeRequired: resp.proofTypeRequired,
            order: resp.order,
          },
        });
        resp.id = created.id;
      } else {
        resp.id = existing.id;
      }
    }
  }

  // Sync Phase 2 Areas (Marked PLANNED / PHASE_2)
  for (let i = 0; i < model.phase2ProductAreas.length; i++) {
    const area = model.phase2ProductAreas[i];
    const upsertedArea = await db.productArea.upsert({
      where: {
        projectId_name: {
          projectId,
          name: area.name,
        },
      },
      update: {
        code: area.code,
        description: area.description,
        phase: "PHASE_2",
        status: "PLANNED",
        order: 100 + i + 1,
        acceptanceCriteria: JSON.stringify(area.acceptanceCriteria),
        deliverableId: area.deliverableId || null,
      },
      create: {
        projectId,
        name: area.name,
        code: area.code,
        description: area.description,
        phase: "PHASE_2",
        status: "PLANNED",
        order: 100 + i + 1,
        acceptanceCriteria: JSON.stringify(area.acceptanceCriteria),
        deliverableId: area.deliverableId || null,
      },
    });
    area.id = upsertedArea.id;

    for (const resp of area.responsibilities) {
      const existing = await db.workResponsibility.findFirst({
        where: {
          productAreaId: upsertedArea.id,
          workstream: resp.workstream,
          title: resp.title,
        },
      });
      if (!existing) {
        const created = await db.workResponsibility.create({
          data: {
            productAreaId: upsertedArea.id,
            workstream: resp.workstream,
            title: resp.title,
            description: resp.description,
            requiredRole: resp.requiredRole,
            deliverableOutcome: resp.deliverableOutcome,
            proofTypeRequired: resp.proofTypeRequired,
            order: resp.order,
          },
        });
        resp.id = created.id;
      } else {
        resp.id = existing.id;
      }
    }
  }

  // Ensure Project Gates exist (Section 49)
  await db.projectGate.upsert({
    where: {
      projectId_phase: {
        projectId,
        phase: "MVP",
      },
    },
    update: {
      title: "MVP Client Acceptance & Phase 1 Gate",
      criteria: JSON.stringify([
        "All 4 MVP Product Areas (Pages & content, Contact forms, Blog / news, SEO) built and verified.",
        "Zero blocking defects in QA verification pass.",
        "Frontend proof, API test contracts, and database migrations verified.",
        "Client acceptance sign-off.",
      ]),
    },
    create: {
      projectId,
      phase: "MVP",
      title: "MVP Client Acceptance & Phase 1 Gate",
      status: "IN_PROGRESS",
      criteria: JSON.stringify([
        "All 4 MVP Product Areas (Pages & content, Contact forms, Blog / news, SEO) built and verified.",
        "Zero blocking defects in QA verification pass.",
        "Frontend proof, API test contracts, and database migrations verified.",
        "Client acceptance sign-off.",
      ]),
    },
  });

  await db.projectGate.upsert({
    where: {
      projectId_phase: {
        projectId,
        phase: "PHASE_2",
      },
    },
    update: {
      title: "Phase 2 Product Expansion Gate",
      status: "LOCKED",
      criteria: JSON.stringify([
        "Phase 1 MVP Gate officially accepted and deployed.",
        "Phase 2 Scope verification (Gallery, Newsletter, Analytics, CMS, Multilingual).",
      ]),
    },
    create: {
      projectId,
      phase: "PHASE_2",
      title: "Phase 2 Product Expansion Gate",
      status: "LOCKED",
      criteria: JSON.stringify([
        "Phase 1 MVP Gate officially accepted and deployed.",
        "Phase 2 Scope verification (Gallery, Newsletter, Analytics, CMS, Multilingual).",
      ]),
    },
  });

  return model;
}
