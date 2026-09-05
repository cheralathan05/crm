import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const { prompt, submissionId } = await req.json();
    if (!prompt) {
      return NextResponse.json({ ok: false, message: "Clarification prompt is required" }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      await tx.paymentRequest.update({
        where: { id },
        data: { status: "CLARIFICATION_REQUIRED" },
      });

      if (submissionId) {
        await tx.paymentSubmission.update({
          where: { id: submissionId },
          data: {
            status: "CLARIFICATION_REQUESTED",
            clarificationPrompt: prompt,
            reviewedByName: session.user?.name || "Admin",
            reviewedAt: new Date(),
          },
        });
      }

      await tx.financialAuditLog.create({
        data: {
          requestId: id,
          actorName: session.user?.name || "Admin",
          action: "CLARIFICATION_REQUESTED",
          entityType: "PAYMENT_REQUEST",
          entityId: id,
          reason: prompt,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 400 });
  }
}
