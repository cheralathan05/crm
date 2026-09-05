import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOnboardingState, resolvePostAuthPath } from "@/lib/onboarding";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, message: "Not authenticated." },
      { status: 401 },
    );
  }

  const state = await getOnboardingState(session.user.id);

  return NextResponse.json({
    ok: true,
    onboarding: { overviewComplete: state.overviewComplete },
    workspace: state.companyName ? { companyName: state.companyName } : null,
    next: resolvePostAuthPath(state),
  });
}
