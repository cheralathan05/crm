import { db } from "../src/lib/db";

async function seedRealCRMData() {
  console.log("=== SEEDING REAL CRM PLATFORM ARCHITECTURE & CAPABILITIES ===");

  const project = await db.clientProject.findFirst({
    where: {
      name: { contains: "CRM" },
    },
  }) || await db.clientProject.findFirst({ orderBy: { createdAt: "desc" } });

  if (!project) {
    throw new Error("No project found to seed.");
  }

  console.log(`Target Project: "${project.name}" (ID: ${project.id})`);

  // 1. Get or create EngineeringBlueprint
  let blueprint = await db.engineeringBlueprint.findFirst({
    where: { projectId: project.id },
  });

  if (!blueprint) {
    blueprint = await db.engineeringBlueprint.create({
      data: {
        projectId: project.id,
        version: 1,
        status: "APPROVED",
      },
    });
  } else {
    // Delete existing generic capabilities/apis/services/entities for this blueprint
    await db.frontendCapability.deleteMany({ where: { blueprintId: blueprint.id } });
    await db.backendApi.deleteMany({ where: { blueprintId: blueprint.id } });
    await db.backendService.deleteMany({ where: { blueprintId: blueprint.id } });
    await db.databaseEntity.deleteMany({ where: { blueprintId: blueprint.id } });
    await db.productBuild.deleteMany({ where: { projectId: project.id } });
  }

  // 2. Real CRM Database Entities
  const entities = [
    {
      name: "Lead",
      tableName: "leads",
      purpose: "Stores inbound prospective clients, marketing source, and qualification scores",
      technicalReason: "Required for lead lifecycle tracking and conversion pipelines",
      fields: JSON.stringify([
        { name: "id", type: "String", isPk: true },
        { name: "name", type: "String" },
        { name: "company", type: "String" },
        { name: "email", type: "String" },
        { name: "phone", type: "String" },
        { name: "status", type: "String", default: "NEW" },
        { name: "value", type: "Float" },
        { name: "score", type: "Int" },
      ]),
      status: "VERIFIED",
      order: 1,
    },
    {
      name: "Contact",
      tableName: "contacts",
      purpose: "Stores verified customer contact records and relationship metadata",
      technicalReason: "Core customer directory for CRM communication and engagement",
      fields: JSON.stringify([
        { name: "id", type: "String", isPk: true },
        { name: "fullName", type: "String" },
        { name: "email", type: "String" },
        { name: "phone", type: "String" },
        { name: "title", type: "String" },
        { name: "companyId", type: "String", isFk: true },
      ]),
      status: "VERIFIED",
      order: 2,
    },
    {
      name: "Deal",
      tableName: "deals",
      purpose: "Tracks sales pipeline opportunities, deal stages, and revenue values",
      technicalReason: "Enables multi-stage sales velocity forecasting and revenue reporting",
      fields: JSON.stringify([
        { name: "id", type: "String", isPk: true },
        { name: "title", type: "String" },
        { name: "amount", type: "Float" },
        { name: "stage", type: "String", default: "QUALIFICATION" },
        { name: "probability", type: "Int" },
        { name: "expectedCloseDate", type: "DateTime" },
      ]),
      status: "VERIFIED",
      order: 3,
    },
    {
      name: "ClientCompany",
      tableName: "client_companies",
      purpose: "Enterprise account organization records and business profile data",
      technicalReason: "Account-based management and contract governance",
      fields: JSON.stringify([
        { name: "id", type: "String", isPk: true },
        { name: "companyName", type: "String" },
        { name: "industry", type: "String" },
        { name: "website", type: "String" },
        { name: "healthScore", type: "Int" },
      ]),
      status: "VERIFIED",
      order: 4,
    },
    {
      name: "ActivityTask",
      tableName: "client_tasks",
      purpose: "Operational tasks, follow-up calls, meetings, and reminder logs",
      technicalReason: "Workflow task automation and sales rep daily agenda management",
      fields: JSON.stringify([
        { name: "id", type: "String", isPk: true },
        { name: "title", type: "String" },
        { name: "status", type: "String" },
        { name: "priority", type: "String" },
        { name: "dueAt", type: "DateTime" },
      ]),
      status: "VERIFIED",
      order: 5,
    },
    {
      name: "ProposalStudio",
      tableName: "client_proposals",
      purpose: "Interactive dynamic proposals, PDF exports, and digital e-signatures",
      technicalReason: "Client quotation, interactive approvals, and deal closing",
      fields: JSON.stringify([
        { name: "id", type: "String", isPk: true },
        { name: "title", type: "String" },
        { name: "amount", type: "Float" },
        { name: "status", type: "String" },
        { name: "document", type: "Json" },
      ]),
      status: "VERIFIED",
      order: 6,
    },
  ];

  for (const entity of entities) {
    await db.databaseEntity.create({
      data: {
        blueprintId: blueprint.id,
        ...entity,
      },
    });
  }
  console.log(`Created ${entities.length} real CRM database entities.`);

  // 3. Real CRM Backend Services
  const services = [
    {
      name: "Lead Qualification & Ingestion Service",
      description: "Handles lead capture webhooks, qualification scoring, and pipeline distribution.",
      status: "ACTIVE",
    },
    {
      name: "Deal Pipeline & Forecasting Engine",
      description: "Calculates stage conversion velocity, probability-weighted revenue, and forecast models.",
      status: "ACTIVE",
    },
    {
      name: "Contact & Account Directory Service",
      description: "Manages customer master data, deduplication, and engagement timelines.",
      status: "ACTIVE",
    },
    {
      name: "Task Automation & Notification Service",
      description: "Dispatches automated follow-up reminders, task assignments, and overdue alerts.",
      status: "ACTIVE",
    },
    {
      name: "AI Proposal & E-Signature Service",
      description: "Assembles interactive proposal documents, generates PDFs, and validates audit signatures.",
      status: "ACTIVE",
    },
    {
      name: "Analytics & Executive KPI Engine",
      description: "Aggregates revenue, deal conversion rates, and sales velocity metrics.",
      status: "ACTIVE",
    },
  ];

  for (const service of services) {
    await db.backendService.create({
      data: {
        blueprintId: blueprint.id,
        ...service,
      },
    });
  }
  console.log(`Created ${services.length} real CRM backend services.`);

  // 4. Real CRM Backend APIs
  const apis = [
    { method: "GET", path: "/api/v1/leads", purpose: "Retrieves list of leads filtered by status, source, or score" },
    { method: "POST", path: "/api/v1/leads", purpose: "Ingests new lead record with automated scoring" },
    { method: "GET", path: "/api/v1/deals", purpose: "Returns active sales deals grouped by pipeline stage" },
    { method: "PATCH", path: "/api/v1/deals", purpose: "Transitions deal stage and logs audit activity" },
    { method: "GET", path: "/api/v1/contacts", purpose: "Searches verified contacts with company relationships" },
    { method: "POST", path: "/api/v1/contacts", purpose: "Persists customer contact record with validation" },
    { method: "GET", path: "/api/v1/tasks", purpose: "Fetches user tasks with due dates and priority tags" },
    { method: "GET", path: "/api/v1/proposals", purpose: "Retrieves proposals, signature status, and values" },
    { method: "GET", path: "/api/v1/analytics/overview", purpose: "Aggregates revenue, win rate, and sales velocity metrics" },
  ];

  for (let i = 0; i < apis.length; i++) {
    await db.backendApi.create({
      data: {
        blueprintId: blueprint.id,
        order: i,
        status: "COMPLETED",
        ...apis[i],
      },
    });
  }
  console.log(`Created ${apis.length} real CRM backend APIs.`);

  // 5. Real CRM Frontend Capabilities (Product Areas)
  const capabilities = [
    {
      name: "Lead Pipeline & Qualification Board",
      type: "PAGE",
      route: "/leads",
      description: "Visual lead management board with qualification scores, status columns, quick intake, and conversion triggers.",
      apiDependencies: JSON.stringify(["GET /api/v1/leads", "POST /api/v1/leads"]),
      order: 1,
      status: "PLANNED",
    },
    {
      name: "Deals & Revenue Forecast View",
      type: "PAGE",
      route: "/deals",
      description: "Interactive deal pipeline with stage transitions, estimated values, probability weighting, and revenue forecasting.",
      apiDependencies: JSON.stringify(["GET /api/v1/deals", "PATCH /api/v1/deals"]),
      order: 2,
      status: "PLANNED",
    },
    {
      name: "Contact & Company Account Directory",
      type: "PAGE",
      route: "/contacts",
      description: "Unified customer record directory with organization hierarchy, communication history, and custom contact tags.",
      apiDependencies: JSON.stringify(["GET /api/v1/contacts", "POST /api/v1/contacts"]),
      order: 3,
      status: "PLANNED",
    },
    {
      name: "Task & Activity Execution Center",
      type: "PAGE",
      route: "/tasks",
      description: "Operational task manager with due dates, priority filters, automated reminders, and activity timeline.",
      apiDependencies: JSON.stringify(["GET /api/v1/tasks"]),
      order: 4,
      status: "PLANNED",
    },
    {
      name: "Interactive Proposal & E-Sign Studio",
      type: "PAGE",
      route: "/proposals",
      description: "Digital proposal studio with scope builder, interactive pricing breakdown, client sign-off, and PDF export.",
      apiDependencies: JSON.stringify(["GET /api/v1/proposals"]),
      order: 5,
      status: "PLANNED",
    },
    {
      name: "Sales Analytics & Performance Dashboard",
      type: "PAGE",
      route: "/analytics",
      description: "Executive KPI dashboard showing deal velocity, conversion rates, sales team leaderboard, and monthly revenue trends.",
      apiDependencies: JSON.stringify(["GET /api/v1/analytics/overview"]),
      order: 6,
      status: "PLANNED",
    },
  ];

  for (const cap of capabilities) {
    await db.frontendCapability.create({
      data: {
        blueprintId: blueprint.id,
        ...cap,
      },
    });
  }
  console.log(`Created ${capabilities.length} real CRM frontend capabilities.`);

  // 6. Update Project Deliverables to match real CRM system
  await db.projectDeliverable.deleteMany({ where: { projectId: project.id } });
  const deliverables = [
    { title: "Lead Ingestion & Qualification Pipeline", category: "ENGINEERING", status: "PLANNED" },
    { title: "Deals & Revenue Forecasting Engine", category: "ENGINEERING", status: "PLANNED" },
    { title: "Contact & Account Directory System", category: "ENGINEERING", status: "PLANNED" },
    { title: "Task Automation & Activity Center", category: "ENGINEERING", status: "PLANNED" },
    { title: "Interactive Proposal Studio & E-Signature", category: "ENGINEERING", status: "PLANNED" },
    { title: "Sales Analytics & Executive Reporting", category: "ENGINEERING", status: "PLANNED" },
  ];

  for (const del of deliverables) {
    await db.projectDeliverable.create({
      data: {
        projectId: project.id,
        ...del,
      },
    });
  }
  console.log(`Created ${deliverables.length} real CRM project deliverables.`);

  console.log("=== REAL CRM ARCHITECTURE APPLIED SUCCESSFULLY ===");
}

seedRealCRMData()
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
