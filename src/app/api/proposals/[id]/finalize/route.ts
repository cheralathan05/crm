import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getProposalForUser, generateProposalPdf, serializeProposalForStudio } from "@/lib/proposal";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/proposals/[id]/finalize ─────────────────────────
   Final check → generate the PDF from the saved document → store it
   under uploads/proposals/ → mark the proposal finalized. Real PDF,
   real page count, real persistence. */

export async function POST(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const proposal = await getProposalForUser(session.user.id, id);
  if (!proposal) {
    return NextResponse.json({ ok: false, message: "Proposal not found." }, { status: 404 });
  }

  const bundle = await serializeProposalForStudio(proposal);
  const doc = bundle.document;

  // Final check — mirror what the studio shows, reject only the blockers.
  const visible = doc.sections.filter((s) => s.visible);
  if (!doc.meta.title.trim()) {
    return NextResponse.json({ ok: false, message: "Add a proposal title before finalizing." }, { status: 400 });
  }
  if (!doc.meta.clientName.trim()) {
    return NextResponse.json({ ok: false, message: "A client is required to finalize." }, { status: 400 });
  }
  if (visible.length === 0) {
    return NextResponse.json({ ok: false, message: "Every section is hidden — nothing to generate." }, { status: 400 });
  }

  let result;
  try {
    result = await generateProposalPdf(doc);
  } catch (err) {
    console.error("[proposal:pdf] generation failed", err);
    return NextResponse.json({ ok: false, message: "The PDF could not be generated. Please try again." }, { status: 500 });
  }

  // Persist the PDF on disk and record its path + accurate page count.
  const dir = path.join(process.cwd(), "uploads", "proposals");
  await mkdir(dir, { recursive: true });
  const fileName = `${proposal.id}.pdf`;
  await writeFile(path.join(dir, fileName), result.buffer, { flag: "wx" }).catch(async () => {
    // Regenerate over an existing file.
    await writeFile(path.join(dir, fileName), result.buffer);
  });
  const pdfPath = `proposals/${fileName}`;

  const saved = await db.clientProposal.update({
    where: { id: proposal.id },
    data: {
      pdfPath,
      pdfPages: result.pages,
      finalizedAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    proposal: {
      id: saved.id,
      reference: saved.reference,
      pdfPath: saved.pdfPath,
      pdfPages: saved.pdfPages,
      finalizedAt: saved.finalizedAt,
      pages: result.pages,
    },
  });
}
