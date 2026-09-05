/**
 * CENTRAL CONFIGURATION REGISTRY
 * Authoritative registry of all system settings across the Business OS.
 * Every setting defines its key, category, scope, sensitivity, default value,
 * editable roles, dependencies, and affected modules.
 */

export type SettingScope =
  | "PERSONAL"
  | "TEAM"
  | "PROJECT"
  | "WORKSPACE"
  | "ORGANIZATION"
  | "SYSTEM";

export type SettingSensitivity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type SettingCategory =
  | "GENERAL"
  | "SECURITY"
  | "ACCESS"
  | "WORKFLOW"
  | "NOTIFICATION"
  | "INTEGRATION"
  | "PAYMENT"
  | "PORTAL"
  | "DATA"
  | "AI";

export interface SettingDefinition {
  key: string;
  name: string;
  description: string;
  category: SettingCategory;
  scope: SettingScope;
  type: "BOOLEAN" | "STRING" | "SELECT" | "NUMBER" | "JSON";
  defaultValue: any;
  options?: { label: string; value: any }[];
  sensitivity: SettingSensitivity;
  editableBy: ("OWNER" | "ADMIN" | "MEMBER")[];
  dependencies: string[];
  affectedModules: string[];
  helpText?: string;
}

export const CONFIGURATION_REGISTRY: Record<string, SettingDefinition> = {
  // ── GENERAL & WORKSPACE IDENTITY ──────────────────────────────
  "general.workspace_name": {
    key: "general.workspace_name",
    name: "Workspace Name",
    description: "The primary organizational entity name for this Business OS instance.",
    category: "GENERAL",
    scope: "WORKSPACE",
    type: "STRING",
    defaultValue: "Business OS Workspace",
    sensitivity: "LOW",
    editableBy: ["OWNER", "ADMIN"],
    dependencies: [],
    affectedModules: ["Header", "Client Portal", "Invoices", "Email Templates"],
  },
  "general.timezone": {
    key: "general.timezone",
    name: "Default Workspace Timezone",
    description: "Standard time zone for deadlines, build sessions, logs, and notification timestamps.",
    category: "GENERAL",
    scope: "WORKSPACE",
    type: "SELECT",
    defaultValue: "Asia/Kolkata",
    options: [
      { label: "Asia/Kolkata (IST +5:30)", value: "Asia/Kolkata" },
      { label: "UTC (Greenwich Mean Time)", value: "UTC" },
      { label: "America/New_York (EST)", value: "America/New_York" },
      { label: "America/Los_Angeles (PST)", value: "America/Los_Angeles" },
      { label: "Europe/London (BST/GMT)", value: "Europe/London" },
      { label: "Asia/Singapore (SGT)", value: "Asia/Singapore" },
    ],
    sensitivity: "LOW",
    editableBy: ["OWNER", "ADMIN"],
    dependencies: [],
    affectedModules: ["Tasks", "Projects", "Audit Logs", "Analytics"],
  },
  "general.date_format": {
    key: "general.date_format",
    name: "Date Display Format",
    description: "Standard calendar and date string format used across dashboards and generated reports.",
    category: "GENERAL",
    scope: "WORKSPACE",
    type: "SELECT",
    defaultValue: "DD/MM/YYYY",
    options: [
      { label: "DD/MM/YYYY (e.g. 21/08/2026)", value: "DD/MM/YYYY" },
      { label: "MM/DD/YYYY (e.g. 08/21/2026)", value: "MM/DD/YYYY" },
      { label: "YYYY-MM-DD (ISO standard)", value: "YYYY-MM-DD" },
    ],
    sensitivity: "LOW",
    editableBy: ["OWNER", "ADMIN"],
    dependencies: [],
    affectedModules: ["UI", "PDF Generator", "Excel Export"],
  },
  "general.currency": {
    key: "general.currency",
    name: "Base Operating Currency",
    description: "Base currency unit for project billing, proposals, client invoices, and financial ledger.",
    category: "GENERAL",
    scope: "ORGANIZATION",
    type: "SELECT",
    defaultValue: "USD",
    options: [
      { label: "USD - United States Dollar ($)", value: "USD" },
      { label: "INR - Indian Rupee (₹)", value: "INR" },
      { label: "EUR - Euro (€)", value: "EUR" },
      { label: "GBP - British Pound (£)", value: "GBP" },
      { label: "AUD - Australian Dollar (A$)", value: "AUD" },
    ],
    sensitivity: "MEDIUM",
    editableBy: ["OWNER", "ADMIN"],
    dependencies: ["payments.confirmation_workflow", "billing.invoices"],
    affectedModules: ["Payments", "Proposals", "Invoices", "Analytics", "Financial Ledger"],
  },

  // ── SECURITY & POSTURE ───────────────────────────────────────
  "security.mfa_enforcement": {
    key: "security.mfa_enforcement",
    name: "Multi-Factor Authentication (MFA) Policy",
    description: "Requires all administrators and employees to provide an authenticator code or passkey at login.",
    category: "SECURITY",
    scope: "ORGANIZATION",
    type: "SELECT",
    defaultValue: "OPTIONAL",
    options: [
      { label: "Optional for all members", value: "OPTIONAL" },
      { label: "Mandatory for Admins & Owners", value: "ADMINS_ONLY" },
      { label: "Mandatory for all workspace members", value: "MANDATORY" },
    ],
    sensitivity: "CRITICAL",
    editableBy: ["OWNER"],
    dependencies: ["auth.sessions", "auth.login_pipeline"],
    affectedModules: ["Authentication", "Sessions", "Member Access", "Employee Login"],
  },
  "security.session_timeout_minutes": {
    key: "security.session_timeout_minutes",
    name: "Session Inactivity Timeout",
    description: "Automatic session revocation duration when an authenticated device remains idle.",
    category: "SECURITY",
    scope: "WORKSPACE",
    type: "SELECT",
    defaultValue: 1440,
    options: [
      { label: "15 minutes (Strict Banking)", value: 15 },
      { label: "60 minutes (High Security)", value: 60 },
      { label: "8 hours (Standard Workday)", value: 480 },
      { label: "24 hours (1 Day)", value: 1440 },
      { label: "7 days (Extended)", value: 10080 },
    ],
    sensitivity: "HIGH",
    editableBy: ["OWNER", "ADMIN"],
    dependencies: ["auth.sessions"],
    affectedModules: ["Auth Session", "API Middleware"],
  },
  "security.password_min_length": {
    key: "security.password_min_length",
    name: "Minimum Password Length",
    description: "Minimum character length requirement for employee and member credentials.",
    category: "SECURITY",
    scope: "ORGANIZATION",
    type: "NUMBER",
    defaultValue: 10,
    sensitivity: "MEDIUM",
    editableBy: ["OWNER", "ADMIN"],
    dependencies: [],
    affectedModules: ["Authentication", "Registration", "Employee Invitations"],
  },
  "security.ip_allowlist_enabled": {
    key: "security.ip_allowlist_enabled",
    name: "Strict IP Address Allowlist",
    description: "Restricts workspace and control plane access exclusively to approved CIDR ranges.",
    category: "SECURITY",
    scope: "ORGANIZATION",
    type: "BOOLEAN",
    defaultValue: false,
    sensitivity: "CRITICAL",
    editableBy: ["OWNER"],
    dependencies: ["network.firewall"],
    affectedModules: ["API Gateway", "Dashboard Access"],
  },

  // ── ACCESS & PERMISSION INHERITANCE ──────────────────────────
  "access.invitation_expiration_days": {
    key: "access.invitation_expiration_days",
    name: "Employee Invitation Expiry Window",
    description: "Number of days before an issued cryptographic invitation token becomes void.",
    category: "ACCESS",
    scope: "WORKSPACE",
    type: "NUMBER",
    defaultValue: 7,
    sensitivity: "MEDIUM",
    editableBy: ["OWNER", "ADMIN"],
    dependencies: ["invitations.tokens"],
    affectedModules: ["Employee Onboarding", "Invitations"],
  },
  "access.default_employee_role": {
    key: "access.default_employee_role",
    name: "Default Assigned Employee Role",
    description: "Base RBAC role assigned to newly invited colleagues when no specific role is chosen.",
    category: "ACCESS",
    scope: "WORKSPACE",
    type: "STRING",
    defaultValue: "Staff Full-Stack Engineer",
    sensitivity: "MEDIUM",
    editableBy: ["OWNER", "ADMIN"],
    dependencies: ["roles.matrix"],
    affectedModules: ["Roles", "Staffing", "Permission Engine"],
  },

  // ── WORKFLOW & BUSINESS RULES ────────────────────────────────
  "workflow.proof_review_required": {
    key: "workflow.proof_review_required",
    name: "Mandatory Proof of Work Verification",
    description: "Tasks cannot be marked completed without QA or Admin approval of submitted evidence.",
    category: "WORKFLOW",
    scope: "WORKSPACE",
    type: "BOOLEAN",
    defaultValue: true,
    sensitivity: "HIGH",
    editableBy: ["OWNER", "ADMIN"],
    dependencies: ["tasks.evidence", "tasks.verification"],
    affectedModules: ["Client Tasks", "Employee OS", "Build Submissions", "QA Reviews"],
  },
  "workflow.proposal_approval_creates_project": {
    key: "workflow.proposal_approval_creates_project",
    name: "Auto-Generate Project on Proposal Signoff",
    description: "Server-side business rule: Client proposal approval immediately provisions client project.",
    category: "WORKFLOW",
    scope: "WORKSPACE",
    type: "BOOLEAN",
    defaultValue: true,
    sensitivity: "HIGH",
    editableBy: ["OWNER", "ADMIN"],
    dependencies: ["proposals.status", "projects.provisioning"],
    affectedModules: ["Proposals", "Projects", "Blueprint Engine"],
  },
  "workflow.client_change_request_policy": {
    key: "workflow.client_change_request_policy",
    name: "Client Change Request Workflow",
    description: "Governs whether scope modifications by clients require formal proposal revision or direct intake.",
    category: "WORKFLOW",
    scope: "WORKSPACE",
    type: "SELECT",
    defaultValue: "REVISE_PROPOSAL",
    options: [
      { label: "Formal Proposal Revision & Resign", value: "REVISE_PROPOSAL" },
      { label: "Inline Scope Addendum with Owner Confirmation", value: "SCOPE_ADDENDUM" },
    ],
    sensitivity: "HIGH",
    editableBy: ["OWNER", "ADMIN"],
    dependencies: ["proposals.revisions", "requirements.scope"],
    affectedModules: ["Client Portal", "Proposals", "Requirements"],
  },

  // ── PAYMENTS & FINANCIAL SAFETY ──────────────────────────────
  "payments.confirmation_workflow": {
    key: "payments.confirmation_workflow",
    name: "Payment Confirmation Policy",
    description: "Policy governing whether received client payments require dual verification or admin confirmation.",
    category: "PAYMENT",
    scope: "ORGANIZATION",
    type: "SELECT",
    defaultValue: "ADMIN_CONFIRMATION",
    options: [
      { label: "Admin Confirmation Required", value: "ADMIN_CONFIRMATION" },
      { label: "Dual Verification (Admin + Owner)", value: "DUAL_VERIFICATION" },
      { label: "Automatic on Verified Gateway Webhook", value: "GATEWAY_WEBHOOK" },
    ],
    sensitivity: "CRITICAL",
    editableBy: ["OWNER"],
    dependencies: ["financial.ledger", "receipts.generator", "client_portal.payments"],
    affectedModules: ["Client Payments", "Invoices", "Receipts", "Excel Data Hub", "Audit"],
  },
  "payments.auto_generate_receipt": {
    key: "payments.auto_generate_receipt",
    name: "Automatic Receipt Generation on Confirmation",
    description: "Server-side execution: Generate cryptographically stamped PDF receipt upon confirmed payment.",
    category: "PAYMENT",
    scope: "WORKSPACE",
    type: "BOOLEAN",
    defaultValue: true,
    sensitivity: "MEDIUM",
    editableBy: ["OWNER", "ADMIN"],
    dependencies: ["payments.confirmation_workflow", "documents.pdf"],
    affectedModules: ["PDF Generator", "Receipts", "Client Portal"],
  },

  // ── CLIENT PORTAL VISIBILITY MATRIX ──────────────────────────
  "portal.client_payment_visibility": {
    key: "portal.client_payment_visibility",
    name: "Client Payment & Invoice Visibility",
    description: "Determines if clients can inspect billing statements, transaction logs, and payment status.",
    category: "PORTAL",
    scope: "WORKSPACE",
    type: "BOOLEAN",
    defaultValue: true,
    sensitivity: "HIGH",
    editableBy: ["OWNER", "ADMIN"],
    dependencies: ["portal.auth", "payments.records"],
    affectedModules: ["Client Portal", "Invoices", "Payment Gateway"],
  },
  "portal.employee_notes_shielded": {
    key: "portal.employee_notes_shielded",
    name: "Shield Internal Engineering Notes from Clients",
    description: "Enforces strict air-gap: Internal dev logs, employee tickets, and QA audits never leak to portal.",
    category: "PORTAL",
    scope: "WORKSPACE",
    type: "BOOLEAN",
    defaultValue: true,
    sensitivity: "CRITICAL",
    editableBy: ["OWNER", "ADMIN"],
    dependencies: ["tasks.notes", "projects.logs"],
    affectedModules: ["Client Portal", "Work Messages", "Employee OS"],
  },

  // ── INTEGRATIONS & EXCEL DATA HUB ────────────────────────────
  "integrations.excel_sync_policy": {
    key: "integrations.excel_sync_policy",
    name: "Excel Data Hub Synchronization Mode",
    description: "Controls synchronization direction and conflict resolution between Excel workbooks and Business OS database.",
    category: "INTEGRATION",
    scope: "WORKSPACE",
    type: "SELECT",
    defaultValue: "BIDIRECTIONAL_CONFIRM",
    options: [
      { label: "Bidirectional with Conflict Confirmation", value: "BIDIRECTIONAL_CONFIRM" },
      { label: "Export Only (OS is Master)", value: "EXPORT_ONLY" },
      { label: "Import Only (Excel is Master)", value: "IMPORT_ONLY" },
      { label: "Disabled / Read-Only", value: "DISABLED" },
    ],
    sensitivity: "HIGH",
    editableBy: ["OWNER", "ADMIN"],
    dependencies: ["excel.hub", "database.records"],
    affectedModules: ["Excel Data Hub", "Database Entities", "Sync Runs"],
  },
  "integrations.webhook_retry_count": {
    key: "integrations.webhook_retry_count",
    name: "Webhook Delivery Retry Attempts",
    description: "Number of exponential backoff retry cycles executed for outbound webhook events before marking failed.",
    category: "INTEGRATION",
    scope: "WORKSPACE",
    type: "NUMBER",
    defaultValue: 3,
    sensitivity: "LOW",
    editableBy: ["OWNER", "ADMIN"],
    dependencies: ["webhooks.dispatcher"],
    affectedModules: ["Webhooks", "Event Stream"],
  },

  // ── NOTIFICATIONS & ROUTING ──────────────────────────────────
  "notification.security_alerts_mandatory": {
    key: "notification.security_alerts_mandatory",
    name: "Mandatory Security Alerts",
    description: "Critical security notifications (login from new device, role changes, secret rotations) cannot be muted.",
    category: "NOTIFICATION",
    scope: "ORGANIZATION",
    type: "BOOLEAN",
    defaultValue: true,
    sensitivity: "HIGH",
    editableBy: ["OWNER"],
    dependencies: ["email.service", "security.audit"],
    affectedModules: ["Notifications", "Email Dispatcher", "Audit"],
  },
  "notification.task_assignment_channel": {
    key: "notification.task_assignment_channel",
    name: "Task Assignment Notification Channel",
    description: "Preferred delivery route when tasks or build items are assigned to an engineer.",
    category: "NOTIFICATION",
    scope: "WORKSPACE",
    type: "SELECT",
    defaultValue: "IN_APP_AND_EMAIL",
    options: [
      { label: "In-App Notification and Email", value: "IN_APP_AND_EMAIL" },
      { label: "In-App Notification Only", value: "IN_APP_ONLY" },
      { label: "Email Digest Only", value: "EMAIL_DIGEST" },
    ],
    sensitivity: "LOW",
    editableBy: ["OWNER", "ADMIN"],
    dependencies: ["email.service"],
    affectedModules: ["Employee OS", "Notifications"],
  },

  // ── DATA GOVERNANCE & RETENTION ──────────────────────────────
  "data.audit_retention_days": {
    key: "data.audit_retention_days",
    name: "Audit Log & Event Trail Retention",
    description: "Minimum retention duration for configuration, access, and security audit records.",
    category: "DATA",
    scope: "ORGANIZATION",
    type: "SELECT",
    defaultValue: 365,
    options: [
      { label: "90 Days (Minimal)", value: 90 },
      { label: "180 Days (Standard)", value: 180 },
      { label: "365 Days (Enterprise 1 Year)", value: 365 },
      { label: "730 Days (2 Years Compliance)", value: 730 },
      { label: "Indefinite / Permanent", value: 0 },
    ],
    sensitivity: "HIGH",
    editableBy: ["OWNER"],
    dependencies: ["audit.storage"],
    affectedModules: ["Audit Trail", "Data Management", "Compliance"],
  },

  // ── AI CONTROL & GOVERNANCE ──────────────────────────────────
  "ai.context_permission_boundary": {
    key: "ai.context_permission_boundary",
    name: "AI Grounding Data Permission Boundary",
    description: "Restricts information accessible to AI agents and Ollama inference models during blueprint generation.",
    category: "AI",
    scope: "WORKSPACE",
    type: "SELECT",
    defaultValue: "EXCLUDE_FINANCIALS_AND_KEYS",
    options: [
      { label: "Exclude Financial Data, Secrets, and API Keys", value: "EXCLUDE_FINANCIALS_AND_KEYS" },
      { label: "Engineering Scope Only (Requirements & Blueprints)", value: "ENGINEERING_ONLY" },
      { label: "Full Workspace Context (Strict Admin Authorization)", value: "FULL_WORKSPACE_AUTHORIZED" },
    ],
    sensitivity: "HIGH",
    editableBy: ["OWNER", "ADMIN"],
    dependencies: ["ai.ollama", "authorization.matrix"],
    affectedModules: ["AI Engine", "Blueprints", "Task Generation"],
  },
};
