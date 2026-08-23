import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { detectArchitectureDrift } from "@/lib/ai/orchestrator/drift.detector";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── GET /api/projects/[id]/blueprint/drift ─────────────────── */
export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  try {
    const drifts = await detectArchitectureDrift(id);
    return NextResponse.json({ ok: true, drifts });
  } catch (err: any) {
    console.error("[api:drift] failed", err);
    return NextResponse.json({ ok: false, message: err.message || "Failed to scan drift." }, { status: 500 });
  }
}
