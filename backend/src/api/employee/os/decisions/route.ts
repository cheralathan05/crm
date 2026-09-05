import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProjectDecisionsData } from "@/lib/employees/employee-os.service";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let projectId = searchParams.get("projectId");

    if (!projectId) {
      const latestProject = await db.clientProject.findFirst({ orderBy: { createdAt: "desc" } });
      projectId = latestProject?.id || null;
    }

    if (!projectId) {
      return NextResponse.json({ ok: false, message: "No active project." }, { status: 404 });
    }

    const data = await getProjectDecisionsData(projectId);
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || "Failed to load decisions." }, { status: 500 });
  }
}
