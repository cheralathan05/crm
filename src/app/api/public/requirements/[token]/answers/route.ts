import { NextResponse } from "next/server";
import { resolveRequestByToken, saveSectionAnswer } from "@/lib/requirements";
import { getSection } from "@/lib/requirement-config";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

/* ── PATCH /api/public/requirements/[token]/answers ────────────
   Debounced autosave for one section. Real-time save state in the UI is
   driven by this response. No event is recorded when nothing changed. */

export async function PATCH(req: Request, { params }: Ctx) {
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
    return NextResponse.json(
      { ok: false, code: "LOCKED", message: "This workspace is no longer editable." },
      { status: 409 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const section = String(body.section ?? "").trim();
  const def = getSection(section);
  if (!def) {
    return NextResponse.json({ ok: false, message: "Unknown section." }, { status: 400 });
  }
  const data = body.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return NextResponse.json({ ok: false, message: "Section data must be an object." }, { status: 400 });
  }

  // Server-side sanitization: keep only fields the section defines; strip
  // anything a crafted request tries to inject.
  const clean: Record<string, unknown> = {};
  const allowedKeys = new Set(def.fields.map((f) => f.key));
  if (def.key === "users" || def.key === "scope" || def.key === "stakeholders" || def.key === "success") {
    // Builder sections keep their structured keys.
    for (const key of ["users", "included", "excluded", "assumptions", "dependencies", "stakeholders", "criteria", "kpis"]) {
      if (key in data) clean[key] = (data as Record<string, unknown>)[key];
    }
  } else {
    for (const key of allowedKeys) {
      if (key in data) clean[key] = (data as Record<string, unknown>)[key];
    }
  }

  const saved = await saveSectionAnswer({ request, section, data: clean, recordEvent: true });

  return NextResponse.json({
    ok: true,
    section,
    complete: def.complete(clean, {
      featureCount: 0,
      mustHaveCount: 0,
      attachmentCount: 0,
    }),
    completeness: saved.completeness,
    readiness: saved.readiness,
    currentSection: saved.currentSection,
    status: saved.status,
  });
}
