import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { executeHandoff } from "@/lib/employees/employee-product-workspace.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { buildId, fromWorkstream, toWorkstream, whatWasBuilt, whatWasVerified, whatRemains, knownIssues, nextOwner } = body;

    const handoff = await executeHandoff({
      buildId,
      fromWorkstream: fromWorkstream || "FRONTEND",
      toWorkstream: toWorkstream || "QA",
      whatWasBuilt,
      whatWasVerified,
      whatRemains,
      knownIssues,
      nextOwner,
    });

    return NextResponse.json({ ok: true, handoff });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || "Failed to execute handoff." }, { status: 500 });
  }
}
