import { GitHubCommandCenter } from "@/components/github/github-command-center";

export const metadata = {
  title: "GitHub Command Center | Business OS",
  description: "Engineering graph, code telemetry, workforce Git attribution, and deliverable verification.",
};

export default async function GitHubPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  return <GitHubCommandCenter initialView={params.view || "overview"} />;
}
