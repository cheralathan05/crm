import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { completeWorkspaceSetup } from "@/lib/onboarding";
import { rateLimit } from "@/lib/rate-limit";
import { workspaceConfigSchema } from "@/lib/validation";
import { mergeConfig } from "@/lib/workspace-config";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Not authenticated." }, { status: 401 });
  }

  const rl = await rateLimit(5, 60_000, "workspace-complete");
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

  const config = mergeConfig(parsed.data);
  if (config.companyName.trim().length < 2) {
    return NextResponse.json(
      { ok: false, message: "Enter your company name." },
      { status: 400 },
    );
  }

  try {
    const saved = await completeWorkspaceSetup(session.user.id, config);
    return NextResponse.json({
      ok: true,
      workspace: { companyName: saved.companyName },
      next: "/dashboard",
      message: "Workspace ready.",
    });
  } catch (error) {
    console.error("[onboarding/workspace/complete] error:", error);
    return NextResponse.json(
      { ok: false, message: "Unable to create your workspace. Please try again." },
      { status: 500 },
    );
  }
}
