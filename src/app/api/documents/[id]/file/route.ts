import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { readStored } from "@/lib/uploads";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  const doc = await db.businessDocument.findUnique({
    where: { id },
  });

  if (!doc) {
    return NextResponse.json({ ok: false, message: "Document record not found" }, { status: 404 });
  }

  // 1. Try reading via readStored
  let stored = await readStored(doc.storagePath);

  // 2. If not found via relative uploads path, try full path or canonical names
  if (!stored) {
    const candidates = [
      path.join(process.cwd(), "uploads", doc.storagePath),
      path.join(process.cwd(), "uploads", "proposals", `${doc.sourceId}-v${doc.version}.pdf`),
      path.join(process.cwd(), "uploads", "proposals", doc.fileName),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        const buf = fs.readFileSync(c);
        stored = { buffer: buf, size: buf.length };
        break;
      }
    }
  }

  if (!stored) {
    return new NextResponse(
      JSON.stringify({ ok: false, message: "Document unavailable. Real file not found on disk." }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  return new NextResponse(new Uint8Array(stored.buffer), {
    headers: {
      "Content-Type": doc.mimeType || "application/pdf",
      "Content-Disposition": `inline; filename="${doc.fileName}"`,
      "Content-Length": String(stored.size),
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
