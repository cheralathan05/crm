import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRequirementForUser, recomputeRequestMetrics } from "@/lib/requirements";
import {
  approveClientChange,
  rejectClientChange,
  requestClarificationOnChange,
  analyzeChangeWithOllama,
} from "@/lib/requirement-collaboration";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  const request = await getRequirementForUser(session.user.id, id);
  if (!request) {
    return NextResponse.json({ ok: false, message: "Requirement request not found." }, { status: 404 });
  }

  try {
    const body = await req.json();
    const action = body.action as "APPROVE" | "REJECT" | "CLARIFY" | "AI_ANALYZE";
    const changeId = body.changeId as string;
    const section = (body.section as string) || "scope";

    if (action === "AI_ANALYZE") {
      const analysis = await analyzeChangeWithOllama({
        section,
        previousValue: body.previousValue ?? "",
        newValue: body.newValue ?? "",
        clientReason: body.reason,
      });
      return NextResponse.json({ ok: true, analysis });
    }

    if (action === "APPROVE") {
      const result = await approveClientChange({
        requestId: request.id,
        actorId: session.user.id,
        actorName: session.user.name ?? "Admin",
        changeId,
        section,
        newValue: body.newValue ?? "",
        reason: body.reason,
      });
      await recomputeRequestMetrics(request.id).catch(() => undefined);
      return NextResponse.json(result);
    }

    if (action === "REJECT") {
      if (!body.reason?.trim()) {
        return NextResponse.json({ ok: false, message: "Rejection reason is mandatory." }, { status: 400 });
      }
      const result = await rejectClientChange({
        requestId: request.id,
        actorId: session.user.id,
        actorName: session.user.name ?? "Admin",
        changeId,
        section,
        reason: body.reason,
      });
      return NextResponse.json(result);
    }

    if (action === "CLARIFY") {
      if (!body.clarificationNote?.trim()) {
        return NextResponse.json({ ok: false, message: "Clarification instructions are required." }, { status: 400 });
      }
      const result = await requestClarificationOnChange({
        requestId: request.id,
        actorId: session.user.id,
        actorName: session.user.name ?? "Admin",
        changeId,
        section,
        clarificationNote: body.clarificationNote,
        guidance: body.guidance,
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ ok: false, message: "Invalid action." }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process change decision.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
