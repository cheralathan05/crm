import { ModulePlaceholder } from "@/components/module-placeholder";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; new?: string }>;
}) {
  const params = await searchParams;
  return <ModulePlaceholder href="/clients" view={params.view} newRecord={params.new === "1"} />;
}
