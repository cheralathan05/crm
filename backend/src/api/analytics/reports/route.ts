import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateExecutiveBusinessReport } from "@/lib/analytics/report-engine.service";

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

  const snapshots = await db.analyticsSnapshot.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ ok: true, data: snapshots });
}

export async function POST(req: Request) {
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
    const body = await req.json().catch(() => ({}));
    const report = await generateExecutiveBusinessReport({
      workspaceId,
      title: body.title,
      createdById: session.user.id,
      createdByName: session.user.name || "Admin",
    });

    return NextResponse.json({ ok: true, data: report });
  } catch (error: any) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { ok: false, message: "Report generation failed.", error: error.message },
      { status: 500 },
    );
  }
}
