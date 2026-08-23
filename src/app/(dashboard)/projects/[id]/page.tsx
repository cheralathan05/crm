import { Suspense } from "react";
import { ProjectCommandCenter } from "@/components/projects/project-command-center";
import { Loader2 } from "lucide-react";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)]" />
          <p className="text-[13px] font-mono text-[var(--bos-text-secondary)]">Connecting Project Command Center…</p>
        </div>
      }
    >
      <ProjectCommandCenter projectId={id} />
    </Suspense>
  );
}
