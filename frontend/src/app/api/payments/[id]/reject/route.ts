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
    const { reason, submissionId } = await req.json();
    if (!reason) {
      return NextResponse.json({ ok: false, message: "Rejection reason is required" }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      await tx.paymentRequest.update({
        where: { id },
        data: { status: "REJECTED" },
      });

      if (submissionId) {
        await tx.paymentSubmission.update({
          where: { id: submissionId },
          data: {
            status: "REJECTED",
            rejectionReason: reason,
            reviewedByName: session.user?.name || "Admin",
            reviewedAt: new Date(),
          },
        });
      }

      await tx.financialAuditLog.create({
        data: {
          requestId: id,
          actorName: session.user?.name || "Admin",
          action: "REJECTED",
          entityType: "PAYMENT_REQUEST",
          entityId: id,
          reason,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 400 });
  }
}
