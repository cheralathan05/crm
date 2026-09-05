import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRequirementForUser } from "@/lib/requirements";
import { categoryLabel } from "@/lib/clarification-rules";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── GET /api/requirements/[id]/impact ─────────────────────────
   Aggregated impact picture across a requirement's clarifications —
   the highest impact per area across all questions, never invented
   costs. */

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const request = await getRequirementForUser(session.user.id, id);
  if (!request) {
    return NextResponse.json({ ok: false, message: "Requirement request not found." }, { status: 404 });
  }

  const questions = await db.requirementQuestion.findMany({
    where: { requirementId: request.id },
    select: { id: true, category: true, priority: true, isBlocking: true, impact: true, status: true },
  });

  const areas = ["scope", "timeline", "budget", "complexity", "risk"] as const;
  const rank = { LOW: 0, MEDIUM: 1, HIGH: 2, UNKNOWN: 0 } as const;
  const aggregate: Record<string, string> = {};
  for (const area of areas) {
    let top: string = "UNKNOWN";
    for (const q of questions) {
      let impact: Record<string, string> = {};
      try {
        impact = JSON.parse(q.impact);
      } catch {
        /* ignore malformed impact */
      }
      const v = String(impact[area] ?? "UNKNOWN").toUpperCase();
      if (rank[v as keyof typeof rank] > rank[top as keyof typeof rank]) top = v;
    }
    aggregate[area] = top;
  }

  return NextResponse.json({
    ok: true,
    impact: aggregate,
    blocking: questions.filter((q) => q.isBlocking && !["RESOLVED", "CANCELLED"].includes(q.status)).length,
    byCategory: questions.reduce<Record<string, number>>((acc, q) => {
      const key = categoryLabel(q.category) || "Unclassified";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  });
}
