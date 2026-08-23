import { ModulePlaceholder } from "@/components/module-placeholder";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  return <ModulePlaceholder href="/documents" view={params.view} />;
}
