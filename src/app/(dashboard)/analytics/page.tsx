import { ModulePlaceholder } from "@/components/module-placeholder";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  return <ModulePlaceholder href="/analytics" view={params.view} />;
}
