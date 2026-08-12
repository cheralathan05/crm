import { ModulePlaceholder } from "@/components/module-placeholder";

export default async function RequirementsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; new?: string }>;
}) {
  const params = await searchParams;
  return (
    <ModulePlaceholder href="/requirements" view={params.view} newRecord={params.new === "1"} />
  );
}
