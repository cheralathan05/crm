import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProposalForUser, serializeProposalForStudio } from "@/lib/proposal";
import type { ProposalAdminAnswer, ProposalSection } from "@/lib/proposal-doc";
import { blockText } from "@/lib/proposal-doc";
import { ollamaOnline } from "@/lib/copilot";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen3:8b";

/* ── POST /api/proposals/[id]/assist ────────────────────────────
   AI Proposal Copilot — document intelligence engine powered by
   local Ollama (Qwen3:8B) using real approved requirement facts.
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
  const instruction = String(body.instruction ?? "Expand section in detail").trim();
  const depth = String(body.depth ?? "Detailed").trim();
  const reqAdminAnswers = Array.isArray(body.adminAnswers) ? body.adminAnswers : [];

  if (!(await ollamaOnline())) {
    return NextResponse.json(
      { ok: false, code: "OLLAMA_OFFLINE", message: "Local AI (Ollama) is offline. Please start Ollama." },
      { status: 503 },
    );
  }

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
      return `[Section: ${s.title} (${s.kicker})]:\n${summary.slice(0, 600)}`;
    })
    .join("\n\n");

  const currentContent = section ? section.blocks.map(blockText).filter(Boolean).join("\n\n") : "";

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
PROPOSAL SECTIONS CONTEXT:
${allSectionsContext.slice(0, 6000)}

ACTIVE SECTION TO EXPAND / COMPOSE:
Section Title: "${section?.title || "Executive Summary"}" (${section?.kicker || "Overview"})
Requested Depth: ${depth}
User Instruction: ${instruction}

CURRENT SECTION CONTENT:
${currentContent || "(Section is currently empty - compose a complete consulting draft)"}

EDITORIAL & FACT PROTECTION RULES:
1. FACT PROTECTION: NEVER invent or alter financial figures, budget totals, launch dates, client decisions, or approved requirement names.
2. SOURCE TRACEABILITY: Anchor all content directly in the approved requirement snapshot, client context, and admin-confirmed facts above.
3. 1-PAGE TARGET COMPLETENESS: Compose a complete, authoritative, structured section designed to naturally fill approximately one A4 page.
4. STRUCTURE: Use clear markdown headings (### Heading) followed by substantive paragraphs detailing:
   - Project Context & Business Background
   - Business Challenge & Pain Points
   - Client Objective & Success Criteria
   - Proposed Solution & Core Capabilities
   - Expected Business Outcomes
   - Implementation Direction & Next Steps
5. Keep internal thinking short and immediately output the complete detailed proposal section markdown. Output ONLY the refined section text.`;

  let ollamaRes: Response;
  try {
    ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate the complete detailed 1-page section for "${section?.title}": ${instruction}` },
        ],
        stream: true,
        options: { temperature: 0.3, num_ctx: 8192, num_predict: 4096 },
      }),
      signal: AbortSignal.timeout(180_000),
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

        // Server-side Fail-safe Auto-Recovery
        if (accumulatedContent.trim().length < 30) {
          // Check if thinking actually contains the draft markdown
          const thinkHeaders = accumulatedThinking.match(/(?:^|\n)###?\s+[^\n]+/g);
          if (thinkHeaders && thinkHeaders.length >= 2) {
            const extracted = accumulatedThinking.replace(/<think>|<\/think>/g, "").trim();
            if (extracted) {
              accumulatedContent += extracted;
              sendNdjson("content", extracted);
            }
          } else {
            // Quick direct fallback completion without reasoning mode
            try {
              const fallbackRes = await fetch(`${OLLAMA_URL}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  model: OLLAMA_MODEL,
                  messages: [
                    { role: "system", content: `${systemPrompt}\n\nIMPORTANT: Output ONLY the markdown text for the proposal section. Do not output any thoughts or thinking tags.` },
                    { role: "user", content: `Write the complete proposal section draft for "${section?.title}" right now:` },
                  ],
                  stream: false,
                  options: { temperature: 0.2, num_ctx: 8192, num_predict: 2048 },
                }),
                signal: AbortSignal.timeout(60_000),
              });
              if (fallbackRes.ok) {
                const fallbackData = await fallbackRes.json();
                const fbContent = fallbackData.message?.content ?? "";
                const cleanContent = fbContent.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
                if (cleanContent) {
                  accumulatedContent += cleanContent;
                  sendNdjson("content", cleanContent);
                }
              }
            } catch {
              /* fallback network error */
            }

            // Guaranteed requirement-anchored consulting draft fallback if still empty
            if (accumulatedContent.trim().length < 30) {
              const autoDraft = `### ${section?.title || "Executive Summary"}\n\n` +
                `This document establishes the strategic foundation and operational roadmap for **${bundle.proposal.title}**, delivered for **${bundle.client?.companyName || "the Client"}**.\n\n` +
                `### Core Objectives & Capabilities\n\n` +
                `${reqFeatures.split("\n").map((f) => `- ${f.replace(/^•\s*/, "")}`).join("\n")}\n\n` +
                `### Implementation & Next Steps\n\n` +
                `The proposed timeline target is **${bundle.document.meta.timelineLabel || "the standard schedule"}** with an investment budget of **${bundle.document.meta.amountLabel}** anchored by verified system architecture requirements.`;
              sendNdjson("content", autoDraft);
            }
          }
        }
      } catch {
        /* disconnected */
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
