import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveRequestByToken, recordEvent, recomputeRequestMetrics } from "@/lib/requirements";
import { computeVisualDiff } from "@/lib/requirement-collaboration";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const { token } = await params;
  const resolved = await resolveRequestByToken(token);
  if (!resolved || resolved.error) {
    return NextResponse.json({ ok: false, message: "Invalid or expired access link." }, { status: 403 });
  }

  const request = resolved.request;

  try {
    const body = await req.json();
    const { responderName, answers } = body as {
      responderName?: string;
      answers: Record<string, {
        questionId?: string;
        section: string;
        value: string | string[];
        previousValue?: string;
        reason?: string;
        isChange?: boolean;
      }>;
    };

    if (!answers || Object.keys(answers).length === 0) {
      return NextResponse.json({ ok: false, message: "No answers provided." }, { status: 400 });
    }

    const responder = responderName?.trim() || request.responderName || "Client";
    const answeredSections: string[] = [];
    const detectedChanges: string[] = [];

    for (const [key, ans] of Object.entries(answers)) {
      const section = ans.section || key;
      const valStr = Array.isArray(ans.value) ? ans.value.join(", ") : String(ans.value ?? "");

      // 1. If bound to a Question ID or section, update Question record
      const questionRecord = ans.questionId
        ? await db.requirementQuestion.findUnique({ where: { id: ans.questionId } })
        : await db.requirementQuestion.findFirst({ where: { requirementId: request.id, section } });

      if (questionRecord) {
        await db.requirementQuestion.update({
          where: { id: questionRecord.id },
          data: {
            response: valStr,
            answerData: JSON.stringify(ans.value),
            respondedByName: responder,
            respondedAt: new Date(),
            status: "ANSWERED",
          },
        });
      }

      // 2. Change detection: if client changed a previously submitted answer or flagged isChange
      const isModified = Boolean(ans.isChange) || (ans.previousValue && ans.previousValue.trim() !== valStr.trim());
      if (isModified && ans.previousValue) {
        detectedChanges.push(section);

        // Record Update Proposal for the admin change review queue
        await db.requirementUpdateProposal.create({
          data: {
            workspaceId: request.workspaceId,
            clientId: request.clientId,
            requirementId: request.id,
            questionId: questionRecord?.id ?? `auto-${section}`,
            summary: ans.reason ? `Client changed ${section}: ${ans.reason}` : `Client updated ${section}`,
            currentValue: ans.previousValue,
            proposedValue: valStr,
            createdByName: responder,
            status: "PENDING",
          },
        }).catch(() => undefined);
      }

      // 3. Save into requirement answer draft if applicable
      await db.requirementAnswer.upsert({
        where: { requestId_section: { requestId: request.id, section } },
        create: {
          requestId: request.id,
          section,
          data: JSON.stringify({ answer: ans.value, lastModifiedBy: responder, reason: ans.reason }),
          completedAt: new Date(),
        },
        update: {
          data: JSON.stringify({ answer: ans.value, lastModifiedBy: responder, reason: ans.reason }),
          completedAt: new Date(),
        },
      });

      answeredSections.push(section);
    }

    // Update request state
    await db.requirementRequest.update({
      where: { id: request.id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        responderName: responder,
      },
    });

    await recordEvent(
      request.id,
      "REVISION_SUBMITTED",
      `Client response submitted (${answeredSections.length} answers)`,
      `Submitted by ${responder}.${detectedChanges.length > 0 ? ` Changes detected in: ${detectedChanges.join(", ")}` : ""}`,
      { changes: detectedChanges, sections: answeredSections },
    );

    await recomputeRequestMetrics(request.id).catch(() => undefined);

    return NextResponse.json({
      ok: true,
      answeredCount: answeredSections.length,
      changesCount: detectedChanges.length,
      responder,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to submit response.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
