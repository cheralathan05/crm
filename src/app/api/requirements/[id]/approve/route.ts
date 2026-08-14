import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRequirementForUser, transitionRequest } from "@/lib/requirements";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const request = await getRequirementForUser(session.user.id, id);
  if (!request) {
    return NextResponse.json({ ok: false, message: "Requirement request not found." }, { status: 404 });
  }
  if (!["SUBMITTED", "REVISION_SUBMITTED", "CHANGES_REQUESTED", "IN_PROGRESS"].includes(request.status)) {
    return NextResponse.json({ ok: false, message: "This request cannot be approved yet." }, { status: 400 });
  }

  const result = await transitionRequest({
    request,
    action: "approve",
    actorId: session.user.id,
    actorName: session.user.name ?? "Owner",
  });
  const updated = "request" in result ? result.request : result;

  return NextResponse.json({ ok: true, status: updated.status });
}
