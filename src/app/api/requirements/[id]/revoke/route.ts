import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRequirementForUser, transitionRequest } from "@/lib/requirements";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

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
  if (request.status === "REVOKED") {
    return NextResponse.json({ ok: false, message: "This request is already revoked." }, { status: 400 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* optional body */
  }

  await transitionRequest({
    request,
    action: "revoke",
    actorId: session.user.id,
    actorName: session.user.name ?? "Owner",
    data: { reason: body.reason ? String(body.reason) : undefined },
  });

  return NextResponse.json({ ok: true, status: "REVOKED" });
}
