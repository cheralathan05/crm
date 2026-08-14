import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveRequestByToken, saveFeatures, saveSectionAnswer } from "@/lib/requirements";
import { catalogFor } from "@/lib/requirement-config";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

const PRIORITIES = new Set(["MUST_HAVE", "SHOULD_HAVE", "NICE_TO_HAVE"]);

/* ── PUT /api/public/requirements/[token]/features ─────────────
   The full structured feature set — every feature is task-ready data:
   priority, users, description, config, acceptance criteria, deps. */

export async function PUT(req: Request, { params }: Ctx) {
  const { token } = await params;
  const resolved = await resolveRequestByToken(token);
  if (!resolved) {
    return NextResponse.json({ ok: false, code: "INVALID" }, { status: 404 });
  }
  if (resolved.error) {
    return NextResponse.json({ ok: false, code: resolved.error }, { status: 403 });
  }
  const request = resolved.request;

  if (!["DRAFT", "SENT", "IN_PROGRESS", "CHANGES_REQUESTED"].includes(request.status)) {
    return NextResponse.json({ ok: false, code: "LOCKED" }, { status: 409 });
  }

  let body: { features?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }
  if (!Array.isArray(body.features)) {
    return NextResponse.json({ ok: false, message: "Features must be an array." }, { status: 400 });
  }

  const catalog = new Map(catalogFor(request.projectType).map((f) => [f.name, f]));

  const cleaned: {
    name: string;
    priority: string;
    users: string[];
    description: string;
    config: Record<string, unknown>;
    acceptanceCriteria: string[];
    dependencies: string[];
  }[] = [];

  for (const raw of body.features) {
    if (!raw || typeof raw !== "object") continue;
    const f = raw as Record<string, unknown>;
    const name = String(f.name ?? "").trim().slice(0, 80);
    if (!name) continue;
    const priority = PRIORITIES.has(String(f.priority)) ? String(f.priority) : "SHOULD_HAVE";
    const users = Array.isArray(f.users) ? f.users.filter((u): u is string => typeof u === "string").slice(0, 40) : [];
    const description = String(f.description ?? "").slice(0, 4000);
    const config = f.config && typeof f.config === "object" && !Array.isArray(f.config)
      ? f.config as Record<string, unknown>
      : {};
    const acceptanceCriteria = Array.isArray(f.acceptanceCriteria)
      ? f.acceptanceCriteria.filter((c): c is string => typeof c === "string").slice(0, 40)
      : [];
    const dependencies = Array.isArray(f.dependencies)
      ? f.dependencies.filter((d): d is string => typeof d === "string").slice(0, 20)
      : [];

    // Keep only config keys the catalog defines for this feature.
    const configDef = catalog.get(name)?.configFields ?? [];
    const cleanConfig: Record<string, unknown> = {};
    for (const field of configDef) {
      if (field.key in config) cleanConfig[field.key] = config[field.key];
    }

    cleaned.push({ name, priority, users, description, config: cleanConfig, acceptanceCriteria, dependencies });
  }

  await saveFeatures(request, cleaned);

  // The features section is complete when there is at least one must-have.
  const features = await db.requirementFeature.findMany({ where: { requestId: request.id } });
  const mustHave = features.filter((f) => f.priority === "MUST_HAVE").length;
  const updated = await saveSectionAnswer({
    request,
    section: "features",
    data: { featureCount: features.length },
    recordEvent: false,
  });

  return NextResponse.json({
    ok: true,
    count: features.length,
    mustHave,
    featureCount: features.length,
    sectionComplete: features.length > 0 && mustHave > 0,
    completeness: updated.completeness,
    readiness: updated.readiness,
  });
}
