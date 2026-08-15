import type { ProposalBlock } from "@/lib/proposal-doc";
import type { ProposalBlockShape } from "@/lib/proposal-doc";

/* ────────────────────────────────────────────────────────────────
   BLOCK CATALOG — the single source of truth for what the studio can
   insert and edit. Every structured block is edited through a schema
   of fields rendered in the contextual panel — no bespoke forms.
──────────────────────────────────────────────────────────────── */

export type BlockField = {
  key: string;
  label: string;
  kind: "text" | "textarea" | "list" | "table" | "select";
  options?: string[];
  placeholder?: string;
};

export const BLOCK_FIELDS: Partial<Record<ProposalBlock["type"], BlockField[]>> = {
  paragraph: [{ key: "text", label: "Paragraph", kind: "textarea" }],
  heading: [
    { key: "text", label: "Heading", kind: "text" },
    { key: "level", label: "Level", kind: "select", options: ["1", "2", "3"] },
  ],
  quote: [
    { key: "text", label: "Quote", kind: "textarea" },
    { key: "attribution", label: "Attribution", kind: "text" },
  ],
  list: [
    { key: "items", label: "List items — one per line", kind: "list" },
    { key: "ordered", label: "Style", kind: "select", options: ["numbered", "plain"] },
  ],
  table: [
    { key: "headers", label: "Column headers — one per line", kind: "list" },
    { key: "rows", label: "Rows — one per line, cells separated by |", kind: "table" },
  ],
  feature_card: [
    { key: "title", label: "Feature", kind: "text" },
    { key: "purpose", label: "Purpose", kind: "textarea" },
    { key: "capabilities", label: "Capabilities — one per line", kind: "list" },
    { key: "priority", label: "Priority", kind: "text" },
    { key: "users", label: "Users", kind: "text" },
    { key: "status", label: "Status", kind: "text" },
  ],
  objective_card: [
    { key: "title", label: "Objective", kind: "text" },
    { key: "description", label: "Description", kind: "textarea" },
    { key: "successIndicator", label: "Success indicator", kind: "text" },
    { key: "requirement", label: "Related requirement", kind: "text" },
  ],
  callout: [
    { key: "title", label: "Title", kind: "text" },
    { key: "text", label: "Message", kind: "textarea" },
    { key: "tone", label: "Tone", kind: "select", options: ["info", "warning", "success"] },
  ],
  statistic: [
    { key: "label", label: "Label", kind: "text" },
    { key: "value", label: "Value", kind: "text" },
    { key: "detail", label: "Detail", kind: "text" },
  ],
  process_flow: [{ key: "steps", label: "Steps — one per line", kind: "list" }],
  timeline: [{ key: "phases", label: "Phases — one per line (Title | Duration | Description)", kind: "list" }],
  milestone: [
    { key: "title", label: "Milestone", kind: "text" },
    { key: "description", label: "Description", kind: "textarea" },
    { key: "date", label: "Date", kind: "text" },
    { key: "status", label: "Status", kind: "text" },
  ],
  deliverable: [
    { key: "id", label: "ID", kind: "text" },
    { key: "name", label: "Deliverable", kind: "text" },
    { key: "description", label: "Description", kind: "textarea" },
    { key: "status", label: "Status", kind: "text" },
  ],
  requirement_reference: [
    { key: "reference", label: "Requirement reference", kind: "text" },
    { key: "title", label: "Title", kind: "text" },
    { key: "status", label: "Status", kind: "text" },
  ],
  pricing_table: [
    { key: "headers", label: "Column headers — one per line", kind: "list" },
    { key: "rows", label: "Rows — one per line, cells separated by |", kind: "table" },
    { key: "total", label: "Total", kind: "text" },
  ],
  assumption: [
    { key: "id", label: "ID", kind: "text" },
    { key: "description", label: "Assumption", kind: "textarea" },
    { key: "owner", label: "Owner", kind: "text" },
    { key: "impact", label: "Impact", kind: "text" },
    { key: "status", label: "Status", kind: "text" },
  ],
  risk: [
    { key: "title", label: "Risk", kind: "text" },
    { key: "description", label: "Description", kind: "textarea" },
    { key: "impact", label: "Impact", kind: "text" },
    { key: "mitigation", label: "Mitigation", kind: "text" },
    { key: "status", label: "Status", kind: "text" },
  ],
  signature: [
    { key: "role", label: "Role", kind: "select", options: ["CLIENT", "PROVIDER"] },
    { key: "name", label: "Name", kind: "text" },
    { key: "title", label: "Title", kind: "text" },
  ],
};

/* ── Insert menu (spec 09) ────────────────────────────────────── */

export type InsertItem = { type: ProposalBlock["type"]; label: string; hint: string };

export const INSERT_ITEMS: InsertItem[] = [
  { type: "paragraph", label: "Text", hint: "Paragraph" },
  { type: "heading", label: "Heading", hint: "Section heading" },
  { type: "list", label: "List", hint: "Bulleted items" },
  { type: "quote", label: "Quote", hint: "Callout quote" },
  { type: "table", label: "Table", hint: "Rows and columns" },
  { type: "feature_card", label: "Feature", hint: "Capability card" },
  { type: "objective_card", label: "Objective", hint: "Goal with success indicator" },
  { type: "callout", label: "Callout", hint: "Highlighted note" },
  { type: "statistic", label: "Statistic", hint: "Big number" },
  { type: "process_flow", label: "Process", hint: "Numbered steps" },
  { type: "timeline", label: "Timeline", hint: "Phases" },
  { type: "milestone", label: "Milestone", hint: "Phase marker" },
  { type: "deliverable", label: "Deliverable", hint: "Output item" },
  { type: "requirement_reference", label: "Requirement", hint: "Traceable reference" },
  { type: "pricing_table", label: "Pricing", hint: "Investment table" },
  { type: "assumption", label: "Assumption", hint: "Working assumption" },
  { type: "risk", label: "Risk", hint: "Risk with mitigation" },
  { type: "signature", label: "Signature", hint: "Sign-off block" },
  { type: "page_break", label: "Page break", hint: "Start a new page" },
];

export const BLOCK_LABELS: Record<string, string> = Object.fromEntries(INSERT_ITEMS.map((i) => [i.type, i.label]));

/** A fresh, empty instance of any block type — inserted scaffolded, never invented content. */
export function blankBlock(type: ProposalBlock["type"]): ProposalBlock {
  const base = { type, id: `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, updatedAt: new Date().toISOString() };
  switch (type) {
    case "paragraph":
      return { ...base, text: "" } as ProposalBlock;
    case "heading":
      return { ...base, text: "", level: 2 } as ProposalBlock;
    case "quote":
      return { ...base, text: "", attribution: "" } as ProposalBlock;
    case "list":
      return { ...base, items: [""] } as ProposalBlock;
    case "table":
      return { ...base, headers: ["", ""], rows: [["", ""]] } as ProposalBlock;
    case "feature_card":
      return { ...base, title: "", purpose: "", capabilities: [], priority: "", users: "", status: "Approved" } as ProposalBlock;
    case "objective_card":
      return { ...base, title: "", description: "", successIndicator: "", requirement: "" } as ProposalBlock;
    case "callout":
      return { ...base, title: "", text: "", tone: "info" } as ProposalBlock;
    case "statistic":
      return { ...base, label: "", value: "", detail: "" } as ProposalBlock;
    case "process_flow":
      return { ...base, steps: [""] } as ProposalBlock;
    case "timeline":
      return { ...base, phases: [{ title: "", description: "", duration: "" }] } as ProposalBlock;
    case "milestone":
      return { ...base, title: "", description: "", date: "", status: "" } as ProposalBlock;
    case "deliverable":
      return { ...base, id: "", name: "", description: "", status: "Planned" } as ProposalBlock;
    case "requirement_reference":
      return { ...base, reference: "", title: "", status: "" } as ProposalBlock;
    case "pricing_table":
      return { ...base, headers: ["Item", "Amount"], rows: [["", ""]], total: "" } as ProposalBlock;
    case "assumption":
      return { ...base, id: "", description: "", owner: "", impact: "", status: "" } as ProposalBlock;
    case "risk":
      return { ...base, title: "", description: "", impact: "", mitigation: "", status: "" } as ProposalBlock;
    case "signature":
      return { ...base, role: "PROVIDER", name: "", title: "" } as ProposalBlock;
    default:
      return { ...base } as ProposalBlock;
  }
}

/** Apply a field value to a block — all block fields are top-level keys, so a
    shallow merge keeps the schema generic. Parses list/table string inputs. */
export function applyBlockField(block: ProposalBlock, key: string, rawValue: string | boolean | string[] | string[][]): ProposalBlock {
  let value: unknown = rawValue;
  const field = (BLOCK_FIELDS[block.type] ?? []).find((f) => f.key === key);

  if (field?.kind === "list" && typeof rawValue === "string") {
    value = rawValue.split("\n");
  } else if (field?.kind === "table" && typeof rawValue === "string") {
    value = rawValue.split("\n").map((line) => line.split("|").map((c) => c.trim()));
  } else if (field?.kind === "select" && typeof rawValue === "string") {
    if (key === "level") value = Number(rawValue);
    if (key === "ordered") value = rawValue === "numbered";
    if (key === "tone" || key === "role") value = rawValue;
  }

  return { ...block, [key]: value } as ProposalBlock;
}

/** Render a block field value for editing (list/table collapse to text). */
export function fieldDisplayValue(block: ProposalBlock, key: string): string | boolean {
  const value = (block as unknown as Record<string, unknown>)[key];
  if (Array.isArray(value)) {
    if (value.length > 0 && Array.isArray(value[0])) {
      return (value as string[][]).map((row) => row.join(" | ")).join("\n");
    }
    return (value as string[]).join("\n");
  }
  if (typeof value === "boolean") return value;
  return typeof value === "string" ? value : value === undefined ? "" : String(value);
}
