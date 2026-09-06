import { NextResponse } from "next/server";
import { resolveRequestByToken } from "@/lib/requirements";
import {
  getOrCreateDiscoverySession,
  processConsultantTurn,
  confirmInlineDiscovery,
  recordDiscoveryDecision,
  toggleScopeItemTier,
  updateJourneySteps,
  approveProjectUnderstanding,
  serializeDiscoverySession,
  handleIDontKnowTurn,
  handleDecideLaterTurn,
  confirmContradictionRevision,
} from "@/lib/discovery/discovery.service";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { token } = await params;
  const resolved = await resolveRequestByToken(token);
  if (!resolved) {
    return NextResponse.json({ ok: false, code: "INVALID" }, { status: 404 });
  }
  if (resolved.error) {
    return NextResponse.json({ ok: false, code: resolved.error, label: resolved.errorLabel }, { status: 403 });
  }

  try {
    const session = await getOrCreateDiscoverySession(resolved.request.id);
    return NextResponse.json({ ok: true, session });
  } catch (error: any) {
    console.error("[API Discovery GET Error]", error);
    return NextResponse.json({ ok: false, message: error?.message || "Failed to load discovery session" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const { token } = await params;
  const resolved = await resolveRequestByToken(token);
  if (!resolved) {
    return NextResponse.json({ ok: false, code: "INVALID" }, { status: 404 });
  }
  if (resolved.error) {
    return NextResponse.json({ ok: false, code: resolved.error, label: resolved.errorLabel }, { status: 403 });
  }

  try {
    const body = await req.json();
    const action = body.action as string;

    const currentSession = await getOrCreateDiscoverySession(resolved.request.id);
    const sessionId = currentSession.id;

    if (action === "SEND_MESSAGE") {
      const userMessage = String(body.message || "").trim();
      const selectedOption = body.selectedOption ? String(body.selectedOption) : undefined;
      if (!userMessage && !selectedOption) {
        return NextResponse.json({ ok: false, message: "Message is required." }, { status: 400 });
      }
      const updated = await processConsultantTurn({
        sessionId,
        userMessage: userMessage || selectedOption || "",
        selectedOption,
      });
      return NextResponse.json({ ok: true, session: updated });
    }

    if (action === "CONFIRM_INLINE") {
      const updated = await confirmInlineDiscovery({
        sessionId,
        confirmed: Boolean(body.confirmed),
        statement: String(body.statement || ""),
        changeNote: body.changeNote ? String(body.changeNote) : undefined,
      });
      return NextResponse.json({ ok: true, session: updated });
    }

    if (action === "RECORD_DECISION") {
      const updated = await recordDiscoveryDecision({
        sessionId,
        decisionTitle: String(body.title || ""),
        choice: String(body.choice || ""),
        reason: body.reason ? String(body.reason) : undefined,
      });
      return NextResponse.json({ ok: true, session: updated });
    }

    if (action === "TOGGLE_SCOPE") {
      const updated = await toggleScopeItemTier({
        sessionId,
        scopeItemId: String(body.scopeItemId || ""),
        targetTier: body.targetTier as any,
      });
      return NextResponse.json({ ok: true, session: updated });
    }

    if (action === "UPDATE_JOURNEY") {
      const updated = await updateJourneySteps({
        sessionId,
        journeyId: String(body.journeyId || ""),
        steps: Array.isArray(body.steps) ? body.steps : [],
      });
      return NextResponse.json({ ok: true, session: updated });
    }

    if (action === "SWITCH_PATH") {
      const intakePath = body.intakePath === "TECHNICAL" ? "TECHNICAL" : "GUIDED";
      await db.discoverySession.update({
        where: { id: sessionId },
        data: { intakePath },
      });
      const updated = await serializeDiscoverySession(sessionId);
      return NextResponse.json({ ok: true, session: updated });
    }

    if (action === "SWITCH_MODE") {
      const mode = body.mode === "REVIEW" ? "REVIEW" : "DISCOVERY";
      await db.discoverySession.update({
        where: { id: sessionId },
        data: { mode },
      });
      const updated = await serializeDiscoverySession(sessionId);
      return NextResponse.json({ ok: true, session: updated });
    }

    if (action === "I_DONT_KNOW") {
      const currentQuestion = String(body.currentQuestion || "Current detail").trim();
      const updated = await handleIDontKnowTurn({
        sessionId,
        currentQuestion,
      });
      return NextResponse.json({ ok: true, session: updated });
    }

    if (action === "DECIDE_LATER") {
      const title = String(body.title || body.currentQuestion || "Deferred item").trim();
      const reason = body.reason ? String(body.reason) : undefined;
      const updated = await handleDecideLaterTurn({
        sessionId,
        title,
        reason,
      });
      return NextResponse.json({ ok: true, session: updated });
    }

    if (action === "CONFIRM_CONTRADICTION") {
      const contradictionId = String(body.contradictionId || "");
      const updated = await confirmContradictionRevision({
        sessionId,
        contradictionId,
      });
      return NextResponse.json({ ok: true, session: updated });
    }

    if (action === "APPROVE_UNDERSTANDING") {
      const approverName = String(body.approverName || resolved.request.responderName || "Client Stakeholder").trim();
      const approverEmail = body.approverEmail ? String(body.approverEmail).trim() : undefined;
      const updated = await approveProjectUnderstanding({
        sessionId,
        approverName,
        approverEmail,
      });
      return NextResponse.json({ ok: true, session: updated });
    }

    return NextResponse.json({ ok: false, message: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error("[API Discovery POST Error]", error);
    return NextResponse.json({ ok: false, message: error?.message || "Failed to process discovery action" }, { status: 500 });
  }
}
