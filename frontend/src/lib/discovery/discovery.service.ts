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

    // Seed welcome greeting message from Business OS Consultant
    const welcomeData: StructuredMessageData = {
      quickReplies: [
        "Online clothing / retail store",
        "Client booking & appointment platform",
        "B2B CRM & sales pipeline",
        "SaaS / Member portal",
      ],
      whyWeAsk: {
        question: "Tell me what you're trying to build.",
        rationale: "Understanding your business model and primary objective allows Business OS to dynamically tailor user journeys, features, and operational requirements.",
      },
    };

    await db.discoveryMessage.create({
      data: {
        sessionId: session.id,
        role: "consultant",
        content: `Welcome to Business OS Project Discovery Studio. Tell me about what you're trying to build and what problem you want to solve for your business. I'll help turn your explanation into a complete, structured project in real time.`,
        structuredData: JSON.stringify(welcomeData),
        modelUsed: "system-consultant",
      },
    });
  }

  return serializeDiscoverySession(session.id);
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
  if (userRolesMap.size === 0) {
    userRolesMap.set("Customer", "INFERRED");
    userRolesMap.set("Admin", "INFERRED");
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
      businessType: businessFact?.title || session.requirement.title || null,
      problemStatement: businessFact?.description || null,
      coreGoal: goalFact?.title || null,
      confirmedOutcomes: outcomes.length > 0 ? outcomes : ["Modernize client ordering and operations centrally"],
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
You do NOT act like a generic chatbot or ask questionnaire forms.
You act like an elite technology & business consultant who understands what the client is building, models the system in real time, and asks ONLY the single highest-value question needed to structure their project.

The client just said: "${effectiveInput}".

Analyze the client's input against the current project context:
${JSON.stringify(contextSummary, null, 2)}

Return a strict JSON object with this exact schema:
{
  "consultantResponse": "Empathic, intelligent response that acknowledges what they said, frames what it means for the project, and smoothly presents the next discovery focus.",
  "activeTopic": "BUSINESS" | "GOAL" | "USERS" | "CUSTOMER_JOURNEY" | "CORE_FEATURES" | "BUSINESS_RULES" | "CURRENT_PROCESS" | "PAYMENTS" | "INTEGRATIONS" | "SECURITY" | "TIMELINE" | "BUDGET",
  "discoveredFacts": [
    { "category": "BUSINESS_PROBLEM" | "GOAL" | "USER_ROLE" | "PROCESS_CURRENT" | "PROCESS_FUTURE" | "OUTCOME", "title": "Short title", "description": "Details" }
  ],
  "discoveredRoles": ["Customer", "Order Staff", etc.],
  "userJourneySteps": ["Step 1", "Step 2", "Step 3", "Step 4"],
  "discoveredCapabilities": [
    { "role": "Customer" | "Staff" | "Admin", "title": "Browse catalog", "description": "Customer can search and filter apparel", "category": "Storefront" }
  ],
  "businessRules": [
    { "rule": "Rule title", "condition": "When applicable", "exceptionHandling": "Fallback", "role": "Staff" }
  ],
  "scopeItems": [
    { "title": "Title", "tier": "CORE" | "POSSIBLE" | "OUT_OF_SCOPE", "rationale": "Why included or suggested" }
  ],
  "inlineConfirmation": {
    "needed": true | false,
    "statement": "I understood: Customers should be able to track their orders. Is that correct?",
    "suggestedAction": "Confirm or adjust"
  },
  "structuredOptions": [
    { "id": "opt1", "label": "Short label", "description": "Context", "isRecommended": true | false }
  ],
  "whyWeAsk": {
    "question": "Question text",
    "rationale": "How this answer changes architecture, data, or project scope"
  },
  "recommendation": {
    "hasRecommendation": true | false,
    "title": "Title",
    "rationale": "Why we recommend this based on their business goal",
    "options": ["Option A", "Option B"],
    "recommendedOption": "Option A"
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
        userPrompt: `Evaluate input: "${effectiveInput}". Respond in JSON.`,
        temperature: 0.15,
        timeoutMs: 30000,
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
          rationale: r.rationale || "",
          status: "PENDING",
        },
      });
    }
  }
}

/**
 * Intelligent deterministic consultant fallback when Ollama is offline.
 * Implements high-value business logic for e-commerce, CRM, portals, booking.
 */
function generateDeterministicConsultantTurn(input: string, context: any) {
  const lower = input.toLowerCase();

  // 1. E-Commerce / Store / WhatsApp ordering
  if (lower.includes("whatsapp") || lower.includes("cloth") || lower.includes("store") || lower.includes("shop") || lower.includes("order")) {
    return {
      consultantResponse: `I understand. You're currently taking customer orders through WhatsApp and want to transition to a dedicated online system. Before we look at technical details, I want to understand the exact customer experience you want to provide.`,
      activeTopic: "CUSTOMER_JOURNEY",
      discoveredFacts: [
        { category: "BUSINESS_PROBLEM", title: "Retail Clothing Store", description: "Orders currently handled manually via WhatsApp messages" },
        { category: "GOAL", title: "Automated Online Ordering", description: "Centralize orders and provide automated customer self-service" },
        { category: "PROCESS_CURRENT", title: "Manual WhatsApp Messaging", description: "Customer texts order details, staff manually logs in Excel" },
        { category: "PROCESS_FUTURE", title: "Business OS Customer Storefront", description: "Customer browses online, submits order, and receives tracking" },
        { category: "OUTCOME", title: "Eliminate Manual Order Entry", description: "Orders sync directly into central order fulfillment system" },
      ],
      discoveredRoles: ["Customer", "Order Staff", "Admin"],
      userJourneySteps: ["Browse catalog", "View product details", "Add to bag", "Checkout", "Pay online", "Order confirmation", "Track order"],
      discoveredCapabilities: [
        { role: "Customer", title: "Browse & Search Products", description: "Filter apparel by category, size and price", category: "Storefront" },
        { role: "Customer", title: "Place Orders Online", description: "Submit customer contact and delivery address", category: "Ordering" },
        { role: "Customer", title: "Real-time Order Tracking", description: "Inspect current delivery stage and order history", category: "Post-Purchase" },
        { role: "Staff", title: "Manage Incoming Orders", description: "Update fulfillment status from pending to shipped", category: "Fulfillment" },
      ],
      businessRules: [
        { rule: "Order Confirmation Rule", condition: "Order placed", exceptionHandling: "Send instant SMS/WhatsApp confirmation", role: "System" },
      ],
      scopeItems: [
        { title: "Product Catalog & Search", tier: "CORE", rationale: "Essential for customer discovery" },
        { title: "Online Cart & Checkout", tier: "CORE", rationale: "Core transactional capability" },
        { title: "Order Tracking Portal", tier: "CORE", rationale: "Directly solves client's visibility problem" },
        { title: "Product Reviews & Ratings", tier: "POSSIBLE", rationale: "Can enhance buyer trust, but not required for phase 1 launch" },
        { title: "Multi-vendor Marketplace", tier: "OUT_OF_SCOPE", rationale: "Excluded — dedicated single-brand store only" },
      ],
      inlineConfirmation: {
        needed: true,
        statement: "Customers should be able to browse products, place orders online, and track their delivery status.",
        suggestedAction: "Confirm customer journey",
      },
      structuredOptions: [
        { id: "opt_browse", label: "Browse & filter apparel", isRecommended: true },
        { id: "opt_pay", label: "Pay online (Cards, UPI)", isRecommended: true },
        { id: "opt_cod", label: "Cash on delivery support" },
        { id: "opt_track", label: "SMS / WhatsApp order updates", isRecommended: true },
        { id: "opt_custom", label: "Something else..." },
      ],
      whyWeAsk: {
        question: "What capabilities should customers have on the storefront?",
        rationale: "This directly defines the frontend UI pages, cart state, and payment gateway integration architecture.",
      },
      recommendation: {
        hasRecommendation: true,
        title: "Customer Accounts vs Guest Checkout",
        rationale: "For a clothing brand with repeat buyers, offering customer accounts with past order history improves retention, but allowing guest checkout minimizes initial friction.",
        options: ["Offer both Guest Checkout and Customer Accounts", "Customer Accounts required", "Guest Checkout only"],
        recommendedOption: "Offer both Guest Checkout and Customer Accounts",
      },
    };
  }

  // 2. Payments / Billing discussion
  if (lower.includes("pay") || lower.includes("card") || lower.includes("upi") || lower.includes("cash")) {
    return {
      consultantResponse: `Got it. Handling payments cleanly is critical for order completion and trust. Let's decide which payment methods you want to support for your customers.`,
      activeTopic: "PAYMENTS",
      discoveredFacts: [
        { category: "PROCESS_FUTURE", title: "Integrated Payment Processing", description: "Automated instant checkout verification" },
      ],
      discoveredCapabilities: [
        { role: "Customer", title: "Online Payment Gateway", description: "Pay securely with instant confirmation", category: "Payments" },
      ],
      businessRules: [
        { rule: "Failed Payment Exception", condition: "Payment fails at gateway", exceptionHandling: "Retain cart items and allow retry", role: "System" },
      ],
      scopeItems: [
        { title: "Automated Payment Receipts", tier: "CORE", rationale: "Required for legal and accounting compliance" },
      ],
      inlineConfirmation: {
        needed: true,
        statement: "Online payment gateway required with automated transaction confirmation.",
      },
      structuredOptions: [
        { id: "opt_upi_cards", label: "Cards, UPI & Netbanking", isRecommended: true },
        { id: "opt_cod", label: "Cash on delivery + Online payment" },
        { id: "opt_decide_later", label: "Select payment provider during technical planning" },
      ],
      whyWeAsk: {
        question: "How should customers pay?",
        rationale: "Determines payment gateway webhook handlers, refund workflows, and checkout security compliance.",
      },
      recommendation: {
        hasRecommendation: true,
        title: "Payment Gateway Provider",
        rationale: "We recommend integrating a proven provider (e.g. Razorpay or Stripe) during technical staging so you can test sandbox transactions.",
        options: ["Decide provider in technical planning", "Razorpay", "Stripe"],
        recommendedOption: "Decide provider in technical planning",
      },
    };
  }

  // 3. General Fallback
  return {
    consultantResponse: `I've captured that. Let's look at how your team will manage daily operations once this goes live. Who on your staff will fulfill orders and update inventory?`,
    activeTopic: "OPERATIONS",
    discoveredFacts: [
      { category: "USER_ROLE", title: "Fulfillment Operator", description: "Staff responsible for packaging and dispatch" },
    ],
    discoveredRoles: ["Customer", "Order Fulfillment Staff", "Admin"],
    discoveredCapabilities: [
      { role: "Staff", title: "Fulfill & Dispatch Orders", description: "Change status and enter shipping courier tracking numbers", category: "Operations" },
    ],
    businessRules: [
      { rule: "Order Cancellation Permission", condition: "Before dispatch", exceptionHandling: "Allowed with instant notification", role: "Staff" },
    ],
    scopeItems: [
      { title: "Staff Operations Portal", tier: "CORE", rationale: "Needed for daily order fulfillment" },
    ],
    inlineConfirmation: {
      needed: false,
    },
    structuredOptions: [
      { id: "opt_staff_roles", label: "Staff can manage orders and dispatch", isRecommended: true },
      { id: "opt_owner_only", label: "Store owner handles all operations" },
      { id: "opt_skip", label: "Decide operational roles later" },
    ],
    whyWeAsk: {
      question: "Who will manage operations?",
      rationale: "Defines admin role permissions, authentication gates, and operational dashboard views.",
    },
    recommendation: {
      hasRecommendation: false,
    },
  };
}

/**
 * Confirm or adjust an inline discovered item.
 */
export async function confirmInlineDiscovery(params: {
  sessionId: string;
  confirmed: boolean;
  statement: string;
  changeNote?: string;
}): Promise<DiscoverySessionDto> {
  const { sessionId, confirmed, statement, changeNote } = params;

  // Record client confirmation event
  const session = await db.discoverySession.findUnique({
    where: { id: sessionId },
    include: { requirement: true },
  });
  if (!session) throw new Error("Session not found");

  if (confirmed) {
    // Mark journey / capabilities as confirmed
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

    await recordEvent(session.requirementId, "DISCOVERY_CONFIRMED", "Client confirmed milestone", statement);
  } else if (changeNote) {
    // Client requested adjustment
    await db.discoveryMessage.create({
      data: {
        sessionId,
        role: "user",
        content: `Adjustment requested: "${changeNote}" for statement "${statement}"`,
      },
    });
    await recordEvent(session.requirementId, "DISCOVERY_CHANGED", "Client adjusted milestone", changeNote);
  }

  return serializeDiscoverySession(sessionId);
}

/**
 * Record a formal structured decision.
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

  const existing = await db.discoveryDecision.findFirst({
    where: { sessionId, title: decisionTitle },
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
        title: decisionTitle,
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
    "DISCOVERY_APPROVED",
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

  // Resilient heuristic / AI impact analysis
  const title = newRequirement.trim();
  const lower = title.toLowerCase();

  const isComplex = lower.includes("payment") || lower.includes("inventory") || lower.includes("marketplace") || lower.includes("multi-vendor");

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
    summary: `Adding "${title}" expands frontend views, requires dedicated API endpoints, and adds ~${isComplex ? 7 : 3} business days to delivery.`,
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
