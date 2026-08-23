import { ModulePlaceholder } from "@/components/module-placeholder";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  return <ModulePlaceholder href="/payments" view={params.view} />;
}
