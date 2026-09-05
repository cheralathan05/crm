import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProposalForUser, serializeProposalForStudio } from "@/lib/proposal";
import type { ProposalAdminAnswer, ProposalSection } from "@/lib/proposal-doc";
import { blockText } from "@/lib/proposal-doc";
import { ollamaOnline } from "@/lib/copilot";
import { rateLimit } from "@/lib/rate-limit";
import { generateRichProposalSectionMarkdown } from "@/lib/proposal-section-generator";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen3:8b";

/* ── POST /api/proposals/[id]/assist ────────────────────────────
   AI Proposal Copilot — document intelligence engine powered by
   local Ollama using real approved requirement facts with guaranteed
   1-page section completion fail-safe.
   Streams NDJSON lines ({ type: "thinking" | "content", text }).
──────────────────────────────────────────────────────────────── */

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

  const rl = await rateLimit(60, 60_000, "proposal-assist");
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Too many requests. Try again shortly.", retryAfter: rl.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  let body: { sectionId?: string; instruction?: string; depth?: string; adminAnswers?: ProposalAdminAnswer[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }
  const sectionId = String(body.sectionId ?? "").trim();
  const instruction = String(body.instruction ?? "Expand section into a complete 1-page deliverable").trim();
  const depth = String(body.depth ?? "Detailed").trim();
  const reqAdminAnswers = Array.isArray(body.adminAnswers) ? body.adminAnswers : [];

  const bundle = await serializeProposalForStudio(proposal);
  let section: ProposalSection | undefined = bundle.document.sections.find((s) => s.id === sectionId);
  if (!section) {
    section = bundle.document.sections.find((s) => s.id === "executive-summary") ?? bundle.document.sections[0];
  }

  // Combine stored doc answers + current request answers
  const allDocAnswers = bundle.document.adminAnswers ?? [];
  const combinedAnswers = [...allDocAnswers, ...reqAdminAnswers];
  const relevantAnswers = combinedAnswers
    .filter((a) => a.answer && a.answer.trim().length > 0)
    .map((a) => `• [${a.category}] ${a.question}\n  ANSWER: ${a.answer.trim()}`)
    .join("\n\n");

  const reqFeatures = bundle.requirement?.features.map((f) => `• ${f.name} (Priority: ${f.priority})`).join("\n") || "All core system modules";

  const allSectionsContext = bundle.document.sections
    .filter((s) => s.visible)
    .map((s) => {
      const summary = s.blocks.map(blockText).filter(Boolean).join(" ");
      return `[Section: ${s.title} (${s.kicker})]:\n${summary.slice(0, 500)}`;
    })
    .join("\n\n");

  const currentContent = section ? section.blocks.map(blockText).filter(Boolean).join("\n\n") : "";

  // Guaranteed requirement-anchored consulting draft synthesizer
  const guaranteedDraft = generateRichProposalSectionMarkdown({
    sectionId: section?.id || "executive-summary",
    sectionTitle: section?.title,
    sectionKicker: section?.kicker,
    proposalTitle: bundle.proposal.title,
    proposalReference: bundle.proposal.reference || "PROP",
    clientName: bundle.client?.companyName || bundle.document.meta.clientName || "the Client",
    clientIndustry: bundle.client?.industry,
    providerName: bundle.workspace.companyName || bundle.document.meta.preparedBy || "Enterprise Delivery Team",
    amountLabel: bundle.document.meta.amountLabel,
    timelineLabel: bundle.document.meta.timelineLabel,
    requirementFeatures: bundle.requirement?.features ?? [],
    adminAnswers: combinedAnswers,
    depth,
    instruction,
  });

  const isOllamaUp = await ollamaOnline();

  // If Ollama is offline, immediately stream the authoritative 1-page synthesized section
  if (!isOllamaUp) {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const payload = JSON.stringify({ type: "content", text: guaranteedDraft }) + "\n";
        controller.enqueue(new TextEncoder().encode(payload));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  }

  const systemPrompt = `You are the Business OS AI Proposal Copilot — an elite enterprise proposal and consulting intelligence engine.

REAL CLIENT & PROJECT CONTEXT:
Client Name: ${bundle.client?.companyName || "Client"}
Industry: ${bundle.client?.industry || "Enterprise Business"}
Provider Name: ${bundle.workspace.companyName}
Proposal Title: ${bundle.proposal.title}
Reference: ${bundle.proposal.reference || "PROP"}
Investment Budget: ${bundle.document.meta.amountLabel}
Target Timeline: ${bundle.document.meta.timelineLabel || "Standard Schedule"}

APPROVED REQUIREMENT SNAPSHOT:
Features & Capabilities:
${reqFeatures}

${relevantAnswers ? `ADMIN-CONFIRMED FACTS & SECTION CLARIFICATIONS:\n${relevantAnswers}\n` : ""}
ACTIVE SECTION TO EXPAND / COMPOSE:
Section Title: "${section?.title || "Executive Summary"}" (${section?.kicker || "Overview"})
Requested Depth: ${depth}
User Instruction: ${instruction}

CURRENT SECTION CONTENT:
${currentContent || "(Section is currently empty - compose a complete consulting draft)"}

CRITICAL EDITORIAL RULES:
1. OUTPUT FORMAT: Output ONLY the complete markdown text for the proposal section. DO NOT output conversational preamble or meta-thoughts like "Okay, I need to generate...". Begin IMMEDIATELY with the first markdown heading (### [Section Title]).
2. 1-PAGE COMPLETENESS: Compose a rich, authoritative section (~400 to 600 words) with 4-5 markdown headings (### Heading), detailed narrative paragraphs, and bullet points covering:
   - Strategic Intent & Purpose
   - Core Scope & Work Breakdown Activities
   - Milestones, Review Gates & Delivery Cadence
   - Quality Assurance, Governance & Acceptance Standards
3. FACT PROTECTION: Never alter financial figures, budget totals, timeline deadlines, or client requirements.`;

  let ollamaRes: Response | null = null;
  try {
    ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Write the complete detailed 1-page proposal section for "${section?.title}": ${instruction}. Start immediately with "### ${section?.title}".` },
        ],
        stream: true,
        options: { temperature: 0.3, num_ctx: 8192, num_predict: 4096 },
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    ollamaRes = null;
  }

  if (!ollamaRes || !ollamaRes.ok || !ollamaRes.body) {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const payload = JSON.stringify({ type: "content", text: guaranteedDraft }) + "\n";
        controller.enqueue(new TextEncoder().encode(payload));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  }

  const reader = ollamaRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let inThinkMode = false;
      let accumulatedThinking = "";
      let accumulatedContent = "";

      const sendNdjson = (type: "thinking" | "content", text: string) => {
        if (!text) return;
        const payload = JSON.stringify({ type, text }) + "\n";
        controller.enqueue(new TextEncoder().encode(payload));
      };

      const processContentChunk = (text: string) => {
        let remaining = text;
        while (remaining.length > 0) {
          if (inThinkMode) {
            const endIdx = remaining.indexOf("</think>");
            if (endIdx !== -1) {
              const thinkChunk = remaining.slice(0, endIdx);
              if (thinkChunk) {
                accumulatedThinking += thinkChunk;
                sendNdjson("thinking", thinkChunk);
              }
              inThinkMode = false;
              remaining = remaining.slice(endIdx + "</think>".length);
            } else {
              accumulatedThinking += remaining;
              sendNdjson("thinking", remaining);
              remaining = "";
            }
          } else {
            const startIdx = remaining.indexOf("<think>");
            if (startIdx !== -1) {
              const contentChunk = remaining.slice(0, startIdx);
              if (contentChunk) {
                accumulatedContent += contentChunk;
                sendNdjson("content", contentChunk);
              }
              inThinkMode = true;
              remaining = remaining.slice(startIdx + "<think>".length);
            } else {
              accumulatedContent += remaining;
              sendNdjson("content", remaining);
              remaining = "";
            }
          }
        }
      };

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
              const json = JSON.parse(trimmed) as {
                message?: { content?: string; thinking?: string };
                done?: boolean;
              };
              // Stream reasoning if provided in dedicated thinking field
              if (json.message?.thinking) {
                accumulatedThinking += json.message.thinking;
                sendNdjson("thinking", json.message.thinking);
              }
              // Stream content (with think tag detection)
              if (json.message?.content) {
                processContentChunk(json.message.content);
              }
            } catch {
              /* ignore parse errors */
            }
          }
        }

        if (buffer.trim()) {
          try {
            const json = JSON.parse(buffer.trim()) as { message?: { content?: string; thinking?: string } };
            if (json.message?.thinking) {
              accumulatedThinking += json.message.thinking;
              sendNdjson("thinking", json.message.thinking);
            }
            if (json.message?.content) {
              processContentChunk(json.message.content);
            }
          } catch {}
        }

        // Server-side Fail-safe Auto-Recovery:
        // If content generated is insufficient (< 200 chars or looks like monologue), send guaranteed rich draft!
        const cleaned = accumulatedContent.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
        const isMonologue = /^(okay|let me start|first, the section|looking at the existing)/i.test(cleaned);
        if (cleaned.length < 200 || isMonologue) {
          sendNdjson("content", guaranteedDraft);
        }
      } catch {
        // In case of error during stream, send guaranteed complete draft
        if (accumulatedContent.trim().length < 200) {
          sendNdjson("content", guaranteedDraft);
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
