import { Suspense } from "react";
import { ProjectsDashboard } from "@/components/projects/projects-dashboard";
import { Loader2 } from "lucide-react";

export default function ProjectsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)]" />
          <p className="text-[13px] font-mono text-[var(--bos-text-secondary)]">Loading Projects Delivery Portfolio…</p>
        </div>
      }
    >
      <ProjectsDashboard />
    </Suspense>
  );
}
