import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPaymentStory } from "@/lib/payments/payment-story.service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const story = await getPaymentStory(id);
    if (!story) {
      return NextResponse.json({ ok: false, message: "Payment record not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: story });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
