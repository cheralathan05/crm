import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEarlyDeliveryIntelligence } from "@/lib/analytics/early-delivery.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { workspace: true },
  });

  const workspaceId = user?.workspace?.id || (await db.workspace.findFirst())?.id;
  if (!workspaceId) {
    return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
  }

  try {
    const data = await getEarlyDeliveryIntelligence(workspaceId);
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    console.error("Early Delivery fetch error:", error);
    return NextResponse.json(
      { ok: false, message: "Early delivery intelligence unavailable.", error: error.message },
      { status: 500 },
    );
  }
}
