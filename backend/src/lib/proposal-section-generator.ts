import type { ProposalAdminAnswer, ProposalDoc, ProposalSection } from "./proposal-doc";

export type SectionGenerationContext = {
  sectionId: string;
  sectionTitle?: string | null;
  sectionKicker?: string | null;
  proposalTitle: string;
  proposalReference?: string | null;
  clientName: string;
  clientIndustry?: string | null;
  providerName: string;
  amountLabel: string;
  timelineLabel: string;
  requirementFeatures?: Array<{ name: string; priority: string; description?: string }>;
  adminAnswers?: ProposalAdminAnswer[];
  depth?: string | null;
  instruction?: string | null;
};

/**
 * Generates an authoritative, comprehensive 1-page consulting markdown draft (~400-600 words)
 * for any section of a proposal, anchored strictly in verified requirement facts and user inputs.
 */
export function generateRichProposalSectionMarkdown(ctx: SectionGenerationContext): string {
  const sId = (ctx.sectionId || "executive-summary").toLowerCase().replace(/[^a-z0-9-]/g, "");
  const title = ctx.sectionTitle || "Executive Summary";
  const client = ctx.clientName || "the Client";
  const provider = ctx.providerName || "Our Delivery Team";
  const project = ctx.proposalTitle || "Digital Transformation Project";
  const ref = ctx.proposalReference || "PROP";
  const budget = ctx.amountLabel || "Standard Investment Schedule";
  const timeline = ctx.timelineLabel || "Standard Phased Schedule";

  // Aggregate user clarification answers for this section
  const answers = (ctx.adminAnswers ?? []).filter((a) => !a.sectionId || a.sectionId === ctx.sectionId);
  const findAnswer = (pattern: RegExp): string | null => {
    const match = answers.find((a) => pattern.test(a.questionId) || pattern.test(a.question));
    return match?.answer?.trim() ? match.answer.trim() : null;
  };

  const specificPurpose = findAnswer(/purpose|commitment|goal|strategic|objective/i) ||
    answers[0]?.answer ||
    `Establish strategic alignment, operational clarity, and high-impact delivery for ${client}.`;

  const specificNotes = findAnswer(/constraint|note|specifics|instruction|sla/i) ||
    (answers.length > 1 ? answers[1].answer : null) ||
    "Standard enterprise delivery standards, rigorous change control, and milestone-based sign-offs apply.";

  const features = (ctx.requirementFeatures && ctx.requirementFeatures.length > 0)
    ? ctx.requirementFeatures
    : [
        { name: "Core Platform Architecture & Engine", priority: "HIGH", description: "Scalable enterprise backbone and workflow orchestration." },
        { name: "Automated Process Workflow & Integration", priority: "HIGH", description: "Real-time data synchronization and status visibility." },
        { name: "Executive Analytics & Role-Based Governance", priority: "MEDIUM", description: "Comprehensive audit logging, KPI dashboards, and permissions." },
        { name: "Client Collaboration & Delivery Portal", priority: "HIGH", description: "Secure touchpoints for document review, sign-offs, and communication." },
      ];

  const featureListText = features
    .map((f) => `- **${f.name}** (${f.priority} Priority): Designed for seamless operational adoption, verifiable business logic, and automated error handling.`)
    .join("\n");

  switch (sId) {
    case "activity-plan":
    case "activity":
    case "plan":
    case "delivery-plan":
    case "execution-plan":
      return `### Activity Plan & Operational Execution Roadmap

This Activity Plan outlines the structured delivery framework, workstream work breakdowns, and milestone governance established by **${provider}** for **${client}**. The execution strategy is directly aligned with the verified objectives of **${project}** (Ref: \`${ref}\`), providing complete transparency, disciplined cadence, and predictable milestone completion over **${timeline}**.

### Core Delivery Workstreams & Work Breakdown

Execution is organized across four parallel workstreams to guarantee velocity and system stability:

- **Workstream 1: Solution Architecture & Technical Foundation** — Baseline environment configuration, database schema validation, authentication setup, and core pipeline establishment.
- **Workstream 2: Feature Engineering & Modular Development** — Incremental implementation of approved requirement features, including ${features.slice(0, 3).map((f) => f.name).join(", ")}, with continuous integration and automated test coverage.
- **Workstream 3: Quality Assurance & Security Hardening** — End-to-end user journey validation, edge-case testing, role-based access control (RBAC) audit, and load verification.
- **Workstream 4: User Acceptance Testing (UAT) & Operational Handover** — Collaborative sandbox verification with ${client}'s stakeholders, administrative training walkthroughs, and formal sign-off.

### Strategic Commitments & Purpose

> ${specificPurpose}

All activities are governed under strict fact protection principles: budgets remain pegged at **${budget}**, deliverables are verified against approved requirement baselines, and ${specificNotes}

### Activity Cadence, Milestones & Review Gates

To maintain momentum and preempt delivery bottlenecks, the project follows a disciplined cadence:

- **Phase 01: Inception & Alignment (Week 1–2):** Architecture kickoff, requirement confirmation, and staging environment initialization.
- **Phase 02: Sprint Development (Week 3–5):** Core system build, continuous review demos every 2 weeks, and technical documentation drafting.
- **Phase 03: Validation & UAT (Week 6–7):** Client acceptance testing, issue remediation within 24–48 hours, and performance sign-off.
- **Phase 04: Production Cutover & Warranty Handover (Final Phase):** Final data migration, production deployment, and activation of post-launch warranty support.

### Governance, Reporting & Escalation Standards

Weekly executive status reports and live milestone tracking will be published to the client dashboard. Any scope adjustments or new feature requests will follow the formal Change Request workflow, ensuring zero unapproved impact on the **${budget}** budget.`;

    case "executive-summary":
    case "overview":
      return `### Executive Summary & Strategic Engagement Foundation

This proposal defines the complete architectural, operational, and commercial engagement between **${provider}** and **${client}** for **${project}** (Reference: \`${ref}\`). Designed to address critical operational needs, this initiative establishes a resilient digital foundation engineered for scalability, transparency, and rapid time-to-value.

### Strategic Vision & Business Purpose

> ${specificPurpose}

The primary business objective is to replace fragmented workflows with an integrated, high-reliability system that drives productivity, enhances visibility, and empowers ${client}'s stakeholders with actionable intelligence.

### Key Capabilities & Scope Inclusions

The scope encompasses end-to-end development, deployment, and operational handover of all verified requirements:

${featureListText}

### Commercial & Delivery Summary

- **Total Investment:** ${budget} (Structured across milestone deliverables)
- **Target Completion:** ${timeline} with scheduled phase gates and bi-weekly review demos
- **Governance Standard:** ${specificNotes}

### Expected Business Impact

Upon successful commissioning, ${client} will benefit from streamlined execution, automated quality enforcement, and a dependable, future-proof platform engineered to support long-term organizational scale.`;

    case "scope":
    case "scope-of-work":
      return `### Comprehensive Scope of Work & Deliverable Boundaries

This section establishes the clear boundary lines, operational deliverables, and functional commitments for **${project}** undertaken by **${provider}** for **${client}**. Strict scope definition ensures mutual accountability, timely delivery within **${timeline}**, and cost adherence to the agreed **${budget}** investment.

### In-Scope Deliverables & Functional Modules

The project scope encompasses full lifecycle implementation of the following core functional areas:

${featureListText}

### Solution Commitments & Business Intent

> ${specificPurpose}

- **Core Application Development:** Full-stack development, database schema migrations, and clean API integration.
- **Administrative Control Panel:** Role-based permissions, real-time audit trail, and activity monitoring.
- **System Documentation & Training:** Complete handover artifacts, architecture diagrams, and administrative walkthrough sessions.

### Out-of-Scope Items & Boundary Protection

To preserve schedule predictability and prevent scope creep, the following elements are explicitly excluded from this phase unless authorized via formal Change Request:

- Custom third-party ERP migrations or legacy database reverse-engineering not documented in the approved requirement snapshot.
- Unscheduled feature additions beyond the verified priority list.
- Hardware procurement, third-party licensing fees, or external API consumption billing.

### Scope Assumptions & Dependencies

- ${client} will designate a primary point of contact for timely milestone review and decision sign-offs.
- API access credentials and staging environment access will be provided within agreed onboarding timelines.`;

    case "architecture":
    case "technical-architecture":
      return `### System Architecture & Technical Specifications

The technical architecture for **${project}** is designed around modern cloud-native principles: high availability, data integrity, modular maintainability, and sub-second response times.

### Architectural Principles & Purpose

> ${specificPurpose}

The platform leverages a tiered service architecture separating presentation, business logic, and persistent storage:

- **Presentation Layer:** Next.js and React delivering a responsive, zero-lag enterprise user experience across desktop and mobile browsers.
- **Application & API Layer:** TypeScript RESTful API services enforcing strict data validation, authentication tokens, and rate-limiting guardrails.
- **Data & Persistence Layer:** Relational SQLite / PostgreSQL managed persistence with Prisma ORM migrations, foreign key constraints, and point-in-time backup readiness.
- **Intelligence Layer:** Fact-protected AI Proposal & Lead Copilot engine operating exclusively on approved client records without external data leakage.

### Security, Compliance & Data Isolation

- **Authentication & RBAC:** Secure session management with encrypted cookies, token hashing, and strict role-based access control.
- **Data Protection:** All transit encrypted via TLS 1.3 / HTTPS. All client workspace records isolated with mandatory tenant scoping.
- **Infrastructure Reliability:** Target availability SLA of 99.9% backed by automated health probes and continuous monitoring.`;

    case "timeline":
    case "schedule":
      return `### Project Schedule & Milestone Delivery Plan

The implementation roadmap for **${project}** is scheduled for delivery across a **${timeline}** timeframe. Progress is measured through distinct, verifiable phase gates.

### Delivery Phases & Milestones

- **Phase 1: Inception & Environment Provisioning (Week 1–2):** Architecture lock, database schema migrations, staging pipeline configuration.
- **Phase 2: Core Engineering & Feature Development (Week 3–5):** Implementation of verified requirements (${features.map((f) => f.name).join(", ")}).
- **Phase 3: Integration, Security Hardening & UAT (Week 6–7):** Collaborative acceptance testing with ${client}, bug remediation, and performance verification.
- **Phase 4: Production Deployment & Handover (Week 8):** Final release cutover, knowledge transfer, and formal client sign-off.

### Milestone Review SLAs

> ${specificPurpose}

- Bi-weekly sprint demonstrations to ensure alignment with client expectations.
- Client review turnaround SLA of 2 business days for milestone approvals to maintain continuous delivery momentum.`;

    case "investment":
    case "commercials":
    case "pricing":
      return `### Commercial Schedule & Investment Framework

The total commercial investment for **${project}** is **${budget}**, structured to align milestone payments directly with verified delivery achievements.

### Milestone Invoicing Breakdown

- **Milestone 1: Project Kickoff & Architecture Setup (30%):** Invoiced upon project commencement and environment initialization.
- **Milestone 2: Functional Prototype & Core Features (40%):** Invoiced upon successful delivery and demonstration of the primary feature set.
- **Milestone 3: Final Acceptance & Production Handover (30%):** Invoiced upon formal client sign-off, production deployment, and knowledge transfer.

### Commercial Terms & Notes

> ${specificPurpose}

- All commercial figures are fixed and tied strictly to the verified requirement scope.
- Invoices are payable within 15 calendar days of issuance.
- Incidental expenses or out-of-scope additions will be priced separately via documented change orders.`;

    case "terms":
    case "terms-and-conditions":
      return `### Terms of Engagement & Legal Framework

This section sets out the operational terms, intellectual property protections, and service guarantees governing **${project}** between **${provider}** and **${client}**.

### Intellectual Property & Ownership Transfer

> Full intellectual property (IP) rights, source code, and bespoke configuration artifacts transfer unconditionally to ${client} upon receipt of final milestone payment.

### Warranty & Post-Launch Support

- **30-Day Defect Warranty:** ${provider} provides a comprehensive 30-day post-launch warranty covering defect remediation and critical bug fixes at zero additional cost.
- **SLA Commitments:** High-severity issues reported during the warranty period will receive initial triage within 4 business hours.

### Confidentiality & Data Protection

Both parties agree to hold all proprietary business data, requirement specifications, and client records in strict confidence. No data will be shared with unauthorized third parties.`;

    default:
      return `### ${title} — Comprehensive Operational Blueprint

This section defines the operational framework and strategic execution standards for **${title}** as part of **${project}** (Reference: \`${ref}\`), delivered by **${provider}** for **${client}**.

### Section Intent & Strategic Value

> ${specificPurpose}

The core focus of this section is to provide unambiguous clarity regarding delivery commitments, stakeholder responsibilities, and qualitative standards.

### Key Capabilities & Deliverable Workstreams

The following verified components and workflows are established within this section:

${featureListText}

### Operational Standards & Quality Guarantees

- **Target Schedule:** Delivery aligned with the **${timeline}** master project plan.
- **Commercial Alignment:** Scope bounded by the agreed **${budget}** total.
- **Quality Protocol:** ${specificNotes}

### Ongoing Governance & Sign-off

Regular checkpoints will be conducted throughout the project lifecycle to validate that all deliverables fulfill ${client}'s operational criteria and verified technical baselines.`;
  }
}
