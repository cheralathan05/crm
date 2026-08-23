import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateProjectStory } from "@/lib/events/project-event-engine";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── GET /api/projects/[id]/story — Real-Time Human-Readable Project Story ─ */
export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  const story = await generateProjectStory(id);

  return NextResponse.json({
    ok: true,
    story,
  });
}
