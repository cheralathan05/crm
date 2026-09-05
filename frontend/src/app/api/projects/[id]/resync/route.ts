import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resyncProjectFromApprovedProposal } from "@/lib/projects";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const updatedProject = await resyncProjectFromApprovedProposal(id);
    return NextResponse.json({
      ok: true,
      message: `Project ${updatedProject.code} resynchronized with approved proposal.`,
      project: { id: updatedProject.id, code: updatedProject.code, name: updatedProject.name },
    });
  } catch (err: any) {
    console.error("[api/projects/[id]/resync] error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to resynchronize project." },
      { status: 500 }
    );
  }
}
