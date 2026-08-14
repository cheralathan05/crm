/* ────────────────────────────────────────────────────────────────
   PROPOSAL DOCUMENT — PURE TYPES & HELPERS
   No server-only imports — safe to share between the API layer and
   the Proposal Studio client component. All functions are pure.
──────────────────────────────────────────────────────────────── */

export type ProposalBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "spacer" };

export type ProposalSource = "REQUIREMENT" | "CLIENT" | "WORKSPACE" | "MANUAL" | "AI_DRAFT";

export type ProposalSection = {
  id: string;
  number: string;
  title: string;
  kicker: string;
  source: ProposalSource;
  visible: boolean;
  blocks: ProposalBlock[];
};

export type ProposalDoc = {
  version: number;
  meta: {
    reference: string;
    title: string;
    clientName: string;
    preparedBy: string;
    preparedFor: string | null;
    amount: number | null;
    currency: string;
    amountLabel: string;
    timelineLabel: string;
    date: string;
  };
  sections: ProposalSection[];
};

export const SOURCE_LABELS: Record<ProposalSource, string> = {
  REQUIREMENT: "Approved requirement",
  CLIENT: "Client record",
  WORKSPACE: "Workspace",
  MANUAL: "Manual",
  AI_DRAFT: "AI draft",
};

/** Upper bound of a budget range string ("₹1L – ₹3L" → 3_00_000). */
export function estimateBudgetAmount(budgetRange: string): number | null {
  const parts = budgetRange.split(/[\u2013\u2014\-–—]/);
  const lastWithDigits = [...parts].reverse().find((p) => /\d/.test(p));
  if (!lastWithDigits) return null;
  const match = lastWithDigits.match(/(\d+(?:\.\d+)?)\s*[LK]/);
  if (!match) return null;
  const raw = Number(match[1]);
  return match[0].toUpperCase().includes("L") ? raw * 100_000 : raw * 1_000;
}

export function formatINR(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function amountLabel(amount: number | null): string {
  if (amount === null) return "To be confirmed";
  return formatINR(amount);
}

export function timelineLabel(answers: Record<string, Record<string, unknown>>): string {
  const t = answers.timeline ?? {};
  const launch = String(t.launchWindow ?? "");
  const deadline = String(t.deadlineDate ?? "");
  if (launch && deadline) return `${launch} · fixed ${deadline}`;
  return launch || "To be discussed";
}

export function hasContent(s: ProposalSection): boolean {
  return s.blocks.some((b) =>
    b.type === "paragraph" ? b.text.trim().length > 0 : b.type === "list" ? b.items.length > 0 : b.type === "table" ? b.rows.length > 0 : false,
  );
}

/** Deterministic, explainable quality score — mirrors the server version. */
export function computeProposalQuality(doc: ProposalDoc): {
  total: number;
  items: { label: string; ok: boolean; note: string }[];
} {
  const visible = doc.sections.filter((s) => s.visible);

  const items: { label: string; ok: boolean; note: string }[] = [];
  items.push({
    label: "Content",
    ok: visible.filter(hasContent).length >= Math.max(4, Math.ceil(visible.length / 2)),
    note: `${visible.filter(hasContent).length} of ${visible.length} sections have content`,
  });
  items.push({
    label: "Branding",
    ok: !!doc.meta.preparedBy && !!doc.meta.clientName,
    note: doc.meta.preparedBy ? `Prepared by ${doc.meta.preparedBy}` : "Add your company name",
  });
  items.push({
    label: "Scope",
    ok: (() => {
      const s = doc.sections.find((x) => x.id === "scope");
      return !!s && hasContent(s);
    })(),
    note: "Scope carries requirement data",
  });
  items.push({
    label: "Pricing",
    ok: doc.meta.amount !== null,
    note: doc.meta.amount !== null ? doc.meta.amountLabel : "Set the investment amount",
  });
  items.push({
    label: "Timeline",
    ok: !!doc.meta.timelineLabel && doc.meta.timelineLabel !== "To be discussed",
    note: doc.meta.timelineLabel || "Add the timeline",
  });
  items.push({
    label: "Terms",
    ok: (() => {
      const s = doc.sections.find((x) => x.id === "terms");
      return !!s && hasContent(s);
    })(),
    note: "Confirm terms before sending",
  });

  const total = Math.round((items.filter((i) => i.ok).length / items.length) * 100);
  return { total, items };
}
