"use client";

import { TaskExecutionWorkspace } from "./task-execution-workspace";

export function TaskWorkspaceDrawer({
  taskId,
  onClose,
  onTaskUpdated,
}: {
  taskId: string;
  onClose: () => void;
  onTaskUpdated?: () => void;
}) {
  return (
    <TaskExecutionWorkspace
      taskId={taskId}
      onClose={onClose}
      onTaskUpdated={onTaskUpdated}
      isAdmin={true}
    />
  );
}
