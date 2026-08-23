import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getClientForUser } from "@/lib/clients";
import { serializeClientDetail } from "@/lib/client-serialize";
import {
  COPILOT_MODEL_LABEL,
  loadConversation,
  ollamaOnline,
  saveMessage,
  streamCopilot,
} from "@/lib/copilot";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function resolve(req: Request, params: Ctx["params"]) {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 }) };
  const { id } = await params;
  // Authorization: getClientForUser resolves the workspace from the session
  // and only returns clients belonging to it — never trust the URL id.
  const client = await getClientForUser(session.user.id, id);
  if (!client) return { error: NextResponse.json({ ok: false, message: "Lead not found." }, { status: 404 }) };
  return { session, client };
}

/* ── GET /api/clients/[id]/copilot ─────────────────────────────
   Conversation history + live Ollama status. */

export async function GET(_req: Request, { params }: Ctx) {
  const ctx = await resolve(_req, params);
  if ("error" in ctx) return ctx.error;
  const { session, client } = ctx;

  const [messages, online] = await Promise.all([
    loadConversation(client.id, session!.user.id),
    ollamaOnline(),
  ]);

  return NextResponse.json({
    ok: true,
    online,
    model: COPILOT_MODEL_LABEL,
    messages,
  });
}

/* ── POST /api/clients/[id]/copilot ────────────────────────────
   Persist the user turn, stream the model answer. Never bypasses
   authorization — the lead is resolved from the session server-side. */

export async function POST(req: Request, { params }: Ctx) {
  const ctx = await resolve(req, params);
  if ("error" in ctx) return ctx.error;
  const { session, client } = ctx;

  // The owning workspace for scoping persisted messages — always the same
  // workspace the client belongs to.
  const workspace = await db.workspace.findUnique({ where: { ownerId: session!.user.id } });
  if (!workspace) {
    return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
  }

  const rl = await rateLimit(60, 60_000, "copilot");
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Too many requests. Try again shortly.", retryAfter: rl.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  let body: { message?: string; via?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }
  const userMessage = body.message?.trim();
  if (!userMessage) {
    return NextResponse.json({ ok: false, message: "Ask something about this lead." }, { status: 400 });
  }
  if (userMessage.length > 2000) {
    return NextResponse.json({ ok: false, message: "Message is too long." }, { status: 400 });
  }
  const via = body.via === "voice" ? "voice" : "text";

  // Probe Ollama before persisting — an unanswered user turn should never
  // become a permanent part of the conversation.
  if (!(await ollamaOnline())) {
    return NextResponse.json(
      { ok: false, code: "OLLAMA_OFFLINE", message: "Local AI is offline. Start Ollama to continue." },
      { status: 503 },
    );
  }

  // Persist the user turn first — the conversation is durable even if the
  // model call fails midway.
  await saveMessage({
    workspaceId: workspace!.id,
    clientId: client!.id,
    userId: session!.user.id,
    role: "USER",
    content: userMessage,
    via,
  });

  const [detail, history] = await Promise.all([
    serializeClientDetail(client!, session!.user.name ?? "Owner"),
    loadConversation(client!.id, session!.user.id),
  ]);

  // history already includes the just-saved user turn; streamCopilot appends
  // the current message itself, so drop the trailing user row here.
  const historyForModel = history
    .slice(-14, -1)
    .map((m) => ({ role: m.role.toLowerCase() === "assistant" ? "assistant" : "user", content: m.content }));

  return streamCopilot({
    detail,
    history: historyForModel,
    userMessage,
    workspaceId: workspace!.id,
    clientId: client!.id,
    userId: session!.user.id,
    via,
  });
}
