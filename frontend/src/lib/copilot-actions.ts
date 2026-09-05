/* ────────────────────────────────────────────────────────────────
   COPILOT ACTIONS — structured, executable suggestions.
   The model appends a single machine-readable block to a reply:
     [ACTION]{"type":"create_task","title":"Follow up with Priya"}[/ACTION]
   The UI parses it into a real action chip (whitelist only — the
   model can never trigger arbitrary code or endpoints), strips the
   block from displayed text, and executes via the existing
   workspace-scoped APIs.
──────────────────────────────────────────────────────────────── */

export type CopilotActionType =
  | "open_requirement"
  | "create_task"
  | "create_activity"
  | "create_note"
  | "create_proposal";

export type CopilotAction = {
  type: CopilotActionType;
  title?: string;
  content?: string;
  amount?: number;
};

const TYPE_RULES: Record<CopilotActionType, { required: ("title" | "content")[]; maxTitle: number; maxContent: number }> = {
  open_requirement: { required: [], maxTitle: 0, maxContent: 0 },
  create_task: { required: ["title"], maxTitle: 120, maxContent: 0 },
  create_activity: { required: ["title"], maxTitle: 120, maxContent: 0 },
  create_note: { required: ["content"], maxTitle: 0, maxContent: 800 },
  create_proposal: { required: ["title"], maxTitle: 120, maxContent: 0 },
};

const BLOCK_RE = /\[ACTION\]([\s\S]*?)\[\/ACTION\]/g;

/** Extract validated action blocks from a model reply. Never throws. */
export function parseActions(content: string): CopilotAction[] {
  const actions: CopilotAction[] = [];
  for (const match of content.matchAll(BLOCK_RE)) {
    let raw: unknown;
    try {
      raw = JSON.parse(match[1].trim());
    } catch {
      continue; // malformed block — ignore, text still displays fine
    }
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const type = r.type;
    if (typeof type !== "string" || !(type in TYPE_RULES)) continue;

    const rule = TYPE_RULES[type as CopilotActionType];
    const action: CopilotAction = { type: type as CopilotActionType };

    let valid = true;
    for (const key of rule.required) {
      const value = typeof r[key] === "string" ? (r[key] as string).trim() : "";
      if (!value) {
        valid = false;
        break;
      }
      action[key] = value.slice(0, rule[key === "title" ? "maxTitle" : "maxContent"]);
    }
    if (!valid) continue;

    if (type === "create_proposal" && typeof r.amount === "number" && Number.isFinite(r.amount) && r.amount >= 0) {
      // Sane ceiling — the proposal endpoint trusts this number, so never
      // pass an unbounded model-provided figure downstream.
      action.amount = Math.min(Math.round(r.amount), 10_000_000);
    }

    actions.push(action);
  }
  return actions;
}

/** Remove action blocks from text meant for display (safe mid-stream). */
export function stripActions(content: string): string {
  let out = content.replace(BLOCK_RE, "").trim();
  // Drop a trailing, still-incomplete block while streaming.
  if (out.includes("[ACTION]")) {
    out = out.replace(/\[ACTION\][\s\S]*$/, "").trim();
  }
  return out;
}

/** Human label for an action chip. */
export function actionLabel(a: CopilotAction): string {
  switch (a.type) {
    case "open_requirement":
      return "Open requirement";
    case "create_task":
      return a.title ? `Create task — ${a.title}` : "Create task";
    case "create_activity":
      return a.title ? `Log activity — ${a.title}` : "Log activity";
    case "create_note":
      return "Save note";
    case "create_proposal":
      return a.title ? `Create proposal — ${a.title}` : "Create proposal";
  }
}

/** Map an action to the workspace-scoped endpoint it executes. */
export function actionRequest(a: CopilotAction, clientId: string): { url: string; body?: unknown } {
  switch (a.type) {
    case "create_task":
      return { url: `/api/clients/${clientId}/tasks`, body: { title: a.title, status: "TODO" } };
    case "create_activity":
      return { url: `/api/clients/${clientId}/activities`, body: { title: a.title, type: "FOLLOW_UP" } };
    case "create_note":
      return { url: `/api/clients/${clientId}/notes`, body: { content: a.content } };
    case "create_proposal":
      return {
        url: `/api/clients/${clientId}/proposals`,
        body: { title: a.title, amount: a.amount ?? undefined, status: "DRAFT" },
      };
    default:
      return { url: "" }; // open_requirement is handled in the UI
  }
}

/**
 * Check whether an identical record already exists, so re-clicking a chip
 * (e.g. after a reload wiped the in-memory done-markers) never duplicates
 * the record. Returns the list endpoint for the action's resource.
 */
export function actionListUrl(a: CopilotAction, clientId: string): string {
  switch (a.type) {
    case "create_task":
      return `/api/clients/${clientId}/tasks`;
    case "create_activity":
      return `/api/clients/${clientId}/activities`;
    case "create_note":
      return `/api/clients/${clientId}/notes`;
    case "create_proposal":
      return `/api/clients/${clientId}/proposals`;
    default:
      return "";
  }
}

/** The field that uniquely identifies a created record for dedupe. */
export function actionMatchField(a: CopilotAction): string | null {
  switch (a.type) {
    case "create_task":
      return a.title ?? null;
    case "create_activity":
      return a.title ?? null;
    case "create_note":
      return a.content ?? null;
    case "create_proposal":
      return a.title ?? null;
    default:
      return null;
  }
}
