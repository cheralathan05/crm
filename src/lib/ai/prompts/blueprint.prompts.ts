/* ────────────────────────────────────────────────────────────────
   ENGINEERING BLUEPRINT PROMPTS
   Specialized prompts for each pipeline step in Ollama Orchestration.
   Enforces:
   - Complete traceability (REQ -> DLV -> AC -> FE -> BE -> DB -> QA)
   - Zero orphan technical objects
   - Explicit justification for every database entity and API endpoint
   - Clear distinction between EXPLICIT, INFERRED and ASSUMED concepts
──────────────────────────────────────────────────────────────── */

export function buildBlueprintSystemPrompt(): string {
  return `You are a Principal Product Architect, Staff Full-Stack Engineer, Database Architect, and AI Systems Engineer for Business OS.

Your mission is to transform APPROVED PROPOSALS AND BUSINESS REQUIREMENTS into a REAL, TRACEABLE, EXECUTABLE ENGINEERING BLUEPRINT across:
- Frontend (Pages, Components, API dependencies, State, Permissions)
- Backend (APIs, Services, Business Rules, DB dependencies, Events)
- Database (Entities, Tables, Attributes, Foreign Keys, Relations, Indexes, Constraints, Query Patterns, Migration Impact)
- Integrations (APIs, Webhooks, Protocols, Sync Modes)
- Security (Auth, RBAC, Encryption, Audit Policies)
- Testing (Unit, Integration, API, DB, E2E, UAT linked to Acceptance Criteria)
- Dependency Graph (Blocking relationships between layers)

CRITICAL OPERATIONAL RULES:
1. COMPLETE TRACEABILITY: Every Frontend capability, API, Database entity, and Test MUST explicitly state which REQ-xxx (and DLV-xxx) requirement created it.
2. NO ORPHAN CODE: Never invent arbitrary tables or endpoints that have no business justification.
3. DATABASE DEPTH: Explain why each entity exists, which APIs consume it, and its relational cardinality.
4. DEPENDENCY LOGIC: Database entities precede Backend APIs. Backend APIs precede Frontend UI. Everything is verified by Tests.
5. AMBIGUITY HANDLING: If a crucial technical decision (e.g. auth provider, billing model) is not in the scope, do NOT guess silently. Add a structured clarification item with its architectural impact.
6. OUTPUT FORMAT: Respond ONLY with valid, parseable JSON strictly conforming to the requested schema. No markdown wrapping outside the JSON object.`;
}

export function buildBlueprintUserPrompt(input: {
  projectTitle: string;
  projectDescription?: string;
  proposalReference?: string;
  budget?: number;
  currency?: string;
  scopeItems: Array<{
    id: string;
    category: string;
    title: string;
    detail: string;
    priority?: string;
    acceptanceCriteria?: string[];
  }>;
  deliverables?: Array<{
    title: string;
    description?: string;
    acceptanceCriteria?: string[];
  }>;
}): string {
  const scopeSummary = input.scopeItems
    .map((s, idx) => {
      const reqId = `REQ-${String(idx + 1).padStart(3, "0")}`;
      const acList = (s.acceptanceCriteria || [])
        .map((ac, acIdx) => `    - AC-${String(idx + 1).padStart(3, "0")}.${acIdx + 1}: ${ac}`)
        .join("\n");
      return `Requirement ID: ${reqId}\nTitle: ${s.title}\nCategory: ${s.category}\nPriority: ${s.priority || "HIGH"}\nDetail: ${s.detail}\nAcceptance Criteria:\n${acList || "    - Standard verification"}`;
    })
    .join("\n\n");

  const deliverableSummary = (input.deliverables || [])
    .map((d, idx) => `DLV-${String(idx + 1).padStart(3, "0")}: ${d.title} — ${d.description || ""}`)
    .join("\n");

  return `Generate a comprehensive, fully-realized Engineering Blueprint for the following approved project.

PROJECT CONTEXT:
Title: ${input.projectTitle}
Description: ${input.projectDescription || "Client Delivery Project"}
Proposal Reference: ${input.proposalReference || "APPROVED_PROPOSAL"}
Budget: ${input.currency || "INR"} ${input.budget || 0}

APPROVED BUSINESS REQUIREMENTS & ACCEPTANCE CRITERIA:
${scopeSummary}

APPROVED DELIVERABLES:
${deliverableSummary || "Standard Engineering Deliverables"}

INSTRUCTIONS:
Return a JSON object conforming strictly to this structure:
{
  "summary": "Brief executive architectural summary",
  "architectureOverview": "High level system structure description",
  "requirements": [
    {
      "id": "REQ-001",
      "title": "...",
      "description": "...",
      "category": "...",
      "priority": "HIGH",
      "deliverables": ["DLV-001"],
      "acceptanceCriteria": [
        { "id": "AC-001", "criterion": "...", "verificationType": "API_TEST" }
      ]
    }
  ],
  "frontend": [
    {
      "name": "...",
      "type": "PAGE",
      "route": "/...",
      "description": "...",
      "requirementId": "REQ-001",
      "deliverableId": "DLV-001",
      "acceptanceCriterionId": "AC-001",
      "components": ["ComponentA", "ComponentB"],
      "apiDependencies": ["GET /api/v1/...", "POST /api/v1/..."],
      "stateDependencies": ["userSession", "..."],
      "permissionRequirements": ["AUTHENTICATED_USER"],
      "confidence": "HIGH",
      "reason": "Directly implements REQ-001 user interaction"
    }
  ],
  "backendApis": [
    {
      "method": "POST",
      "path": "/api/v1/...",
      "version": "v1",
      "purpose": "...",
      "requirementId": "REQ-001",
      "deliverableId": "DLV-001",
      "acceptanceCriterionId": "AC-001",
      "requestSchema": {},
      "responseSchema": {},
      "errorSchema": {},
      "authentication": true,
      "authorization": "OWNER | ADMIN",
      "service": "Service.method",
      "databaseDependencies": ["EntityName"],
      "events": ["entity.created"],
      "testCoverage": ["test_entity_creation"],
      "confidence": "HIGH",
      "reason": "Processes REQ-001 state modifications"
    }
  ],
  "backendServices": [
    {
      "name": "Service",
      "description": "...",
      "requirementId": "REQ-001",
      "methods": [{ "name": "create", "parameters": ["data"], "returnType": "Promise<Entity>", "description": "..." }],
      "businessRules": ["Rule 1", "Rule 2"],
      "events": ["event.name"],
      "confidence": "HIGH",
      "reason": "Encapsulates business rules for REQ-001"
    }
  ],
  "database": [
    {
      "name": "EntityName",
      "tableName": "entity_names",
      "purpose": "Stores core domain data for REQ-001",
      "technicalReason": "Needed to persist REQ-001 transactions with ACID compliance",
      "requirementId": "REQ-001",
      "deliverableId": "DLV-001",
      "fields": [
        { "name": "id", "type": "String", "isPk": true, "isFk": false, "isNullable": false, "isUnique": true, "description": "Primary key cuid" },
        { "name": "createdAt", "type": "DateTime", "isPk": false, "isFk": false, "isNullable": false, "isUnique": false, "default": "now()" }
      ],
      "relationships": [],
      "indexes": ["id"],
      "constraints": ["id PRIMARY KEY"],
      "queryPatterns": ["SELECT by id"],
      "migrationImpact": "LOW - new table creation",
      "confidence": "HIGH",
      "reason": "Primary storage for REQ-001"
    }
  ],
  "integrations": [],
  "security": [
    {
      "name": "Role-Based Access Control",
      "category": "AUTHORIZATION",
      "description": "Enforce project and workspace ownership guards",
      "authorizationRules": ["Admin full access", "Member read-only access"],
      "confidence": "HIGH",
      "reason": "Security baseline"
    }
  ],
  "testing": [
    {
      "name": "Entity API & Integration Test",
      "testType": "INTEGRATION",
      "description": "Verifies endpoint handling and database persistence",
      "requirementId": "REQ-001",
      "deliverableId": "DLV-001",
      "acceptanceCriterionId": "AC-001",
      "setupSteps": ["Seed test client"],
      "executionSteps": ["Execute POST /api/v1/..."],
      "expectedOutcome": "Status 201 with created record",
      "confidence": "HIGH",
      "reason": "Proves AC-001"
    }
  ],
  "dependencies": [
    {
      "sourceLayer": "DATABASE",
      "sourceName": "EntityName",
      "targetLayer": "BACKEND",
      "targetName": "POST /api/v1/...",
      "dependencyType": "BLOCKS",
      "isBlocking": true,
      "reason": "Database schema must exist before API can execute queries"
    }
  ],
  "clarifications": [],
  "confidence": "HIGH",
  "technicalReasoning": "System decomposed from approved proposal scope items."
}`;
}

export function buildWorkPlanPrompt(params: {
  projectTitle: string;
  blueprint: {
    frontend: any[];
    backendApis: any[];
    database: any[];
    testing: any[];
    dependencies: any[];
  };
}): string {
  return `You are a Principal Technical Project Lead. Convert the approved Engineering Blueprint into an executable Engineering Work Plan.

PROJECT: ${params.projectTitle}

APPROVED BLUEPRINT ASSETS:
- Database Entities: ${params.blueprint.database.map((d: any) => `${d.name} (${d.requirementId || "REQ"})`).join(", ")}
- Backend APIs: ${params.blueprint.backendApis.map((b: any) => `${b.method} ${b.path} (${b.requirementId || "REQ"})`).join(", ")}
- Frontend Capabilities: ${params.blueprint.frontend.map((f: any) => `${f.name} ${f.route || ""} (${f.requirementId || "REQ"})`).join(", ")}
- Testing Specs: ${params.blueprint.testing.map((t: any) => `${t.name} (${t.requirementId || "REQ"})`).join(", ")}

RULES:
1. Every work item MUST have a clear layer: DATABASE, BACKEND, FRONTEND, INTEGRATION, SECURITY, TESTING, or DEPLOYMENT.
2. Every work item MUST link to a valid requirementId (e.g. REQ-001).
3. Dependencies between work items must be logical (e.g. DB items block BE items, BE items block FE items).
4. Provide workIds like DB-001, BE-001, FE-001, QA-001.

Return ONLY a valid JSON object matching:
{
  "planSummary": "...",
  "totalEstimatedHours": 40,
  "executionPhases": [
    { "phaseName": "Phase 1: Foundation & Data Architecture", "description": "...", "workIds": ["DB-001", "BE-001"] }
  ],
  "workItems": [
    {
      "workId": "DB-001",
      "title": "Create Entity schema and migrations",
      "description": "Define Prisma model, indexes, and relations",
      "layer": "DATABASE",
      "requirementId": "REQ-001",
      "dependencies": [],
      "estimatedHours": 4,
      "priority": "HIGH",
      "expectedResult": "Schema validated and migrated in database",
      "suggestedRole": "Database Architect"
    }
  ]
}`;
}
