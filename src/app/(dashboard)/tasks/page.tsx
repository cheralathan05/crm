import { Suspense } from "react";
import { TasksCommandCenter } from "@/components/tasks/tasks-command-center";
import { Loader2 } from "lucide-react";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; new?: string }>;
}) {
  const params = await searchParams;

  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--bos-accent)]" />
          <p className="text-[13px] font-mono text-[var(--bos-text-secondary)]">Loading Tasks Execution Brain…</p>
        </div>
      }
    >
      <TasksCommandCenter initialView={params.view} initialNew={params.new === "1"} />
    </Suspense>
  );
}
