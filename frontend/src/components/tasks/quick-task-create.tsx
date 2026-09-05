"use client";

import { useEffect, useState, useTransition } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Layers,
  ListTodo,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ALL_WORKSTREAMS, type WorkstreamType } from "@/lib/tasks-types";

export function QuickTaskCreate({
  onClose,
  onTaskCreated,
  preselectedProjectId,
}: {
  onClose: () => void;
  onTaskCreated?: (taskId: string) => void;
  preselectedProjectId?: string;
}) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Form State
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(preselectedProjectId || "");
  const [milestoneId, setMilestoneId] = useState("");
  const [deliverableId, setDeliverableId] = useState("");
  const [workstream, setWorkstream] = useState<WorkstreamType>("FRONTEND");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [assigneeName, setAssigneeName] = useState("");
  const [teamRole, setTeamRole] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [description, setDescription] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [clientVisibility, setClientVisibility] = useState<"INTERNAL" | "CLIENT_VISIBLE">("INTERNAL");

  // Subtasks & Criteria arrays
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [criteria, setCriteria] = useState<string[]>([]);
  const [newCriterion, setNewCriterion] = useState("");

  // Duplicate Check
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadProjects() {
      try {
        setLoadingProjects(true);
        const res = await fetch("/api/clients/fields"); // or project list
        const projRes = await fetch("/api/tasks/command-center");
        const json = await projRes.json();
        // Fetch projects for user
        const prjs = await fetch("/api/projects/launch-preview");
        // Also fetch general projects from tasks
        const listRes = await fetch("/api/tasks");
        const listJson = await listRes.json();
        if (listJson.ok && listJson.tasks) {
          const projectMap = new Map<string, { id: string; name: string; clientId: string }>();
          for (const t of listJson.tasks) {
            if (t.project && !projectMap.has(t.project.id)) {
              projectMap.set(t.project.id, {
                id: t.project.id,
                name: t.project.name,
                clientId: t.clientId,
              });
            }
          }
          const uniqueProjects = Array.from(projectMap.values());
          setProjects(uniqueProjects);
          if (!projectId && uniqueProjects.length > 0) {
            setProjectId(uniqueProjects[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingProjects(false);
      }
    }
    loadProjects();
  }, []);

  // Debounced duplicate detection
  useEffect(() => {
    if (title.trim().length >= 3) {
      const timer = setTimeout(async () => {
        try {
          const res = await fetch("/api/tasks/check-duplicates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, projectId }),
          });
          const json = await res.json();
          if (json.ok && json.duplicates && json.duplicates.length > 0) {
            setDuplicates(json.duplicates);
            setShowDuplicateWarning(true);
          } else {
            setDuplicates([]);
            setShowDuplicateWarning(false);
          }
        } catch (err) {
          console.error(err);
        }
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setDuplicates([]);
      setShowDuplicateWarning(false);
    }
  }, [title, projectId]);

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks([...subtasks, newSubtask.trim()]);
      setNewSubtask("");
    }
  };

  const handleAddCriterion = () => {
    if (newCriterion.trim()) {
      setCriteria([...criteria, newCriterion.trim()]);
      setNewCriterion("");
    }
  };

  const handleSubmit = (force: boolean = false) => {
    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    startTransition(async () => {
      try {
        setError(null);
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            projectId: projectId || undefined,
            workstream,
            priority,
            assigneeName: assigneeName || undefined,
            teamRole: teamRole || undefined,
            dueAt: dueAt || undefined,
            description: description.trim() || undefined,
            expectedResult: expectedResult.trim() || undefined,
            clientVisibility,
            subtasks,
            acceptanceCriteria: criteria,
            checkDuplicates: !force,
            forceCreate: force,
          }),
        });

        const json = await res.json();
        if (json.ok && json.task) {
          onTaskCreated?.(json.task.id);
          onClose();
        } else if (json.duplicateFound) {
          setDuplicates(json.duplicates);
          setShowDuplicateWarning(true);
        } else {
          setError(json.message || "Failed to create task.");
        }
      } catch (err: any) {
        setError(err.message || "Network error creating task.");
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[var(--bos-bg)] border border-[var(--bos-border-strong)] rounded-xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden text-[var(--bos-text-primary)] my-8">
        {/* Header */}
        <div className="p-4 border-b border-[var(--bos-border)] bg-[var(--bos-surface)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--bos-accent)]" />
            <h2 className="text-[16px] font-bold text-[var(--bos-text-primary)]">Create Executable Task</h2>
          </div>
          <button onClick={onClose} className="p-1 text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Duplicate Task Warning Banner */}
        {showDuplicateWarning && duplicates.length > 0 && (
          <div className="p-3.5 bg-amber-500/10 border-b border-amber-500/20 text-[12px] space-y-2">
            <div className="flex items-center gap-2 font-semibold text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Similar Task Already Exists in Workspace:
            </div>
            <div className="space-y-1 pl-6">
              {duplicates.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-[11px] font-mono">
                  <span>
                    <strong>{d.code || "TASK"}</strong>: {d.title} ({d.projectName}) · {d.status}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 pl-6 pt-1">
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                className="px-2.5 py-1 bg-amber-600 text-white rounded text-[11px] font-medium"
              >
                Create Anyway
              </button>
              <button
                type="button"
                onClick={() => setShowDuplicateWarning(false)}
                className="px-2.5 py-1 border border-[var(--bos-border)] rounded text-[11px]"
              >
                Adjust Title
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-500/10 border-b border-red-500/20 text-red-600 text-[12px] flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-mono font-medium text-[var(--bos-text-tertiary)] uppercase tracking-wider block">
              Task Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Build Product Listing API with Category Filters"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-[13px] bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-md focus:outline-none focus:border-[var(--bos-accent)] font-medium"
              autoFocus
            />
          </div>

          {/* Project & Workstream Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-medium text-[var(--bos-text-tertiary)] uppercase tracking-wider block">
                Project
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 text-[12px] bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-md font-sans"
              >
                <option value="">-- General / Select Project --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-medium text-[var(--bos-text-tertiary)] uppercase tracking-wider block">
                Workstream
              </label>
              <select
                value={workstream}
                onChange={(e) => setWorkstream(e.target.value as WorkstreamType)}
                className="w-full px-3 py-2 text-[12px] bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-md font-sans"
              >
                {ALL_WORKSTREAMS.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority, Assignee & Due Date */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-medium text-[var(--bos-text-tertiary)] uppercase tracking-wider block">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-2.5 py-1.5 text-[12px] bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-md font-mono"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-medium text-[var(--bos-text-tertiary)] uppercase tracking-wider block">
                Assignee
              </label>
              <input
                type="text"
                placeholder="e.g. Arun"
                value={assigneeName}
                onChange={(e) => setAssigneeName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-[12px] bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-md"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-medium text-[var(--bos-text-tertiary)] uppercase tracking-wider block">
                Target Due
              </label>
              <input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full px-2.5 py-1.5 text-[12px] bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-md font-mono"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-medium text-[var(--bos-text-tertiary)] uppercase tracking-wider block">
              What to Do (Description)
            </label>
            <textarea
              placeholder="Detailed instructions for the engineer or team member…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-[12px] bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-md focus:outline-none focus:border-[var(--bos-accent)]"
            />
          </div>

          {/* Expected Result */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-medium text-[var(--bos-text-tertiary)] uppercase tracking-wider block">
              Expected Result
            </label>
            <input
              type="text"
              placeholder="e.g. Fast response times with pagination & zero console errors"
              value={expectedResult}
              onChange={(e) => setExpectedResult(e.target.value)}
              className="w-full px-3 py-1.5 text-[12px] bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-md"
            />
          </div>

          {/* Subtasks Builder */}
          <div className="space-y-2 pt-2 border-t border-[var(--bos-border)]">
            <label className="text-[11px] font-mono font-medium text-[var(--bos-text-tertiary)] uppercase tracking-wider block">
              Initial Subtasks ({subtasks.length})
            </label>
            <div className="space-y-1.5">
              {subtasks.map((st, idx) => (
                <div key={idx} className="flex items-center justify-between px-3 py-1.5 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[12px]">
                  <span>{st}</span>
                  <button
                    type="button"
                    onClick={() => setSubtasks(subtasks.filter((_, i) => i !== idx))}
                    className="text-[var(--bos-text-tertiary)] hover:text-red-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add subtask unit…"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                className="flex-1 px-3 py-1.5 text-[12px] bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-1.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[12px] rounded hover:bg-[var(--bos-bg)]"
              >
                Add
              </button>
            </div>
          </div>

          {/* Acceptance Criteria Builder */}
          <div className="space-y-2 pt-2 border-t border-[var(--bos-border)]">
            <label className="text-[11px] font-mono font-medium text-[var(--bos-text-tertiary)] uppercase tracking-wider block">
              Acceptance Criteria ({criteria.length})
            </label>
            <div className="space-y-1.5">
              {criteria.map((cr, idx) => (
                <div key={idx} className="flex items-center justify-between px-3 py-1.5 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[12px]">
                  <span>✓ {cr}</span>
                  <button
                    type="button"
                    onClick={() => setCriteria(criteria.filter((_, i) => i !== idx))}
                    className="text-[var(--bos-text-tertiary)] hover:text-red-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add verifiable acceptance criteria…"
                value={newCriterion}
                onChange={(e) => setNewCriterion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCriterion();
                  }
                }}
                className="flex-1 px-3 py-1.5 text-[12px] bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded"
              />
              <button
                type="button"
                onClick={handleAddCriterion}
                className="px-3 py-1.5 bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[12px] rounded hover:bg-[var(--bos-bg)]"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--bos-border)] bg-[var(--bos-surface)] flex items-center justify-between">
          <label className="flex items-center gap-2 text-[11px] text-[var(--bos-text-secondary)] cursor-pointer">
            <input
              type="checkbox"
              checked={clientVisibility === "CLIENT_VISIBLE"}
              onChange={(e) => setClientVisibility(e.target.checked ? "CLIENT_VISIBLE" : "INTERNAL")}
              className="rounded text-[var(--bos-accent)]"
            />
            Client Visible Task
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[var(--bos-border)] text-[12px] font-medium rounded hover:bg-[var(--bos-bg)] transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isPending || !title.trim()}
              className="px-5 py-2 bg-[var(--bos-accent)] text-white text-[12px] font-semibold rounded hover:bg-[var(--bos-accent-hover)] transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Create Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
