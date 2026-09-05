import { NextRequest, NextResponse } from "next/server";
import { readStored } from "@/lib/uploads";
import path from "node:path";

export const dynamic = "force-dynamic";

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".json": "application/json",
  ".zip": "application/zip",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;
    if (!slug || slug.length === 0) {
      return NextResponse.json({ ok: false, message: "File path missing." }, { status: 400 });
    }

    const relativePath = slug.join("/");
    const fileData = await readStored(relativePath);

    if (!fileData) {
      return NextResponse.json({ ok: false, message: "Proof file not found on disk." }, { status: 404 });
    }

    const ext = path.extname(relativePath).toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";
    const filename = path.basename(relativePath);

    return new NextResponse(new Uint8Array(fileData.buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": String(fileData.size),
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (err: any) {
    console.error("[api/tasks/proofs] serve error:", err);
    return NextResponse.json({ ok: false, message: "Error serving proof file." }, { status: 500 });
  }
}
