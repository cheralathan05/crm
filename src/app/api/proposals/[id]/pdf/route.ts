import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getProposalForUser, generateProposalPdf, serializeProposalForStudio } from "@/lib/proposal";
import { readStored } from "@/lib/uploads";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── GET /api/proposals/[id]/pdf — serve the generated PDF ─────
   Workspace-scoped: only the owning user can download it.
   If pdfPath is missing or outdated, it regenerates directly from
   the authoritative proposal document stored in the database. */

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

  let pdfBytes: Buffer | null = null;

  // Try reading existing file
  if (proposal.pdfPath) {
    const stored = await readStored(proposal.pdfPath);
    if (stored) {
      pdfBytes = stored.buffer;
    }
  }

  // If file doesn't exist on disk or pdfPath is null, generate from database document
  if (!pdfBytes) {
    try {
      const bundle = await serializeProposalForStudio(proposal);
      const result = await generateProposalPdf(bundle.document);
      pdfBytes = result.buffer;

      // Save to disk
      const dir = path.join(process.cwd(), "uploads", "proposals");
      await mkdir(dir, { recursive: true });
      const fileName = `${proposal.id}-v${proposal.version}.pdf`;
      await writeFile(path.join(dir, fileName), pdfBytes);
      const pdfPath = `proposals/${fileName}`;

      await db.clientProposal.update({
        where: { id: proposal.id },
        data: { pdfPath, pdfPages: result.pages },
      });
    } catch (err) {
      console.error("[proposal:pdf] auto-generation failed", err);
      return NextResponse.json({ ok: false, message: "Could not generate proposal PDF." }, { status: 500 });
    }
  }

  const safeName = (proposal.reference ?? "proposal").replace(/[^A-Za-z0-9-]/g, "_");
  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeName}-v${proposal.version}.pdf"`,
      "Content-Length": String(pdfBytes.length),
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
