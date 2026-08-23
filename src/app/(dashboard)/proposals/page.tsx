import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listProposalsForUser } from "@/lib/proposal";
import { ProposalsPage } from "@/components/proposals/proposals-page";

export const dynamic = "force-dynamic";

export default async function ProposalsRoute() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const data = await listProposalsForUser(session.user.id);
  return <ProposalsPage rows={data.rows} counts={data.counts} />;
}
