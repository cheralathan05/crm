import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getRequirementForUser } from "@/lib/requirements";
import { RequirementDetailWorkspace } from "@/components/requirements/requirement-detail-workspace";

export const dynamic = "force-dynamic";

export default async function RequirementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) notFound();

  const { id } = await params;
  const req = await getRequirementForUser(session.user.id, id);
  if (!req) notFound();

  return <RequirementDetailWorkspace requestId={id} />;
}
