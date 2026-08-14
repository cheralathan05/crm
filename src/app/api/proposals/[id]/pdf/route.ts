import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProposalForUser } from "@/lib/proposal";
import { readStored } from "@/lib/uploads";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── GET /api/proposals/[id]/pdf — serve the generated PDF ─────
   Workspace-scoped: only the owning user can download it. The file
   lives on disk; the database holds only the relative path. */

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const proposal = await getProposalForUser(session.user.id, id);
  if (!proposal || !proposal.pdfPath) {
    return NextResponse.json({ ok: false, message: "This proposal has no generated PDF yet." }, { status: 404 });
  }

  const stored = await readStored(proposal.pdfPath);
  if (!stored) {
    return NextResponse.json({ ok: false, message: "The PDF file is missing. Finalize the proposal again to regenerate it." }, { status: 404 });
  }

  const safeName = (proposal.reference ?? "proposal").replace(/[^A-Za-z0-9-]/g, "_");
  return new NextResponse(new Uint8Array(stored.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeName}.pdf"`,
      "Content-Length": String(stored.size),
      "Cache-Control": "private, max-age=60",
    },
  });
}
