import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProposalForUser, serializeProposalForStudio, generateProposalPdf } from "@/lib/proposal";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── GET /api/proposals/[id]/download — admin PDF download ────
   Serves the exact fresh PDF generated from the authoritative database
   document and records the download in the audit trail. */

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const proposal = await getProposalForUser(session.user.id, id);
  if (!proposal) {
    return NextResponse.json({ ok: false, message: "Proposal not found." }, { status: 404 });
  }
  try {
    const bundle = await serializeProposalForStudio(proposal);
    const result = await generateProposalPdf(bundle.document);
    const pdfBytes = result.buffer;

    await db.clientAuditEvent.create({
      data: {
        clientId: proposal.clientId,
        entity: "PROPOSAL",
        action: "DOCUMENT_UPLOADED",
        entityId: proposal.id,
        actorId: session.user.id,
        actorName: session.user.name ?? "Owner",
        after: JSON.stringify({ event: "pdf_downloaded", version: proposal.version, pages: result.pages }),
      },
    });

    const safeName = (proposal.reference ?? "proposal").replace(/[^A-Za-z0-9-]/g, "_");
    return new NextResponse(new Uint8Array(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="BusinessOS-${safeName}-v${proposal.version}.pdf"`,
        "Content-Length": String(pdfBytes.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[proposal:download] generation failed", err);
    return NextResponse.json({ ok: false, message: "Could not generate proposal PDF." }, { status: 500 });
  }
}
