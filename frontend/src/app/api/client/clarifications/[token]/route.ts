import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveClarificationBundleByToken, serializePublicClarificationBundle } from "@/lib/questions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/* ── GET /api/client/clarifications/[token] ────────────────────
   The client's full clarification set for the requirement: every
   question awaiting their answer, with classification, answer type,
   options, context and progress. Internal notes and ids never leave
   the server. */

export async function GET(_req: Request, { params }: Ctx) {
  const { token } = await params;
  const bundle = await resolveClarificationBundleByToken(token);
  if (!bundle) {
    return NextResponse.json({ ok: false, code: "INVALID" }, { status: 404 });
  }
  if (bundle.error) {
    return NextResponse.json({ ok: false, code: bundle.error, label: bundle.errorLabel }, { status: 403 });
  }

  const featureIds = bundle.questions.map((q) => q.featureId).filter((id): id is string => Boolean(id));
  const features = featureIds.length > 0
    ? await db.requirementFeature.findMany({ where: { id: { in: featureIds } }, select: { id: true, name: true } })
    : [];
  const featureName = new Map(features.map((f) => [f.id, f.name]));
  const questions = bundle.questions.map((q) =>
    Object.assign(q, { feature: q.featureId ? { name: featureName.get(q.featureId) ?? null } : null }),
  );

  const anchor = bundle.questions.find((q) => q.id === bundle.anchorId) ?? bundle.questions[0];
  return NextResponse.json(serializePublicClarificationBundle({ anchor, questions }));
}
