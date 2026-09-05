import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { captureBuildProofRecord } from "@/lib/employees/employee-product-workspace.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { buildId, proofs, type, milestone, title, evidenceUrl, evidenceCode, testOutcome, whatChanged } = body;

    if (!buildId) {
      return NextResponse.json({ ok: false, message: "Missing buildId." }, { status: 400 });
    }

    if (Array.isArray(proofs) && proofs.length > 0) {
      const results = [];
      for (const p of proofs) {
        if (!p.type || !p.milestone || !p.title || !p.whatChanged) {
          continue;
        }
        const created = await captureBuildProofRecord({
          buildId,
          type: p.type,
          milestone: p.milestone,
          title: p.title,
          evidenceUrl: p.evidenceUrl,
          evidenceCode: p.evidenceCode,
          testOutcome: p.testOutcome,
          whatChanged: p.whatChanged,
        });
        results.push(created);
      }
      return NextResponse.json({ ok: true, proofs: results, count: results.length });
    }

    if (!type || !milestone || !title || !whatChanged) {
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
