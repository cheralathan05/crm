import { NextResponse } from "next/server";
import { calculateChangeImpact } from "@/lib/discovery/discovery.service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    const body = await req.json();
    const newRequirement = String(body.newRequirement || "").trim();
    if (!newRequirement) {
      return NextResponse.json({ ok: false, message: "newRequirement is required." }, { status: 400 });
    }

    const impact = await calculateChangeImpact({
      requirementId: id,
      newRequirement,
    });

    return NextResponse.json({ ok: true, impact });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error?.message || "Failed to calculate impact." }, { status: 500 });
  }
}
