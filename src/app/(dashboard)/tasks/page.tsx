import { ModulePlaceholder } from "@/components/module-placeholder";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; new?: string }>;
}) {
  const params = await searchParams;
  return <ModulePlaceholder href="/tasks" view={params.view} newRecord={params.new === "1"} />;
}
