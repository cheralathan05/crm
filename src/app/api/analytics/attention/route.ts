import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAttentionCenterItems } from "@/lib/analytics/attention-center.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
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

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || undefined;
  const projectId = searchParams.get("projectId") || undefined;
  const severity = (searchParams.get("severity") as any) || undefined;

  try {
    const result = await getAttentionCenterItems(workspaceId, { category, projectId, severity });
    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error("Attention Center fetch error:", error);
    return NextResponse.json(
      { ok: false, message: "Attention Center temporarily unavailable.", error: error.message },
      { status: 500 },
    );
  }
}
