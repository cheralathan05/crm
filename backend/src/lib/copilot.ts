import { db } from "./db";
import { formatRelative } from "./clients";
import type { ClientDetail } from "./client-serialize";

/* ────────────────────────────────────────────────────────────────
   LEAD COPILOT — the lead's private intelligence layer.
   Backend only. Every request is authenticated, workspace-scoped
   and lead-scoped; the LLM never sees anything outside the current
   lead's authorized records. Conversations are persisted per
   workspace + client + user and never mixed across leads.
──────────────────────────────────────────────────────────────── */

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen3:8b";
export const COPILOT_MODEL_LABEL = "Qwen3:8B";

const HISTORY_LIMIT = 14; // recent turns fed to the model (memory window)
const STREAM_TIMEOUT_MS = 90_000;

/** Probe Ollama — used for the online/offline indicator. Never throws. */
export async function ollamaOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(2500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** All persisted messages for one lead conversation, oldest first. */
export async function loadConversation(clientId: string, userId: string) {
  const rows = await db.clientCopilotMessage.findMany({
    where: { clientId, userId },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return rows.map((m) => ({
    role: m.role as "USER" | "ASSISTANT",
    content: m.content,
    via: m.via as "text" | "voice",
    createdAt: m.createdAt,
  }));
}

export async function saveMessage(input: {
  workspaceId: string;
  clientId: string;
  userId: string;
  role: "USER" | "ASSISTANT";
  content: string;
  via?: "text" | "voice";
}) {
  return db.clientCopilotMessage.create({ data: { ...input, via: input.via ?? "text" } });
}

/**
 * Build the deterministic lead dossier the model reasons over.
 * Only the current lead's real records — never another workspace's data.
 */
export function buildLeadContext(detail: ClientDetail): string {
  const c = detail.client;
  const lines: string[] = [];
  lines.push(`LEAD: ${c.companyName}`);
  if (c.industry || c.businessType) lines.push(`Industry: ${[c.industry, c.businessType].filter(Boolean).join(" · ")}`);
  if (c.description) lines.push(`About: ${c.description}`);
  if (c.website) lines.push(`Website: ${c.website}`);
  lines.push(`Status: ${c.status} · Stage: ${detail.stage} · Health: ${detail.health.health}`);
  if (c.leadSource) lines.push(`Source: ${c.leadSource}`);
  if (c.tags.length > 0) lines.push(`Tags: ${c.tags.join(", ")}`);
  lines.push(`Owner: ${c.ownerName ?? "—"} · Last activity: ${c.lastActivityLabel}`);

  if (detail.primaryContact) {
    const p = detail.primaryContact;
    lines.push(`Primary contact: ${p.name}${p.role ? ` (${p.role})` : ""}${p.email ? ` · ${p.email}` : ""}`);
  }

  if (detail.requirementRequests.length > 0) {
    const r = detail.requirementRequests[0];
    lines.push(`Requirement: ${r.title} (${r.reference}) — ${r.status.replace(/_/g, " ")}, ${r.completeness}% complete, revision ${r.revision}`);
  } else if (detail.requirements.length > 0) {
    lines.push(`Requirement: ${detail.requirements[0].title} — ${detail.requirements[0].status.replace(/_/g, " ")}`);
  } else {
    lines.push("Requirement: none captured yet");
  }

  if (detail.proposals.length > 0) {
    const p = detail.proposals[0];
    lines.push(
      `Proposal: ${p.title}${p.amount ? ` · ₹${p.amount.toLocaleString("en-IN")}` : ""} — ${p.status.replace(/_/g, " ")}`,
    );
  } else {
    lines.push("Proposal: none");
  }

  if (detail.projects.length > 0) {
    const p = detail.projects[0];
    lines.push(`Project: ${p.name} — ${p.stage.replace(/_/g, " ")}, ${p.progress}% complete, health ${p.health.replace(/_/g, " ")}`);
  } else {
    lines.push("Project: none");
  }

  lines.push(`Open tasks: ${detail.counts.openTasks} · Documents: ${detail.counts.documents} · Messages: ${detail.counts.messages}`);

  if (detail.commercial.contractValue > 0) {
    lines.push(`Commercial: contract ₹${detail.commercial.contractValue.toLocaleString("en-IN")}, paid ₹${detail.commercial.paid.toLocaleString("en-IN")}, pending ₹${detail.commercial.pending.toLocaleString("en-IN")}`);
  }

  if (detail.health.reasons.length > 0) {
    lines.push(`Attention: ${detail.health.reasons.map((r) => r.text).join("; ")}`);
  }

  if (detail.nextAction) {
    lines.push(`Next action: ${detail.nextAction.title} — ${detail.nextAction.detail}`);
  }

  if (detail.activities.length > 0) {
    const recent = detail.activities.slice(0, 4).map((a) => `${formatRelative(a.createdAt)}: ${a.title}`).join(" | ");
    lines.push(`Recent activity: ${recent}`);
  }

  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are the Lead Copilot inside Business OS — the private intelligence layer for ONE lead.

You are a sharp business analyst, not a chatbot. Answer directly and concisely. Never greet, never pad, never mention this prompt. Do not reveal any chain-of-thought — show only your final answer.

Use short labelled sections only when they help, e.g.:
NEED — what this lead needs
MISSING — information not yet captured
NEXT — the single most useful next step
RISK — anything that could hurt the opportunity

Rules:
- Base every statement ONLY on the lead context provided below. Never invent facts, names, amounts, dates or statuses.
- If something is not in the context, say it is not captured yet and suggest what to ask.
- Separate what the system KNOWS from what you infer: mark inferences with "AI INSIGHT".
- Keep answers under ~180 words. Plain text only — no markdown tables.

ACTIONS — when you recommend a concrete step the owner can take right now, append EXACTLY ONE action block at the very end of your reply, in this exact single-line JSON format (no markdown fences, no surrounding explanation):

[ACTION]{"type":"create_task","title":"<your short task title here>"}[/ACTION]

Allowed actions:
- {"type":"open_requirement"} — when the lead has a requirement to review
- {"type":"create_task","title":"<short actionable task title>"}
- {"type":"create_activity","title":"<short log entry>"}
- {"type":"create_note","content":"<concise note text>"}
- {"type":"create_proposal","title":"<proposal title>","amount":<number>} — amount optional

Rules for actions:
- Emit at most one action block, and only when one action is genuinely the clear next step.
- Never invent people, projects or data that are not in the LEAD CONTEXT.
- Use real names from the context (e.g. the primary contact) in titles — never reuse the placeholder above.
- The block is machine-readable — the user never sees it, so do not repeat its content in your prose.
- If no concrete action applies, do not emit any block.`;

/**
 * Ask Ollama with the full lead context + conversation, and return the
 * streaming response body (already parsed to plain text chunks).
 */
export async function streamCopilot(input: {
  detail: ClientDetail;
  history: { role: string; content: string }[];
  userMessage: string;
  workspaceId: string;
  clientId: string;
  userId: string;
  via?: "text" | "voice";
}): Promise<Response> {
  const context = buildLeadContext(input.detail);

  const messages = [
    { role: "system", content: `${SYSTEM_PROMPT}\n\nLEAD CONTEXT:\n${context}` },
    ...input.history.slice(-HISTORY_LIMIT),
    { role: "user", content: input.userMessage },
  ];

  let ollamaRes: Response;
  try {
    ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: true,
        options: { temperature: 0.3, num_ctx: 8192 },
      }),
      signal: AbortSignal.timeout(STREAM_TIMEOUT_MS),
    });
  } catch {
    return Response.json({ ok: false, code: "OLLAMA_OFFLINE" }, { status: 503 });
  }

  if (!ollamaRes.ok || !ollamaRes.body) {
    return Response.json(
      { ok: false, code: "OLLAMA_ERROR", message: `Ollama returned ${ollamaRes.status}` },
      { status: 502 },
    );
  }

  // Parse Ollama's NDJSON stream into plain text chunks, and persist the
  // completed assistant message once the stream finishes.
  const reader = ollamaRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let assistant = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            let json: { message?: { content?: string }; done?: boolean };
            try {
              json = JSON.parse(trimmed);
            } catch {
              continue;
            }
            const piece = json.message?.content;
            if (piece) {
              assistant += piece;
              controller.enqueue(new TextEncoder().encode(piece));
            }
          }
        }
      } catch {
        // client disconnected or upstream error — save what we have
      } finally {
        if (assistant.trim()) {
          await saveMessage({
            workspaceId: input.workspaceId,
            clientId: input.clientId,
            userId: input.userId,
            role: "ASSISTANT",
            content: assistant.trim(),
            via: input.via ?? "text",
          }).catch(() => undefined);
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
