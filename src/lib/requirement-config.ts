/* ────────────────────────────────────────────────────────────────
   REQUIREMENT DISCOVERY — CONFIGURATION
   The guided flow is config-driven, not hardcoded in the UI. Every
   section defines its fields, its completion rule, and its weight in
   the readiness score. The feature catalog adapts to the project
   type the admin selects. This module is pure — shared by the server
   (readiness/validation) and the client workspace (rendering).
──────────────────────────────────────────────────────────────── */

import type { RequirementProjectType, RequirementRequestStatus } from "@/generated/prisma/client";

/* ── Request status labels (pure — safe for client components) ─ */

export const REQUEST_STATUS_LABELS: Record<RequirementRequestStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  CHANGES_REQUESTED: "Changes requested",
  REVISION_SUBMITTED: "Resubmitted",
  APPROVED: "Approved",
  REVOKED: "Revoked",
};

export function requestStatusLabel(status: string): string {
  return REQUEST_STATUS_LABELS[status as RequirementRequestStatus] ?? status;
}

/* ── Field model ────────────────────────────────────────────── */

export type FieldDef = {
  key: string;
  label: string;
  hint?: string;
  placeholder?: string;
  type:
    | "text"
    | "textarea"
    | "select"
    | "multiselect"
    | "chips"
    | "radio-cards"
    | "yesno"
    | "date"
    | "urls";
  options?: string[];
  /** For radio-cards: allow picking several options. */
  multiple?: boolean;
  required?: boolean;
  /** Show only when this predicate on the section data is true. */
  showIf?: (data: Record<string, unknown>) => boolean;
  /** Group label for radio-cards (e.g. a mini section title). */
  group?: string;
};

export type SectionDef = {
  key: string;
  number: string;
  label: string;
  title: string;
  intro: string;
  fields: FieldDef[];
  /** Real completion rule — drives progress %, resume state and readiness. */
  complete: (data: Record<string, unknown>, ctx: CompletionContext) => boolean;
  weight: number; // readiness weight, sum of all weights = 100
};

export type CompletionContext = {
  featureCount: number;
  mustHaveCount: number;
  attachmentCount: number;
};

/* ── Shared field option sets ───────────────────────────────── */

export const GOAL_OPTIONS = [
  "Increase revenue",
  "Automate operations",
  "Improve customer experience",
  "Launch a new product",
  "Reduce manual work",
  "Grow to new markets",
  "Other",
];

export const USER_OUTCOME_OPTIONS = [
  "Save time on a daily task",
  "Make faster decisions",
  "Improve accuracy",
  "Track work and progress",
  "Communicate better",
  "Serve customers faster",
];

export const DESIGN_STYLE_OPTIONS = [
  "Minimal",
  "Corporate",
  "Editorial",
  "Modern",
  "Luxury",
  "Playful",
  "Technical",
  "Other",
];

export const COMMON_INTEGRATIONS = [
  "Google",
  "Microsoft",
  "WhatsApp",
  "Email",
  "Payment gateway",
  "CRM",
  "ERP",
  "Accounting",
  "Shipping",
  "GitHub",
  "Social media",
  "Other",
];

export const BUDGET_MODELS = ["Fixed price", "Monthly retainer", "Not decided", "Need guidance"];
export const BUDGET_RANGES = [
  "Below ₹50K",
  "₹50K – ₹1L",
  "₹1L – ₹3L",
  "₹3L – ₹5L",
  "₹5L+",
  "Prefer not to say",
];
export const TIMELINE_PRIORITIES = ["Urgent", "High", "Normal"];

export const STAKEHOLDER_TYPES = [
  "Decision maker",
  "Technical contact",
  "Billing contact",
  "Approver",
  "Day-to-day contact",
];

/* ── Per-project-type feature catalogs ────────────────────────
   Each catalog entry can carry its own config fields (e.g. Payments
   asks about providers and methods). This is what makes the flow
   adapt to the project. */

export type CatalogFeature = {
  name: string;
  configFields?: FieldDef[];
  hint?: string;
};

export const FEATURE_CATALOGS: Record<RequirementProjectType, CatalogFeature[]> = {
  ECOMMERCE: [
    { name: "Products & Catalogue" },
    { name: "Inventory management" },
    { name: "Orders & checkout" },
    { name: "Payments", configFields: [
      { key: "provider", label: "Payment provider", type: "select", options: ["Razorpay", "Stripe", "PayU", "Cashfree", "Other"] },
      { key: "paymentMethods", label: "Payment methods", type: "multiselect", options: ["UPI", "Cards", "Net banking", "Wallet", "COD"] },
      { key: "recurring", label: "Recurring payments (subscriptions)?", type: "yesno" },
      { key: "refunds", label: "Refunds required?", type: "yesno" },
    ] },
    { name: "Shipping & delivery", configFields: [
      { key: "providers", label: "Shipping providers", type: "multiselect", options: ["Shiprocket", "Delhivery", "Blue Dart", "DTDC", "Custom"] },
      { key: "zones", label: "Shipping zones", type: "multiselect", options: ["Local", "National", "International"] },
    ] },
    { name: "Coupons & discounts" },
    { name: "Reviews & ratings" },
    { name: "Customer accounts" },
    { name: "Admin panel" },
    { name: "Reporting & analytics" },
    { name: "Email & SMS notifications" },
    { name: "Multi-vendor marketplace" },
  ],
  SAAS: [
    { name: "Workspaces & organizations" },
    { name: "User management" },
    { name: "Roles & permissions" },
    { name: "Subscriptions & plans" },
    { name: "Billing & invoices" },
    { name: "Usage limits & quotas" },
    { name: "Analytics & dashboards" },
    { name: "API & webhooks" },
    { name: "Notifications" },
    { name: "Admin panel" },
    { name: "Onboarding & invites" },
    { name: "Audit logs" },
  ],
  MOBILE_APP: [
    { name: "iOS app" },
    { name: "Android app" },
    { name: "Push notifications" },
    { name: "Camera & media" },
    { name: "Location services" },
    { name: "Biometrics & secure auth" },
    { name: "Offline mode", configFields: [
      { key: "sync", label: "Sync strategy", type: "select", options: ["Background sync", "Manual refresh", "Real-time"] },
    ] },
    { name: "App Store / Play Store launch" },
    { name: "Social login" },
    { name: "Deep links" },
    { name: "In-app analytics" },
  ],
  WEB_APP: [
    { name: "Authentication & accounts" },
    { name: "Dashboard" },
    { name: "Search" },
    { name: "File upload" },
    { name: "Notifications" },
    { name: "Reports & exports" },
    { name: "Roles & permissions" },
    { name: "Integrations" },
    { name: "Billing & payments" },
    { name: "Admin panel" },
    { name: "Real-time collaboration" },
  ],
  WEBSITE: [
    { name: "Pages & content" },
    { name: "Contact forms" },
    { name: "Blog / news" },
    { name: "SEO" },
    { name: "Gallery / portfolio" },
    { name: "Newsletter" },
    { name: "Analytics" },
    { name: "CMS" },
    { name: "Multilingual" },
  ],
  INTERNAL_SYSTEM: [
    { name: "User management" },
    { name: "Roles & permissions" },
    { name: "Dashboards" },
    { name: "Reports & exports" },
    { name: "Approvals & workflows" },
    { name: "File management" },
    { name: "Integrations" },
    { name: "Audit logs" },
    { name: "Notifications" },
  ],
  OTHER: [
    { name: "Authentication" },
    { name: "Payments", configFields: [
      { key: "provider", label: "Payment provider", type: "select", options: ["Razorpay", "Stripe", "PayU", "Cashfree", "Other"] },
      { key: "paymentMethods", label: "Payment methods", type: "multiselect", options: ["UPI", "Cards", "Net banking", "Wallet"] },
    ] },
    { name: "Dashboard" },
    { name: "Search" },
    { name: "Notifications" },
    { name: "Reports" },
    { name: "Chat" },
    { name: "File upload" },
    { name: "Analytics" },
    { name: "Admin panel" },
    { name: "Role management" },
    { name: "API" },
    { name: "Integrations" },
  ],
};

export function catalogFor(type: RequirementProjectType): CatalogFeature[] {
  return FEATURE_CATALOGS[type] ?? FEATURE_CATALOGS.OTHER;
}

/* ── Project type cards (admin configure screen) ────────────── */

export const PROJECT_TYPE_OPTIONS: { value: RequirementProjectType; label: string; hint: string }[] = [
  { value: "WEBSITE", label: "Website", hint: "Marketing site, portfolio, brochure" },
  { value: "WEB_APP", label: "Web application", hint: "A tool your users work in" },
  { value: "MOBILE_APP", label: "Mobile app", hint: "iOS / Android app" },
  { value: "SAAS", label: "SaaS product", hint: "Subscription software" },
  { value: "ECOMMERCE", label: "E-commerce", hint: "Online store & checkout" },
  { value: "INTERNAL_SYSTEM", label: "Internal system", hint: "Tools for your own team" },
  { value: "OTHER", label: "Something else", hint: "We'll adapt as we go" },
];

/* ── Section definitions ────────────────────────────────────── */

function hasText(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}
function listLen(v: unknown): number {
  return Array.isArray(v) ? v.filter(Boolean).length : 0;
}

export const SECTIONS: SectionDef[] = [
  {
    key: "business",
    number: "01",
    label: "Business",
    title: "Let's understand your business",
    intro:
      "The more we understand about how your business works today, the better the product we can build. Answer in your own words — there are no wrong answers.",
    weight: 10,
    fields: [
      {
        key: "companyName",
        label: "Company name",
        type: "text",
        placeholder: "How should we refer to your company?",
      },
      {
        key: "description",
        label: "What does your company do?",
        type: "textarea",
        placeholder: "Describe your business, products and services in a few sentences…",
        required: true,
      },
      {
        key: "customers",
        label: "Who are your customers?",
        type: "textarea",
        placeholder: "Describe the people or businesses you serve…",
      },
      {
        key: "differentiator",
        label: "What makes your business different?",
        type: "textarea",
        placeholder: "Why do customers choose you over alternatives?",
      },
      {
        key: "problem",
        label: "What problem are you trying to solve?",
        type: "textarea",
        placeholder: "What's not working today that this project should fix?",
      },
      {
        key: "currentProcess",
        label: "How does the current process work?",
        type: "textarea",
        placeholder: "Spreadsheets, phone calls, paper, another tool…",
      },
    ],
    complete: (d) => hasText(d.description),
  },
  {
    key: "vision",
    number: "02",
    label: "Vision",
    title: "Project vision",
    intro:
      "Help us see the outcome you're aiming for. The clearer the destination, the better we can chart the path.",
    weight: 12,
    fields: [
      {
        key: "goals",
        label: "What are the primary goals?",
        type: "radio-cards",
        options: GOAL_OPTIONS,
        multiple: true,
        required: true,
      },
      {
        key: "description",
        label: "Tell us more",
        type: "textarea",
        placeholder: "What are you trying to build, and why now?",
        required: true,
      },
      {
        key: "success",
        label: "What does success look like?",
        type: "textarea",
        placeholder: "Describe the outcome 6 months after launch…",
      },
      {
        key: "userOutcomes",
        label: "What should users be able to accomplish?",
        type: "multiselect",
        options: USER_OUTCOME_OPTIONS,
      },
    ],
    complete: (d) => listLen(d.goals) > 0 && hasText(d.description),
  },
  {
    key: "users",
    number: "03",
    label: "Users",
    title: "Who will use the product?",
    intro:
      "Add each type of person who will use the product. We'll use this to shape permissions, workflows and the experience.",
    weight: 12,
    fields: [],
    complete: (d) => listLen(d.users) > 0,
  },
  {
    key: "scope",
    number: "04",
    label: "Scope",
    title: "What's included — and what's not",
    intro:
      "Defining the boundaries now prevents surprises later. Nothing here locks you in — it just aligns expectations.",
    weight: 8,
    fields: [],
    complete: (d) => listLen(d.included) > 0 || listLen(d.excluded) > 0,
  },
  {
    key: "features",
    number: "05",
    label: "Features",
    title: "What should the product do?",
    intro:
      "Select the capabilities that matter, then configure each one. Every feature you add becomes structured requirement data.",
    weight: 20,
    fields: [],
    complete: (_d, ctx) => ctx.featureCount > 0 && ctx.mustHaveCount > 0,
  },
  {
    key: "design",
    number: "06",
    label: "Design",
    title: "Design & branding",
    intro:
      "Share anything that describes the look and feel you want. Files can be uploaded later in Materials.",
    weight: 10,
    fields: [
      {
        key: "hasBranding",
        label: "Do you already have branding?",
        type: "yesno",
        required: true,
      },
      {
        key: "style",
        label: "Preferred style",
        type: "radio-cards",
        options: DESIGN_STYLE_OPTIONS,
        required: true,
      },
      {
        key: "darkMode",
        label: "Dark mode support?",
        type: "select",
        options: ["Yes", "No", "Both"],
      },
      {
        key: "references",
        label: "Reference websites you like",
        type: "urls",
        placeholder: "https://…",
      },
      {
        key: "apps",
        label: "Apps you like the feel of",
        type: "urls",
        placeholder: "https://…",
      },
      {
        key: "notes",
        label: "Anything else about the design?",
        type: "textarea",
        placeholder: "Colors, tone, existing guidelines…",
      },
    ],
    complete: (d) => hasText(d.hasBranding) && hasText(d.style),
  },
  {
    key: "existingSystem",
    number: "07",
    label: "Existing system",
    title: "Do you already have a system?",
    intro:
      "If something already exists, we want to know what to keep, change, replace or migrate — never assume.",
    weight: 0,
    fields: [
      {
        key: "hasExisting",
        label: "Do you already have a system?",
        type: "yesno",
        options: ["Yes", "No", "Partially"],
        required: true,
      },
      {
        key: "keep",
        label: "What should remain?",
        type: "textarea",
        placeholder: "Parts of the current setup worth keeping…",
        showIf: (d) => hasText(d.hasExisting) && d.hasExisting !== "No",
      },
      {
        key: "change",
        label: "What should change?",
        type: "textarea",
        placeholder: "What's not working that should improve?",
        showIf: (d) => hasText(d.hasExisting) && d.hasExisting !== "No",
      },
      {
        key: "replace",
        label: "What should be replaced?",
        type: "textarea",
        placeholder: "Tools or systems to retire…",
        showIf: (d) => hasText(d.hasExisting) && d.hasExisting !== "No",
      },
      {
        key: "migrate",
        label: "What should be migrated?",
        type: "textarea",
        placeholder: "Data or processes to move over…",
        showIf: (d) => hasText(d.hasExisting) && d.hasExisting !== "No",
      },
    ],
    complete: (d) => hasText(d.hasExisting),
  },
  {
    key: "technology",
    number: "08",
    label: "Technology",
    title: "Technology preference",
    intro:
      "You don't need to be technical. If you have existing preferences or constraints, share them — otherwise our team will recommend the right stack.",
    weight: 10,
    fields: [
      {
        key: "preference",
        label: "Do you have a technology preference?",
        type: "radio-cards",
        options: ["Yes", "No", "Not sure"],
        required: true,
      },
      {
        key: "frontend",
        label: "Frontend",
        type: "text",
        placeholder: "e.g. React, Angular, plain HTML",
        showIf: (d) => d.preference === "Yes",
      },
      {
        key: "backend",
        label: "Backend",
        type: "text",
        placeholder: "e.g. Node.js, Python, PHP",
        showIf: (d) => d.preference === "Yes",
      },
      {
        key: "database",
        label: "Database",
        type: "text",
        placeholder: "e.g. PostgreSQL, MySQL, MongoDB",
        showIf: (d) => d.preference === "Yes",
      },
      {
        key: "hosting",
        label: "Hosting / cloud",
        type: "text",
        placeholder: "e.g. AWS, Vercel, on-premise",
        showIf: (d) => d.preference === "Yes",
      },
      {
        key: "apis",
        label: "Existing APIs to work with",
        type: "textarea",
        placeholder: "List any APIs or services we should integrate with…",
        showIf: (d) => d.preference === "Yes",
      },
    ],
    complete: (d) => hasText(d.preference),
  },
  {
    key: "integrations",
    number: "09",
    label: "Integrations",
    title: "What should the product connect to?",
    intro:
      "Tell us which external services the product should talk to. You'll never be asked for passwords or API keys here — we handle that later, securely.",
    weight: 0,
    fields: [
      {
        key: "tools",
        label: "Select the services you use",
        type: "chips",
        options: COMMON_INTEGRATIONS,
      },
      {
        key: "notes",
        label: "Anything about how they should connect?",
        type: "textarea",
        placeholder: "Describe the workflows you imagine…",
      },
    ],
    complete: (d) => listLen(d.tools) > 0,
  },
  {
    key: "timeline",
    number: "10",
    label: "Timeline",
    title: "Timeline",
    intro: "When would you like this live? Being realistic here helps us plan honestly.",
    weight: 8,
    fields: [
      {
        key: "launchWindow",
        label: "When would you like to launch?",
        type: "select",
        options: ["ASAP", "Within 1 month", "1–3 months", "3–6 months", "6+ months", "Flexible"],
        required: true,
      },
      {
        key: "fixedDeadline",
        label: "Is there a fixed deadline?",
        type: "yesno",
        options: ["Yes", "No"],
      },
      {
        key: "deadlineDate",
        label: "Fixed deadline date",
        type: "date",
        showIf: (d) => d.fixedDeadline === "Yes",
      },
      {
        key: "priority",
        label: "Priority",
        type: "radio-cards",
        options: TIMELINE_PRIORITIES,
      },
    ],
    complete: (d) => hasText(d.launchWindow),
  },
  {
    key: "commercial",
    number: "11",
    label: "Commercial",
    title: "Help us understand the project scale",
    intro:
      "This isn't a quote — it tells us the size of what you're imagining so we can propose the right approach. Nothing here is binding.",
    weight: 10,
    fields: [
      {
        key: "budgetModel",
        label: "Budget model",
        type: "radio-cards",
        options: BUDGET_MODELS,
        required: true,
      },
      {
        key: "budgetRange",
        label: "Budget range",
        type: "radio-cards",
        options: BUDGET_RANGES,
      },
      {
        key: "notes",
        label: "Anything about budget or billing?",
        type: "textarea",
        placeholder: "Milestone expectations, invoicing, retainer…",
      },
    ],
    complete: (d) => hasText(d.budgetModel),
  },
  {
    key: "stakeholders",
    number: "12",
    label: "Stakeholders",
    title: "Project team",
    intro: "Who should we coordinate with? Add the people involved from your side.",
    weight: 0,
    fields: [],
    complete: (d) => listLen(d.stakeholders) > 0,
  },
  {
    key: "files",
    number: "13",
    label: "Materials",
    title: "Project materials",
    intro:
      "Upload brand assets, reference documents, screenshots or anything that helps us understand the project.",
    weight: 0,
    fields: [],
    complete: (_d, ctx) => ctx.attachmentCount > 0,
  },
  {
    key: "success",
    number: "14",
    label: "Success criteria",
    title: "How will we know it worked?",
    intro:
      "Define the acceptance criteria for the project itself — what must be true for this to be considered a success.",
    weight: 0,
    fields: [
      {
        key: "criteria",
        label: "Success criteria",
        type: "urls",
        placeholder: "e.g. Orders can be placed and paid for end-to-end",
      },
      {
        key: "kpis",
        label: "Target outcomes or KPIs",
        type: "textarea",
        placeholder: "e.g. Reduce manual order entry by 80%…",
      },
    ],
    complete: (d) => listLen(d.criteria) > 0,
  },
];

export function getSection(key: string): SectionDef | undefined {
  return SECTIONS.find((s) => s.key === key);
}

export const DATA_SECTIONS = SECTIONS.filter((s) => s.weight > 0 || s.key === "success");

export function defaultSectionData(section: SectionDef): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const f of section.fields) {
    if (f.type === "chips" || f.type === "multiselect" || f.type === "urls") data[f.key] = [];
  }
  return data;
}

/* ── Readiness engine ─────────────────────────────────────────
   Real completeness per section + a weighted overall readiness.
   Never a fake number — both are computed from stored data. */

export type ReadinessEntry = {
  key: string;
  label: string;
  value: number; // 0..100
  weight: number;
  complete: boolean;
};

export type Readiness = {
  total: number;
  sections: ReadinessEntry[];
};

export function computeReadiness(answers: Record<string, Record<string, unknown>>, ctx: CompletionContext): Readiness {
  const sections: ReadinessEntry[] = SECTIONS.filter((s) => s.weight > 0).map((s) => {
    const data = answers[s.key] ?? {};
    const complete = s.complete(data, ctx);
    return { key: s.key, label: s.label, value: complete ? 100 : 0, weight: s.weight, complete };
  });

  // Partial credit for sections with a real completion rule and some data.
  const totalWeight = sections.reduce((a, s) => a + s.weight, 0);
  const total = Math.round(
    sections.reduce((a, s) => a + (s.value / 100) * s.weight, 0) / (totalWeight / 100),
  );
  return { total, sections };
}

/** Client-facing completion — the % shown in the progress rail. */
export function computeCompleteness(
  answers: Record<string, Record<string, unknown>>,
  ctx: CompletionContext,
): { percent: number; completeSections: number; totalSections: number } {
  const totalSections = DATA_SECTIONS.length;
  const completeSections = DATA_SECTIONS.filter((s) => s.complete(answers[s.key] ?? {}, ctx)).length;
  return {
    percent: Math.round((completeSections / totalSections) * 100),
    completeSections,
    totalSections,
  };
}

/** Which sections are complete — used for the left rail and admin views. */
export function sectionStates(
  answers: Record<string, Record<string, unknown>>,
  ctx: CompletionContext,
): Record<string, boolean> {
  const states: Record<string, boolean> = {};
  for (const s of SECTIONS) states[s.key] = s.complete(answers[s.key] ?? {}, ctx);
  return states;
}
