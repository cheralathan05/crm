import {
  BarChart3,
  CheckSquare,
  ClipboardList,
  CreditCard,
  FileText,
  FolderKanban,
  FolderOpen,
  GitBranch,
  LayoutDashboard,
  MessageSquare,
  Settings,
  UserRoundCog,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────
   BUSINESS OS — NAVIGATION CONFIGURATION
   The single source of truth for sidebar, command menu and the
   module pages. Never duplicate this structure anywhere else.
──────────────────────────────────────────────────────────────── */

export type UserRole = "OWNER" | "ADMIN" | "MEMBER";

/** Which badge a nav item reads from the server-side counts. */
export type BadgeKey = "requirements" | "tasks" | "messages" | "notifications";

/** Sub-navigation entries. `view` becomes a ?view= query param. */
export interface NavChild {
  label: string;
  view?: string;
  roles?: UserRole[];
}

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  badgeKey?: BadgeKey;
  /** Restrict the whole item to these roles. */
  roles?: UserRole[];
  /** Integration state indicator (GitHub). */
  status?: "github";
  children?: NavChild[];
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

const ALL: UserRole[] = ["OWNER", "ADMIN", "MEMBER"];
const STAFF: UserRole[] = ["OWNER", "ADMIN"];

/* ── Workspace sections ─────────────────────────────────────── */

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Workspace",
    items: [
      {
        label: "Overview",
        href: "/dashboard",
        icon: LayoutDashboard,
        description: "Your Business OS home — the state of the business at a glance.",
      },
      {
        label: "Clients",
        href: "/clients",
        icon: Users,
        description: "Every relationship, lead and account in one place.",
        roles: STAFF,
        children: [
          { label: "All Clients" },
          { label: "Active", view: "active" },
          { label: "Leads", view: "leads" },
          { label: "Archived", view: "archived" },
        ],
      },
      {
        label: "Requirements",
        href: "/requirements",
        icon: ClipboardList,
        description: "What clients need, from submission to approval.",
        badgeKey: "requirements",
        roles: STAFF,
        children: [
          { label: "All Requirements" },
          { label: "Needs Review", view: "needs-review" },
          { label: "Changes Requested", view: "changes-requested" },
          { label: "Approved", view: "approved" },
        ],
      },
      {
        label: "Proposals",
        href: "/proposals",
        icon: FileText,
        description: "Turn approved requirements into clear, priced proposals.",
        roles: STAFF,
        children: [
          { label: "All Proposals" },
          { label: "Draft", view: "draft" },
          { label: "Sent", view: "sent" },
          { label: "Viewed", view: "viewed" },
          { label: "Approved", view: "approved" },
          { label: "Changes Requested", view: "changes-requested" },
        ],
      },
      {
        label: "Projects",
        href: "/projects",
        icon: FolderKanban,
        description: "Plan, run and deliver client work.",
        children: [
          { label: "All Projects" },
          { label: "Active", view: "active" },
          { label: "Planning", view: "planning" },
          { label: "At Risk", view: "at-risk" },
          { label: "Completed", view: "completed" },
        ],
      },
      {
        label: "Tasks",
        href: "/tasks",
        icon: CheckSquare,
        description: "The work that keeps projects moving — assigned and tracked.",
        badgeKey: "tasks",
        children: [
          { label: "All Tasks" },
          { label: "My Tasks", view: "my" },
          { label: "Today", view: "today" },
          { label: "Upcoming", view: "upcoming" },
          { label: "Overdue", view: "overdue" },
          { label: "Completed", view: "completed" },
        ],
      },
      {
        label: "Employees",
        href: "/employees",
        icon: UserRoundCog,
        description: "Your team, their roles and workload.",
        roles: STAFF,
        children: [
          { label: "All Employees" },
          { label: "Teams", view: "teams" },
          { label: "Roles", view: "roles" },
          { label: "Workload", view: "workload" },
        ],
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        label: "Messages",
        href: "/messages",
        icon: MessageSquare,
        description: "Every conversation with clients and your team.",
        badgeKey: "messages",
        children: [
          { label: "Inbox", view: "inbox" },
          { label: "Sent", view: "sent" },
          { label: "Client Conversations", view: "clients" },
          { label: "Internal", view: "internal" },
        ],
      },
      {
        label: "Documents",
        href: "/documents",
        icon: FolderOpen,
        description: "Files connected to clients, requirements, proposals and projects.",
        children: [
          { label: "All Documents" },
          { label: "Client Documents", view: "clients" },
          { label: "Requirements", view: "requirements" },
          { label: "Proposals", view: "proposals" },
          { label: "Project Files", view: "projects" },
          { label: "Payment Receipts", view: "receipts" },
        ],
      },
      {
        label: "Payments",
        href: "/payments",
        icon: CreditCard,
        description: "Invoices, transactions and payment status.",
        roles: STAFF,
        children: [
          { label: "Overview" },
          { label: "Payment Requests", view: "requests" },
          { label: "Awaiting Verification", view: "verification" },
          { label: "Transactions", view: "ledger" },
          { label: "Receipts", view: "receipts" },
        ],
      },
      {
        label: "Automations",
        href: "/automations",
        icon: Zap,
        description: "Workflows that connect requirement → proposal → project → tasks.",
        roles: STAFF,
        children: [
          { label: "Workflows", view: "workflows" },
          { label: "Templates", view: "templates" },
          { label: "Activity", view: "activity" },
        ],
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        label: "Analytics",
        href: "/analytics",
        icon: BarChart3,
        description: "See how clients, projects, team and revenue are moving.",
        roles: STAFF,
        children: [
          { label: "Overview" },
          { label: "Clients", view: "clients" },
          { label: "Projects", view: "projects" },
          { label: "Team", view: "team" },
          { label: "Revenue", view: "revenue", roles: STAFF },
        ],
      },
    ],
  },
  {
    label: "Development",
    items: [
      {
        label: "GitHub",
        href: "/github",
        icon: GitBranch,
        description: "Keep engineering work connected to the business.",
        status: "github",
        children: [
          { label: "Overview" },
          { label: "Repositories", view: "repositories" },
          { label: "Issues", view: "issues" },
          { label: "Pull Requests", view: "pulls" },
          { label: "Activity", view: "activity" },
        ],
      },
    ],
  },
];

/* ── Settings (pinned at the bottom) ───────────────────────── */

export const SETTINGS_ITEM: NavItem = {
  label: "Settings",
  href: "/settings",
  icon: Settings,
  description: "Workspace, team, roles and account configuration.",
  children: [
    { label: "Workspace", view: "workspace", roles: STAFF },
    { label: "Profile", view: "profile" },
    { label: "Team", view: "team", roles: STAFF },
    { label: "Roles & Permissions", view: "roles", roles: STAFF },
    { label: "Notifications", view: "notifications" },
    { label: "Integrations", view: "integrations", roles: STAFF },
    { label: "Billing", view: "billing", roles: STAFF },
    { label: "Security", view: "security" },
  ],
};

/* ── Role filtering ────────────────────────────────────────── */

function filterChildren(item: NavItem, role: UserRole): NavItem {
  const children = item.children?.filter((c) => !c.roles || c.roles.includes(role));
  return { ...item, children };
}

/** Tasks — "My Tasks" becomes the first, prominent entry for members. */
function orderTasksForMember(item: NavItem, role: UserRole): NavItem {
  if (item.label !== "Tasks" || role !== "MEMBER" || !item.children) return item;
  const my = item.children.find((c) => c.view === "my");
  const rest = item.children.filter((c) => c.view !== "my");
  return my ? { ...item, children: [my, ...rest] } : item;
}

export function navForRole(role: UserRole): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items
      .filter((item) => !item.roles || item.roles.includes(role))
      .map((item) => orderTasksForMember(filterChildren(item, role), role)),
  })).filter((section) => section.items.length > 0);
}

export function settingsForRole(role: UserRole): NavItem {
  return filterChildren(SETTINGS_ITEM, role);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

/* ── Lookups ───────────────────────────────────────────────── */

const ALL_ITEMS: NavItem[] = [...NAV_SECTIONS.flatMap((s) => s.items), SETTINGS_ITEM];

export function findItemByHref(href: string): NavItem | undefined {
  return ALL_ITEMS.find((i) => i.href === href);
}

/* ── Command menu ──────────────────────────────────────────── */

export interface CommandEntry {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  href: string;
  keywords: string;
  group: "navigation" | "actions";
}

export const QUICK_ACTIONS: { label: string; href: string; icon: LucideIcon; roles: UserRole[] }[] = [
  { label: "Create Client", href: "/clients?new=1", icon: Users, roles: STAFF },
  { label: "Create Requirement", href: "/requirements?new=1", icon: ClipboardList, roles: STAFF },
  { label: "Create Proposal", href: "/proposals?new=1", icon: FileText, roles: STAFF },
  { label: "Create Project", href: "/projects?new=1", icon: FolderKanban, roles: STAFF },
  { label: "Create Task", href: "/tasks?new=1", icon: CheckSquare, roles: ALL },
];

export function commandEntriesForRole(role: UserRole): CommandEntry[] {
  const entries: CommandEntry[] = [];

  for (const section of navForRole(role)) {
    for (const item of section.items) {
      entries.push({
        id: `nav:${item.href}`,
        label: item.label,
        hint: section.label,
        icon: item.icon,
        href: item.href,
        keywords: item.label.toLowerCase(),
        group: "navigation",
      });
      for (const child of item.children ?? []) {
        entries.push({
          id: `nav:${item.href}:${child.view ?? "all"}`,
          label: child.label,
          hint: `${section.label} · ${item.label}`,
          icon: item.icon,
          href: child.view ? `${item.href}?view=${child.view}` : item.href,
          keywords: `${child.label} ${item.label}`.toLowerCase(),
          group: "navigation",
        });
      }
    }
  }

  const settings = settingsForRole(role);
  for (const child of settings.children ?? []) {
    entries.push({
      id: `nav:${settings.href}:${child.view ?? "all"}`,
      label: child.label,
      hint: `Settings · ${settings.label}`,
      icon: Settings,
      href: child.view ? `${settings.href}?view=${child.view}` : settings.href,
      keywords: `${child.label} settings`.toLowerCase(),
      group: "navigation",
    });
  }

  for (const action of QUICK_ACTIONS) {
    if (action.roles.some((r) => r === role)) {
      entries.push({
        id: `action:${action.href}`,
        label: action.label,
        hint: "Quick action",
        icon: action.icon,
        href: action.href,
        keywords: `${action.label} create new`.toLowerCase(),
        group: "actions",
      });
    }
  }

  return entries;
}
