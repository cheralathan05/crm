import { NextResponse } from "next/server";
import { getDocumentOperatingData } from "@/lib/documents/document-query.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") || "all";
  const search = searchParams.get("search") || "";

  try {
    const data = await getDocumentOperatingData(view, search);
    return NextResponse.json({
      ok: true,
      ...data,
    });
  } catch (err: any) {
    console.error("[api/documents] Error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to load documents" },
      { status: 500 }
    );
  }
}
