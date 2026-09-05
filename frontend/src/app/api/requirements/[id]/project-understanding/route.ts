import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRequirementForUser } from "@/lib/requirements";
import {
  getProjectUnderstanding,
  saveProjectUnderstanding,
  checkProposalGate,
} from "@/lib/requirement-collaboration";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

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

  const [understanding, gate] = await Promise.all([
    getProjectUnderstanding(request.id),
    checkProposalGate(request.id),
  ]);

  return NextResponse.json({
    ok: true,
    understanding,
    gate,
    revision: request.revision,
    status: request.status,
  });
}

export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  const request = await getRequirementForUser(session.user.id, id);
  if (!request) {
    return NextResponse.json({ ok: false, message: "Requirement request not found." }, { status: 404 });
  }

  try {
    const body = await req.json();
    const state = body.state;
    if (!state?.brief) {
      return NextResponse.json({ ok: false, message: "Project understanding brief is required." }, { status: 400 });
    }

    await saveProjectUnderstanding({
      requestId: request.id,
      actorId: session.user.id,
      actorName: session.user.name ?? "Project Lead",
      state,
    });

    const gate = await checkProposalGate(request.id);
    return NextResponse.json({ ok: true, state, gate });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save project understanding.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
