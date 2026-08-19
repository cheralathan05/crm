import type { ProposalAdminAnswer, ProposalDoc, ProposalSection } from "./proposal-doc";
import type { RequirementCoverage } from "./proposal-doc";

export type SectionQuestion = {
  id: string;
  sectionId: string;
  category: "REQUIRED" | "OPTIONAL";
  question: string;
  hint?: string;
  existingValue?: string;
  isAnswered: boolean;
};

export type SectionGapAnalysis = {
  sectionId: string;
  sectionTitle: string;
  isSufficient: boolean;
  totalQuestions: number;
  answeredCount: number;
  requiredQuestions: SectionQuestion[];
  optionalQuestions: SectionQuestion[];
};

/** Pre-defined question schema for each proposal section */
const SECTION_QUESTION_TEMPLATES: Record<
  string,
  {
    required: Array<{ id: string; question: string; hint: string }>;
    optional: Array<{ id: string; question: string; hint: string }>;
  }
> = {
  "executive-summary": {
    required: [
      {
        id: "q_biz_problem",
        question: "What primary business problem is the client currently trying to solve?",
        hint: "e.g. Manual lead tracking causes high response delays and lost sales opportunities.",
      },
      {
        id: "q_expected_outcome",
        question: "What key business outcome or result does the client expect from this project?",
        hint: "e.g. 50% faster quote turnaround and unified real-time visibility across pipeline.",
      },
      {
        id: "q_primary_users",
        question: "Who will primarily use or benefit from this solution?",
        hint: "e.g. Sales managers, account executives, and executive leadership.",
      },
    ],
    optional: [
      {
        id: "q_biz_priority",
        question: "Is there a specific strategic goal or priority driving this engagement?",
        hint: "e.g. Scalable foundation ahead of Q3 enterprise expansion.",
      },
      {
        id: "q_project_trigger",
        question: "Is there a deadline or business event driving this project?",
        hint: "e.g. Transition needed before annual vendor contract renewal.",
      },
    ],
  },
  "client-understanding": {
    required: [
      {
        id: "q_client_challenge",
        question: "What specific market or operational challenges is the client facing?",
        hint: "e.g. Fragmented legacy tools and lack of centralized reporting.",
      },
      {
        id: "q_strategic_vision",
        question: "What is the client's strategic vision for modernizing this workflow?",
        hint: "e.g. A unified, cloud-native portal accessible across desktop and mobile.",
      },
    ],
    optional: [
      {
        id: "q_client_differentiator",
        question: "What makes the client's business or offering unique in their industry?",
        hint: "e.g. Premium high-touch white-glove service model.",
      },
    ],
  },
  objectives: {
    required: [
      {
        id: "q_primary_objective",
        question: "What is the single most critical objective this project must achieve?",
        hint: "e.g. Eliminate manual spreadsheets and automate client status alerts.",
      },
      {
        id: "q_success_indicator",
        question: "How will success be measured upon project delivery?",
        hint: "e.g. 100% data audit compliance and zero unassigned inbound requests.",
      },
    ],
    optional: [
      {
        id: "q_secondary_objectives",
        question: "Are there secondary business or efficiency objectives?",
        hint: "e.g. Faster onboarding time for new team members.",
      },
    ],
  },
  "problem-solution": {
    required: [
      {
        id: "q_current_pain_points",
        question: "What are the core pain points and business impact of the current state?",
        hint: "e.g. 12+ hours wasted weekly on manual reconciliations and data entry errors.",
      },
      {
        id: "q_solution_approach",
        question: "How does the proposed solution resolve each pain point?",
        hint: "e.g. Automated sync engine with real-time discrepancy alerts.",
      },
    ],
    optional: [
      {
        id: "q_impact_cost",
        question: "What is the estimated cost or lost revenue if this problem goes unresolved?",
        hint: "e.g. Escalating customer churn and administrative overhead.",
      },
    ],
  },
  scope: {
    required: [
      {
        id: "q_in_scope_bounds",
        question: "What capabilities and modules are explicitly included in scope?",
        hint: "e.g. Client management, proposal studio, PDF generator, and email delivery.",
      },
      {
        id: "q_out_of_scope_bounds",
        question: "What items or integrations are explicitly out-of-scope for this phase?",
        hint: "e.g. Third-party ERP migration and custom mobile app builds.",
      },
    ],
    optional: [
      {
        id: "q_scope_assumptions",
        question: "What key operational assumptions are required from the client?",
        hint: "e.g. Client provides API credentials and staging server access within 3 days.",
      },
    ],
  },
  features: {
    required: [
      {
        id: "q_feature_workflow",
        question: "What is the primary end-to-end user workflow through the core features?",
        hint: "e.g. Lead capture -> requirement gathering -> proposal generation -> digital sign-off.",
      },
      {
        id: "q_business_rules",
        question: "Are there specific business rules, permissions, or validations needed?",
        hint: "e.g. Multi-tier approval required for proposals above budget thresholds.",
      },
    ],
    optional: [
      {
        id: "q_data_capture",
        question: "What specific data fields or custom entities must be captured?",
        hint: "e.g. GST number, billing address, custom tags, and milestone schedules.",
      },
    ],
  },
  architecture: {
    required: [
      {
        id: "q_hosting_target",
        question: "Where will this platform be hosted and deployed?",
        hint: "e.g. Vercel / AWS Cloud with secure SSL and managed database.",
      },
      {
        id: "q_tech_stack_decision",
        question: "What core tech stack and frameworks are established?",
        hint: "e.g. Next.js, Node.js API, Prisma ORM, and local AI Copilot.",
      },
    ],
    optional: [
      {
        id: "q_security_standards",
        question: "What security, authentication, and encryption standards apply?",
        hint: "e.g. Token hashing, role-based access control (RBAC), and HTTPS.",
      },
    ],
  },
  deliverables: {
    required: [
      {
        id: "q_handover_items",
        question: "What tangible system modules and artifacts will be delivered?",
        hint: "e.g. Production code, database schema, admin manual, and API docs.",
      },
      {
        id: "q_acceptance_standard",
        question: "What is the acceptance standard for final handover sign-off?",
        hint: "e.g. 100% test pass rate and formal client UAT approval.",
      },
    ],
    optional: [
      {
        id: "q_training_scope",
        question: "What client team onboarding or training sessions are included?",
        hint: "e.g. 2 live administrator walkthrough sessions.",
      },
    ],
  },
  timeline: {
    required: [
      {
        id: "q_target_timeline",
        question: "What is the target schedule, duration, or key completion milestone?",
        hint: "e.g. 4-6 weeks total across Discovery, Build, and UAT Launch phases.",
      },
      {
        id: "q_milestones",
        question: "What are the key phase gates or milestone checkpoints?",
        hint: "e.g. Milestone 1: Design (W2), Milestone 2: Build (W4), Milestone 3: Launch (W6).",
      },
    ],
    optional: [
      {
        id: "q_review_turnaround",
        question: "What is the expected client review turnaround SLA?",
        hint: "e.g. 2 business days for milestone approvals.",
      },
    ],
  },
  investment: {
    required: [
      {
        id: "q_payment_milestones",
        question: "What is the payment milestone schedule and invoicing schedule?",
        hint: "e.g. 30% on kickoff, 50% on development handover, 20% on final launch.",
      },
    ],
    optional: [
      {
        id: "q_tax_terms",
        question: "Are taxes, VAT, or incidental expenses included or billed separately?",
        hint: "e.g. All figures exclusive of applicable GST.",
      },
    ],
  },
  "activity-plan": {
    required: [
      {
        id: "q_activity_purpose",
        question: "What core operational commitments, workstreams, or execution priorities apply?",
        hint: "e.g. Disciplined 4-phase agile delivery, transparent sprint demos, and milestone sign-offs.",
      },
      {
        id: "q_workstreams",
        question: "What are the primary delivery workstreams and cadence?",
        hint: "e.g. Architecture setup, feature engineering sprints, security audit, and UAT cutover.",
      },
    ],
    optional: [
      {
        id: "q_activity_constraints",
        question: "Any specific client review turnaround SLAs or dependencies?",
        hint: "e.g. 48-hour client review turnaround and weekly live progress demonstrations.",
      },
    ],
  },
  methodology: {
    required: [
      {
        id: "q_methodology_framework",
        question: "What delivery methodology and collaboration model will be used?",
        hint: "e.g. Agile sprint iterations with bi-weekly demonstrations and staging deployments.",
      },
    ],
    optional: [
      {
        id: "q_change_management",
        question: "How will change requests or scope additions be managed?",
        hint: "e.g. Documented change order workflow with client sign-off before implementation.",
      },
    ],
  },
  terms: {
    required: [
      {
        id: "q_ip_ownership",
        question: "What are the intellectual property and code transfer terms?",
        hint: "e.g. Full IP and source code transfer upon receipt of final milestone payment.",
      },
    ],
    optional: [
      {
        id: "q_warranty_support",
        question: "What post-launch warranty or maintenance window is provided?",
        hint: "e.g. 30-day post-launch bug fix warranty included.",
      },
    ],
  },
};

/** Generic template for any custom sections */
const DEFAULT_QUESTIONS = {
  required: [
    {
      id: "q_section_purpose",
      question: "What key business purpose or commitment should this section establish?",
      hint: "e.g. Clear explanation of deliverables, client responsibilities, and outcomes.",
    },
  ],
  optional: [
    {
      id: "q_section_specifics",
      question: "Any specific notes, constraints, or client instructions for this section?",
      hint: "e.g. Specific wording or SLA guarantees agreed during discovery.",
    },
  ],
};

/**
 * Analyzes whether enough real information is available for the given section.
 * Checks existing proposal facts, saved admin answers, client records, and requirements.
 */
export function analyzeSectionInformationSufficiency(
  sectionId: string,
  sectionTitle: string,
  doc: ProposalDoc,
  clientContext?: { companyName?: string; industry?: string; description?: string },
  requirementFeatures?: Array<{ name: string; priority: string }>,
): SectionGapAnalysis {
  const template = SECTION_QUESTION_TEMPLATES[sectionId] ?? DEFAULT_QUESTIONS;
  const savedAnswers = doc.adminAnswers ?? [];

  // Helper to find answer for question (checks this section first, then other sections if common key)
  const findAnswer = (qId: string): string | undefined => {
    const direct = savedAnswers.find((a) => a.sectionId === sectionId && a.questionId === qId);
    if (direct?.answer?.trim()) return direct.answer.trim();
    // Cross-section reuse for common business facts
    const shared = savedAnswers.find((a) => a.questionId === qId && a.answer?.trim());
    return shared?.answer?.trim();
  };

  const requiredQuestions: SectionQuestion[] = template.required.map((t) => {
    const existing = findAnswer(t.id);
    return {
      id: t.id,
      sectionId,
      category: "REQUIRED" as const,
      question: t.question,
      hint: t.hint,
      existingValue: existing,
      isAnswered: Boolean(existing && existing.length > 3),
    };
  });

  const optionalQuestions: SectionQuestion[] = template.optional.map((t) => {
    const existing = findAnswer(t.id);
    return {
      id: t.id,
      sectionId,
      category: "OPTIONAL" as const,
      question: t.question,
      hint: t.hint,
      existingValue: existing,
      isAnswered: Boolean(existing && existing.length > 3),
    };
  });

  const totalRequired = requiredQuestions.length;
  const answeredRequired = requiredQuestions.filter((q) => q.isAnswered).length;
  const totalQuestions = requiredQuestions.length + optionalQuestions.length;
  const answeredCount = requiredQuestions.filter((q) => q.isAnswered).length + optionalQuestions.filter((q) => q.isAnswered).length;

  // Sufficiency: all required questions answered OR enough real data already in section/requirements
  const section = doc.sections.find((s) => s.id === sectionId);
  const hasExistingContent = Boolean(section && section.blocks.length >= 3 && section.blocks.some((b) => b.type === "paragraph" && b.text.length > 100));

  const isSufficient = answeredRequired === totalRequired || (totalRequired === 0 && hasExistingContent);

  return {
    sectionId,
    sectionTitle,
    isSufficient,
    totalQuestions,
    answeredCount,
    requiredQuestions,
    optionalQuestions,
  };
}
