import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const { id } = await props.params;
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "pdf";

  const snapshot = await db.analyticsSnapshot.findUnique({
    where: { id },
  });

  if (!snapshot) {
    return NextResponse.json({ ok: false, message: "Report not found." }, { status: 404 });
  }

  // 1. JSON Export
  if (format === "json") {
    return new NextResponse(snapshot.metrics, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${snapshot.id}.json"`,
      },
    });
  }

  // 2. CSV Export
  if (format === "csv") {
    let csvData = `Report,${snapshot.title}\nVersion,${snapshot.version}\nGenerated,${snapshot.createdAt.toISOString()}\nSummary,"${snapshot.summary.replace(/"/g, '""')}"\n\n`;
    try {
      const parsed = JSON.parse(snapshot.metrics);
      if (parsed.overview?.pulse) {
        csvData += "Category,Status,Headline\n";
        for (const p of parsed.overview.pulse) {
          csvData += `"${p.category}","${p.status}","${(p.headline || "").replace(/"/g, '""')}"\n`;
        }
      }
    } catch {}

    return new NextResponse(csvData, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${snapshot.id}.csv"`,
      },
    });
  }

  // 3. PDF Export
  if (!snapshot.pdfPath) {
    return NextResponse.json({ ok: false, message: "PDF not generated for this report." }, { status: 404 });
  }

  const fullPdfPath = path.join(process.cwd(), "uploads", snapshot.pdfPath);
  if (!fs.existsSync(fullPdfPath)) {
    return NextResponse.json({ ok: false, message: "PDF file missing on disk." }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(fullPdfPath);
  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${snapshot.id}.pdf"`,
    },
  });
}
