import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateWorkBreakdownPlan, commitWorkBreakdownPlan } from "@/lib/tasks";

export const dynamic = "force-dynamic";

/* ── GET /api/tasks/work-breakdown?projectId=... — Generate Preview ─ */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ ok: false, message: "projectId is required." }, { status: 400 });
  }

  const plan = await generateWorkBreakdownPlan(projectId);
  if (!plan) {
    return NextResponse.json({ ok: false, message: "Project not found or invalid." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, plan });
}

/* ── POST /api/tasks/work-breakdown — Commit Approved Work Plan ── */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const { projectId, plan } = body;
  if (!projectId || !plan) {
    return NextResponse.json({ ok: false, message: "projectId and approved plan are required." }, { status: 400 });
  }

  try {
    const result = await commitWorkBreakdownPlan(
      projectId,
      plan,
      session.user.id,
      session.user.name ?? "Team Lead",
    );
    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    console.error("[work-breakdown commit error]", err);
    return NextResponse.json({ ok: false, message: err.message || "Failed to commit work plan." }, { status: 500 });
  }
}
