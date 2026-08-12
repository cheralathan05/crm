import { ModulePlaceholder } from "@/components/module-placeholder";

export default async function GitHubPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  return <ModulePlaceholder href="/github" view={params.view} />;
}
