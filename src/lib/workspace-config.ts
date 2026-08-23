/* ────────────────────────────────────────────────────────────────
   Workspace configuration — the real data model of the Workspace
   Creation Engine. Every field here is persisted per user and is
   workspace-scoped (resolved from the authenticated session).
──────────────────────────────────────────────────────────────── */

export type ThemeChoice = "SYSTEM" | "LIGHT" | "DARK";

export type WorkspaceConfig = {
  companyName: string;
  profile: {
    legalName: string;
    website: string;
    businessEmail: string;
    businessPhone: string;
  };
  business: {
    industry: string;
    businessType: string;
    businessModel: string;
    description: string;
    services: string[];
    targetCustomers: string[];
  };
  setup: {
    leadSources: string[];
    approvalFlow: string[];
    executionMode: string;
    teamSize: string;
    roles: string[];
    workTypes: string[];
    projectDuration: string;
    clientVolume: string;
    currentTools: string[];
  };
  preferences: {
    theme: ThemeChoice;
    defaultLanding: string;
    timezone: string;
    dateFormat: string;
  };
  notifications: {
    email: boolean;
    tasks: boolean;
    clients: boolean;
    projects: boolean;
    proposals: boolean;
    system: boolean;
  };
};

export function emptyConfig(prefill = ""): WorkspaceConfig {
  return {
    companyName: prefill,
    profile: { legalName: "", website: "", businessEmail: "", businessPhone: "" },
    business: {
      industry: "",
      businessType: "",
      businessModel: "",
      description: "",
      services: [],
      targetCustomers: [],
    },
    setup: {
      leadSources: [],
      approvalFlow: [],
      executionMode: "",
      teamSize: "",
      roles: [],
      workTypes: [],
      projectDuration: "",
      clientVolume: "",
      currentTools: [],
    },
    preferences: {
      theme: "SYSTEM",
      defaultLanding: "Overview",
      timezone: "Asia/Kolkata",
      dateFormat: "DD/MM/YYYY",
    },
    notifications: {
      email: true,
      tasks: true,
      clients: true,
      projects: true,
      proposals: true,
      system: true,
    },
  };
}

/* ── JSON list helpers (SQLite stores arrays as JSON strings) ── */
export function parseList(json: string | null | undefined): string[] {
  try {
    const value = JSON.parse(json ?? "[]");
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function toList(list: string[]): string {
  return JSON.stringify(list);
}

/**
 * Merge a (possibly partial) client payload over the full defaults.
 * The autosave API accepts any subset of the configuration; this makes
 * the persisted result always complete and well-shaped.
 */
export function mergeConfig(data: Partial<WorkspaceConfig>): WorkspaceConfig {
  const base = emptyConfig();
  return {
    companyName: data.companyName ?? base.companyName,
    profile: { ...base.profile, ...data.profile },
    business: {
      ...base.business,
      ...data.business,
      services: data.business?.services ?? base.business.services,
      targetCustomers: data.business?.targetCustomers ?? base.business.targetCustomers,
    },
    setup: {
      ...base.setup,
      ...data.setup,
      leadSources: data.setup?.leadSources ?? base.setup.leadSources,
      approvalFlow: data.setup?.approvalFlow ?? base.setup.approvalFlow,
      roles: data.setup?.roles ?? base.setup.roles,
      workTypes: data.setup?.workTypes ?? base.setup.workTypes,
      currentTools: data.setup?.currentTools ?? base.setup.currentTools,
    },
    preferences: { ...base.preferences, ...data.preferences },
    notifications: { ...base.notifications, ...data.notifications },
  };
}

/* ── Option sets (from the workspace configuration spec) ── */

export const INDUSTRIES = [
  "Software & Technology",
  "Marketing Agency",
  "Consulting",
  "E-commerce",
  "Design Studio",
  "Agency / Services",
  "Product Company",
  "Freelance / Solo",
  "Other",
] as const;

export const BUSINESS_TYPES = [
  "Product company",
  "Service company",
  "Agency",
  "Consultancy",
  "Freelance / Solo",
  "Internal team",
] as const;

export const BUSINESS_MODELS = [
  "Project-based",
  "Retainer",
  "Product / SaaS",
  "Mixed",
] as const;

export const SERVICES = [
  "Web Development",
  "Mobile Development",
  "UI/UX Design",
  "AI Automation",
  "Branding",
  "Marketing",
  "Consulting",
  "Support & Maintenance",
  "Other",
] as const;

export const TARGET_CUSTOMERS = [
  "Startups",
  "SMBs",
  "Enterprise",
  "Individuals",
  "Other businesses",
  "Internal teams",
] as const;

export const LEAD_SOURCES = [
  "Client inquiry",
  "Website",
  "Email",
  "WhatsApp",
  "Referral",
  "Sales team",
  "Existing customers",
  "Other",
] as const;

export const APPROVAL_FLOWS = [
  "Manual approval",
  "Proposal approval",
  "Contract signed",
  "Payment received",
  "Internal decision",
  "Other",
] as const;

export const EXECUTION_MODES = [
  "Projects",
  "Milestones",
  "Tasks",
  "Tickets",
  "Campaigns",
  "Other",
] as const;

export const TEAM_SIZES = [
  "Just me",
  "2–5",
  "6–10",
  "11–25",
  "26–50",
  "51–100",
  "100+",
] as const;

export const ROLES = [
  "Founder",
  "Manager",
  "Sales",
  "Designer",
  "Frontend",
  "Backend",
  "QA",
  "Marketing",
  "Finance",
  "Operations",
  "Other",
] as const;

export const WORK_TYPES = [
  "Web Development",
  "Mobile Development",
  "Software Products",
  "UI/UX",
  "Marketing",
  "Consulting",
  "E-commerce",
  "Internal Projects",
  "Other",
] as const;

export const PROJECT_DURATIONS = [
  "< 1 month",
  "1–3 months",
  "3–6 months",
  "6–12 months",
  "Ongoing",
] as const;

export const CLIENT_VOLUMES = [
  "1–2 at a time",
  "3–5 at a time",
  "6–10 at a time",
  "10+ at a time",
] as const;

export const CURRENT_TOOLS = [
  "Spreadsheet",
  "Email",
  "WhatsApp",
  "CRM",
  "Project Management",
  "Documents",
  "Multiple tools",
] as const;

export const TIMEZONES = [
  "UTC",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
] as const;

export const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] as const;

export const LANDING_AREAS = ["Overview", "Clients", "Projects", "Tasks"] as const;

/* ── Preview adaptation — Business OS adapts to the business ── */

export function navForIndustry(industry: string): string[] {
  const nav: Record<string, string[]> = {
    "Software & Technology": ["CLIENTS", "PROJECTS", "REQUIREMENTS", "DEVELOPMENT", "TASKS"],
    "Marketing Agency": ["CLIENTS", "CAMPAIGNS", "REQUIREMENTS", "PROJECTS", "TASKS"],
    Consulting: ["CLIENTS", "ENGAGEMENTS", "REQUIREMENTS", "DELIVERABLES"],
    "E-commerce": ["CLIENTS", "PRODUCTS", "ORDERS", "PROJECTS", "TASKS"],
    "Design Studio": ["CLIENTS", "PROJECTS", "DESIGNS", "REVIEWS", "TASKS"],
    "Product Company": ["CLIENTS", "PRODUCTS", "ROADMAP", "RELEASES", "TASKS"],
  };
  return nav[industry] ?? ["CLIENTS", "PROJECTS", "REQUIREMENTS", "TASKS", "EMPLOYEES", "DOCUMENTS"];
}

/** Representative project names per work type — visual configuration only. */
export function projectForWorkType(workType: string): string {
  const projects: Record<string, string> = {
    "Web Development": "Website Redesign",
    "Mobile Development": "Mobile App — MVP",
    "Software Products": "SaaS Platform",
    "UI/UX": "Product Design Sprint",
    Marketing: "Launch Campaign",
    Consulting: "Process Audit",
    "E-commerce": "Storefront Build",
    "Internal Projects": "Internal Tool",
  };
  return projects[workType] ?? "New Project";
}

/** Milestone skeleton — matches the roadmap stages. */
export const PROJECT_MILESTONES = ["Discovery", "Design", "Development", "Testing", "Delivery"];
