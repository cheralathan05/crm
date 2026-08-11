import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setWorkspaceName } from "@/lib/onboarding";
import { rateLimit } from "@/lib/rate-limit";
import { workspaceNameSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, message: "Not authenticated." },
      { status: 401 },
    );
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
    return NextResponse.json(
      { ok: false, message: "Invalid request body." },
      { status: 400 },
    );
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
    console.error("[onboarding/workspace] error:", error);
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
