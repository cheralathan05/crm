import { ModulePlaceholder } from "@/components/module-placeholder";

export default async function AutomationsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  return <ModulePlaceholder href="/automations" view={params.view} />;
}
