import { DocumentWorkspace } from "@/components/documents/document-workspace";
import { getDocumentOperatingData } from "@/lib/documents/document-query.service";

export const dynamic = "force-dynamic";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; search?: string }>;
}) {
  const params = await searchParams;
  const initialData = await getDocumentOperatingData(params.view ?? "all", params.search ?? "");
  return <DocumentWorkspace initialData={initialData} initialView={params.view} />;
}


