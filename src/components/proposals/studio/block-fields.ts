import type { ProposalBlock } from "@/lib/proposal-doc";

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
    { key: "title", label: "Feature Name", kind: "text" },
    { key: "purpose", label: "Overview & Purpose", kind: "textarea" },
    { key: "businessNeed", label: "Business Need", kind: "textarea" },
    { key: "primaryUsers", label: "Primary Users", kind: "text" },
    { key: "capabilities", label: "Capabilities — one per line", kind: "list" },
    { key: "userFlow", label: "User Flow / Experience", kind: "textarea" },
    { key: "expectedOutcome", label: "Expected Outcome", kind: "textarea" },
    { key: "acceptanceCriteria", label: "Acceptance Criteria — one per line", kind: "list" },
    { key: "requirementSource", label: "Requirement Source", kind: "text" },
    { key: "priority", label: "Priority", kind: "text" },
    { key: "status", label: "Status", kind: "text" },
  ],
  objective_card: [
    { key: "title", label: "Objective Title", kind: "text" },
    { key: "description", label: "Description", kind: "textarea" },
    { key: "businessNeed", label: "Business Need", kind: "textarea" },
    { key: "whyItMatters", label: "Why It Matters", kind: "textarea" },
    { key: "currentState", label: "Current State", kind: "text" },
    { key: "desiredState", label: "Desired State", kind: "text" },
    { key: "expectedOutcome", label: "Expected Outcome", kind: "textarea" },
    { key: "successIndicator", label: "Success Indicator", kind: "text" },
    { key: "requirement", label: "Related Requirement", kind: "text" },
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
    { key: "date", label: "Target Date", kind: "text" },
    { key: "status", label: "Status", kind: "text" },
  ],
  deliverable: [
    { key: "id", label: "Deliverable ID", kind: "text" },
    { key: "name", label: "Deliverable Name", kind: "text" },
    { key: "description", label: "Description", kind: "textarea" },
    { key: "output", label: "Expected Output", kind: "text" },
    { key: "acceptance", label: "Acceptance Criteria", kind: "text" },
    { key: "status", label: "Status", kind: "text" },
  ],
  requirement_reference: [
    { key: "reference", label: "Requirement reference", kind: "text" },
    { key: "title", label: "Title", kind: "text" },
    { key: "status", label: "Status", kind: "text" },
  ],
  architecture: [
    { key: "title", label: "Architecture Title", kind: "text" },
    { key: "layers", label: "Layers — one per line (Layer | Technology | Purpose)", kind: "list" },
  ],
  comparison: [
    { key: "title", label: "Comparison Title", kind: "text" },
    { key: "businessNeed", label: "Business Need", kind: "textarea" },
    { key: "problem", label: "Current State Problem", kind: "textarea" },
    { key: "impact", label: "Current State Impact", kind: "textarea" },
    { key: "solution", label: "Proposed Solution", kind: "textarea" },
    { key: "outcome", label: "Expected Outcome", kind: "textarea" },
  ],
  pricing_table: [
    { key: "headers", label: "Column headers — one per line", kind: "list" },
    { key: "rows", label: "Rows — one per line, cells separated by |", kind: "table" },
    { key: "total", label: "Total Investment", kind: "text" },
  ],
  assumption: [
    { key: "id", label: "ID", kind: "text" },
    { key: "description", label: "Assumption Description", kind: "textarea" },
    { key: "owner", label: "Owner", kind: "text" },
    { key: "impact", label: "Impact", kind: "text" },
    { key: "status", label: "Status", kind: "text" },
  ],
  risk: [
    { key: "title", label: "Risk Title", kind: "text" },
    { key: "description", label: "Risk Description", kind: "textarea" },
    { key: "impact", label: "Impact Level", kind: "text" },
    { key: "probability", label: "Probability", kind: "text" },
    { key: "mitigation", label: "Mitigation Strategy", kind: "textarea" },
    { key: "status", label: "Status", kind: "text" },
  ],
  signature: [
    { key: "role", label: "Role", kind: "select", options: ["CLIENT", "PROVIDER"] },
    { key: "name", label: "Name", kind: "text" },
    { key: "title", label: "Title / Designation", kind: "text" },
    { key: "date", label: "Signing Date", kind: "text" },
  ],
  approval: [
    { key: "clientName", label: "Client Organization", kind: "text" },
    { key: "projectName", label: "Project Title", kind: "text" },
    { key: "approvedScope", label: "Approved Scope", kind: "textarea" },
    { key: "authorizedPerson", label: "Authorized Representative", kind: "text" },
    { key: "acceptanceDate", label: "Acceptance Date", kind: "text" },
  ],
};

/* ── Insert menu (spec 09) ────────────────────────────────────── */

export type InsertItem = { type: ProposalBlock["type"]; label: string; hint: string };

export const INSERT_ITEMS: InsertItem[] = [
  { type: "paragraph", label: "Text", hint: "Standard editorial paragraph" },
  { type: "heading", label: "Heading", hint: "Section heading" },
  { type: "feature_card", label: "Feature Card", hint: "Complete feature intelligence card" },
  { type: "objective_card", label: "Objective Card", hint: "Strategic goal with success indicator" },
  { type: "comparison", label: "Problem / Solution", hint: "Current state vs Proposed solution" },
  { type: "architecture", label: "Architecture", hint: "Technical stack layers" },
  { type: "deliverable", label: "Deliverable", hint: "Deliverable with acceptance criteria" },
  { type: "table", label: "Table", hint: "Structured columns and rows" },
  { type: "pricing_table", label: "Pricing Table", hint: "Commercial investment breakdown" },
  { type: "timeline", label: "Timeline", hint: "Visual project phases" },
  { type: "milestone", label: "Milestone", hint: "Phase marker" },
  { type: "process_flow", label: "Process Flow", hint: "Sequential numbered steps" },
  { type: "callout", label: "Callout", hint: "Highlighted note or insight" },
  { type: "statistic", label: "Statistic", hint: "Big metric card" },
  { type: "list", label: "List", hint: "Numbered or bulleted items" },
  { type: "requirement_reference", label: "Requirement Link", hint: "Traceable requirement reference" },
  { type: "assumption", label: "Assumption", hint: "Working project assumption" },
  { type: "risk", label: "Risk & Mitigation", hint: "Risk analysis card" },
  { type: "approval", label: "Digital Acceptance", hint: "Official proposal acceptance block" },
  { type: "signature", label: "Signature Block", hint: "Authorized sign-off line" },
  { type: "quote", label: "Quote", hint: "Client or testimonial quote" },
  { type: "page_break", label: "Page Break", hint: "Start a fresh page" },
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
      return { ...base, headers: ["Item", "Details"], rows: [["", ""]] } as ProposalBlock;
    case "feature_card":
      return {
        ...base,
        title: "",
        purpose: "",
        businessNeed: "",
        primaryUsers: "",
        capabilities: [],
        userFlow: "",
        expectedOutcome: "",
        acceptanceCriteria: [],
        requirementSource: "",
        priority: "High",
        users: "",
        status: "Approved",
      } as ProposalBlock;
    case "objective_card":
      return {
        ...base,
        title: "",
        description: "",
        businessNeed: "",
        whyItMatters: "",
        currentState: "",
        desiredState: "",
        expectedOutcome: "",
        successIndicator: "",
        requirement: "",
      } as ProposalBlock;
    case "callout":
      return { ...base, title: "", text: "", tone: "info" } as ProposalBlock;
    case "statistic":
      return { ...base, label: "", value: "", detail: "" } as ProposalBlock;
    case "process_flow":
      return { ...base, steps: [""] } as ProposalBlock;
    case "timeline":
      return { ...base, phases: [{ title: "", description: "", duration: "Phase 01" }] } as ProposalBlock;
    case "milestone":
      return { ...base, title: "", description: "", date: "", status: "Planned" } as ProposalBlock;
    case "deliverable":
      return { ...base, id: "DLV-001", name: "", description: "", output: "", acceptance: "", status: "Planned" } as ProposalBlock;
    case "requirement_reference":
      return { ...base, reference: "REQ-001", title: "", status: "Covered" } as ProposalBlock;
    case "architecture":
      return {
        ...base,
        title: "Technical Architecture",
        layers: [
          { name: "Frontend", tech: "Next.js & React", purpose: "User Interface" },
          { name: "Backend", tech: "Node.js Server Engine", purpose: "Business Logic & APIs" },
          { name: "Database", tech: "Prisma & SQL", purpose: "Data Persistence" },
        ],
      } as ProposalBlock;
    case "comparison":
      return {
        ...base,
        title: "Current vs Proposed State",
        businessNeed: "",
        currentState: { problem: "", impact: "" },
        proposedState: { solution: "", outcome: "" },
      } as ProposalBlock;
    case "pricing_table":
      return { ...base, headers: ["Deliverable", "Description", "Investment"], rows: [["", "", ""]], total: "" } as ProposalBlock;
    case "assumption":
      return { ...base, id: "ASM-001", description: "", owner: "Client / Provider", impact: "Low", status: "Active" } as ProposalBlock;
    case "risk":
      return { ...base, title: "", description: "", impact: "Medium", probability: "Low", mitigation: "", status: "Mitigated" } as ProposalBlock;
    case "approval":
      return {
        ...base,
        clientName: "",
        projectName: "",
        approvedScope: "All included proposal deliverables",
        acceptanceDate: new Date().toISOString().split("T")[0],
        authorizedPerson: "",
        digitalStamp: "BUSINESS_OS_VERIFIED",
        status: "Pending Signature",
      } as ProposalBlock;
    case "signature":
      return { ...base, role: "PROVIDER", name: "", title: "", date: new Date().toISOString().split("T")[0] } as ProposalBlock;
    default:
      return { ...base } as ProposalBlock;
  }
}

/** Apply a field value to a block — handles nested comparison and architecture properties. */
export function applyBlockField(block: ProposalBlock, key: string, rawValue: string | boolean | string[] | string[][]): ProposalBlock {
  let value: unknown = rawValue;
  const field = (BLOCK_FIELDS[block.type] ?? []).find((f) => f.key === key);

  if (field?.kind === "list" && typeof rawValue === "string") {
    if (block.type === "architecture") {
      value = rawValue
        .split("\n")
        .map((line) => {
          const parts = line.split("|").map((p) => p.trim());
          return { name: parts[0] || "", tech: parts[1] || "", purpose: parts[2] || "" };
        })
        .filter((l) => l.name);
    } else if (block.type === "timeline") {
      value = rawValue
        .split("\n")
        .map((line) => {
          const parts = line.split("|").map((p) => p.trim());
          return { title: parts[0] || "", duration: parts[1] || "", description: parts[2] || "" };
        })
        .filter((p) => p.title);
    } else {
      value = rawValue.split("\n").filter((x) => x.trim().length > 0);
    }
  } else if (field?.kind === "table" && typeof rawValue === "string") {
    value = rawValue.split("\n").map((line) => line.split("|").map((c) => c.trim()));
  } else if (field?.kind === "select" && typeof rawValue === "string") {
    if (key === "level") value = Number(rawValue);
    if (key === "ordered") value = rawValue === "numbered";
    if (key === "tone" || key === "role") value = rawValue;
  }

  // Nested comparison handling
  if (block.type === "comparison") {
    const cur = block as unknown as { currentState: Record<string, string>; proposedState: Record<string, string> };
    if (key === "problem") return { ...block, currentState: { ...cur.currentState, problem: String(value) } } as ProposalBlock;
    if (key === "impact") return { ...block, currentState: { ...cur.currentState, impact: String(value) } } as ProposalBlock;
    if (key === "solution") return { ...block, proposedState: { ...cur.proposedState, solution: String(value) } } as ProposalBlock;
    if (key === "outcome") return { ...block, proposedState: { ...cur.proposedState, outcome: String(value) } } as ProposalBlock;
  }

  return { ...block, [key]: value } as ProposalBlock;
}

/** Render a block field value for editing. */
export function fieldDisplayValue(block: ProposalBlock, key: string): string | boolean {
  if (block.type === "comparison") {
    const b = block as unknown as { currentState?: Record<string, string>; proposedState?: Record<string, string> };
    if (key === "problem") return b.currentState?.problem ?? "";
    if (key === "impact") return b.currentState?.impact ?? "";
    if (key === "solution") return b.proposedState?.solution ?? "";
    if (key === "outcome") return b.proposedState?.outcome ?? "";
  }
  if (block.type === "architecture" && key === "layers") {
    const b = block as unknown as { layers?: { name: string; tech: string; purpose?: string }[] };
    return (b.layers ?? []).map((l) => `${l.name} | ${l.tech} | ${l.purpose ?? ""}`).join("\n");
  }
  if (block.type === "timeline" && key === "phases") {
    const b = block as unknown as { phases?: { title: string; duration?: string; description?: string }[] };
    return (b.phases ?? []).map((p) => `${p.title} | ${p.duration ?? ""} | ${p.description ?? ""}`).join("\n");
  }

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
