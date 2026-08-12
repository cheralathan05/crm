import { ModulePlaceholder } from "@/components/module-placeholder";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; new?: string }>;
}) {
  const params = await searchParams;
  return (
    <ModulePlaceholder href="/projects" view={params.view} newRecord={params.new === "1"} />
  );
}
