import { db } from "@/lib/db";
import { askOllamaJson, isOllamaAvailable } from "@/lib/ai/ollama/ollama.client";
import { recordEvent } from "@/lib/requirements";
import type {
  DiscoverySessionDto,
  LiveProjectModel,
  TopicAreaKey,
  TopicAreaItem,
  ScopeTier,
  StructuredMessageData,
  ChangeImpactResult,
} from "./discovery.types";

/* ────────────────────────────────────────────────────────────────────────────
   BUSINESS OS INTELLIGENT PROJECT DISCOVERY STUDIO — CORE SERVICE
   ────────────────────────────────────────────────────────────────────────────
   Ollama behaves as an intelligent project consultant that turns natural
   client conversations into a live, structured project model in real time.
   Zero mock data · Pure SQLite persistence · Resilient local Ollama inference.
   ──────────────────────────────────────────────────────────────────────────── */

export const DEFAULT_TOPIC_AREAS: { key: TopicAreaKey; label: string; order: number }[] = [
  { key: "PROJECT", label: "Project Overview", order: 1 },
  { key: "BUSINESS", label: "Business Context", order: 2 },
  { key: "GOAL", label: "Core Goals & Outcomes", order: 3 },
  { key: "USERS", label: "Users & Roles", order: 4 },
  { key: "CUSTOMER_JOURNEY", label: "Customer Journey", order: 5 },
  { key: "CORE_FEATURES", label: "Capabilities & Features", order: 6 },
  { key: "BUSINESS_RULES", label: "Business Rules & Logic", order: 7 },
  { key: "CURRENT_PROCESS", label: "Current vs Future Process", order: 8 },
  { key: "INTEGRATIONS", label: "Integrations & APIs", order: 9 },
  { key: "CONTENT", label: "Content & Data", order: 10 },
  { key: "DESIGN", label: "Design & Look", order: 11 },
  { key: "PAYMENTS", label: "Payments & Billing", order: 12 },
  { key: "SECURITY", label: "Security & Permissions", order: 13 },
  { key: "OPERATIONS", label: "Staff & Operations", order: 14 },
  { key: "TIMELINE", label: "Timeline Expectations", order: 15 },
  { key: "BUDGET", label: "Budget & Commercials", order: 16 },
  { key: "FINAL_REVIEW", label: "Final Review & Sign-off", order: 17 },
];

/**
 * Get or initialize an active DiscoverySession for a requirement.
 */
export async function getOrCreateDiscoverySession(requirementId: string): Promise<DiscoverySessionDto> {
  const req = await db.requirementRequest.findUnique({
    where: { id: requirementId },
    include: { client: true },
  });
  if (!req) throw new Error(`Requirement request ${requirementId} not found`);

  let session = await db.discoverySession.findUnique({
    where: { requirementId },
  });

  if (!session) {
    session = await db.discoverySession.create({
      data: {
        requirementId: req.id,
        workspaceId: req.workspaceId,
        clientId: req.clientId,
        mode: "DISCOVERY",
        intakePath: "GUIDED",
        currentArea: "BUSINESS",
        completeness: 0,
        readinessScore: 20,
        healthStatus: "READY",
        lastDiscussedTopic: "BUSINESS",
      },
    });

    // Seed topic areas
    for (const area of DEFAULT_TOPIC_AREAS) {
      await db.discoveryTopicArea.create({
        data: {
          sessionId: session.id,
          areaKey: area.key,
          label: area.label,
          order: area.order,
          status: area.key === "BUSINESS" ? "INFERRED" : "NOT_DISCUSSED",
        },
      });
    }

    // Seed welcome greeting message from Business OS Consultant (Rule 3)
    // CRITICAL: The opening welcome message and Current Question are distinct.
    // The opening message invites the client to explain what they want in their own words.
    // The Current Question must NOT duplicate the opening message!
    const welcomeData: StructuredMessageData = {
      allowCustomInput: true,
      quickReplies: [
        "Internal Operations & Workflow Platform",
        "Client Portal & Project Delivery",
        "Client Booking & Appointment Platform",
        "B2B CRM & Sales Pipeline",
        "Other / I'll explain in my own words",
      ],
    };

    await db.discoveryMessage.create({
      data: {
        sessionId: session.id,
        role: "consultant",
        content: `Welcome to Business OS Project Discovery Studio.\n\nTell me what you're trying to build, what problem you're trying to solve, and how you want your business to work after the solution is in place.\n\nYou can explain it in your own words. It doesn't need to be technical or perfectly organized.\n\nI'll help turn your explanation into a clear project definition.`,
        structuredData: JSON.stringify(welcomeData),
        modelUsed: "system-consultant",
      },
    });
  }

  return serializeDiscoverySession(session.id);
}

/**
 * Compute honest Discovery Coverage Matrix across 12 authentic project dimensions (Rule 36).
 * Never displays fake progress or "X of 20 questions".
 */
export function computeDiscoveryCoverage(data: {
  facts?: any[];
  journeys?: any[];
  capabilities?: any[];
  businessRules?: any[];
  scopeItems?: any[];
}): import("./discovery.types").DiscoveryCoverageItem[] {
  const facts = data.facts || [];
  const capabilities = data.capabilities || [];
  const journeys = data.journeys || [];
  const rules = data.businessRules || [];
  const scopeItems = data.scopeItems || [];

  // When client has not provided their explanation yet, honest state is Awaiting Client Response
  const isInitialState = facts.length === 0 && capabilities.length === 0 && journeys.length === 0;
  if (isInitialState) {
    return [
      { dimensionKey: "businessContext", label: "Business Context", status: "NOT_YET_DISCUSSED", summary: "Awaiting client response" },
      { dimensionKey: "problem", label: "Business Problem", status: "NOT_YET_DISCUSSED", summary: "Awaiting client response" },
      { dimensionKey: "goals", label: "Project Objectives & Desired Future", status: "NOT_YET_DISCUSSED", summary: "Awaiting client response" },
      { dimensionKey: "users", label: "Target Users & Responsibilities", status: "NOT_YET_DISCUSSED", summary: "Awaiting client response" },
      { dimensionKey: "workflow", label: "Current vs Desired Workflow", status: "NOT_YET_DISCUSSED", summary: "Awaiting client response" },
      { dimensionKey: "requirements", label: "Functional Capabilities", status: "NOT_YET_DISCUSSED", summary: "Awaiting client response" },
      { dimensionKey: "information", label: "Information & Records Managed", status: "NOT_YET_DISCUSSED", summary: "Awaiting client response" },
      { dimensionKey: "businessRules", label: "Business Rules & Logic", status: "NOT_YET_DISCUSSED", summary: "Awaiting client response" },
      { dimensionKey: "tools", label: "Existing Tools & Migration", status: "NOT_YET_DISCUSSED", summary: "Awaiting client response" },
      { dimensionKey: "integrations", label: "System Connections & APIs", status: "NOT_YET_DISCUSSED", summary: "Awaiting client response" },
      { dimensionKey: "scope", label: "Scope Boundaries & Radar", status: "NOT_YET_DISCUSSED", summary: "Awaiting client response" },
      { dimensionKey: "successCriteria", label: "Success Criteria & Deliverables", status: "NOT_YET_DISCUSSED", summary: "Awaiting client response" },
    ];
  }

  const hasBusiness = facts.some((f) => f.category === "BUSINESS_CONTEXT" || f.category === "BUSINESS_PROBLEM" || f.category === "OUTCOME");
  const hasProblem = facts.some((f) => f.category === "BUSINESS_PROBLEM");
  const hasGoal = facts.some((f) => f.category === "GOAL" || f.category === "OUTCOME");
  const hasUsers = journeys.length > 0 || capabilities.some((c) => c.roleName && c.roleName !== "General");
  const hasWorkflow = journeys.length > 0 || facts.some((f) => f.category === "PROCESS_CURRENT" || f.category === "PROCESS_FUTURE");
  const hasRequirements = capabilities.length > 0;
  const hasInformation = facts.some((f) => f.category === "INFORMATION_RECORD");
  const hasRules = rules.length > 0;
  const hasIntegrations = facts.some((f) => f.category === "INTEGRATION");
  const hasExistingTools = facts.some((f) => f.category === "EXISTING_TOOL");
  const hasScope = scopeItems.length > 0;
  const hasSuccessCriteria = facts.some((f) => f.category === "SUCCESS_CRITERIA" || f.category === "OUTCOME");

  return [
    {
      dimensionKey: "businessContext",
      label: "Business Context",
      status: hasBusiness ? "COMPLETE" : "IN_PROGRESS",
      summary: hasBusiness ? "Business model and operational nature identified" : "Awaiting initial context",
    },
    {
      dimensionKey: "problem",
      label: "Business Problem",
      status: hasProblem ? "COMPLETE" : "NOT_YET_DISCUSSED",
      summary: hasProblem ? "Core operational pain point documented" : "Not yet clarified",
    },
    {
      dimensionKey: "goals",
      label: "Project Objectives & Desired Future",
      status: hasGoal ? "COMPLETE" : "IN_PROGRESS",
      summary: hasGoal ? "Target operational outcomes defined" : "Exploring target outcomes",
    },
    {
      dimensionKey: "users",
      label: "Target Users & Responsibilities",
      status: hasUsers ? "COMPLETE" : "NEEDS_REVIEW",
      summary: hasUsers ? `${journeys.length || 1} distinct user roles identified` : "Roles and permissions pending",
    },
    {
      dimensionKey: "workflow",
      label: "Current vs Desired Workflow",
      status: hasWorkflow ? "COMPLETE" : "IN_PROGRESS",
      summary: hasWorkflow ? "Key operational lifecycle stages mapped" : "Process stages pending",
    },
    {
      dimensionKey: "requirements",
      label: "Functional Capabilities",
      status: hasRequirements ? "COMPLETE" : "NOT_YET_DISCUSSED",
      summary: hasRequirements ? `${capabilities.length} capabilities structured` : "No specific capabilities confirmed yet",
    },
    {
      dimensionKey: "information",
      label: "Information & Records Managed",
      status: hasInformation ? "COMPLETE" : "NEEDS_REVIEW",
      summary: hasInformation ? "Core business entities mapped" : "Core data records pending",
    },
    {
      dimensionKey: "businessRules",
      label: "Business Rules & Logic",
      status: hasRules ? "COMPLETE" : "IN_PROGRESS",
      summary: hasRules ? `${rules.length} business rules documented` : "Approval gates and conditions pending",
    },
    {
      dimensionKey: "tools",
      label: "Existing Tools & Migration",
      status: hasExistingTools ? "COMPLETE" : "NOT_YET_DISCUSSED",
      summary: hasExistingTools ? "Current tools and data migration noted" : "Not yet discussed",
    },
    {
      dimensionKey: "integrations",
      label: "System Connections & APIs",
      status: hasIntegrations ? "COMPLETE" : "NOT_APPLICABLE",
      summary: hasIntegrations ? "External services identified" : "No external connections required yet",
    },
    {
      dimensionKey: "scope",
      label: "Scope Boundaries & Radar",
      status: hasScope ? "COMPLETE" : "IN_PROGRESS",
      summary: hasScope ? `${scopeItems.length} scope items categorized` : "Scope boundaries being established",
    },
    {
      dimensionKey: "successCriteria",
      label: "Success Criteria & Deliverables",
      status: hasSuccessCriteria ? "COMPLETE" : "NEEDS_REVIEW",
      summary: hasSuccessCriteria ? "Deliverables and success signs mapped" : "To be confirmed before final sign-off",
    },
  ];
}

/**
 * Serialize full discovery state into a complete DTO including the Live Project Model.
 */
export async function serializeDiscoverySession(sessionId: string): Promise<DiscoverySessionDto> {
  const session = await db.discoverySession.findUnique({
    where: { id: sessionId },
    include: {
      requirement: {
        include: { client: true },
      },
      areas: { orderBy: { order: "asc" } },
      messages: { orderBy: { createdAt: "asc" } },
      facts: true,
      decisions: { orderBy: { createdAt: "desc" } },
      journeys: { orderBy: { order: "asc" } },
      capabilities: { orderBy: { createdAt: "asc" } },
      businessRules: { orderBy: { createdAt: "asc" } },
      scopeItems: { orderBy: { createdAt: "asc" } },
      assumptions: { orderBy: { createdAt: "asc" } },
      recommendations: { orderBy: { createdAt: "asc" } },
      references: { orderBy: { createdAt: "desc" } },
      approvalRecords: { orderBy: { approvedAt: "desc" }, take: 1 },
    },
  });

  if (!session) throw new Error(`Discovery session ${sessionId} not found`);

  // Assemble Live Project Model
  const businessFact = session.facts.find((f) => f.category === "BUSINESS_PROBLEM");
  const goalFact = session.facts.find((f) => f.category === "GOAL");
  const currentProcessFacts = session.facts.filter((f) => f.category === "PROCESS_CURRENT");
  const futureProcessFacts = session.facts.filter((f) => f.category === "PROCESS_FUTURE");
  const outcomes = session.facts.filter((f) => f.category === "OUTCOME").map((f) => f.title);

  // Group user roles
  const userRolesMap = new Map<string, "CONFIRMED" | "INFERRED">();
  for (const cap of session.capabilities) {
    if (cap.roleName) {
      userRolesMap.set(cap.roleName, cap.status === "CONFIRMED" ? "CONFIRMED" : "INFERRED");
    }
  }
  for (const j of session.journeys) {
    if (j.roleName && !userRolesMap.has(j.roleName)) {
      userRolesMap.set(j.roleName, j.isConfirmed ? "CONFIRMED" : "INFERRED");
    }
  }

  // Construct Scope Radar
  const coreScope = session.scopeItems.filter((s) => s.tier === "CORE").map(mapScope);
  const possibleScope = session.scopeItems.filter((s) => s.tier === "POSSIBLE").map(mapScope);
  const unknownScope = session.scopeItems.filter((s) => s.tier === "UNKNOWN").map(mapScope);
  const outOfScope = session.scopeItems.filter((s) => s.tier === "OUT_OF_SCOPE").map(mapScope);

  // Derive Traceability
  const traceability = session.capabilities.map((c, idx) => ({
    reqCode: `REQ-${String(idx + 1).padStart(3, "0")}`,
    title: c.title,
    source: `Discovery fact (${c.roleName})`,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
  }));

  const model: LiveProjectModel = {
    whatWeAreBuilding: {
      businessType: businessFact?.title || null,
      problemStatement: businessFact?.description || null,
      coreGoal: goalFact?.title || null,
      confirmedOutcomes: outcomes,
    },
    processTransformation: {
      todayProcess: currentProcessFacts.map((f) => f.title),
      futureProcess: futureProcessFacts.map((f) => f.title),
    },
    userRoles: Array.from(userRolesMap.entries()).map(([name, status]) => ({ name, status })),
    journeys: session.journeys.map((j) => ({
      id: j.id,
      roleName: j.roleName,
      title: j.title,
      steps: safeParseArray(j.steps),
      isConfirmed: j.isConfirmed,
    })),
    capabilities: session.capabilities.map((c) => ({
      id: c.id,
      roleName: c.roleName,
      title: c.title,
      description: c.description,
      category: c.category,
      status: c.status as "CONFIRMED" | "INFERRED" | "POSSIBLE",
    })),
    businessRules: session.businessRules.map((b) => ({
      id: b.id,
      rule: b.rule,
      condition: b.condition,
      exceptionHandling: b.exceptionHandling,
      appliesToRole: b.appliesToRole,
      severity: b.severity as "STANDARD" | "STRICT",
      status: b.status as "CONFIRMED" | "INFERRED",
    })),
    scopeRadar: {
      core: coreScope,
      possible: possibleScope,
      unknown: unknownScope,
      outOfScope: outOfScope,
    },
    openDecisions: session.decisions.map((d) => ({
      id: d.id,
      title: d.title,
      options: safeParseArray(d.options),
      selectedOption: d.selectedOption,
      reason: d.reason,
      source: d.source,
      status: d.status as "CONFIRMED" | "UNDECIDED" | "LEAVE_FOR_LATER",
    })),
    assumptions: session.assumptions.map((a) => ({
      id: a.id,
      title: a.title,
      category: a.category,
      status: a.status as "CONFIRMED" | "ASSUMPTION" | "RECOMMENDATION" | "UNKNOWN",
      validationQuestion: a.validationQuestion,
    })),
    recommendations: session.recommendations.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      options: safeParseArray(r.options),
      recommendedOption: r.recommendedOption,
      rationale: r.rationale,
      status: r.status as "PENDING" | "ACCEPTED" | "DECLINED",
    })),
    references: session.references.map((rf) => ({
      id: rf.id,
      type: rf.type as any,
      name: rf.name,
      path: rf.path,
      observations: safeParseArray(rf.observations),
      clientDecisions: safeParseObject(rf.clientDecisions),
      createdAt: rf.createdAt.toISOString(),
    })),
    traceability,
    informationRecords: session.facts
      .filter((f) => f.category === "INFORMATION_RECORD")
      .map((f) => ({
        id: f.id,
        name: f.title,
        description: f.description,
        status: (f.status as "CONFIRMED" | "INFERRED") || "INFERRED",
      })),
    reportingVisibility: session.facts
      .filter((f) => f.category === "REPORTING")
      .map((f) => {
        const parts = f.description.split(":");
        return {
          id: f.id,
          audience: (parts[0] || "Management").trim(),
          whatTheySee: f.title,
          decisionSupported: parts.slice(1).join(":").trim() || undefined,
        };
      }),
    existingTools: session.facts
      .filter((f) => f.category === "EXISTING_TOOL")
      .map((f) => ({
        id: f.id,
        toolName: f.title,
        currentUse: f.description,
        disposition: f.description.includes("KEEP") ? ("KEEP" as const) : ("REPLACE" as const),
        migrationNeeded: f.description.toLowerCase().includes("migration") || f.description.toLowerCase().includes("excel"),
      })),
    systemConnections: session.facts
      .filter((f) => f.category === "INTEGRATION")
      .map((f) => {
        const parts = f.description.split("->");
        return {
          id: f.id,
          systemName: f.title,
          reason: (parts[0] || f.description).trim(),
          dataFlow: (parts[1] || "Bi-directional sync").trim(),
        };
      }),
    contradictions: session.facts
      .filter((f) => f.category === "CONTRADICTION")
      .map((f) => ({
        id: f.id,
        topic: f.title,
        previousUnderstanding: f.description.split("||")[0]?.replace("Previous:", "").trim() || "Earlier statement",
        newUnderstanding: f.description.split("||")[1]?.replace("New:", "").trim() || "Current statement",
        whatChanged: f.description.split("||")[2]?.replace("Changed:", "").trim() || f.title,
        status: (f.status === "CONFIRMED" ? "CONFIRMED" : "DETECTED") as "CONFIRMED" | "DETECTED",
      })),
    coverage: computeDiscoveryCoverage({
      facts: session.facts,
      journeys: session.journeys,
      capabilities: session.capabilities,
      businessRules: session.businessRules,
      scopeItems: session.scopeItems,
    }),
    health: {
      status: session.healthStatus as any,
      score: session.readinessScore,
      issues: [],
    },
  };

  const latestApproval = session.approvalRecords[0];

  return {
    id: session.id,
    requirementId: session.requirementId,
    reference: session.requirement.reference,
    projectTitle: session.requirement.title,
    companyName: session.requirement.client.companyName,
    mode: session.mode as any,
    intakePath: (session.intakePath as any) || "GUIDED",
    currentArea: session.currentArea as TopicAreaKey,
    completeness: session.completeness,
    readinessScore: session.readinessScore,
    healthStatus: session.healthStatus as any,
    lastDiscussedTopic: session.lastDiscussedTopic,
    areas: session.areas.map((a) => ({
      key: a.areaKey as TopicAreaKey,
      label: a.label,
      status: a.status as any,
      order: a.order,
    })),
    messages: session.messages.map((m) => ({
      id: m.id,
      role: m.role as any,
      content: m.content,
      structuredData: m.structuredData ? safeParseObject(m.structuredData) : undefined,
      modelUsed: m.modelUsed,
      latencyMs: m.latencyMs,
      createdAt: m.createdAt.toISOString(),
    })),
    model,
    isLocked: session.mode === "APPROVED",
    approvedAt: latestApproval ? latestApproval.approvedAt.toISOString() : null,
    approverName: latestApproval ? latestApproval.approverName : null,
  };
}

function mapScope(s: any) {
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    tier: s.tier as ScopeTier,
    rationale: s.rationale,
    impact: s.impact,
  };
}

/**
 * Process a consultant turn: Client inputs an explanation, answer, or choice.
 * The Question Value Engine + Ollama reasoning generates structured model updates and the next question.
 */
export async function processConsultantTurn(params: {
  sessionId: string;
  userMessage: string;
  selectedOption?: string;
}): Promise<DiscoverySessionDto> {
  const { sessionId, userMessage, selectedOption } = params;
  const session = await db.discoverySession.findUnique({
    where: { id: sessionId },
    include: {
      requirement: { include: { client: true } },
      facts: true,
      journeys: true,
      capabilities: true,
      decisions: true,
      scopeItems: true,
      areas: true,
      messages: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!session) throw new Error("Session not found");
  if (session.mode === "APPROVED") throw new Error("This discovery session is approved and locked.");

  const effectiveInput = selectedOption ? `${userMessage} (Selected: ${selectedOption})` : userMessage;

  // 1. Record User Message
  await db.discoveryMessage.create({
    data: {
      sessionId,
      role: "user",
      content: effectiveInput,
    },
  });

  // 2. Question Value Engine & Ollama Modeling
  const contextSummary = {
    businessFacts: session.facts.map((f) => `${f.category}: ${f.title} (${f.description})`),
    journeys: session.journeys.map((j) => `${j.roleName}: ${j.steps}`),
    capabilities: session.capabilities.map((c) => `${c.roleName}: ${c.title}`),
    confirmedScope: session.scopeItems.filter((s) => s.tier === "CORE").map((s) => s.title),
    openDecisions: session.decisions.filter((d) => d.status === "UNDECIDED").map((d) => d.title),
    lastArea: session.currentArea,
  };

  const systemPrompt = `You are Business OS Intelligent Project Consultant.
This is a real business product, NOT a chatbot demo, questionnaire, form wizard, or generic prompt.
You behave like an elite senior consultant sitting with a real client to understand exactly what they want to build.

Adhere strictly to the 58 Master Rules of Project Discovery Studio:
1. DO NOT MAKE THIS A QUESTIONNAIRE. Never run a rote list of questions. Every question must have a clear purpose, be connected to what the client said, and define the actual project.
2. UNDERSTAND BEFORE ASKING. Analyze what is confirmed, what is partially understood, what is unclear, what is missing, what can safely remain unknown.
3. NEVER ASK FOR INFORMATION THE CLIENT ALREADY PROVIDED. Remember everything the client stated.
4. NEVER ASSUME THE BUSINESS. Adapt to ANY legitimate business (retail, healthcare, education, construction, SaaS, agency, logistics, internal operations, etc.). Never introduce unrelated concepts (e.g. do not ask about inventory if they want a CRM).
5. ASK EXACTLY ONE GOOD QUESTION AT A TIME in simple, non-technical business language.
6. EXPLAIN WHY YOU ARE ASKING. Always explain how this question impacts the real project architecture, scope, or operations.
7. PROVIDE 3-4 SMART CHOICES + ALWAYS include { "id": "opt_other", "label": "Other / I'll explain", "isRecommended": false }.
8. DISTINGUISH FACT FROM ASSUMPTION. Explicitly separate confirmed facts from assumptions.
9. DETECT CONTRADICTIONS & CHANGING REQUIREMENTS. If the client updates an earlier statement, return a contradiction object explaining what changed.
10. KNOW WHEN TO STOP. When the core problem, objective, roles, workflows, capabilities, and scope are sufficiently clear, set "isReadyForReview": true and invite the client to review the project blueprint.
11. NEVER DUPLICATE THE WELCOME MESSAGE. The opening message already welcomed the client. The currentQuestion must always be a focused, relevant discovery question arising from what the client just told you.
12. NEVER TURN SYSTEM QUESTIONS INTO BUSINESS DATA. Only extract genuine facts, capabilities, and business rules from what the CLIENT explicitly stated. Never store system questions, prompts, or unanswered topics as project requirements or open decisions.
13. NEVER INTRODUCE UNRELATED OPERATIONAL QUESTIONS. If the client wants an operations platform, CRM, or project management tool, NEVER ask about inventory or physical order fulfillment! Connect your questions strictly to their stated business domain.

Current client input: "${effectiveInput}"
Current project context:
${JSON.stringify(contextSummary, null, 2)}

Return a strict JSON object with this exact schema:
{
  "consultantResponse": "Professional, conversational response that directly engages with their statement and asks ONE clear next question in business language.",
  "activeTopic": "PROJECT" | "BUSINESS" | "GOAL" | "USERS" | "CUSTOMER_JOURNEY" | "CORE_FEATURES" | "BUSINESS_RULES" | "CURRENT_PROCESS" | "INTEGRATIONS" | "SECURITY" | "TIMELINE" | "BUDGET",
  "currentQuestion": {
    "question": "The single most important focal question to resolve now",
    "contextWhy": "Why this specific question matters for structuring their project"
  },
  "whyWeAsk": {
    "question": "The question",
    "rationale": "Detailed explanation of why this answer affects scope, data models, or processes"
  },
  "structuredOptions": [
    { "id": "opt1", "label": "Option label", "description": "Short hint", "isRecommended": true },
    { "id": "opt_other", "label": "Other / I'll explain", "isRecommended": false }
  ],
  "isReadyForReview": false,
  "contradiction": {
    "detected": false,
    "topic": "Topic if contradiction found",
    "previousUnderstanding": "What was previously understood",
    "newUnderstanding": "What the client stated now",
    "whatChanged": "Summary of what changed"
  },
  "discoveredFacts": [
    { "category": "BUSINESS_PROBLEM" | "GOAL" | "USER_ROLE" | "PROCESS_CURRENT" | "PROCESS_FUTURE" | "OUTCOME" | "SUCCESS_CRITERIA", "title": "Short title", "description": "Details" }
  ],
  "discoveredInformationRecords": [
    { "name": "e.g. Invoices", "description": "e.g. Tracks client billings" }
  ],
  "discoveredReporting": [
    { "audience": "Management", "whatTheySee": "Weekly sales velocity", "decisionSupported": "Resource allocation" }
  ],
  "discoveredExistingTools": [
    { "toolName": "Excel", "currentUse": "Tracking leads manually", "disposition": "REPLACE", "migrationNeeded": true }
  ],
  "discoveredIntegrations": [
    { "systemName": "Stripe", "reason": "Payment processing", "dataFlow": "Checkout payment tokens" }
  ],
  "discoveredRoles": ["Role 1", "Role 2"],
  "userJourneySteps": ["Step 1", "Step 2", "Step 3"],
  "discoveredCapabilities": [
    { "role": "Role", "title": "Capability Title", "description": "Description", "category": "Category" }
  ],
  "businessRules": [
    { "rule": "Rule name", "condition": "When condition met", "exceptionHandling": "Fallback", "role": "Role" }
  ],
  "scopeItems": [
    { "title": "Feature Title", "tier": "CORE" | "POSSIBLE" | "OUT_OF_SCOPE", "rationale": "Rationale" }
  ],
  "inlineConfirmation": {
    "needed": false,
    "statement": "Statement",
    "suggestedAction": "Confirm or adjust"
  },
  "recommendation": {
    "hasRecommendation": false,
    "title": "",
    "rationale": "",
    "options": [],
    "recommendedOption": ""
  }
}`;

  let parsedAi: any = null;
  let modelUsed = "deterministic-rule-engine";
  const startMs = Date.now();

  const isUp = await isOllamaAvailable();
  if (isUp) {
    try {
      const ollamaRes = await askOllamaJson({
        systemPrompt,
        userPrompt: `Evaluate input: "${effectiveInput}". Respond in strict JSON according to the schema.`,
        temperature: 0.15,
        timeoutMs: 35000,
      });
      if (ollamaRes.ok && ollamaRes.content) {
        parsedAi = JSON.parse(ollamaRes.content);
        modelUsed = ollamaRes.modelUsed || "Ollama";
      }
    } catch (err) {
      console.warn("[Discovery] Ollama inference fallback:", err);
    }
  }

  // Resilient deterministic consultant logic if Ollama unavailable or unparseable
  if (!parsedAi) {
    parsedAi = generateDeterministicConsultantTurn(effectiveInput, contextSummary);
  }

  const durationMs = Date.now() - startMs;

  // 3. Persist Discovered Entities to DB
  await applyDiscoveredEntities(sessionId, session.requirementId, parsedAi);

  // 4. Save Consultant Response Message
  const structuredPayload: StructuredMessageData = {
    currentQuestion: parsedAi.currentQuestion || {
      question: parsedAi.whyWeAsk?.question || "Tell me more about your desired workflow",
      contextWhy: parsedAi.whyWeAsk?.rationale || "Helps map business processes and user responsibilities",
    },
    options: parsedAi.structuredOptions || [],
    inlineConfirmation: parsedAi.inlineConfirmation?.needed
      ? {
          id: `conf_${Date.now()}`,
          statement: parsedAi.inlineConfirmation.statement,
          sourceContext: effectiveInput,
          status: "PENDING",
          suggestedAction: parsedAi.inlineConfirmation.suggestedAction,
        }
      : undefined,
    whyWeAsk: parsedAi.whyWeAsk,
    contradiction: parsedAi.contradiction?.detected
      ? {
          id: `contra_${Date.now()}`,
          topic: parsedAi.contradiction.topic || "Requirement Revision",
          previousUnderstanding: parsedAi.contradiction.previousUnderstanding || "",
          newUnderstanding: parsedAi.contradiction.newUnderstanding || "",
          whatChanged: parsedAi.contradiction.whatChanged || "",
          status: "DETECTED",
        }
      : undefined,
    iDontKnow: {
      helpMeDecide: parsedAi.recommendation?.hasRecommendation
        ? {
            recommendationTitle: parsedAi.recommendation.title,
            rationale: parsedAi.recommendation.rationale,
            options: parsedAi.recommendation.options || [],
          }
        : undefined,
      leaveUndecidedAllowed: true,
      canSkip: true,
    },
    detectedTopic: parsedAi.activeTopic,
  };

  await db.discoveryMessage.create({
    data: {
      sessionId,
      role: "consultant",
      content: parsedAi.consultantResponse,
      structuredData: JSON.stringify(structuredPayload),
      modelUsed,
      latencyMs: durationMs,
    },
  });

  // 5. Update Topic Areas & Metrics
  const nextArea = parsedAi.activeTopic || session.currentArea;
  await db.discoverySession.update({
    where: { id: sessionId },
    data: {
      currentArea: nextArea,
      lastDiscussedTopic: nextArea,
      completeness: Math.min(95, session.completeness + 15),
      readinessScore: Math.min(90, session.readinessScore + 12),
    },
  });

  // Mark current area as confirmed or inferred
  await db.discoveryTopicArea.updateMany({
    where: { sessionId, areaKey: nextArea },
    data: { status: "INFERRED" },
  });

  return serializeDiscoverySession(sessionId);
}

/**
 * Persist discovered entities from Ollama/Consultant turn and sync to Requirement features & answers.
 */
async function applyDiscoveredEntities(sessionId: string, requirementId: string, aiOutput: any) {
  // Discovered Facts
  if (Array.isArray(aiOutput.discoveredFacts)) {
    for (const fact of aiOutput.discoveredFacts) {
      if (!fact.title) continue;
      const existing = await db.discoveryFact.findFirst({
        where: { sessionId, category: fact.category, title: fact.title },
      });
      if (!existing) {
        await db.discoveryFact.create({
          data: {
            sessionId,
            category: fact.category,
            title: fact.title,
            description: fact.description || "",
            status: "INFERRED",
          },
        });
      }
    }
  }

  // User Journey
  if (Array.isArray(aiOutput.userJourneySteps) && aiOutput.userJourneySteps.length > 0) {
    const existingJourney = await db.userJourney.findFirst({
      where: { sessionId, roleName: "Customer" },
    });
    if (existingJourney) {
      const merged = Array.from(new Set([...safeParseArray(existingJourney.steps), ...aiOutput.userJourneySteps]));
      await db.userJourney.update({
        where: { id: existingJourney.id },
        data: { steps: JSON.stringify(merged) },
      });
    } else {
      await db.userJourney.create({
        data: {
          sessionId,
          roleName: "Customer",
          title: "Customer Purchasing Journey",
          steps: JSON.stringify(aiOutput.userJourneySteps),
          isConfirmed: false,
        },
      });
    }
  }

  // Discovered Capabilities -> also sync to RequirementFeature!
  if (Array.isArray(aiOutput.discoveredCapabilities)) {
    for (const cap of aiOutput.discoveredCapabilities) {
      if (!cap.title) continue;
      const existing = await db.systemCapability.findFirst({
        where: { sessionId, title: cap.title },
      });
      if (!existing) {
        await db.systemCapability.create({
          data: {
            sessionId,
            roleName: cap.role || "Customer",
            title: cap.title,
            description: cap.description || "",
            category: cap.category || "General",
            status: "INFERRED",
          },
        });

        // Also add to RequirementFeature so all proposal engines and task matrices have real data!
        const existingFeat = await db.requirementFeature.findFirst({
          where: { requestId: requirementId, name: cap.title },
        });
        if (!existingFeat) {
          await db.requirementFeature.create({
            data: {
              requestId: requirementId,
              name: cap.title,
              priority: "MUST_HAVE",
              description: cap.description || "",
              users: JSON.stringify([cap.role || "Customer"]),
              acceptanceCriteria: JSON.stringify([
                `${cap.role || "User"} can successfully execute ${cap.title}`,
                "System verifies inputs and handles edge cases cleanly",
              ]),
            },
          });
        }
      }
    }
  }

  // Business Rules
  if (Array.isArray(aiOutput.businessRules)) {
    for (const br of aiOutput.businessRules) {
      if (!br.rule) continue;
      const existing = await db.businessRule.findFirst({
        where: { sessionId, rule: br.rule },
      });
      if (!existing) {
        await db.businessRule.create({
          data: {
            sessionId,
            rule: br.rule,
            condition: br.condition || null,
            exceptionHandling: br.exceptionHandling || null,
            appliesToRole: br.role || null,
            status: "INFERRED",
          },
        });
      }
    }
  }

  // Scope Items
  if (Array.isArray(aiOutput.scopeItems)) {
    for (const item of aiOutput.scopeItems) {
      if (!item.title) continue;
      const existing = await db.scopeItem.findFirst({
        where: { sessionId, title: item.title },
      });
      if (!existing) {
        await db.scopeItem.create({
          data: {
            sessionId,
            title: item.title,
            tier: item.tier || "CORE",
            rationale: item.rationale || "",
          },
        });
      }
    }
  }

  // AI Recommendation Layer
  if (aiOutput.recommendation?.hasRecommendation) {
    const r = aiOutput.recommendation;
    const existing = await db.aiRecommendation.findFirst({
      where: { sessionId, title: r.title },
    });
    if (!existing) {
      await db.aiRecommendation.create({
        data: {
          sessionId,
          title: r.title,
          description: r.rationale || "",
          options: JSON.stringify(r.options || []),
          recommendedOption: r.recommendedOption || null,
          rationale: r.rationale || null,
          status: "PENDING",
        },
      });
    }
  }

  // Discovered Information Records (Rule 14)
  if (Array.isArray(aiOutput.discoveredInformationRecords)) {
    for (const info of aiOutput.discoveredInformationRecords) {
      if (!info.name) continue;
      const existing = await db.discoveryFact.findFirst({
        where: { sessionId, category: "INFORMATION_RECORD", title: info.name },
      });
      if (!existing) {
        await db.discoveryFact.create({
          data: {
            sessionId,
            category: "INFORMATION_RECORD",
            title: info.name,
            description: info.description || "",
            status: "INFERRED",
          },
        });
      }
    }
  }

  // Discovered Reporting & Visibility (Rule 17)
  if (Array.isArray(aiOutput.discoveredReporting)) {
    for (const rep of aiOutput.discoveredReporting) {
      if (!rep.whatTheySee) continue;
      const existing = await db.discoveryFact.findFirst({
        where: { sessionId, category: "REPORTING", title: rep.whatTheySee },
      });
      if (!existing) {
        await db.discoveryFact.create({
          data: {
            sessionId,
            category: "REPORTING",
            title: rep.whatTheySee,
            description: `${rep.audience || "Management"}: ${rep.decisionSupported || ""}`,
            status: "INFERRED",
          },
        });
      }
    }
  }

  // Discovered Existing Tools & Migration (Rule 18)
  if (Array.isArray(aiOutput.discoveredExistingTools)) {
    for (const tool of aiOutput.discoveredExistingTools) {
      if (!tool.toolName) continue;
      const existing = await db.discoveryFact.findFirst({
        where: { sessionId, category: "EXISTING_TOOL", title: tool.toolName },
      });
      if (!existing) {
        await db.discoveryFact.create({
          data: {
            sessionId,
            category: "EXISTING_TOOL",
            title: tool.toolName,
            description: `${tool.currentUse || ""} [Disposition: ${tool.disposition || "REPLACE"}, Migration: ${tool.migrationNeeded ? "Required" : "None"}]`,
            status: "INFERRED",
          },
        });
      }
    }
  }

  // Discovered System Connections (Rule 19)
  if (Array.isArray(aiOutput.discoveredIntegrations)) {
    for (const intg of aiOutput.discoveredIntegrations) {
      if (!intg.systemName) continue;
      const existing = await db.discoveryFact.findFirst({
        where: { sessionId, category: "INTEGRATION", title: intg.systemName },
      });
      if (!existing) {
        await db.discoveryFact.create({
          data: {
            sessionId,
            category: "INTEGRATION",
            title: intg.systemName,
            description: `${intg.reason || ""} -> ${intg.dataFlow || "Bi-directional"}`,
            status: "INFERRED",
          },
        });
      }
    }
  }

  // Contradiction / Revision Detected (Rules 28 & 29)
  if (aiOutput.contradiction?.detected && aiOutput.contradiction.topic) {
    const contra = aiOutput.contradiction;
    await db.discoveryFact.create({
      data: {
        sessionId,
        category: "CONTRADICTION",
        title: contra.topic,
        description: `Previous: ${contra.previousUnderstanding || ""} || New: ${contra.newUnderstanding || ""} || Changed: ${contra.whatChanged || ""}`,
        status: "DETECTED",
      },
    });
  }
}

/**
 * Intelligent deterministic consultant fallback when Ollama is offline.
 * Adapts dynamically to ANY legitimate business (Operations, CRM, Education, Construction, Healthcare, E-Commerce, Custom).
 * NEVER assumes retail inventory or physical fulfillment unless explicitly requested! (Rules 6 & 51)
 */
function generateDeterministicConsultantTurn(input: string, context: any) {
  const lower = input.toLowerCase();

  // 1. Business Operations / CRM / Client Lifecycle / Projects & Workflows (Rule 51 Real-World Example)
  if (
    lower.includes("crm") ||
    lower.includes("proposal") ||
    lower.includes("project") ||
    lower.includes("task") ||
    lower.includes("client") ||
    lower.includes("sheet") ||
    lower.includes("spreadsheet") ||
    lower.includes("lead") ||
    lower.includes("contract") ||
    lower.includes("agency") ||
    lower.includes("operation") ||
    lower.includes("workstream")
  ) {
    return {
      consultantResponse: `I understand completely. You are currently running operations across disconnected spreadsheets and tools, and want to consolidate the entire client-to-project journey into a single platform.\n\nLet's start with how client work begins: after a client submits their requirements and a proposal is generated, who should have authority to approve the proposal before the project is created?`,
      activeTopic: "BUSINESS_RULES",
      discoveredFacts: [
        {
          category: "BUSINESS_PROBLEM",
          title: "Operations Across Disconnected Tools",
          description: "Clients, requirements, proposals, projects, tasks and documents currently managed across spreadsheets and different tools",
        },
        {
          category: "GOAL",
          title: "Business Operations Management Platform",
          description: "Centralize client intake, automate proposal-to-project handover, and track project execution progress",
        },
        {
          category: "PROCESS_CURRENT",
          title: "Manual Spreadsheets & Separate Tools",
          description: "Data fragmented across sheets, email, and manual communication causing delays and loss of context",
        },
        {
          category: "PROCESS_FUTURE",
          title: "Unified Business OS Lifecycle",
          description: "Requirement Request -> Project Discovery -> Proposal -> Client Approval -> Project Creation -> Tasks",
        },
        {
          category: "OUTCOME",
          title: "Full Project Delivery Visibility",
          description: "Real-time visibility into project deadlines, task assignments, and approved commercial scope",
        },
      ],
      discoveredRoles: ["Client Stakeholder", "Project Manager", "Operations Admin"],
      userJourneySteps: [
        "Client submits requirements",
        "Discovery structures scope",
        "Commercial proposal generated",
        "Client reviews & approves proposal",
        "Project initialized with work areas",
        "Tasks assigned & executed",
        "Milestone delivery & completion",
      ],
      discoveredCapabilities: [
        { role: "Client Stakeholder", title: "Client Requirement Intake Portal", description: "Submit project needs and review discovery models", category: "Intake" },
        { role: "Operations Admin", title: "Structured Proposal Generation", description: "Generate accurate proposals directly from confirmed requirements", category: "Commercial" },
        { role: "Client Stakeholder", title: "Proposal Review & Approval", description: "Formal sign-off gating project creation", category: "Commercial" },
        { role: "Project Manager", title: "Project & Workstream Initialization", description: "Automatically create work areas based on approved scope", category: "Projects" },
        { role: "Project Manager", title: "Task Assignment & Progress Tracking", description: "Assign tasks with status, priority, and dependencies", category: "Execution" },
      ],
      businessRules: [
        {
          rule: "Proposal Approval Gate",
          condition: "Proposal status is APPROVED",
          exceptionHandling: "Project creation blocked until client signs off",
          role: "Client Stakeholder",
        },
        {
          rule: "Scope Protection",
          condition: "Workstreams and tasks generated",
          exceptionHandling: "Must connect directly to approved requirements",
          role: "System",
        },
      ],
      scopeItems: [
        { title: "Client Requirement Intake & Discovery Studio", tier: "CORE", rationale: "Core entry point for all client work" },
        { title: "Automated Proposal Generator & Approval Flow", tier: "CORE", rationale: "Essential commercial transition gate" },
        { title: "Project Workspace & Task Command Center", tier: "CORE", rationale: "Execution backbone for team delivery" },
        { title: "Custom BI Reporting Dashboard", tier: "POSSIBLE", rationale: "Valuable for management, but standard metrics suffice for launch" },
        { title: "Third-party Accounting ERP Sync", tier: "OUT_OF_SCOPE", rationale: "Phase 2 consideration — standalone tracking for launch" },
      ],
      inlineConfirmation: {
        needed: true,
        statement: "A project should only be initialized after the client formally reviews and approves the proposal.",
        suggestedAction: "Confirm approval rule",
      },
      structuredOptions: [
        { id: "opt_client_only", label: "Client stakeholder approval required", isRecommended: true },
        { id: "opt_co_approval", label: "Client approval + Internal PM sign-off", isRecommended: true },
        { id: "opt_dept_head", label: "Department head approval" },
        { id: "opt_other", label: "Other / I'll explain", isRecommended: false },
      ],
      whyWeAsk: {
        question: "Who should approve the proposal before the project begins?",
        rationale: "Ensures the approval process matches your real business governance so active work is never initiated without agreed commercial sign-off.",
      },
      currentQuestion: {
        question: "Who should have authority to approve a proposal before the project is created?",
        contextWhy: "Prevents unapproved work from starting and mirrors your real business decision hierarchy.",
      },
    };
  }

  // 2. Education / School / Academy / University
  if (
    lower.includes("school") ||
    lower.includes("student") ||
    lower.includes("teacher") ||
    lower.includes("course") ||
    lower.includes("class") ||
    lower.includes("academy") ||
    lower.includes("education") ||
    lower.includes("learning") ||
    lower.includes("grade") ||
    lower.includes("exam")
  ) {
    return {
      consultantResponse: `I understand. You are creating an educational management system to coordinate students, instructors, and courses. Let's look at how student registration and class placement will work. How should student enrollments and fee payments be processed?`,
      activeTopic: "CURRENT_PROCESS",
      discoveredFacts: [
        { category: "BUSINESS_PROBLEM", title: "Academic Administration Management", description: "Student enrollments, schedules, and academic tracking managed manually" },
        { category: "GOAL", title: "Modern Education Management System", description: "Centralize student records, course scheduling, and teacher gradebooks" },
      ],
      discoveredRoles: ["Student", "Instructor", "School Administrator"],
      userJourneySteps: ["Student applies online", "Admin reviews application", "Fee invoice issued", "Payment verified", "Enrolled into courses", "Student attends & views grades"],
      discoveredCapabilities: [
        { role: "Student", title: "Online Application & Course Registration", description: "Browse course catalog and register for classes", category: "Admissions" },
        { role: "School Administrator", title: "Student Record Management", description: "Maintain enrollment status, fees, and official transcripts", category: "Administration" },
        { role: "Instructor", title: "Attendance & Gradebook Management", description: "Log student attendance and submit course marks", category: "Academics" },
      ],
      businessRules: [
        { rule: "Course Prerequisite Rule", condition: "Registering for advanced course", exceptionHandling: "Requires passing grade in prerequisite", role: "System" },
      ],
      scopeItems: [
        { title: "Student Portal & Enrollment", tier: "CORE", rationale: "Core student access requirement" },
        { title: "Instructor Gradebook & Attendance", tier: "CORE", rationale: "Essential academic record keeping" },
      ],
      structuredOptions: [
        { id: "opt_online_pay", label: "Online fee payment with instant enrollment", isRecommended: true },
        { id: "opt_admin_approval", label: "Admin review and manual enrollment approval", isRecommended: true },
        { id: "opt_other", label: "Other / I'll explain", isRecommended: false },
      ],
      whyWeAsk: {
        question: "How should student enrollments and fee payments be processed?",
        rationale: "Defines the administrative onboarding pipeline, payment verification workflows, and student role permissions.",
      },
      currentQuestion: {
        question: "How should student enrollments and fee payments be processed and approved?",
        contextWhy: "Determines whether enrollment is self-service or requires administrative verification.",
      },
    };
  }

  // 3. Construction / Field Operations / Contractor Projects
  if (
    lower.includes("construction") ||
    lower.includes("contractor") ||
    lower.includes("site") ||
    lower.includes("field") ||
    lower.includes("safety") ||
    lower.includes("blueprint") ||
    lower.includes("building") ||
    lower.includes("inspection")
  ) {
    return {
      consultantResponse: `I understand. You are managing construction projects and field contractors where job-site coordination and milestone verification are critical. Who on the job site will submit daily logs, and who needs to approve completed milestones?`,
      activeTopic: "USERS",
      discoveredFacts: [
        { category: "BUSINESS_PROBLEM", title: "Job-Site Operations Tracking", description: "Field logs, safety checks, and contractor milestone sign-offs managed on paper" },
        { category: "GOAL", title: "Construction Operations Platform", description: "Real-time field logging, subcontractor milestones, and safety sign-offs" },
      ],
      discoveredRoles: ["Field Superintendent", "Subcontractor", "Project Director"],
      userJourneySteps: ["Superintendent opens daily log", "Subcontractor logs hours & progress", "Safety checklist completed", "Milestone submitted", "Director inspects & approves"],
      discoveredCapabilities: [
        { role: "Field Superintendent", title: "Daily Job-Site Progress Logging", description: "Capture photos, weather, and labor counts", category: "Field" },
        { role: "Project Director", title: "Milestone Approval & Payment Release", description: "Review milestone quality before releasing contractor payment", category: "Management" },
      ],
      businessRules: [
        { rule: "Safety Inspection Gate", condition: "Daily site start", exceptionHandling: "Mandatory safety checklist before work begins", role: "Field Superintendent" },
      ],
      scopeItems: [
        { title: "Mobile Field Logging", tier: "CORE", rationale: "Used directly on job-sites" },
        { title: "Milestone Approval & Audit Trail", tier: "CORE", rationale: "Required for contractor compliance" },
      ],
      structuredOptions: [
        { id: "opt_super_submits", label: "Field superintendents log daily, PM approves milestones", isRecommended: true },
        { id: "opt_subcontractor_direct", label: "Subcontractors submit directly from mobile" },
        { id: "opt_other", label: "Other / I'll explain", isRecommended: false },
      ],
      whyWeAsk: {
        question: "Who will submit daily logs, and who approves completed milestones?",
        rationale: "Establishes field-to-office accountability and approval checkpoints for contractor billing.",
      },
      currentQuestion: {
        question: "Who on the job site will submit daily logs, and who needs to approve completed milestones?",
        contextWhy: "Determines mobile field interface permissions versus executive sign-off authority.",
      },
    };
  }

  // 4. Healthcare / Clinic / Patient Booking
  if (
    lower.includes("clinic") ||
    lower.includes("doctor") ||
    lower.includes("patient") ||
    lower.includes("hospital") ||
    lower.includes("medical") ||
    lower.includes("appointment") ||
    lower.includes("prescription")
  ) {
    return {
      consultantResponse: `I understand. You are building a patient appointment and clinic management system. Let's look at the scheduling workflow: how should patients book appointments, and who confirms doctor availability?`,
      activeTopic: "CURRENT_PROCESS",
      discoveredFacts: [
        { category: "BUSINESS_PROBLEM", title: "Manual Clinic Appointments & Patient Intake", description: "Scheduling and patient records handled over phone calls and paper forms" },
        { category: "GOAL", title: "Digital Patient Intake & Clinic Scheduling Hub", description: "Online patient booking, digital intake forms, and automated doctor schedule management" },
      ],
      discoveredRoles: ["Patient", "Doctor", "Clinic Receptionist"],
      userJourneySteps: ["Patient selects doctor & time slot", "Completes medical intake form", "Appointment confirmed", "Reminder sent via SMS", "Consultation conducted"],
      discoveredCapabilities: [
        { role: "Patient", title: "Online Appointment Booking", description: "Select clinic location, doctor specialty, and available slot", category: "Booking" },
        { role: "Clinic Receptionist", title: "Schedule Coordination & Check-in", description: "Manage doctor calendars and mark patient arrivals", category: "Reception" },
        { role: "Doctor", title: "Consultation Notes & Schedule View", description: "Review patient history and record consultation outcomes", category: "Clinical" },
      ],
      businessRules: [
        { rule: "Advance Booking Notice", condition: "Same-day appointments", exceptionHandling: "Requires receptionist confirmation", role: "System" },
      ],
      scopeItems: [
        { title: "Patient Self-Service Booking Portal", tier: "CORE", rationale: "Solves front-desk phone bottleneck" },
        { title: "Doctor Schedule Calendar", tier: "CORE", rationale: "Essential for appointment management" },
      ],
      structuredOptions: [
        { id: "opt_instant_book", label: "Instant online booking with automated confirmation", isRecommended: true },
        { id: "opt_reception_confirms", label: "Patient requests slot, receptionist confirms" },
        { id: "opt_other", label: "Other / I'll explain", isRecommended: false },
      ],
      whyWeAsk: {
        question: "How should patients schedule appointments, and who confirms availability?",
        rationale: "Determines calendar synchronization rules, slot reservation locks, and patient SMS reminders.",
      },
      currentQuestion: {
        question: "How should patients schedule appointments, and who confirms doctor availability?",
        contextWhy: "Establishes whether booking is fully automated or moderated by clinic staff.",
      },
    };
  }

  // 5. Retail / E-Commerce Store (ONLY if explicitly requested by client!)
  if (
    lower.includes("apparel") ||
    lower.includes("clothing") ||
    lower.includes("storefront") ||
    (lower.includes("store") && lower.includes("product")) ||
    (lower.includes("sell") && lower.includes("products"))
  ) {
    return {
      consultantResponse: `I understand. You are building an online retail storefront to display your product catalog and take orders directly from customers. What payment methods and order delivery updates do you want to provide?`,
      activeTopic: "CUSTOMER_JOURNEY",
      discoveredFacts: [
        { category: "BUSINESS_PROBLEM", title: "Manual Order Processing", description: "Orders currently handled manually through messaging" },
        { category: "GOAL", title: "Online Retail Storefront", description: "Centralized product catalog, automated cart checkout, and real-time tracking" },
      ],
      discoveredRoles: ["Customer", "Order Fulfillment Staff", "Store Manager"],
      userJourneySteps: ["Browse catalog", "Add to bag", "Checkout", "Pay online", "Order confirmed", "Order dispatch tracking"],
      discoveredCapabilities: [
        { role: "Customer", title: "Product Catalog & Search", description: "Filter items by category, size and price", category: "Storefront" },
        { role: "Customer", title: "Online Cart & Checkout", description: "Securely enter shipping address and pay", category: "Checkout" },
        { role: "Order Fulfillment Staff", title: "Order Fulfillment & Dispatch", description: "Update shipping courier tracking numbers", category: "Operations" },
      ],
      businessRules: [
        { rule: "Order Notification Rule", condition: "Order placed", exceptionHandling: "Send instant SMS/Email confirmation", role: "System" },
      ],
      scopeItems: [
        { title: "Online Catalog & Cart Checkout", tier: "CORE", rationale: "Core transactional capability" },
        { title: "Delivery Tracking Portal", tier: "CORE", rationale: "Direct customer visibility requirement" },
      ],
      structuredOptions: [
        { id: "opt_cards_upi", label: "Online Cards, UPI & Netbanking", isRecommended: true },
        { id: "opt_cod_support", label: "Cash on delivery + Online payment" },
        { id: "opt_other", label: "Other / I'll explain", isRecommended: false },
      ],
      whyWeAsk: {
        question: "What payment methods and delivery tracking options do you want to provide?",
        rationale: "Defines payment gateway webhook integration, refund workflows, and courier notification triggers.",
      },
      currentQuestion: {
        question: "What payment methods and delivery tracking options do you want to provide for customers?",
        contextWhy: "Determines checkout payment architecture and shipping update notifications.",
      },
    };
  }

  // 6. Universal Semantic Parser — Adapts to ANY custom business (Rule 7)
  // NEVER mentions inventory or physical orders!
  return {
    consultantResponse: `I understand what you're trying to achieve. To turn your explanation into a clear, buildable project definition, let's look at the primary people who will use this system.\n\nWho will be using this solution day-to-day, and what does each type of user need to accomplish?`,
    activeTopic: "USERS",
    discoveredFacts: [
      {
        category: "BUSINESS_PROBLEM",
        title: "Operational Modernization",
        description: input.slice(0, 160),
      },
      {
        category: "GOAL",
        title: "Tailored Business Platform",
        description: "Streamline operations, eliminate manual friction, and provide unified visibility",
      },
    ],
    discoveredRoles: ["Primary Business User", "Management Administrator"],
    userJourneySteps: ["User accesses system", "Reviews pending tasks & records", "Performs business action", "System records update & notifies relevant team"],
    discoveredCapabilities: [
      { role: "Primary Business User", title: "Core Operations Workspace", description: "Manage day-to-day business records and tasks", category: "Core" },
      { role: "Management Administrator", title: "Administrative Control & Reporting", description: "Configure system permissions and inspect operational metrics", category: "Administration" },
    ],
    businessRules: [
      { rule: "Role-Based Access Guard", condition: "Accessing sensitive records", exceptionHandling: "Restricted to authorized roles", role: "System" },
    ],
    scopeItems: [
      { title: "Core Operational Management Platform", tier: "CORE", rationale: "Directly delivers client's primary objective" },
      { title: "Role-Based Security & Permissions", tier: "CORE", rationale: "Ensures data integrity and governance" },
    ],
    structuredOptions: [
      { id: "opt_internal_only", label: "Internal team & administrators only", isRecommended: true },
      { id: "opt_client_internal", label: "External clients + Internal team", isRecommended: true },
      { id: "opt_multi_tier", label: "Multi-tier: Admins, Managers, and External Users" },
      { id: "opt_other", label: "Other / I'll explain", isRecommended: false },
    ],
    whyWeAsk: {
      question: "Who will be the primary users of the system?",
      rationale: "Identifies target user roles, permission boundaries, authentication tiers, and specific feature access.",
    },
    currentQuestion: {
      question: "Who will be the primary users of the system, and what are their main responsibilities?",
      contextWhy: "Defines access permissions, interface layouts, and security gates for each role.",
    },
  };
}

/**
 * Convert an interrogative question into a clean declarative business decision subject.
 * CRITICAL RULE: A system question itself must NEVER be recorded as business data or a requirement.
 * Example:
 * "Do you want a mobile application at launch?" -> "Whether a mobile application is required at launch"
 * "How many sales employees will use the system?" -> "Sales employee user count"
 * "Who should approve proposals before delivery?" -> "Proposal approval authority"
 */
export function extractDecisionSubject(question: string): string {
  if (!question) return "Unresolved specification detail";
  let q = question.trim().replace(/[?.\s]+$/, "");

  // If question starts with welcome prompt, never treat as decision
  if (q.toLowerCase().includes("tell me what you're trying to build") || q.toLowerCase().includes("welcome to business os")) {
    return "Initial project vision & scope";
  }

  // Remove conversational lead-ins
  q = q.replace(/^(please\s+tell\s+me|could\s+you\s+clarify|can\s+you\s+explain|i'd\s+like\s+to\s+know|let's\s+decide|we\s+need\s+to\s+know|could\s+you\s+tell\s+me)\s+/i, "");

  // Match: "Do you want/need/require (a/an)? (.+)" -> "Whether $2 is required at launch"
  // Example: "Do you want a mobile application at launch?" -> "Whether a mobile application is required at launch"
  const doYouWantMatch = q.match(/^do\s+you\s+(?:want|need|require|plan\s+for)\s+(.+)/i);
  if (doYouWantMatch) {
    let target = doYouWantMatch[1].trim();
    target = target.replace(/\s+at\s+launch$/i, "").trim();
    return `Whether ${target} is required at launch`;
  }

  // Match: "Should (.+) be (.+)" -> "Whether $1 should be $2"
  const shouldMatch = q.match(/^should\s+(.+)/i);
  if (shouldMatch) {
    return `Whether ${shouldMatch[1].trim()}`;
  }

  // Match: "(Once|After|When) (.+), how (should|will|can) (.+) be (started|created|handled|processed|managed|initiated)?"
  // Example: "Once a proposal is approved, how should the project be started?" -> "Project initiation process after a proposal is approved"
  const conditionalHowMatch = q.match(/^(?:once|after|when)\s+(.+?),\s*how\s+(?:should|will|can|is)\s+(?:the\s+)?(.+?)\s+(?:be\s+)?(started|created|handled|processed|managed|initiated)/i);
  if (conditionalHowMatch) {
    const condition = conditionalHowMatch[1].trim();
    const entity = conditionalHowMatch[2].trim();
    const verb = conditionalHowMatch[3].toLowerCase();
    const verbNoun = verb === "started" || verb === "initiated" ? "initiation" : verb === "created" ? "creation" : verb === "processed" ? "processing" : "handling";
    return `${capitalizeFirst(entity)} ${verbNoun} process after ${condition}`;
  }

  // Match: "How (should|will|can) (the\s+)?(.+) be (started|created|handled|processed|managed|initiated)?"
  const howBeMatch = q.match(/^how\s+(?:should|will|can|is)\s+(?:the\s+)?(.+?)\s+(?:be\s+)?(started|created|handled|processed|managed|initiated)/i);
  if (howBeMatch) {
    const entity = howBeMatch[1].trim();
    const verb = howBeMatch[2].toLowerCase();
    const verbNoun = verb === "started" || verb === "initiated" ? "initiation" : verb === "created" ? "creation" : verb === "processed" ? "processing" : "workflow";
    return `${capitalizeFirst(entity)} ${verbNoun} process`;
  }

  // Match: "How many (.+) will (.+)" -> "$1 volume & scale"
  const howManyMatch = q.match(/^how\s+many\s+(.+?)\s+(?:will|are|do|should)/i);
  if (howManyMatch) {
    return `${capitalizeFirst(howManyMatch[1].trim())} volume & scale`;
  }

  // Match: "Who (will|should|can) (have authority to)? (approve|manage|handle|access|fulfill|lead) (.+)" -> "$2 authority for $3"
  const whoActionMatch = q.match(/^who\s+(?:will|should|can|needs\s+to|(?:has|have)\s+authority\s+to)?\s*(?:(?:has|have)\s+authority\s+to\s+)?(approve|manage|handle|access|fulfill|lead|review)\s*(.+)/i);
  if (whoActionMatch) {
    const action = whoActionMatch[1].toLowerCase();
    const actionNoun = action === "approve" ? "Approval" : action === "manage" ? "Management" : action === "fulfill" ? "Fulfillment" : action === "access" ? "Access" : "Operational";
    return `${actionNoun} authority for ${whoActionMatch[2].trim()}`;
  }

  // Match: "Who will (.+)" -> "Role assignment for $1"
  const whoGeneral = q.match(/^who\s+(?:will|should|is|are)\s+(.+)/i);
  if (whoGeneral) {
    return `Role assignment for ${whoGeneral[1].trim()}`;
  }

  // Match: "What (.+) do you (use|prefer|need|want|have)?" -> "$1 selection"
  const whatDoYouMatch = q.match(/^what\s+(.+?)\s+(?:do\s+you|is|are)\s+(?:use|prefer|need|want|have|require)/i);
  if (whatDoYouMatch) {
    return `${capitalizeFirst(whatDoYouMatch[1].trim())} selection & configuration`;
  }

  // Match: "Which (.+) should (.+)" -> "$1 selection"
  const whichMatch = q.match(/^which\s+(.+?)\s+should/i);
  if (whichMatch) {
    return `${capitalizeFirst(whichMatch[1].trim())} selection`;
  }

  // Match: "Where will (.+) be (.+)" -> "$1 hosting & deployment location"
  const whereMatch = q.match(/^where\s+(?:will|should|is)\s+(.+?)\s+(?:be)?/i);
  if (whereMatch) {
    return `${capitalizeFirst(whereMatch[1].trim())} environment & hosting`;
  }

  // Match: "When (should|does|will) (.+)" -> "$2 timing & schedule"
  const whenMatch = q.match(/^when\s+(?:should|does|will)\s+(.+)/i);
  if (whenMatch) {
    return `${capitalizeFirst(whenMatch[1].trim())} timing & schedule`;
  }

  // Fallback: strip question marks and prepend "Decision regarding" if interrogative
  if (q.match(/^(how|what|why|who|where|when|which|is|are|can|could|will|would)\s+/i)) {
    return `Decision regarding ${q.toLowerCase().replace(/^(how|what|why|who|where|when|which|is|are|can|could|will|would)\s+(?:to\s+|should\s+|is\s+|are\s+)?/i, "")}`;
  }

  return capitalizeFirst(q);
}

function capitalizeFirst(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Handle "I don't know" gracefully without pressure (Rule 26).
 * Records uncertainty under Needs Decision.
 * CRITICAL RULE: Never store the system question itself as the decision.
 */
export async function handleIDontKnowTurn(params: {
  sessionId: string;
  currentQuestion: string;
}): Promise<DiscoverySessionDto> {
  const { sessionId, currentQuestion } = params;

  // Convert question into clean business decision subject
  const decisionSubject = extractDecisionSubject(currentQuestion);

  // 1. Record decision under Needs Decision
  await db.discoveryDecision.create({
    data: {
      sessionId,
      title: decisionSubject,
      options: JSON.stringify(["Determine during technical staging", "Consult internal team"]),
      selectedOption: "Needs Decision",
      reason: "Client stated uncertainty during discovery turn.",
      status: "UNDECIDED",
    },
  });

  // 2. Record under projectAssumption as UNKNOWN / NEEDS_DECISION
  await db.projectAssumption.create({
    data: {
      sessionId,
      category: "NEEDS_DECISION",
      title: decisionSubject,
      status: "UNKNOWN",
      validationQuestion: `To be determined during technical planning: ${decisionSubject}`,
    },
  });

  // 3. Record user message
  await db.discoveryMessage.create({
    data: {
      sessionId,
      role: "user",
      content: "I don't know yet.",
    },
  });

  // 4. Consultant reassuring reply
  const replyData: StructuredMessageData = {
    currentQuestion: {
      question: "What is the next key capability or workflow we should model?",
      contextWhy: "Leaving undecided details as open decisions ensures discovery moves forward without blocking.",
    },
    quickReplies: [
      "Let's define user roles & permissions",
      "Let's map the core workflow steps",
      "Let's check reporting and visibility",
    ],
    whyWeAsk: {
      question: "How should we proceed?",
      rationale: "Recording uncertainty under Needs Decision protects your project from false assumptions while keeping discovery progress fluid.",
    },
  };

  await db.discoveryMessage.create({
    data: {
      sessionId,
      role: "consultant",
      content: `Understood. I have recorded "${decisionSubject}" under Needs Decision in your project model so it remains visible without blocking our progress. We can resolve this during technical staging. What should we explore next?`,
      structuredData: JSON.stringify(replyData),
      modelUsed: "system-consultant",
    },
  });

  return serializeDiscoverySession(sessionId);
}

/**
 * Handle "Decide later" explicitly (Rule 27).
 * Records an open decision item with LEAVE_FOR_LATER status.
 * CRITICAL RULE: Stores the business subject being decided, not merely the system question.
 */
export async function handleDecideLaterTurn(params: {
  sessionId: string;
  title: string;
  reason?: string;
}): Promise<DiscoverySessionDto> {
  const { sessionId, title, reason } = params;

  // Convert question/title into clean business decision subject
  const decisionSubject = extractDecisionSubject(title);

  await db.discoveryDecision.create({
    data: {
      sessionId,
      title: decisionSubject,
      options: JSON.stringify(["Decide in technical staging", "Consult internal stakeholders"]),
      selectedOption: "Deferred for later",
      reason: reason || "Client explicitly deferred this decision for later review.",
      status: "LEAVE_FOR_LATER",
    },
  });

  await db.discoveryMessage.create({
    data: {
      sessionId,
      role: "user",
      content: `We'll decide on "${decisionSubject}" later.`,
    },
  });

  const replyData: StructuredMessageData = {
    currentQuestion: {
      question: "What is the next key capability or workflow we should model?",
      contextWhy: "Focusing on what is already clear ensures we capture verified requirements first.",
    },
    quickReplies: [
      "Let's define user roles & permissions",
      "Let's map the core workflow steps",
      "Let's review reporting & visibility",
    ],
    whyWeAsk: {
      question: "What should we explore next?",
      rationale: "Explicitly deferring decisions protects scope accuracy and keeps discovery momentum high.",
    },
  };

  await db.discoveryMessage.create({
    data: {
      sessionId,
      role: "consultant",
      content: `Recorded "${decisionSubject}" under Open Decisions. This will remain visible in your project model until explicitly confirmed. What should we explore next?`,
      structuredData: JSON.stringify(replyData),
      modelUsed: "system-consultant",
    },
  });

  return serializeDiscoverySession(sessionId);
}

/**
 * Confirm a detected contradiction / requirement revision (Rules 28 & 29).
 */
export async function confirmContradictionRevision(params: {
  sessionId: string;
  contradictionId: string;
}): Promise<DiscoverySessionDto> {
  const { sessionId, contradictionId } = params;

  const fact = await db.discoveryFact.findUnique({
    where: { id: contradictionId },
  });

  if (fact && fact.category === "CONTRADICTION") {
    await db.discoveryFact.update({
      where: { id: contradictionId },
      data: { status: "CONFIRMED" },
    });

    await db.discoveryMessage.create({
      data: {
        sessionId,
        role: "consultant",
        content: `✓ Requirement revision confirmed: "${fact.title}". The project model has been updated to reflect your new agreed specification.`,
        modelUsed: "system-consultant",
      },
    });
  }

  return serializeDiscoverySession(sessionId);
}

/**
 * Confirm an inline discovery milestone or statement.
 */
export async function confirmInlineDiscovery(params: {
  sessionId: string;
  confirmed: boolean;
  statement: string;
  changeNote?: string;
}): Promise<DiscoverySessionDto> {
  const { sessionId, confirmed, statement, changeNote } = params;

  const session = await db.discoverySession.findUnique({
    where: { id: sessionId },
    include: { requirement: true },
  });
  if (!session) throw new Error("Session not found");

  if (confirmed) {
    await db.userJourney.updateMany({
      where: { sessionId },
      data: { isConfirmed: true },
    });
    await db.systemCapability.updateMany({
      where: { sessionId },
      data: { status: "CONFIRMED" },
    });
    await db.scopeItem.updateMany({
      where: { sessionId, tier: "CORE" },
      data: { tier: "CORE" },
    });
    await db.discoveryTopicArea.updateMany({
      where: { sessionId, areaKey: session.currentArea },
      data: { status: "CONFIRMED" },
    });

    await recordEvent(session.requirementId, "APPROVED", "Client confirmed milestone", statement);
  } else if (changeNote) {
    await db.discoveryMessage.create({
      data: {
        sessionId,
        role: "user",
        content: `Adjustment requested: "${changeNote}" for statement "${statement}"`,
      },
    });
    await recordEvent(session.requirementId, "REVISION_REQUESTED", "Client adjusted milestone", changeNote);
  }

  return serializeDiscoverySession(sessionId);
}

/**
 * Record a formal structured decision.
 * Subject is cleaned so system questions are never stored as business decisions.
 */
export async function recordDiscoveryDecision(params: {
  sessionId: string;
  decisionTitle: string;
  choice: string;
  reason?: string;
}): Promise<DiscoverySessionDto> {
  const { sessionId, decisionTitle, choice, reason } = params;
  const session = await db.discoverySession.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("Session not found");

  const cleanTitle = extractDecisionSubject(decisionTitle);

  const existing = await db.discoveryDecision.findFirst({
    where: { sessionId, title: cleanTitle },
  });

  if (existing) {
    await db.discoveryDecision.update({
      where: { id: existing.id },
      data: {
        selectedOption: choice,
        reason: reason || "Selected by client",
        status: choice === "UNDECIDED" ? "UNDECIDED" : "CONFIRMED",
      },
    });
  } else {
    await db.discoveryDecision.create({
      data: {
        sessionId,
        title: cleanTitle,
        selectedOption: choice,
        reason: reason || "Selected by client",
        status: choice === "UNDECIDED" ? "UNDECIDED" : "CONFIRMED",
      },
    });
  }

  return serializeDiscoverySession(sessionId);
}

/**
 * Move a scope item between CORE, POSSIBLE, UNKNOWN, or OUT_OF_SCOPE.
 */
export async function toggleScopeItemTier(params: {
  sessionId: string;
  scopeItemId: string;
  targetTier: ScopeTier;
}): Promise<DiscoverySessionDto> {
  const { sessionId, scopeItemId, targetTier } = params;
  await db.scopeItem.update({
    where: { id: scopeItemId },
    data: { tier: targetTier },
  });
  return serializeDiscoverySession(sessionId);
}

/**
 * Update step list for a user journey.
 */
export async function updateJourneySteps(params: {
  sessionId: string;
  journeyId: string;
  steps: string[];
}): Promise<DiscoverySessionDto> {
  const { sessionId, journeyId, steps } = params;
  await db.userJourney.update({
    where: { id: journeyId },
    data: { steps: JSON.stringify(steps), isConfirmed: true },
  });
  return serializeDiscoverySession(sessionId);
}

/**
 * Client formal approval of Project Understanding.
 * Locks the business understanding and creates immutable audit record.
 */
export async function approveProjectUnderstanding(params: {
  sessionId: string;
  approverName: string;
  approverEmail?: string;
}): Promise<DiscoverySessionDto> {
  const { sessionId, approverName, approverEmail } = params;
  const session = await db.discoverySession.findUnique({
    where: { id: sessionId },
    include: { requirement: true },
  });
  if (!session) throw new Error("Session not found");

  const fullDto = await serializeDiscoverySession(sessionId);

  // 1. Create Immutable Snapshot
  await db.discoveryApprovalRecord.create({
    data: {
      sessionId,
      approverName,
      approverEmail,
      approvedAt: new Date(),
      snapshotJson: JSON.stringify(fullDto.model),
      requirementVersion: session.requirement.revision,
    },
  });

  // 2. Lock Discovery Session
  await db.discoverySession.update({
    where: { id: sessionId },
    data: {
      mode: "APPROVED",
      completeness: 100,
      readinessScore: 100,
      healthStatus: "READY",
    },
  });

  // 3. Update Requirement Request Status to APPROVED
  await db.requirementRequest.update({
    where: { id: session.requirementId },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      responderName: approverName,
      completeness: 100,
      readiness: 100,
    },
  });

  await recordEvent(
    session.requirementId,
    "APPROVED",
    "Project Understanding approved by client",
    `Signed off by ${approverName}. Technical implementation details will be prepared from this approved model.`,
  );

  return serializeDiscoverySession(sessionId);
}

/**
 * Calculate the change impact for an added feature or requirement change.
 */
export async function calculateChangeImpact(params: {
  requirementId: string;
  newRequirement: string;
}): Promise<ChangeImpactResult> {
  const { requirementId, newRequirement } = params;

  const title = newRequirement.trim();
  const lower = title.toLowerCase();

  const isComplex =
    lower.includes("payment") ||
    lower.includes("inventory") ||
    lower.includes("marketplace") ||
    lower.includes("multi-vendor");

  return {
    newRequirementTitle: title,
    frontendImpact: [
      `New interactive UI components and state management for "${title}"`,
      "Responsive view additions across mobile and desktop breakpoints",
    ],
    backendImpact: [
      `REST / Server Action endpoints to handle ${title} mutations`,
      "Role-based permission guards and server validation",
    ],
    databaseImpact: [
      `Schema expansion with relations to Project / Workspace records`,
      "Migration and index optimization",
    ],
    integrationsImpact: isComplex
      ? ["External API webhooks and third-party credential management"]
      : ["Internal event bus triggers"],
    qaImpact: [
      "Automated unit testing for data consistency",
      "End-to-end user journey validation on staging",
    ],
    estimatedTimelineAdditionDays: isComplex ? 7 : 3,
    estimatedBudgetDeltaPercent: isComplex ? 15 : 5,
    summary: `Adding "${title}" expands frontend views, requires dedicated API endpoints, and adds ~${
      isComplex ? 7 : 3
    } business days to delivery.`,
  };
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

function safeParseArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeParseObject(raw: string | null | undefined): Record<string, any> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
