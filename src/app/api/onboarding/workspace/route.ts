import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getWorkspaceConfig,
  saveWorkspaceConfig,
  setWorkspaceName,
} from "@/lib/onboarding";
import { rateLimit } from "@/lib/rate-limit";
import { workspaceNameSchema, workspaceConfigSchema } from "@/lib/validation";
import { mergeConfig } from "@/lib/workspace-config";

/** Resume — the full saved configuration for this user (null if none). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Not authenticated." }, { status: 401 });
  }

  const config = await getWorkspaceConfig(session.user.id);
  return NextResponse.json({ ok: true, config });
}

/** Autosave — idempotent full-config upsert, always workspace-scoped. */
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Not authenticated." }, { status: 401 });
  }

  const rl = await rateLimit(30, 60_000, "workspace-autosave");
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Too many attempts. Try again shortly." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  const parsed = workspaceConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid configuration." },
      { status: 400 },
    );
  }

  try {
    const config = await saveWorkspaceConfig(session.user.id, mergeConfig(parsed.data));
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    console.error("[onboarding/workspace PATCH] error:", error);
    return NextResponse.json(
      { ok: false, message: "Unable to save your workspace. Please try again." },
      { status: 500 },
    );
  }
}

/** Legacy single-step creation (old company-name flow). */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Not authenticated." }, { status: 401 });
  }

  const rl = await rateLimit(10, 60_000, "workspace");
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Too many attempts. Try again shortly." },
      { status: 429 },
    );
  }

  let body: { companyName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  const parsed = workspaceNameSchema.safeParse(body.companyName);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Enter a company name." },
      { status: 400 },
    );
  }

  try {
    await setWorkspaceName(session.user.id, parsed.data);
  } catch (error) {
    console.error("[onboarding/workspace POST] error:", error);
    return NextResponse.json(
      { ok: false, message: "Unable to create your workspace. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    workspace: { companyName: parsed.data },
    message: "Workspace ready.",
  });
}
