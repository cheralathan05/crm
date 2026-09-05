import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { askBusinessOS } from "@/lib/analytics/ask-business-os.service";

export const dynamic = "force-dynamic";

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
    const { question } = await req.json();
    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { ok: false, message: "A question string is required." },
        { status: 400 },
      );
    }

    const response = await askBusinessOS(question, workspaceId);
    return NextResponse.json({ ok: true, data: response });
  } catch (error: any) {
    console.error("Ask Business OS query error:", error);
    return NextResponse.json(
      { ok: false, message: "Could not process question.", error: error.message },
      { status: 500 },
    );
  }
}
