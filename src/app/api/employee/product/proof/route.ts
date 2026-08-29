import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { captureBuildProofRecord } from "@/lib/employees/employee-product-workspace.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { buildId, type, milestone, title, evidenceUrl, evidenceCode, testOutcome, whatChanged } = body;

    if (!buildId || !type || !milestone || !title || !whatChanged) {
      return NextResponse.json({ ok: false, message: "Missing required fields." }, { status: 400 });
    }

    const proof = await captureBuildProofRecord({
      buildId,
      type,
      milestone,
      title,
      evidenceUrl,
      evidenceCode,
      testOutcome,
      whatChanged,
    });

    return NextResponse.json({ ok: true, proof });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || "Failed to capture proof." }, { status: 500 });
  }
}
