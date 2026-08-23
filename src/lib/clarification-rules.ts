/* ────────────────────────────────────────────────────────────────
   CLARIFICATION ENGINE — RULES (deterministic)
   Pure functions: scope classification, vague-question detection,
   quality scoring, answer-type suggestion, curated options, impact
   and priority estimation. No AI here — this layer always works and
   grounds everything in real requirement data. AI generation (when
   available) is layered on top and never bypasses these rules.
──────────────────────────────────────────────────────────────── */

export type ImpactArea = "scope" | "timeline" | "budget" | "complexity" | "risk";
export type ImpactValue = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
export type ImpactMap = Record<ImpactArea, ImpactValue>;

export const ANSWER_TYPES = [
  "TEXT",
  "LONG_TEXT",
  "SINGLE_SELECT",
  "MULTI_SELECT",
  "YES_NO",
  "NUMBER",
  "CURRENCY",
  "DATE",
  "DATE_RANGE",
  "DROPDOWN",
  "FILE_UPLOAD",
  "URL",
  "EMAIL",
  "PHONE",
  "RATING",
  "TABLE",
  "CUSTOM",
] as const;

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "BLOCKING"] as const;

/* ── Scope taxonomy — category → subcategories ──────────────── */

export const SCOPE_CATEGORIES: { value: string; label: string; subcategories: string[] }[] = [
  { value: "CORE_FUNCTIONALITY", label: "Core Functionality", subcategories: ["Product catalogue", "Shopping cart", "Checkout", "Search", "Orders", "Customer accounts"] },
  { value: "FEATURES", label: "Features", subcategories: ["Feature scope", "Configuration", "Workflows", "Product management"] },
  { value: "USER_ROLES", label: "User Roles", subcategories: ["Customer", "Admin", "Manager", "Roles & permissions"] },
  { value: "USER_JOURNEYS", label: "User Journeys", subcategories: ["Onboarding", "Core tasks", "Edge cases"] },
  { value: "BUSINESS_RULES", label: "Business Rules", subcategories: ["Pricing rules", "Discounts", "Approvals"] },
  { value: "DATA", label: "Data", subcategories: ["Data model", "Migration", "Import / export"] },
  { value: "INTEGRATIONS", label: "Integrations", subcategories: ["Third-party services", "Webhooks", "Data sync"] },
  { value: "API_BACKEND", label: "API / Backend", subcategories: ["Public API", "Internal services", "Database"] },
  { value: "FRONTEND_UI", label: "Frontend / UI", subcategories: ["Pages", "Components", "Responsive"] },
  { value: "DESIGN_BRANDING", label: "Design / Branding", subcategories: ["Visual identity", "Guidelines", "Assets"] },
  { value: "AUTHENTICATION", label: "Authentication", subcategories: ["Login methods", "SSO", "Password & reset"] },
  { value: "AUTHORIZATION", label: "Authorization / Permissions", subcategories: ["Roles", "Permissions", "Access control"] },
  { value: "PAYMENTS", label: "Payments", subcategories: ["Payment gateway", "Subscriptions", "Refunds", "Invoicing"] },
  { value: "NOTIFICATIONS", label: "Notifications", subcategories: ["Email", "Push", "In-app"] },
  { value: "EMAIL", label: "Email", subcategories: ["Transactional", "Marketing"] },
  { value: "MESSAGING", label: "Messaging", subcategories: ["In-app chat", "SMS"] },
  { value: "REPORTING_ANALYTICS", label: "Reporting / Analytics", subcategories: ["Dashboards", "Reports", "KPIs"] },
  { value: "DASHBOARD", label: "Dashboard", subcategories: ["Overview", "Widgets"] },
  { value: "ADMIN_PANEL", label: "Admin Panel", subcategories: ["Content management", "User management", "Product management"] },
  { value: "CLIENT_PORTAL", label: "Client Portal", subcategories: ["Profile", "Order history", "Documents"] },
  { value: "MOBILE", label: "Mobile", subcategories: ["iOS", "Android"] },
  { value: "WEB", label: "Web", subcategories: ["Public site", "Web app"] },
  { value: "PERFORMANCE", label: "Performance", subcategories: ["Speed", "Scalability", "Load"] },
  { value: "SECURITY", label: "Security", subcategories: ["Data protection", "Access", "Encryption"] },
  { value: "COMPLIANCE", label: "Compliance", subcategories: ["Legal", "Data residency", "Accessibility"] },
  { value: "INFRASTRUCTURE", label: "Infrastructure", subcategories: ["Hosting", "CI / CD"] },
  { value: "DEPLOYMENT", label: "Deployment", subcategories: ["Environments", "Release process"] },
  { value: "THIRD_PARTY_SERVICES", label: "Third-Party Services", subcategories: ["Services", "APIs"] },
  { value: "CONTENT", label: "Content", subcategories: ["Pages", "Copy", "Media"] },
  { value: "SEO", label: "SEO", subcategories: ["Metadata", "Indexing"] },
  { value: "TESTING", label: "Testing", subcategories: ["QA", "UAT", "Automated"] },
  { value: "MAINTENANCE_SUPPORT", label: "Maintenance / Support", subcategories: ["Updates", "Support"] },
  { value: "TIMELINE", label: "Timeline", subcategories: ["Milestones", "Launch"] },
  { value: "DELIVERABLES", label: "Deliverables", subcategories: ["Scope of delivery", "Handover"] },
  { value: "BUDGET_COMMERCIAL", label: "Budget / Commercial", subcategories: ["Pricing", "Payment terms"] },
  { value: "OTHER", label: "Other", subcategories: ["General"] },
];

export function categoryLabel(value: string | null | undefined): string {
  if (!value) return "";
  return SCOPE_CATEGORIES.find((c) => c.value === value)?.label ?? value.replace(/_/g, " ");
}

/* ── Vague-question detector ────────────────────────────────── */

const VAGUE_PATTERNS: RegExp[] = [
  /re-?check this/i,
  /check this/i,
  /confirm this/i,
  /clarify this/i,
  /please confirm/i,
  /need more details/i,
  /more detail/i,
  /confirm scope/i,
  /clarify scope/i,
  /what do you want/i,
  /please explain/i,
  /tell us more/i,
  /expand on/i,
  /elaborate/i,
  /recheck/i,
];

export function isVague(text: string): boolean {
  const t = text.trim();
  if (t.length < 15) return true;
  return VAGUE_PATTERNS.some((p) => p.test(t));
}

export function vagueFlags(text: string): string[] {
  const t = text.trim();
  const flags: string[] = [];
  if (t.length < 15) flags.push("too_short");
  for (const p of VAGUE_PATTERNS) {
    if (p.test(t)) flags.push(`vague:${p.source}`);
  }
  return flags;
}

/* ── Keyword → scope classification ─────────────────────────── */

type ClassifyInput = {
  text: string;
  section: string;
  features?: { id: string; name: string }[];
  answers?: Record<string, Record<string, unknown>>;
};

const KEYWORD_MAP: [RegExp, string, string][] = [
  [/payment|gateway|razorpay|stripe|paypal|subscription|recurring|refund|invoice/i, "PAYMENTS", "Payment gateway"],
  [/login|sign ?in|oauth|google login|sso|password reset|authentication|2fa|mfa/i, "AUTHENTICATION", "Login methods"],
  [/role|permission|access control|authorization|privilege/i, "AUTHORIZATION", "Roles"],
  [/admin panel|admin dashboard|manage products|content management|admin/i, "ADMIN_PANEL", "Product management"],
  [/report|analytics|kpi|dashboard metrics|insight/i, "REPORTING_ANALYTICS", "Dashboards"],
  [/email|newsletter|mail/i, "EMAIL", "Transactional"],
  [/notification|push|alert|reminder/i, "NOTIFICATIONS", "Push"],
  [/mobile|ios|android|app store|phone app/i, "MOBILE", "iOS"],
  [/website|web app|frontend|ui|page|layout|responsive/i, "FRONTEND_UI", "Pages"],
  [/design|brand|logo|style|visual|colour|color|guideline/i, "DESIGN_BRANDING", "Visual identity"],
  [/integrat|webhook|third.party|api|rest|web service/i, "INTEGRATIONS", "Third-party services"],
  [/backend|database|schema|data model|server/i, "API_BACKEND", "Internal services"],
  [/security|encrypt|gdpr|compliance|data protection|audit log/i, "SECURITY", "Data protection"],
  [/budget|cost|price|commercial|payment terms|estimate/i, "BUDGET_COMMERCIAL", "Pricing"],
  [/timeline|deadline|launch date|release date|milestone|when/i, "TIMELINE", "Milestones"],
  [/data|migration|import|export|csv|excel/i, "DATA", "Import / export"],
  [/cart|checkout|catalogue|catalog|product|order|inventory/i, "CORE_FUNCTIONALITY", "Product catalogue"],
  [/feature|functionality|workflow|capabilit/i, "FEATURES", "Feature scope"],
  [/customer|user|account|sign ?up|register/i, "USER_ROLES", "Customer"],
  [/content|copy|page text|media|image|video/i, "CONTENT", "Copy"],
  [/seo|search engine|metadata|index/i, "SEO", "Metadata"],
  [/test|qa|uat|quality/i, "TESTING", "QA"],
  [/hosting|deploy|ci\/cd|environment|infrastructure|server|cloud/i, "INFRASTRUCTURE", "Hosting"],
];

const SECTION_FALLBACK: Record<string, [string, string]> = {
  business: ["CORE_FUNCTIONALITY", "Feature scope"],
  vision: ["CORE_FUNCTIONALITY", "Feature scope"],
  users: ["USER_ROLES", "Customer"],
  scope: ["FEATURES", "Feature scope"],
  features: ["FEATURES", "Feature scope"],
  design: ["DESIGN_BRANDING", "Visual identity"],
  existingSystem: ["DATA", "Migration"],
  technology: ["API_BACKEND", "Internal services"],
  integrations: ["INTEGRATIONS", "Third-party services"],
  timeline: ["TIMELINE", "Milestones"],
  commercial: ["BUDGET_COMMERCIAL", "Pricing"],
  stakeholders: ["USER_ROLES", "Roles & permissions"],
  success: ["REPORTING_ANALYTICS", "KPIs"],
};

export function classifyScope(input: ClassifyInput): {
  category: string;
  subcategory: string;
  featureId: string | null;
  itemLabel: string;
  confidence: "high" | "medium" | "low";
} {
  const text = input.text;
  const features = input.features ?? [];
  const answers = input.answers ?? {};

  // Exact feature match first — the strongest signal for "which item".
  const mentioned = features.find((f) => text.toLowerCase().includes(f.name.toLowerCase()));
  if (mentioned) {
    const match = KEYWORD_MAP.find(([p]) => p.test(mentioned.name)) ?? KEYWORD_MAP.find(([p]) => p.test(text));
    const [category, subcategory] = match ? [match[1], match[2]] : ["FEATURES", "Feature scope"];
    return { category, subcategory, featureId: mentioned.id, itemLabel: mentioned.name, confidence: "high" };
  }

  // Keyword classification over the note.
  for (const [pattern, category, subcategory] of KEYWORD_MAP) {
    if (pattern.test(text)) {
      return { category, subcategory, featureId: null, itemLabel: subcategory, confidence: "high" };
    }
  }

  // Fall back to the section context.
  const fallback = SECTION_FALLBACK[input.section] ?? ["OTHER", "General"];
  const firstFeature = features[0];
  return {
    category: fallback[0],
    subcategory: fallback[1],
    featureId: firstFeature?.id ?? null,
    itemLabel: firstFeature?.name ?? fallback[1],
    confidence: "low",
  };
}

/* ── Answer type suggestion ─────────────────────────────────── */

export function suggestAnswerType(question: string): string {
  const q = question.trim();
  if (/\b(yes|no|whether|confirm|support)\b/i.test(q) && /\?$/.test(q) && !/\b(which|how many|list)\b/i.test(q)) return "YES_NO";
  if (/\b(which|what .*options|select|choose|gateways?|providers?|integrations?|platforms?)\b/i.test(q)) return "MULTI_SELECT";
  if (/\b(how many|number|count|users?)\b/i.test(q) && /\d/.test(q) || /\bexpected number\b/i.test(q)) return "NUMBER";
  if (/\b(amount|budget|cost|price|₹|inr|usd|eur)\b/i.test(q)) return "CURRENCY";
  if (/\b(when|date|deadline|launch|by when)\b/i.test(q)) return "DATE";
  if (/\b(email address|email id|your email)\b/i.test(q)) return "EMAIL";
  if (/\b(phone|contact number|mobile number)\b/i.test(q)) return "PHONE";
  if (/\b(url|link|website|site)\b/i.test(q)) return "URL";
  if (/\b(upload|attach|file|pdf|brand guidelines|logo)\b/i.test(q)) return "FILE_UPLOAD";
  if (/\b(rate|rating|score|1-5|1 to 5)\b/i.test(q)) return "RATING";
  if (/\b(list|all|which|what)\b/i.test(q)) return "MULTI_SELECT";
  return "LONG_TEXT";
}

/* ── Curated options per category ───────────────────────────── */

const OPTION_SETS: Record<string, Record<string, string[]>> = {
  PAYMENTS: {
    "Payment gateway": ["Razorpay", "Stripe", "PayPal", "PayU", "Cashfree", "Other"],
    Subscriptions: ["Monthly", "Quarterly", "Yearly", "Custom"],
  },
  AUTHENTICATION: {
    "Login methods": ["Email + password", "Google", "Google + Microsoft", "Phone OTP", "All of the above"],
  },
  AUTHORIZATION: {
    Roles: ["Customer", "Admin", "Manager", "Custom roles"],
  },
  NOTIFICATIONS: {
    Push: ["Email", "Push notification", "SMS", "In-app", "All of the above"],
  },
  EMAIL: {
    Transactional: ["Order updates", "Account emails", "Marketing", "All of the above"],
  },
  TIMELINE: {
    Milestones: ["Within 1 month", "1–3 months", "3–6 months", "6+ months", "Flexible"],
  },
  BUDGET_COMMERCIAL: {
    Pricing: ["Fixed price", "Monthly retainer", "Milestone-based", "Not decided"],
  },
  MOBILE: {
    iOS: ["iOS only", "Android only", "Both iOS and Android"],
  },
  CORE_FUNCTIONALITY: {
    "Product catalogue": ["Manual entry", "Bulk CSV/Excel upload", "Both", "Not sure"],
    Checkout: ["Guest checkout", "Logged-in checkout", "Both"],
  },
  FEATURES: {
    "Feature scope": ["First release", "Later phase", "Out of scope"],
  },
};

export function optionsFor(category: string | null | undefined, subcategory: string | null | undefined, answerType: string): string[] {
  if (answerType === "YES_NO") return ["Yes", "No"];
  const set = OPTION_SETS[category ?? ""]?.[subcategory ?? ""];
  if (set && set.length > 0) return set;
  if (category === "PAYMENTS" && answerType === "MULTI_SELECT") return OPTION_SETS.PAYMENTS["Payment gateway"];
  return [];
}

/* ── Rule-based professional rewrite (AI-offline safety net) ──
   Turns a vague internal note into a contextual client question
   grounded in the classified item. Never invents requirements — it
   only asks for confirmation about the item already in context. */

export function buildClientQuestion(input: {
  note: string;
  section: string;
  category: string;
  subcategory: string;
  itemLabel: string;
  answerType: string;
}): { clientQuestion: string; currentUnderstanding: string; whyWeAsk: string; helpText: string } {
  const { category, subcategory, itemLabel, answerType } = input;
  const item = itemLabel || `${categoryLabel(category)} — ${subcategory}`;
  const isConfirm = answerType === "YES_NO";

  const clientQuestion = isConfirm
    ? `Could you confirm whether ${item.toLowerCase()} should be part of the project scope and how it should work?`
    : `Could you confirm what you expect for ${item.toLowerCase()} — specifically what should be included and how it should work?`;

  return {
    clientQuestion,
    currentUnderstanding: `The requirements currently reference ${item}, but the specific details were not captured.`,
    whyWeAsk: `This determines the exact scope of the ${categoryLabel(category).toLowerCase()} work and directly affects the proposal estimate.`,
    helpText: "Answer in your own words — there are no wrong answers. If you're unsure, say so and we'll advise.",
  };
}

/* ── Quality score — 0–100, gate is 70 ──────────────────────── */

export function scoreQuality(input: {
  clientQuestion: string;
  section: string;
  category: string | null;
  subcategory: string | null;
  answerType: string;
  options: string[];
  whyWeAsk?: string | null;
  currentUnderstanding?: string | null;
  impact?: Partial<ImpactMap>;
}): { score: number; flags: string[]; passed: boolean } {
  const flags: string[] = [];
  let score = 0;

  // Context — classification + section.
  if (input.section && input.category && input.subcategory) {
    score += 25;
  } else {
    flags.push("missing_classification");
  }

  // Specificity — not vague, interrogative, meaningful length.
  const q = input.clientQuestion.trim();
  const vague = isVague(q) || vagueFlags(q).length > 0;
  if (!vague && q.length >= 25 && /[?]|\b(whether|confirm|which|how|what|when|do you|are you)\b/i.test(q)) {
    score += 25;
  } else {
    flags.push(vague ? "vague_language" : "lacks_specificity");
  }

  // Answer type — appropriate + options for select types.
  const needsOptions = ["SINGLE_SELECT", "MULTI_SELECT", "DROPDOWN"].includes(input.answerType);
  if (input.answerType && input.answerType !== "CUSTOM") {
    score += 10;
  }
  if (needsOptions && input.options.length >= 2) score += 5;
  else if (needsOptions) flags.push("missing_options");

  // Why we ask + current understanding — client trust and context.
  if (input.whyWeAsk && input.whyWeAsk.trim().length >= 20) score += 10;
  else flags.push("missing_why");
  if (input.currentUnderstanding && input.currentUnderstanding.trim().length >= 15) score += 10;
  else flags.push("missing_context");

  // Impact awareness.
  const impact = input.impact ?? {};
  const impactAreas = Object.values(impact).filter((v) => v && v !== "UNKNOWN").length;
  if (impactAreas > 0) score += 10;
  else flags.push("missing_impact");

  return { score, flags, passed: score >= 70 };
}

/* ── Impact estimation — LOW / MEDIUM / HIGH / UNKNOWN ──────── */

const CATEGORY_IMPACT: Record<string, Partial<ImpactMap>> = {
  PAYMENTS: { scope: "HIGH", timeline: "MEDIUM", budget: "MEDIUM", complexity: "HIGH", risk: "HIGH" },
  AUTHENTICATION: { scope: "HIGH", timeline: "MEDIUM", budget: "LOW", complexity: "MEDIUM", risk: "HIGH" },
  AUTHORIZATION: { scope: "HIGH", timeline: "MEDIUM", budget: "LOW", complexity: "MEDIUM", risk: "MEDIUM" },
  SECURITY: { scope: "HIGH", timeline: "MEDIUM", budget: "MEDIUM", complexity: "HIGH", risk: "HIGH" },
  COMPLIANCE: { scope: "MEDIUM", timeline: "HIGH", budget: "MEDIUM", complexity: "MEDIUM", risk: "HIGH" },
  INFRASTRUCTURE: { scope: "MEDIUM", timeline: "HIGH", budget: "HIGH", complexity: "HIGH", risk: "MEDIUM" },
  CORE_FUNCTIONALITY: { scope: "HIGH", timeline: "HIGH", budget: "MEDIUM", complexity: "HIGH", risk: "HIGH" },
  FEATURES: { scope: "MEDIUM", timeline: "MEDIUM", budget: "MEDIUM", complexity: "MEDIUM", risk: "MEDIUM" },
  INTEGRATIONS: { scope: "MEDIUM", timeline: "MEDIUM", budget: "LOW", complexity: "MEDIUM", risk: "MEDIUM" },
  API_BACKEND: { scope: "MEDIUM", timeline: "MEDIUM", budget: "LOW", complexity: "HIGH", risk: "MEDIUM" },
  REPORTING_ANALYTICS: { scope: "MEDIUM", timeline: "LOW", budget: "LOW", complexity: "MEDIUM", risk: "LOW" },
  DASHBOARD: { scope: "MEDIUM", timeline: "LOW", budget: "LOW", complexity: "MEDIUM", risk: "LOW" },
  ADMIN_PANEL: { scope: "MEDIUM", timeline: "MEDIUM", budget: "MEDIUM", complexity: "MEDIUM", risk: "LOW" },
  MOBILE: { scope: "HIGH", timeline: "HIGH", budget: "HIGH", complexity: "HIGH", risk: "HIGH" },
  WEB: { scope: "MEDIUM", timeline: "LOW", budget: "LOW", complexity: "LOW", risk: "LOW" },
  DESIGN_BRANDING: { scope: "LOW", timeline: "LOW", budget: "LOW", complexity: "LOW", risk: "LOW" },
  FRONTEND_UI: { scope: "MEDIUM", timeline: "LOW", budget: "LOW", complexity: "LOW", risk: "LOW" },
  USER_ROLES: { scope: "MEDIUM", timeline: "MEDIUM", budget: "LOW", complexity: "MEDIUM", risk: "MEDIUM" },
  USER_JOURNEYS: { scope: "MEDIUM", timeline: "MEDIUM", budget: "MEDIUM", complexity: "MEDIUM", risk: "MEDIUM" },
  DATA: { scope: "MEDIUM", timeline: "HIGH", budget: "MEDIUM", complexity: "HIGH", risk: "HIGH" },
  TIMELINE: { scope: "MEDIUM", timeline: "HIGH", budget: "HIGH", complexity: "LOW", risk: "HIGH" },
  BUDGET_COMMERCIAL: { scope: "MEDIUM", timeline: "LOW", budget: "HIGH", complexity: "LOW", risk: "MEDIUM" },
  DELIVERABLES: { scope: "HIGH", timeline: "MEDIUM", budget: "MEDIUM", complexity: "LOW", risk: "MEDIUM" },
  NOTIFICATIONS: { scope: "LOW", timeline: "LOW", budget: "LOW", complexity: "LOW", risk: "LOW" },
  EMAIL: { scope: "LOW", timeline: "LOW", budget: "LOW", complexity: "LOW", risk: "LOW" },
  MESSAGING: { scope: "LOW", timeline: "LOW", budget: "LOW", complexity: "MEDIUM", risk: "LOW" },
  CLIENT_PORTAL: { scope: "MEDIUM", timeline: "MEDIUM", budget: "MEDIUM", complexity: "MEDIUM", risk: "MEDIUM" },
  PERFORMANCE: { scope: "MEDIUM", timeline: "HIGH", budget: "MEDIUM", complexity: "HIGH", risk: "HIGH" },
  CONTENT: { scope: "LOW", timeline: "LOW", budget: "LOW", complexity: "LOW", risk: "LOW" },
  SEO: { scope: "LOW", timeline: "LOW", budget: "LOW", complexity: "LOW", risk: "LOW" },
  TESTING: { scope: "MEDIUM", timeline: "MEDIUM", budget: "MEDIUM", complexity: "LOW", risk: "MEDIUM" },
  MAINTENANCE_SUPPORT: { scope: "LOW", timeline: "MEDIUM", budget: "MEDIUM", complexity: "LOW", risk: "LOW" },
  DEPLOYMENT: { scope: "LOW", timeline: "MEDIUM", budget: "LOW", complexity: "MEDIUM", risk: "MEDIUM" },
  THIRD_PARTY_SERVICES: { scope: "MEDIUM", timeline: "MEDIUM", budget: "MEDIUM", complexity: "MEDIUM", risk: "MEDIUM" },
  OTHER: { scope: "LOW", timeline: "LOW", budget: "UNKNOWN", complexity: "LOW", risk: "LOW" },
};

export function estimateImpact(category: string | null | undefined, priority: string): ImpactMap {
  const base: ImpactMap = { scope: "LOW", timeline: "LOW", budget: "UNKNOWN", complexity: "LOW", risk: "LOW" };
  const mapped = CATEGORY_IMPACT[category ?? ""] ?? CATEGORY_IMPACT.OTHER;
  const impact: ImpactMap = { ...base, ...mapped };
  if (priority === "BLOCKING") {
    for (const k of ["scope", "timeline", "risk"] as ImpactArea[]) {
      if (impact[k] !== "HIGH") impact[k] = "MEDIUM";
    }
  }
  if (category === "BUDGET_COMMERCIAL") impact.budget = "HIGH";
  return impact;
}

/* ── Priority estimation ────────────────────────────────────── */

export function estimatePriority(input: {
  category: string | null | undefined;
  subcategory: string | null | undefined;
  note: string;
}): "LOW" | "MEDIUM" | "HIGH" | "BLOCKING" {
  const { category, subcategory, note } = input;
  const text = `${category ?? ""} ${subcategory ?? ""} ${note}`;

  if (/payment gateway|checkout|login|primary business|core workflow|order|cart|billing/i.test(text)) return "BLOCKING";
  if (["PAYMENTS", "AUTHENTICATION", "AUTHORIZATION", "CORE_FUNCTIONALITY", "SECURITY", "COMPLIANCE", "INTEGRATIONS"].includes(category ?? "")) return "HIGH";
  if (["FEATURES", "ADMIN_PANEL", "DASHBOARD", "REPORTING_ANALYTICS", "DATA", "MOBILE", "API_BACKEND"].includes(category ?? "")) return "HIGH";
  if (["DESIGN_BRANDING", "CONTENT", "SEO", "NOTIFICATIONS", "EMAIL"].includes(category ?? "")) return "LOW";
  return "MEDIUM";
}

/* ── Proposal readiness check ───────────────────────────────── */

export function proposalBlockers(input: {
  questions: { category: string | null; subcategory: string | null; clientQuestion: string | null; status: string; isBlocking: boolean }[];
}): { blocked: boolean; blockers: { id: string; label: string; category: string }[] } {
  const blockers = input.questions
    .filter((q) => q.isBlocking && !["RESOLVED", "CANCELLED", "ANSWERED"].includes(q.status))
    .map((q) => ({
      id: "",
      label: q.clientQuestion ?? "Unresolved blocking question",
      category: categoryLabel(q.category) || q.subcategory || "Unclassified",
    }));
  return { blocked: blockers.length > 0, blockers };
}
