import { ClientsPage } from "@/components/clients/clients-page";

export default async function ClientsRoute({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; new?: string }>;
}) {
  const params = await searchParams;
  return <ClientsPage initialNew={params.new === "1"} />;
}
