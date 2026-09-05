import { z } from "zod";

/* ────────────────────────────────────────────────────────────────
   ZOD VALIDATION SCHEMAS FOR ENGINEERING BLUEPRINT
   Enforces strict typed contracts for all Ollama outputs.
   Never stores arbitrary or unvalidated AI text.
──────────────────────────────────────────────────────────────── */

export const ConfidenceLevelSchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
export const AssumptionTypeSchema = z.enum(["EXPLICIT", "INFERRED", "ASSUMED"]);

// 1. Normalized Requirement
export const NormalizedRequirementSchema = z.object({
  id: z.string().describe("e.g. REQ-001"),
  title: z.string(),
  description: z.string(),
  category: z.string().default("FUNCTIONAL"),
  priority: z.enum(["MUST_HAVE", "SHOULD_HAVE", "NICE_TO_HAVE", "HIGH", "MEDIUM", "LOW"]).default("HIGH"),
  deliverables: z.array(z.string()).default([]),
  acceptanceCriteria: z.array(
    z.object({
      id: z.string().describe("e.g. AC-001"),
      criterion: z.string(),
      verificationType: z.string().default("AUTOMATED_TEST"),
    }),
  ),
  sourceSection: z.string().optional(),
  sourceText: z.string().optional(),
});

// 2. Frontend Capability Schema
export const FrontendCapabilityItemSchema = z.object({
  name: z.string(),
  type: z.enum(["PAGE", "COMPONENT", "FORM", "TABLE", "DIALOG", "DRAWER"]).default("PAGE"),
  route: z.string().optional(),
  description: z.string(),
  requirementId: z.string().describe("Linked REQ-xxx ID"),
  deliverableId: z.string().optional(),
  acceptanceCriterionId: z.string().optional(),
  components: z.array(z.string()).default([]),
  apiDependencies: z.array(z.string()).default([]),
  stateDependencies: z.array(z.string()).default([]),
  permissionRequirements: z.array(z.string()).default([]),
  confidence: ConfidenceLevelSchema.default("HIGH"),
  reason: z.string(),
});

// 3. Backend API Contract Schema
export const BackendApiItemSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z.string().describe("e.g. /api/v1/workspaces"),
  version: z.string().default("v1"),
  purpose: z.string(),
  requirementId: z.string().describe("Linked REQ-xxx ID"),
  deliverableId: z.string().optional(),
  acceptanceCriterionId: z.string().optional(),
  requestSchema: z.record(z.string(), z.any()).default({}),
  responseSchema: z.record(z.string(), z.any()).default({}),
  errorSchema: z.record(z.string(), z.any()).default({}),
  authentication: z.boolean().default(true),
  authorization: z.string().default("AUTHENTICATED_USER"),
  rateLimits: z.string().optional(),
  service: z.string().describe("e.g. WorkspaceService.create"),
  databaseDependencies: z.array(z.string()).default([]),
  events: z.array(z.string()).default([]),
  testCoverage: z.array(z.string()).default([]),
  confidence: ConfidenceLevelSchema.default("HIGH"),
  reason: z.string(),
});

// 4. Backend Service Schema
export const BackendServiceItemSchema = z.object({
  name: z.string().describe("e.g. WorkspaceService"),
  description: z.string(),
  requirementId: z.string().optional(),
  methods: z.array(
    z.object({
      name: z.string(),
      parameters: z.array(z.string()).default([]),
      returnType: z.string(),
      description: z.string(),
    }),
  ).default([]),
  businessRules: z.array(z.string()).default([]),
  events: z.array(z.string()).default([]),
  confidence: ConfidenceLevelSchema.default("HIGH"),
  reason: z.string(),
});

// 5. Database Entity Schema
export const DatabaseEntityItemSchema = z.object({
  name: z.string().describe("e.g. Workspace"),
  tableName: z.string().describe("e.g. workspaces"),
  purpose: z.string().describe("Why does this entity exist?"),
  technicalReason: z.string().describe("Which requirement/deliverable created it"),
  requirementId: z.string().describe("Linked REQ-xxx ID"),
  deliverableId: z.string().optional(),
  fields: z.array(
    z.object({
      name: z.string(),
      type: z.string().describe("e.g. String, Int, DateTime, Boolean, Json"),
      isPk: z.boolean().default(false),
      isFk: z.boolean().default(false),
      fkTarget: z.string().optional(),
      isNullable: z.boolean().default(false),
      isUnique: z.boolean().default(false),
      default: z.string().optional(),
      description: z.string().optional(),
    }),
  ),
  relationships: z.array(
    z.object({
      type: z.enum(["ONE_TO_ONE", "ONE_TO_MANY", "MANY_TO_ONE", "MANY_TO_MANY"]).default("MANY_TO_ONE"),
      targetEntity: z.string(),
      foreignKey: z.string().optional(),
      cardinality: z.string().default("1:N"),
    }),
  ).default([]),
  indexes: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  queryPatterns: z.array(z.string()).default([]),
  migrationImpact: z.string().optional(),
  confidence: ConfidenceLevelSchema.default("HIGH"),
  reason: z.string(),
});

// 6. Integration Schema
export const IntegrationItemSchema = z.object({
  name: z.string(),
  type: z.enum(["REST", "GRAPHQL", "WEBHOOK", "GRPC", "SDK", "SMTP", "OAUTH"]).default("REST"),
  provider: z.string().optional(),
  direction: z.enum(["INBOUND", "OUTBOUND", "BIDIRECTIONAL"]).default("OUTBOUND"),
  authType: z.enum(["API_KEY", "OAUTH2", "BASIC", "JWT", "NONE"]).default("API_KEY"),
  payloadFormat: z.string().default("JSON"),
  syncMode: z.enum(["SYNC", "ASYNC", "EVENT_DRIVEN"]).default("ASYNC"),
  errorStrategy: z.string().default("RETRY_WITH_EXPONENTIAL_BACKOFF"),
  requirementId: z.string().optional(),
  confidence: ConfidenceLevelSchema.default("HIGH"),
  reason: z.string(),
});

// 7. Security Requirement Schema
export const SecurityItemSchema = z.object({
  name: z.string(),
  category: z.enum(["AUTHENTICATION", "AUTHORIZATION", "DATA_PROTECTION", "AUDIT", "RATE_LIMITING", "ENCRYPTION"]).default("AUTHORIZATION"),
  description: z.string(),
  authenticationMechanism: z.string().optional(),
  authorizationRules: z.array(z.string()).default([]),
  dataProtection: z.string().optional(),
  auditPolicy: z.string().optional(),
  requirementId: z.string().optional(),
  confidence: ConfidenceLevelSchema.default("HIGH"),
  reason: z.string(),
});

// 8. Test Specification Schema
export const TestSpecificationItemSchema = z.object({
  name: z.string(),
  testType: z.enum(["UNIT", "INTEGRATION", "API", "DATABASE", "AUTHORIZATION", "E2E", "SECURITY", "PERFORMANCE", "UAT"]).default("API"),
  description: z.string(),
  requirementId: z.string().describe("Linked REQ-xxx ID"),
  deliverableId: z.string().optional(),
  acceptanceCriterionId: z.string().optional(),
  setupSteps: z.array(z.string()).default([]),
  executionSteps: z.array(z.string()).default([]),
  expectedOutcome: z.string(),
  confidence: ConfidenceLevelSchema.default("HIGH"),
  reason: z.string(),
});

// 9. Dependency Schema
export const DependencyItemSchema = z.object({
  sourceLayer: z.enum(["DATABASE", "BACKEND", "FRONTEND", "TESTING", "INTEGRATION", "SECURITY", "DEPLOYMENT"]),
  sourceName: z.string(),
  targetLayer: z.enum(["DATABASE", "BACKEND", "FRONTEND", "TESTING", "INTEGRATION", "SECURITY", "DEPLOYMENT"]),
  targetName: z.string(),
  dependencyType: z.enum(["BLOCKS", "REQUIRED_BY", "VERIFIES"]).default("BLOCKS"),
  isBlocking: z.boolean().default(true),
  reason: z.string(),
});

// 10. Clarification & Assumption Schema
export const ClarificationItemSchema = z.object({
  question: z.string(),
  sourceRequirementId: z.string().optional(),
  impact: z.array(z.string()).default(["Frontend", "Backend", "Database"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "BLOCKING"]).default("MEDIUM"),
  whyItMatters: z.string(),
});

// Complete Engineering Blueprint Generation Output Schema
export const EngineeringBlueprintOutputSchema = z.object({
  summary: z.string(),
  architectureOverview: z.string(),
  requirements: z.array(NormalizedRequirementSchema),
  frontend: z.array(FrontendCapabilityItemSchema),
  backendApis: z.array(BackendApiItemSchema),
  backendServices: z.array(BackendServiceItemSchema),
  database: z.array(DatabaseEntityItemSchema),
  integrations: z.array(IntegrationItemSchema).default([]),
  security: z.array(SecurityItemSchema).default([]),
  testing: z.array(TestSpecificationItemSchema),
  dependencies: z.array(DependencyItemSchema),
  clarifications: z.array(ClarificationItemSchema).default([]),
  confidence: ConfidenceLevelSchema.default("HIGH"),
  technicalReasoning: z.string(),
});

// Work Plan Generation Schema
export const ProposedWorkItemSchema = z.object({
  workId: z.string().describe("e.g. DB-001, BE-001, FE-001, QA-001"),
  title: z.string(),
  description: z.string(),
  layer: z.enum(["DATABASE", "BACKEND", "FRONTEND", "INTEGRATION", "SECURITY", "TESTING", "DEPLOYMENT"]),
  requirementId: z.string().describe("Must link to REQ-xxx"),
  deliverableId: z.string().optional(),
  acceptanceCriterionId: z.string().optional(),
  dependencies: z.array(z.string()).default([]).describe("List of workIds or entity names that block this item"),
  estimatedHours: z.number().default(4),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  expectedResult: z.string(),
  suggestedRole: z.string().default("Full Stack Engineer"),
});

export const ProposedWorkPlanOutputSchema = z.object({
  planSummary: z.string(),
  totalEstimatedHours: z.number(),
  executionPhases: z.array(
    z.object({
      phaseName: z.string(),
      description: z.string(),
      workIds: z.array(z.string()),
    }),
  ),
  workItems: z.array(ProposedWorkItemSchema),
});

export type EngineeringBlueprintOutput = z.infer<typeof EngineeringBlueprintOutputSchema>;
export type ProposedWorkPlanOutput = z.infer<typeof ProposedWorkPlanOutputSchema>;
export type ProposedWorkItem = z.infer<typeof ProposedWorkItemSchema>;
