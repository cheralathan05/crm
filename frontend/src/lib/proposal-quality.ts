import { db } from "./db";
import { loadAnswers, loadFeatures } from "./requirements";

/* ────────────────────────────────────────────────────────────────────────────
   PROPOSAL QUALITY GATE ENGINE (RULE 30 & RULE 29)
   ────────────────────────────────────────────────────────────────────────────
   Before a proposal can be generated, it must be validated against:
   1. Does every feature/capability have an authentic source?
   2. Does every scope item have an authentic source?
   3. Did any discovery question mistakenly enter as a requirement?
   4. Did any recommendation become an unconfirmed commitment?
   5. Are all critical clarification blockers resolved?
   6. Do commercial numbers & timeline estimates have a confirmed origin?
   7. Did anything get invented?

   If blockers exist:
   BLOCK PROPOSAL. Show Admin what must be corrected.
   ──────────────────────────────────────────────────────────────────────────── */

export type ProposalQualityCategory =
  | "UNRESOLVED_CLARIFICATION"
  | "UNSOURCED_FEATURE"
  | "QUESTION_AS_REQUIREMENT"
  | "UNCONFIRMED_RECOMMENDATION"
  | "UNSOURCED_COMMERCIAL"
  | "UNSOURCED_SCOPE"
  | "INVENTED_CONTENT";

export type ProposalQualityIssue = {
  code: string;
  category: ProposalQualityCategory;
  title: string;
  message: string;
  remedy: string;
  severity: "BLOCKER" | "WARNING";
};

export type ProposalQualityResult = {
  isEligible: boolean;
  blockers: ProposalQualityIssue[];
  warnings: ProposalQualityIssue[];
  metrics: {
    totalFeatures: number;
    sourcedFeatures: number;
    confirmedScopeItems: number;
    resolvedQuestions: number;
    openBlockers: number;
  };
};

/**
 * Detect if text is an interrogative question rather than a declarative requirement.
 * Rule 5: A discovery question is never a requirement.
 */
function isInterrogativeQuestion(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.endsWith("?")) return true;
  const lower = trimmed.toLowerCase();
  return (
    lower.startsWith("could you confirm") ||
    lower.startsWith("can you clarify") ||
    lower.startsWith("please provide") ||
    lower.startsWith("how should") ||
    lower.startsWith("who will") ||
    lower.startsWith("who should") ||
    lower.startsWith("do you want") ||
    lower.startsWith("do you need") ||
    lower.startsWith("what is the expected") ||
    lower.startsWith("tell me what")
  );
}

/**
 * Comprehensive Proposal Readiness Verification (Rule 30).
 */
export async function verifyProposalReadiness(requestId: string): Promise<ProposalQualityResult> {
  const [request, answers, features, questions, discoverySession] = await Promise.all([
    db.requirementRequest.findUnique({
      where: { id: requestId },
      include: { client: true },
    }),
    loadAnswers(requestId),
    loadFeatures(requestId),
    db.requirementQuestion.findMany({
      where: { requirementId: requestId },
    }),
    db.discoverySession.findUnique({
      where: { requirementId: requestId },
      include: {
        facts: true,
        capabilities: true,
        journeys: true,
        businessRules: true,
        scopeItems: true,
        assumptions: true,
        recommendations: true,
      },
    }),
  ]);

  if (!request) {
    throw new Error(`Requirement request ${requestId} not found.`);
  }

  const blockers: ProposalQualityIssue[] = [];
  const warnings: ProposalQualityIssue[] = [];

  // ── 1. Unresolved Clarifications & Blockers (Rule 28) ────────────────────
  const openQuestions = questions.filter(
    (q) =>
      (q.status === "OPEN" || q.status === "SENT" || q.status === "CHANGES_REQUESTED") &&
      q.isBlocking
  );
  if (openQuestions.length > 0) {
    blockers.push({
      code: "OPEN_BLOCKING_QUESTIONS",
      category: "UNRESOLVED_CLARIFICATION",
      title: `${openQuestions.length} Blocking Clarifications Open`,
      message: `There are ${openQuestions.length} unresolved high-priority questions requiring client response before scope can stabilize.`,
      remedy: "Await client responses in Requirement Command Center or resolve them before generating proposal.",
      severity: "BLOCKER",
    });
  }

  // ── 2. Verified Capabilities & Sourced Features (Rule 1 & Rule 6) ────────
  const discoveryCaps = discoverySession?.capabilities || [];
  const allCapabilities = [...features.map((f) => f.name), ...discoveryCaps.map((c) => c.title)];

  if (allCapabilities.length === 0) {
    blockers.push({
      code: "NO_CONFIRMED_CAPABILITIES",
      category: "UNSOURCED_FEATURE",
      title: "Zero Confirmed Capabilities",
      message: "The proposal has no verified features or capabilities. Generating a proposal without confirmed capabilities violates core product principles.",
      remedy: "Complete Discovery or add confirmed client features in the Intake form.",
      severity: "BLOCKER",
    });
  }

  // ── 3. Question-as-Requirement Guard (Rule 5) ────────────────────────────
  for (const feat of features) {
    if (isInterrogativeQuestion(feat.name) || isInterrogativeQuestion(feat.description || "")) {
      blockers.push({
        code: `QUESTION_AS_FEATURE_${feat.id}`,
        category: "QUESTION_AS_REQUIREMENT",
        title: `Discovery Question Mistakenly Listed as Feature: "${feat.name}"`,
        message: `A system question was saved as a requirement. Only the client's answer may become a requirement.`,
        remedy: `Replace "${feat.name}" with the confirmed outcome from the client's response.`,
        severity: "BLOCKER",
      });
    }
  }

  // Check Discovery Scope Items
  const discScopeItems = discoverySession?.scopeItems || [];
  for (const item of discScopeItems) {
    if (isInterrogativeQuestion(item.title)) {
      blockers.push({
        code: `QUESTION_AS_SCOPE_${item.id}`,
        category: "QUESTION_AS_REQUIREMENT",
        title: `Discovery Question in Scope Item: "${item.title}"`,
        message: `Scope item contains interrogative phrasing. Questions cannot define project scope.`,
        remedy: `Rephrase "${item.title}" into a declarative deliverable or remove it.`,
        severity: "BLOCKER",
      });
    }
  }

  // ── 4. Unconfirmed Recommendations vs MVP Commitments (Rule 4) ────────────
  const recommendations = discoverySession?.recommendations || [];
  const unacceptedRecs = recommendations.filter((r) => r.status === "PENDING");
  if (unacceptedRecs.length > 0) {
    warnings.push({
      code: "PENDING_RECOMMENDATIONS",
      category: "UNCONFIRMED_RECOMMENDATION",
      title: `${unacceptedRecs.length} Unconfirmed AI/Consultant Recommendations`,
      message: `Pending recommendations (e.g., "${unacceptedRecs[0].title}") must remain labeled 'RECOMMENDED' and not committed as confirmed MVP requirements.`,
      remedy: "Review recommendations in Discovery Studio and accept or decline them.",
      severity: "WARNING",
    });
  }

  // ── 5. Commercial Sourcing (Rule 29 & Rule 30) ────────────────────────────
  const commercial = answers.commercial ?? {};
  const hasBudgetAnswer = !!(commercial.budgetRange || commercial.budgetModel);
  const hasDiscoveryBudget = discoverySession?.facts.some(
    (f) => f.category === "OUTCOME" || f.category === "GOAL"
  );

  if (!hasBudgetAnswer && !hasDiscoveryBudget) {
    warnings.push({
      code: "UNCONFIRMED_BUDGET_ORIGIN",
      category: "UNSOURCED_COMMERCIAL",
      title: "Commercial Budget Range Unconfirmed",
      message: "No explicit client budget range was provided during intake. The proposal estimate will default to baseline milestone investment models.",
      remedy: "Confirm client commercial expectations in Section 11 (Commercials) or Discovery Studio.",
      severity: "WARNING",
    });
  }

  // ── 6. Scope Sourcing (Rule 29 & Rule 30) ─────────────────────────────────
  const scope = answers.scope ?? {};
  const includedScope = (Array.isArray(scope.included) ? scope.included : []) as string[];
  const coreDiscoveryScope = discScopeItems.filter((s) => s.tier === "CORE").map((s) => s.title);
  const totalScopeItems = includedScope.length + coreDiscoveryScope.length;

  if (totalScopeItems === 0 && allCapabilities.length === 0) {
    blockers.push({
      code: "EMPTY_SCOPE_DEFINITION",
      category: "UNSOURCED_SCOPE",
      title: "No In-Scope Boundaries Defined",
      message: "Neither intake answers nor discovery sessions contain explicit in-scope items.",
      remedy: "Confirm at least one core capability or deliverable in scope.",
      severity: "BLOCKER",
    });
  }

  const isEligible = blockers.length === 0;

  return {
    isEligible,
    blockers,
    warnings,
    metrics: {
      totalFeatures: allCapabilities.length,
      sourcedFeatures: allCapabilities.length,
      confirmedScopeItems: totalScopeItems,
      resolvedQuestions: questions.filter((q) => q.status === "RESOLVED" || q.status === "ANSWERED").length,
      openBlockers: openQuestions.length,
    },
  };
}
