import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRequirementForUser } from "@/lib/requirements";
import { createClientRequestBundle } from "@/lib/requirement-collaboration";

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

  try {
    const body = await req.json();
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json({ ok: false, message: "At least one question item must be selected." }, { status: 400 });
    }

    const result = await createClientRequestBundle({
      requestId: request.id,
      actorId: session.user.id,
      actorName: session.user.name ?? "Project Lead",
      items,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create client request.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
