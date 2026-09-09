/* ────────────────────────────────────────────────────────────────────────────
   BUSINESS OS INTELLIGENT PROJECT DISCOVERY STUDIO — TYPES
   ──────────────────────────────────────────────────────────────────────────── */

export type DiscoveryIntakePath = "TECHNICAL" | "GUIDED";

export type DiscoveryMode = "DISCOVERY" | "REVIEW" | "APPROVED";

export type DiscoveryHealth = "READY" | "NEEDS_CLARIFICATION" | "MISSING_CRITICAL_INFO";

export type TopicAreaKey =
  | "PROJECT"
  | "BUSINESS"
  | "GOAL"
  | "USERS"
  | "CUSTOMER_JOURNEY"
  | "CORE_FEATURES"
  | "BUSINESS_RULES"
  | "CURRENT_PROCESS"
  | "INTEGRATIONS"
  | "CONTENT"
  | "DESIGN"
  | "PAYMENTS"
  | "SECURITY"
  | "OPERATIONS"
  | "TIMELINE"
  | "BUDGET"
  | "FINAL_REVIEW";

export type TopicAreaStatus =
  | "CONFIRMED"
  | "INFERRED"
  | "NEEDS_CLARIFICATION"
  | "NOT_DISCUSSED"
  | "NOT_APPLICABLE";

export interface TopicAreaItem {
  key: TopicAreaKey;
  label: string;
  status: TopicAreaStatus;
  order: number;
  summary?: string;
}

export type ScopeTier = "CORE" | "POSSIBLE" | "UNKNOWN" | "OUT_OF_SCOPE";

export interface ScopeItemData {
  id: string;
  title: string;
  description: string;
  tier: ScopeTier;
  rationale?: string | null;
  impact?: string | null;
}

export interface StructuredOption {
  id: string;
  label: string;
  description?: string;
  isRecommended?: boolean;
}

export interface InlineConfirmationData {
  id: string;
  statement: string;
  sourceContext: string;
  status: "PENDING" | "CONFIRMED" | "CHANGED";
  suggestedAction?: string;
}

export interface WhyWeAskData {
  question: string;
  rationale: string;
}

export interface IDontKnowAction {
  helpMeDecide?: {
    recommendationTitle: string;
    rationale: string;
    options: string[];
  };
  leaveUndecidedAllowed?: boolean;
  canSkip?: boolean;
}

export interface ContradictionNotice {
  id: string;
  topic: string;
  previousUnderstanding: string;
  newUnderstanding: string;
  whatChanged: string;
  status: "DETECTED" | "CONFIRMED";
}

export interface InformationRecordItem {
  id: string;
  name: string;
  description: string;
  status: "CONFIRMED" | "INFERRED";
}

export interface ReportingVisibilityItem {
  id: string;
  audience: "Management" | "Staff" | "Customer" | string;
  whatTheySee: string;
  decisionSupported?: string;
}

export interface ExistingToolItem {
  id: string;
  toolName: string;
  currentUse: string;
  disposition: "REPLACE" | "KEEP" | "INTEGRATE";
  migrationNeeded: boolean;
}

export interface SystemConnectionItem {
  id: string;
  systemName: string;
  reason: string;
  dataFlow: string;
  failureHandling?: string;
}

export type CoverageStatus = "COMPLETE" | "IN_PROGRESS" | "NEEDS_REVIEW" | "NOT_YET_DISCUSSED" | "NOT_APPLICABLE";

export interface DiscoveryCoverageItem {
  dimensionKey: string;
  label: string;
  status: CoverageStatus;
  summary: string;
}

export interface StructuredMessageData {
  currentQuestion?: {
    question: string;
    contextWhy: string;
  };
  options?: StructuredOption[];
  allowCustomInput?: boolean;
  inlineConfirmation?: InlineConfirmationData;
  whyWeAsk?: WhyWeAskData;
  iDontKnow?: IDontKnowAction;
  contradiction?: ContradictionNotice;
  quickReplies?: string[];
  detectedTopic?: TopicAreaKey;
}

export interface DiscoveryMessageDto {
  id: string;
  role: "user" | "consultant" | "system";
  content: string;
  structuredData?: StructuredMessageData;
  modelUsed?: string | null;
  latencyMs?: number | null;
  createdAt: string;
}

export interface UserJourneyStep {
  id: string;
  label: string;
  actor: string;
  order: number;
  description?: string;
}

export interface UserJourneyData {
  id: string;
  roleName: string;
  title: string;
  steps: string[];
  isConfirmed: boolean;
}

export interface SystemCapabilityData {
  id: string;
  roleName: "Customer" | "Staff" | "Admin" | string;
  title: string;
  description: string;
  category: string;
  priority?: string;
  status: "CONFIRMED" | "INFERRED" | "POSSIBLE";
}

export interface BusinessRuleData {
  id: string;
  rule: string;
  condition?: string | null;
  exceptionHandling?: string | null;
  appliesToRole?: string | null;
  severity?: "STANDARD" | "STRICT";
  status: "CONFIRMED" | "INFERRED";
}

export interface DecisionRecord {
  id: string;
  title: string;
  options: string[];
  selectedOption?: string | null;
  reason?: string | null;
  source?: string | null;
  status: "CONFIRMED" | "UNDECIDED" | "LEAVE_FOR_LATER";
}

export interface AssumptionItem {
  id: string;
  title: string;
  statement?: string;
  category: string;
  status: "CONFIRMED" | "ASSUMPTION" | "RECOMMENDATION" | "UNKNOWN";
  riskLevel?: "Low" | "Medium" | "High";
  validationQuestion?: string | null;
}

export interface AiRecommendationDto {
  id: string;
  title: string;
  description: string;
  options: string[];
  recommendedOption?: string | null;
  rationale?: string | null;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
}

export interface DiscoveryReferenceDto {
  id: string;
  type: "IMAGE" | "SCREENSHOT" | "FILE" | "EXCEL" | "PDF" | "URL";
  name: string;
  path?: string | null;
  observations: string[];
  clientDecisions: Record<string, "INCLUDE" | "EXCLUDE">;
  createdAt: string;
}

export interface ProcessTransformation {
  todayProcess: string[];
  futureProcess: string[];
}

export interface WhatWeAreBuilding {
  businessType?: string | null;
  problemStatement?: string | null;
  coreGoal?: string | null;
  summary?: string | null;
  targetOutcome?: string | null;
  confirmedOutcomes: string[];
}

export interface TraceabilityItem {
  reqCode: string;
  title: string;
  source: string;
  status: string;
  createdAt: string;
}

export interface LiveProjectModel {
  whatWeAreBuilding: WhatWeAreBuilding;
  processTransformation: ProcessTransformation;
  userRoles: { name: string; status: "CONFIRMED" | "INFERRED"; permissions?: string; restrictions?: string }[];
  journeys: UserJourneyData[];
  capabilities: SystemCapabilityData[];
  informationRecords: InformationRecordItem[];
  businessRules: BusinessRuleData[];
  reportingVisibility: ReportingVisibilityItem[];
  existingTools: ExistingToolItem[];
  systemConnections: SystemConnectionItem[];
  scopeRadar: {
    core: ScopeItemData[];
    possible: ScopeItemData[];
    unknown: ScopeItemData[];
    outOfScope: ScopeItemData[];
  };
  openDecisions: DecisionRecord[];
  assumptions: AssumptionItem[];
  recommendations: AiRecommendationDto[];
  references: DiscoveryReferenceDto[];
  traceability: TraceabilityItem[];
  contradictions: ContradictionNotice[];
  coverage: DiscoveryCoverageItem[];
  health: {
    status: DiscoveryHealth;
    score: number;
    issues: string[];
  };
}

export interface DiscoverySessionDto {
  id: string;
  requirementId: string;
  reference: string;
  projectTitle: string;
  companyName: string;
  mode: DiscoveryMode;
  intakePath: DiscoveryIntakePath;
  currentArea: TopicAreaKey;
  completeness: number;
  readinessScore: number;
  healthStatus: DiscoveryHealth;
  lastDiscussedTopic?: string | null;
  areas: TopicAreaItem[];
  messages: DiscoveryMessageDto[];
  model: LiveProjectModel;
  isLocked: boolean;
  approvedAt?: string | null;
  approverName?: string | null;
}

export interface ChangeImpactResult {
  newRequirementTitle: string;
  frontendImpact: string[];
  backendImpact: string[];
  databaseImpact: string[];
  integrationsImpact: string[];
  qaImpact: string[];
  estimatedTimelineAdditionDays: number;
  estimatedBudgetDeltaPercent: number;
  summary: string;
}
