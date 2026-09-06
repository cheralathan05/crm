import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRequirementForUser } from "@/lib/requirements";
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

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const request = await getRequirementForUser(session.user.id, id);
  if (!request) {
    return NextResponse.json({ ok: false, message: "Requirement not found." }, { status: 404 });
  }

  try {
    const discoverySession = await getOrCreateDiscoverySession(request.id);
    return NextResponse.json({ ok: true, session: discoverySession });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[API Requirement Discovery GET Error]", err);
    return NextResponse.json({ ok: false, message: err?.message || "Failed to load discovery session" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const request = await getRequirementForUser(session.user.id, id);
  if (!request) {
    return NextResponse.json({ ok: false, message: "Requirement not found." }, { status: 404 });
  }

  try {
    const body = await req.json();
    const action = body.action as string;

    const currentSession = await getOrCreateDiscoverySession(request.id);
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
        targetTier: body.targetTier as never,
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
      const approverName = String(body.approverName || session.user.name || "Internal Lead").trim();
      const approverEmail = body.approverEmail ? String(body.approverEmail).trim() : (session.user.email ?? undefined);
      const updated = await approveProjectUnderstanding({
        sessionId,
        approverName,
        approverEmail,
      });
      return NextResponse.json({ ok: true, session: updated });
    }

    return NextResponse.json({ ok: false, message: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[API Requirement Discovery POST Error]", err);
    return NextResponse.json({ ok: false, message: err?.message || "Failed to process discovery action" }, { status: 500 });
  }
}
