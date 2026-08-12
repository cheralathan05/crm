import { ModulePlaceholder } from "@/components/module-placeholder";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  return <ModulePlaceholder href="/employees" view={params.view} />;
}
