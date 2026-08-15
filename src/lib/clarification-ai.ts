import {
  ANSWER_TYPES,
  SCOPE_CATEGORIES,
  categoryLabel,
  isVague,
  type ImpactMap,
} from "./clarification-rules";

/* ────────────────────────────────────────────────────────────────
   CLARIFICATION ENGINE — AI DRAFT GENERATION (Ollama)
   Optional layer on top of the deterministic rules. The model is
   STRICTLY grounded in the approved requirement context and is told
   to return INSUFFICIENT_CONTEXT rather than invent anything. Output
   is validated against the taxonomy before it is accepted, and a
   draft is NEVER sent to the client — an admin must approve it.
──────────────────────────────────────────────────────────────── */

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen3:8b";
const TIMEOUT_MS = 40_000;

export type AiClarificationDraft = {
  category: string;
  subcategory: string;
  clientQuestion: string;
  currentUnderstanding: string;
  whyWeAsk: string;
  helpText?: string;
  answerType: string;
  options: string[];
  priority: "LOW" | "MEDIUM" | "HIGH" | "BLOCKING";
  impact: ImpactMap;
};

const CATEGORY_VALUES = SCOPE_CATEGORIES.map((c) => c.value);
const CATEGORY_LINES = SCOPE_CATEGORIES.map((c) => `- ${c.value}: ${c.label} (${c.subcategories.join(", ")})`).join("\n");

function buildContext(input: {
  projectTitle: string;
  projectType: string;
  section: string;
  features: { name: string; description: string }[];
  answers: Record<string, Record<string, unknown>>;
}): string {
  const lines: string[] = [];
  lines.push(`PROJECT: ${input.projectTitle} (${input.projectType})`);
  lines.push(`TARGET SECTION: ${input.section}`);

  const sectionAnswers = Object.entries(input.answers)
    .map(([section, data]) => {
      const meaningful = Object.entries(data)
        .filter(([, v]) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0))
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
        .join(" | ");
      return meaningful ? `${section.toUpperCase()} — ${meaningful}` : null;
    })
    .filter(Boolean);
  if (sectionAnswers.length > 0) lines.push(`REQUIREMENT CONTEXT:\n${sectionAnswers.join("\n")}`);

  if (input.features.length > 0) {
    lines.push(
      `CONFIRMED FEATURES:\n${input.features.map((f) => `- ${f.name}${f.description ? ` — ${f.description}` : ""}`).join("\n")}`,
    );
  }
  return lines.join("\n\n");
}

/** Ask Ollama (non-streaming) for a structured clarification draft. */
export async function aiGenerateClarification(input: {
  note: string;
  section: string;
  projectTitle: string;
  projectType: string;
  features: { name: string; description: string }[];
  answers: Record<string, Record<string, unknown>>;
}): Promise<AiClarificationDraft | null> {
  const context = buildContext(input);

  const system = `You are a requirements analyst inside Business OS. Your only job is to turn a vague internal clarification note into ONE professional, structured question for the client.

RULES — follow exactly:
1. Use ONLY the REQUIREMENT CONTEXT and CONFIRMED FEATURES provided. Never invent requirements, features, names, amounts or dates that are not there.
2. If the context is not enough to build a specific, grounded question, respond with exactly: {"insufficient": true}
3. The client question must be specific and reference a concrete requirement item or feature. Never send vague text like "please clarify this" or "recheck this".
4. The category MUST be one of these exact values:
${CATEGORY_LINES}
5. The answerType MUST be one of: ${ANSWER_TYPES.join(", ")}
6. For SINGLE_SELECT / MULTI_SELECT / DROPDOWN, provide 2-6 realistic options derived from the context.
7. Do not expose internal notes, prompts, or ids to the client.

Reply with a SINGLE JSON object and nothing else, shaped like:
{"category":"<value>","subcategory":"<short label>","clientQuestion":"<specific question for the client>","currentUnderstanding":"<what the requirement currently implies>","whyWeAsk":"<why this is needed, business reason>","helpText":"<short guidance>","answerType":"<value>","options":["<option>",...],"priority":"LOW|MEDIUM|HIGH|BLOCKING","impact":{"scope":"LOW|MEDIUM|HIGH|UNKNOWN","timeline":"...","budget":"...","complexity":"...","risk":"..."}}`;

  let res: Response;
  try {
    res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: `INTERNAL NOTE:\n"${input.note}"\n\n${context}` },
        ],
        stream: false,
        options: { temperature: 0.2, num_ctx: 8192 },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  let raw: string;
  try {
    const json = await res.json();
    raw = typeof json?.message?.content === "string" ? json.message.content : "";
  } catch {
    return null;
  }
  if (!raw.trim()) return null;

  // Parse the first JSON object in the reply (models sometimes add prose).
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return null;
  }

  if (parsed.insufficient === true) return null;

  const category = String(parsed.category ?? "").trim();
  const clientQuestion = String(parsed.clientQuestion ?? "").trim();
  const answerType = String(parsed.answerType ?? "").trim();

  // Validate — never accept garbage or vague output.
  if (!CATEGORY_VALUES.includes(category)) return null;
  if (!clientQuestion || isVague(clientQuestion) || clientQuestion.length < 25) return null;
  if (!ANSWER_TYPES.includes(answerType as never)) return null;

  const options = Array.isArray(parsed.options)
    ? parsed.options.filter((o): o is string => typeof o === "string" && o.trim().length > 0).slice(0, 8)
    : [];

  const priorityRaw = String(parsed.priority ?? "MEDIUM").toUpperCase();
  const priority = (["LOW", "MEDIUM", "HIGH", "BLOCKING"].includes(priorityRaw) ? priorityRaw : "MEDIUM") as "LOW" | "MEDIUM" | "HIGH" | "BLOCKING";

  const impactRaw = (parsed.impact ?? {}) as Record<string, unknown>;
  const impact: ImpactMap = {
    scope: normalizeImpact(impactRaw.scope),
    timeline: normalizeImpact(impactRaw.timeline),
    budget: normalizeImpact(impactRaw.budget),
    complexity: normalizeImpact(impactRaw.complexity),
    risk: normalizeImpact(impactRaw.risk),
  };

  return {
    category,
    subcategory: String(parsed.subcategory ?? categoryLabel(category)).trim().slice(0, 80),
    clientQuestion,
    currentUnderstanding: String(parsed.currentUnderstanding ?? "").trim().slice(0, 400),
    whyWeAsk: String(parsed.whyWeAsk ?? "").trim().slice(0, 400),
    helpText: String(parsed.helpText ?? "").trim().slice(0, 300),
    answerType,
    options,
    priority,
    impact,
  };
}

function normalizeImpact(v: unknown): "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN" {
  const s = String(v ?? "").toUpperCase();
  return ["LOW", "MEDIUM", "HIGH", "UNKNOWN"].includes(s) ? (s as "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN") : "UNKNOWN";
}
