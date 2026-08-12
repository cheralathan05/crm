import { ModulePlaceholder } from "@/components/module-placeholder";

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; new?: string }>;
}) {
  const params = await searchParams;
  return (
    <ModulePlaceholder href="/proposals" view={params.view} newRecord={params.new === "1"} />
  );
}
