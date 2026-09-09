import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getClientForUser } from "@/lib/clients";
import { serializeClientDetail } from "@/lib/client-serialize";
import { LeadWorkspace } from "@/components/clients/lead-workspace";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ req?: string; [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const reqId = typeof sp.req === "string" ? sp.req : undefined;

  // Authorization: the client must belong to the authenticated user's workspace.
  const client = session?.user?.id ? await getClientForUser(session.user.id, id) : null;
  if (!client) notFound();

  const actorName = session?.user?.name ?? "Owner";
  const detail = await serializeClientDetail(client, actorName);

  return <LeadWorkspace initial={detail} actorName={actorName} initialReqId={reqId} />;
}

