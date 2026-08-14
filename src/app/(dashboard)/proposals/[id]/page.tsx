import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProposalForUser, serializeProposalForStudio } from "@/lib/proposal";
import { ProposalStudio } from "@/components/proposals/proposal-studio";

export const dynamic = "force-dynamic";

export default async function ProposalStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const proposal = await getProposalForUser(session.user.id, id);
  if (!proposal) redirect("/proposals");

  const bundle = await serializeProposalForStudio(proposal);
  return <ProposalStudio initial={bundle} />;
}
