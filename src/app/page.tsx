import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOnboardingState, resolvePostAuthPath } from "@/lib/onboarding";

export default async function Home() {
  const session = await auth();

  if (session?.user?.id) {
    const state = await getOnboardingState(session.user.id);
    redirect(resolvePostAuthPath(state));
  }

  redirect("/login");
}
