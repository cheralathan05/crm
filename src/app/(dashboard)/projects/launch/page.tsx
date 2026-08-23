import { Suspense } from "react";
import { ProjectLaunchWizard } from "@/components/projects/project-launch";
import { Loader2 } from "lucide-react";

export default function ProjectLaunchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)]" />
          <p className="text-[13px] font-mono text-[var(--bos-text-secondary)]">Loading Project Launch Workspace…</p>
        </div>
      }
    >
      <ProjectLaunchWizard />
    </Suspense>
  );
}
