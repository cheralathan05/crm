import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOnboardingState, resolvePostAuthPath } from "@/lib/onboarding";
import { LandingPageClient } from "@/components/landing/landing-page-client";

export const metadata: Metadata = {
  title: "Business OS — The Intelligent Enterprise Operating System",
  description:
    "Connect your entire business: clients, requirements, proposals, projects, teams, documents, payments, and delivery in one intelligent workspace.",
};

export default async function Home(props: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const isPreview = searchParams?.preview === "true";

  const session = await auth();

  if (session?.user?.id && !isPreview) {
    if (session.user.role === "MEMBER") {
      redirect("/employee/work");
    }
    const state = await getOnboardingState(session.user.id);
    redirect(resolvePostAuthPath(state));
  }

  return <LandingPageClient />;
}
