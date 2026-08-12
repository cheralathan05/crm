import { ModulePlaceholder } from "@/components/module-placeholder";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  return <ModulePlaceholder href="/messages" view={params.view} />;
}
