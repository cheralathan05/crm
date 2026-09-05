import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminPaymentDashboardData } from "@/lib/payments/payment-story.service";
import { createPaymentRequest } from "@/lib/payments/payment-request.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await getAdminPaymentDashboardData();
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("[api/payments] error:", err);
    return NextResponse.json({ ok: false, message: err.message || "Failed to load payment data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = await createPaymentRequest({
      ...body,
      createdById: session.user.id,
      createdByName: session.user.name || "Admin",
    });

    return NextResponse.json({ ok: true, data: result }, { status: 201 });
  } catch (err: any) {
    console.error("[api/payments] POST error:", err);
    return NextResponse.json({ ok: false, message: err.message || "Failed to create payment request" }, { status: 400 });
  }
}
