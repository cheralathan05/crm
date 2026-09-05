import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProjectProductMap } from "@/lib/tasks";

export const dynamic = "force-dynamic";

/* ── GET /api/projects/[id]/product-map ────────────────────────── */
export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
    }

    const { id } = await props.params;
    const productMap = await getProjectProductMap(id);

    if (!productMap) {
      return NextResponse.json({ ok: false, message: "Project not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, productMap });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || "Failed to load product map." }, { status: 500 });
  }
}
