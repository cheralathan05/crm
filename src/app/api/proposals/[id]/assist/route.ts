import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProposalForUser, serializeProposalForStudio } from "@/lib/proposal";
import type { ProposalSection } from "@/lib/proposal-doc";
import { ollamaOnline } from "@/lib/copilot";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen3:8b";

/* ── POST /api/proposals/[id]/assist ────────────────────────────
   Draft/rewrite a single proposal section with the local model.
   The model only ever sees the proposal's own real data (the document
   plus requirement context) — it cannot invent facts, prices or dates.
   Nothing is persisted server-side; drafts live in the studio until
   the user inserts or rejects them. */

export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const proposal = await getProposalForUser(session.user.id, id);
  if (!proposal) {
    return NextResponse.json({ ok: false, message: "Proposal not found." }, { status: 404 });
  }

  const rl = await rateLimit(30, 60_000, "proposal-assist");
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Too many requests. Try again shortly.", retryAfter: rl.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  let body: { sectionId?: string; instruction?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }
  const sectionId = String(body.sectionId ?? "").trim();
  const instruction = String(body.instruction ?? "").trim();
  if (!sectionId || !instruction) {
    return NextResponse.json({ ok: false, message: "A section and instruction are required." }, { status: 400 });
  }

  if (!(await ollamaOnline())) {
    return NextResponse.json(
      { ok: false, code: "OLLAMA_OFFLINE", message: "Local AI is offline. Start Ollama to use AI assist." },
      { status: 503 },
    );
  }

  const bundle = await serializeProposalForStudio(proposal);
  const section: ProposalSection | undefined = bundle.document.sections.find((s) => s.id === sectionId);
  if (!section) {
    return NextResponse.json({ ok: false, message: "Section not found." }, { status: 404 });
  }

  // A factual snapshot of the whole document — the model drafts from this,
  // never from general knowledge about the client.
  const facts = bundle.document.sections
    .filter((s) => s.visible && s.id !== sectionId)
    .map((s) => {
      const lines = s.blocks
        .map((b) =>
          b.type === "paragraph"
            ? b.text
            : b.type === "list"
              ? b.items.join("; ")
              : b.type === "table"
                ? b.rows.map((r) => r.join(" | ")).join("; ")
                : "",
        )
        .filter(Boolean);
      return `${s.number} ${s.title}: ${lines.join(" ")}`.slice(0, 600);
    })
    .join("\n");

  const current = section.blocks
    .map((b) =>
      b.type === "paragraph"
        ? b.text
        : b.type === "list"
          ? b.items.join("; ")
          : b.type === "table"
            ? b.rows.map((r) => r.join(" | ")).join("; ")
            : "",
    )
    .filter(Boolean)
    .join(" ");

  const systemPrompt = `You are the Proposal Copilot inside Business OS — a professional proposal writer for one specific proposal.

Your task: ${instruction}

Section to draft: "${section.title}" (${section.kicker}).

PROPOSAL FACTS (the ONLY facts you may use):
${facts.slice(0, 8000)}

CURRENT SECTION CONTENT (rewrite or expand; keep what is already correct):
${current.slice(0, 3000) || "(empty)"}

Rules:
- Use ONLY the proposal facts above. Never invent company names, amounts, prices, dates, people, or scope.
- If a fact is missing, say so plainly instead of making one up.
- Write formal, client-ready business prose. No markdown, no headers, no bullet symbols — plain paragraphs separated by blank lines.
- Output ONLY the section draft text — nothing else. No preamble, no labels.`;

  let ollamaRes: Response;
  try {
    ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [{ role: "system", content: systemPrompt }],
        stream: true,
        options: { temperature: 0.3, num_ctx: 8192 },
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    return NextResponse.json({ ok: false, code: "OLLAMA_OFFLINE", message: "Local AI is offline." }, { status: 503 });
  }

  if (!ollamaRes.ok || !ollamaRes.body) {
    return NextResponse.json(
      { ok: false, code: "OLLAMA_ERROR", message: `AI returned ${ollamaRes.status}.` },
      { status: 502 },
    );
  }

  // Relay the NDJSON stream as plain text.
  const reader = ollamaRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
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
            try {
              const json = JSON.parse(trimmed) as { message?: { content?: string } };
              if (json.message?.content) {
                controller.enqueue(new TextEncoder().encode(json.message.content));
              }
            } catch {
              /* skip malformed line */
            }
          }
        }
      } catch {
        /* client disconnected */
      } finally {
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
