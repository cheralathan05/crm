import { ModulePlaceholder } from "@/components/module-placeholder";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  return <ModulePlaceholder href="/settings" view={params.view} />;
}
