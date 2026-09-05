import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { confirmPayment } from "@/lib/payments/payment-confirmation.service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const result = await confirmPayment({
      requestId: id,
      submissionId: body.submissionId,
      confirmedById: session.user.id,
      confirmedByName: session.user.name || "Admin",
      note: body.note,
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (err: any) {
    console.error("[api/payments/confirm] error:", err);
    return NextResponse.json({ ok: false, message: err.message || "Confirmation failed" }, { status: 400 });
  }
}
