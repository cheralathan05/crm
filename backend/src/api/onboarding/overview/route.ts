import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { completeOverview } from "@/lib/onboarding";
import { rateLimit } from "@/lib/rate-limit";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, message: "Not authenticated." },
      { status: 401 },
    );
  }

  const rl = await rateLimit(10, 60_000, "onboarding-overview");
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Too many attempts. Try again shortly." },
      { status: 429 },
    );
  }

  await completeOverview(session.user.id);

  return NextResponse.json({ ok: true, message: "Overview complete." });
}
