import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveRequestByToken, recordEvent } from "@/lib/requirements";
import {
  getProjectUnderstanding,
  clientApproveProjectUnderstanding,
  clientRequestUnderstandingChange,
} from "@/lib/requirement-collaboration";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { token } = await params;
  const resolved = await resolveRequestByToken(token);
  if (!resolved || resolved.error) {
    return NextResponse.json({ ok: false, message: "Invalid or expired access link." }, { status: 403 });
  }

  const request = resolved.request;
  const [understanding, events] = await Promise.all([
    getProjectUnderstanding(request.id),
    db.requirementEvent.findMany({
      where: { requestId: request.id },
      select: { id: true, label: true, detail: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  return NextResponse.json({
    ok: true,
    understanding,
    title: request.title,
    reference: request.reference,
    companyName: request.client.companyName,
    status: request.status,
    recentEvents: events.map((e) => ({
      id: e.id,
      label: e.label,
      detail: e.detail,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request, { params }: Ctx) {
  const { token } = await params;
  const resolved = await resolveRequestByToken(token);
  if (!resolved || resolved.error) {
    return NextResponse.json({ ok: false, message: "Invalid or expired access link." }, { status: 403 });
  }

  const request = resolved.request;

  try {
    const body = await req.json();
    const action = body.action as "APPROVE" | "REQUEST_CHANGE";

    if (action === "APPROVE") {
      const responderName = body.responderName?.trim() || request.responderName || "Client Stakeholder";
      const result = await clientApproveProjectUnderstanding({
        requestId: request.id,
        responderName,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "REQUEST_CHANGE") {
      if (!body.requestedChange?.trim() || !body.reason?.trim()) {
        return NextResponse.json(
          { ok: false, message: "Both the requested change and the reason are required." },
          { status: 400 },
        );
      }

      const result = await clientRequestUnderstandingChange({
        requestId: request.id,
        section: body.section || "Scope",
        currentUnderstanding: body.currentUnderstanding || "",
        requestedChange: body.requestedChange.trim(),
        reason: body.reason.trim(),
      });
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ ok: false, message: "Invalid action." }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process request.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
