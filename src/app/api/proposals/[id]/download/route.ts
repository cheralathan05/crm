import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProposalForUser } from "@/lib/proposal";
import { readStored } from "@/lib/uploads";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── GET /api/proposals/[id]/download — admin PDF download ────
   Serves the exact stored finalized PDF with a download disposition
   and records the download in the audit trail. Never regenerates. */

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const proposal = await getProposalForUser(session.user.id, id);
  if (!proposal || !proposal.pdfPath) {
    return NextResponse.json({ ok: false, message: "This proposal has no finalized PDF yet." }, { status: 404 });
  }

  const stored = await readStored(proposal.pdfPath);
  if (!stored) {
    return NextResponse.json({ ok: false, message: "The PDF file is missing. Finalize the proposal again to regenerate it." }, { status: 404 });
  }

  await db.clientAuditEvent.create({
    data: {
      clientId: proposal.clientId,
      entity: "PROPOSAL",
      action: "DOCUMENT_UPLOADED",
      entityId: proposal.id,
      actorId: session.user.id,
      actorName: session.user.name ?? "Owner",
      after: JSON.stringify({ event: "pdf_downloaded", version: proposal.version, pages: proposal.pdfPages }),
    },
  });

  const safeName = (proposal.reference ?? "proposal").replace(/[^A-Za-z0-9-]/g, "_");
  return new NextResponse(new Uint8Array(stored.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="BusinessOS-${safeName}-v${proposal.version}.pdf"`,
      "Content-Length": String(stored.size),
      "Cache-Control": "private, no-store",
    },
  });
}
