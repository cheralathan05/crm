"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  FolderKanban,
  Layers,
  Link2,
  Loader2,
  Monitor,
  Search,
  Server,
  Shield,
  Sparkles,
  User,
  Users,
  X,
  Zap,
  Database,
  TestTube,
  AlertTriangle,
  Star,
  BarChart3,
  Activity,
  Target,
} from "lucide-react";
import { WorkstreamPagePreview } from "./workstream-page-preview";
import { WorkstreamDependencyGraph } from "./workstream-dependency-graph";

/* ════════════════════════════════════════════════════════════════════
   WORKSTREAM ASSIGNMENT FLOW
   
   7-Step admin assignment:
   1. Select Project
   2. Select Employee
   3. Choose Responsibility (workstream)
   4. Review Discovered Work
   5. Assignment Analysis
   6. Confirm & Assign
   7. Success
   
   ZERO MOCK DATA — everything from the real database.
   ════════════════════════════════════════════════════════════════════ */

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const STEP_LABELS: Record<Step, string> = {
  1: "Select Project",
  2: "Select Employee",
  3: "Choose Responsibility",
  4: "Review Work",
  5: "Analysis",
  6: "Confirm",
  7: "Assigned",
};

export function WorkstreamAssignmentFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Data State
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [discoveredWork, setDiscoveredWork] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [assignmentResult, setAssignmentResult] = useState<any>(null);

  // Selection State
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedWorkstream, setSelectedWorkstream] = useState<string>("");

  // UI State
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [empSearchQuery, setEmpSearchQuery] = useState("");
  const [assigning, setAssigning] = useState(false);

  // ── Step 1: Load Projects ────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/employees/assign-work");
        const json = await res.json();
        if (json.ok) setProjects(json.projects || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  // ── Step 2: Load Employees for Project ───────────────────────
  const loadEmployees = useCallback(async (projectId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/assign-work?projectId=${projectId}`);
      const json = await res.json();
      if (json.ok) setEmployees(json.employees || []);
    } catch {}
    setLoading(false);
  }, []);

  // ── Step 4: Discover Work ────────────────────────────────────
  const loadDiscoveredWork = useCallback(async (projectId: string, workstream: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/employees/assign-work/discover?projectId=${projectId}&workstream=${workstream}`
      );
      const json = await res.json();
      if (json.ok) setDiscoveredWork(json);
    } catch {}
    setLoading(false);
  }, []);

  // ── Step 5: Load Analysis ────────────────────────────────────
  const loadAnalysis = useCallback(async (employeeId: string, projectId: string, workstream: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/employees/assign-work/analysis?employeeId=${employeeId}&projectId=${projectId}&workstream=${workstream}`
      );
      const json = await res.json();
      if (json.ok) setAnalysis(json);
    } catch {}
    setLoading(false);
  }, []);

  // ── Step 6: Execute Assignment ───────────────────────────────
  const executeAssignment = async () => {
    if (!selectedEmployee || !selectedProject || !selectedWorkstream) return;
    setAssigning(true);
    try {
      const res = await fetch("/api/employees/assign-work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployee.id,
          projectId: selectedProject.id,
          workstream: selectedWorkstream,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setAssignmentResult(json);
        setStep(7);
      }
    } catch {}
    setAssigning(false);
  };

  // ── Step Navigation ──────────────────────────────────────────
  const goToStep = (target: Step) => {
    setStep(target);
  };

  const selectProject = (project: any) => {
    setSelectedProject(project);
    setSelectedEmployee(null);
    setSelectedWorkstream("");
    setDiscoveredWork(null);
    setAnalysis(null);
    loadEmployees(project.id);
    setStep(2);
  };

  const selectEmployee = (emp: any) => {
    setSelectedEmployee(emp);
    setSelectedWorkstream("");
    setDiscoveredWork(null);
    setAnalysis(null);
    setStep(3);
  };

  const selectWorkstream = (ws: string) => {
    setSelectedWorkstream(ws);
    if (selectedProject) {
      loadDiscoveredWork(selectedProject.id, ws);
    }
    setStep(4);
  };

  const proceedToAnalysis = () => {
    if (selectedEmployee && selectedProject && selectedWorkstream) {
      loadAnalysis(selectedEmployee.id, selectedProject.id, selectedWorkstream);
    }
    setStep(5);
  };

  const proceedToConfirm = () => {
    setStep(6);
  };

  // ── Filtered Data ────────────────────────────────────────────
  const filteredProjects = projects.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.code || "").toLowerCase().includes(q) ||
      p.clientName.toLowerCase().includes(q)
    );
  });

  const filteredEmployees = employees.filter((e) => {
    if (!empSearchQuery) return true;
    const q = empSearchQuery.toLowerCase();
    return (
      e.fullName.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      (e.roleName || "").toLowerCase().includes(q) ||
      (e.teamName || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[var(--bos-bg)] text-[var(--bos-text-primary)] pb-20">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="border-b border-[var(--bos-border)] bg-[var(--bos-surface-panel)]">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/employees")}
                className="p-1.5 rounded-lg hover:bg-[var(--bos-surface)] text-[var(--bos-text-secondary)] transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-[17px] font-bold text-[var(--bos-text-primary)]">
                  Assign Work
                </h1>
                <p className="text-[11px] text-[var(--bos-text-secondary)]">
                  Assign responsibility-level ownership to team members
                </p>
              </div>
            </div>

            {/* Step Indicator */}
            <div className="hidden md:flex items-center gap-1">
              {([1, 2, 3, 4, 5, 6] as Step[]).map((s) => (
                <div key={s} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => s < step && goToStep(s)}
                    disabled={s > step}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-mono transition-all",
                      s === step
                        ? "bg-[var(--bos-accent)] text-white font-bold"
                        : s < step
                          ? "bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)] cursor-pointer hover:bg-[var(--bos-accent)]/15"
                          : "text-[var(--bos-text-tertiary)]",
                      s > step ? "cursor-default" : "cursor-pointer"
                    )}
                  >
                    {s < step ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[8px] font-bold">
                        {s}
                      </span>
                    )}
                    <span className="hidden lg:inline">{STEP_LABELS[s]}</span>
                  </button>
                  {s < 6 && <ChevronRight className="w-3 h-3 text-[var(--bos-text-tertiary)] mx-0.5" />}
                </div>
              ))}
            </div>
          </div>

          {/* Selection Summary Breadcrumb */}
          {(selectedProject || selectedEmployee || selectedWorkstream) && step < 7 && (
            <div className="flex items-center gap-2 mt-3 text-[11px] font-mono text-[var(--bos-text-secondary)]">
              {selectedProject && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)]">
                  <FolderKanban className="w-3 h-3" />
                  {selectedProject.name}
                </span>
              )}
              {selectedEmployee && (
                <>
                  <ChevronRight className="w-3 h-3" />
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)]">
                    <User className="w-3 h-3" />
                    {selectedEmployee.fullName}
                  </span>
                </>
              )}
              {selectedWorkstream && (
                <>
                  <ChevronRight className="w-3 h-3" />
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--bos-accent-subtle)] border border-[var(--bos-accent)]/20 text-[var(--bos-accent)]">
                    <Layers className="w-3 h-3" />
                    {selectedWorkstream}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────── */}
      <main className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6">
        {/* Loading */}
        {loading && (
          <div className="py-16 flex flex-col items-center gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-[var(--bos-accent)]" />
            <span className="text-[12px] font-mono text-[var(--bos-text-secondary)]">
              Loading...
            </span>
          </div>
        )}

        {/* ═══════════ STEP 1: SELECT PROJECT ═══════════ */}
        {!loading && step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-[15px] font-bold text-[var(--bos-text-primary)]">
                Choose Project
              </h2>
              <p className="text-[12px] text-[var(--bos-text-secondary)] mt-0.5">
                Select the project you want to assign team members to
              </p>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--bos-text-tertiary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[13px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] focus:outline-none focus:border-[var(--bos-accent)] transition-all"
              />
            </div>

            {filteredProjects.length === 0 ? (
              <div className="py-12 text-center text-[13px] text-[var(--bos-text-tertiary)]">
                {projects.length === 0 ? "No active projects available." : "No projects match your search."}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectProject(p)}
                    className="p-4 rounded-xl border border-[var(--bos-border)] bg-[var(--bos-surface-panel)] hover:border-[var(--bos-accent)]/40 hover:shadow-md transition-all text-left cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-[10px] font-mono text-[var(--bos-accent)] font-bold">{p.code || "PROJECT"}</span>
                        <h3 className="text-[14px] font-bold text-[var(--bos-text-primary)] mt-0.5 group-hover:text-[var(--bos-accent)] transition-colors">
                          {p.name}
                        </h3>
                      </div>
                      <span className={cn(
                        "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded",
                        p.stage === "DEVELOPMENT" ? "bg-sky-500/10 text-sky-600" :
                          p.stage === "PLANNING" ? "bg-amber-500/10 text-amber-600" :
                            p.stage === "TESTING" ? "bg-violet-500/10 text-violet-600" :
                              "bg-[var(--bos-surface)] text-[var(--bos-text-secondary)]"
                      )}>
                        {p.stage}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-[var(--bos-text-secondary)] mb-3">
                      <Building2 className="w-3 h-3" />
                      <span>{p.clientName}</span>
                    </div>

                    {p.description && (
                      <p className="text-[11px] text-[var(--bos-text-secondary)] line-clamp-2 mb-3 leading-relaxed">
                        {p.description}
                      </p>
                    )}

                    {/* Scope Stats */}
                    <div className="grid grid-cols-4 gap-2 pt-3 border-t border-[var(--bos-border)]">
                      {[
                        { label: "Pages", val: p.scope.pages },
                        { label: "APIs", val: p.scope.apis },
                        { label: "Tasks", val: p.scope.tasks },
                        { label: "Team", val: p.teamSize },
                      ].map((s) => (
                        <div key={s.label} className="text-center">
                          <span className="text-[14px] font-bold text-[var(--bos-text-primary)] block">{s.val}</span>
                          <span className="text-[9px] font-mono text-[var(--bos-text-tertiary)]">{s.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Progress */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] font-mono text-[var(--bos-text-tertiary)] mb-1">
                        <span>Progress</span>
                        <span>{p.progress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--bos-surface-sunken)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--bos-accent)] transition-all"
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════ STEP 2: SELECT EMPLOYEE ═══════════ */}
        {!loading && step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-[15px] font-bold text-[var(--bos-text-primary)]">
                Who Do You Want to Assign?
              </h2>
              <p className="text-[12px] text-[var(--bos-text-secondary)] mt-0.5">
                Select the team member to assign a responsibility on <strong>{selectedProject?.name}</strong>
              </p>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--bos-text-tertiary)]" />
              <input
                type="text"
                value={empSearchQuery}
                onChange={(e) => setEmpSearchQuery(e.target.value)}
                placeholder="Search employees by name, role, skill..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[13px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] focus:outline-none focus:border-[var(--bos-accent)] transition-all"
              />
            </div>

            {filteredEmployees.length === 0 ? (
              <div className="py-12 text-center text-[13px] text-[var(--bos-text-tertiary)]">
                {employees.length === 0 ? "No active employees available." : "No employees match your search."}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEmployees.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => selectEmployee(emp)}
                    className={cn(
                      "p-4 rounded-xl border bg-[var(--bos-surface-panel)] hover:shadow-md transition-all text-left cursor-pointer group",
                      emp.alreadyOnProject
                        ? "border-[var(--bos-accent)]/30"
                        : "border-[var(--bos-border)] hover:border-[var(--bos-accent)]/40"
                    )}
                  >
                    {/* Employee Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--bos-accent-subtle)] flex items-center justify-center text-[var(--bos-accent)] font-bold text-[14px] shrink-0">
                        {emp.fullName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[13.5px] font-bold text-[var(--bos-text-primary)] truncate group-hover:text-[var(--bos-accent)] transition-colors">
                          {emp.fullName}
                        </h3>
                        <span className="text-[11px] text-[var(--bos-text-secondary)]">
                          {emp.roleName || "No role assigned"}
                        </span>
                      </div>
                    </div>

                    {/* Skills */}
                    {emp.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {emp.skills.slice(0, 4).map((s: string, i: number) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[9px] font-mono text-[var(--bos-text-secondary)]">
                            {s}
                          </span>
                        ))}
                        {emp.skills.length > 4 && (
                          <span className="text-[9px] font-mono text-[var(--bos-text-tertiary)]">
                            +{emp.skills.length - 4} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[var(--bos-border)]">
                      <div>
                        <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] block">Workload</span>
                        <span className={cn(
                          "text-[13px] font-bold",
                          emp.currentWorkload.utilizationPercent > 100 ? "text-rose-500" :
                            emp.currentWorkload.utilizationPercent > 80 ? "text-amber-500" :
                              "text-emerald-500"
                        )}>
                          {emp.currentWorkload.utilizationPercent}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] block">Active Tasks</span>
                        <span className="text-[13px] font-bold text-[var(--bos-text-primary)]">
                          {emp.currentWorkload.activeTaskCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] block">Capacity</span>
                        <span className="text-[13px] font-bold text-[var(--bos-text-primary)]">
                          {emp.currentWorkload.assignedHours}h / {emp.currentWorkload.capacityHours}h
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] block">Projects</span>
                        <span className="text-[13px] font-bold text-[var(--bos-text-primary)]">
                          {emp.currentProjects.length}
                        </span>
                      </div>
                    </div>

                    {/* Already on project badge */}
                    {emp.alreadyOnProject && (
                      <div className="mt-2 px-2 py-1 rounded-lg bg-[var(--bos-accent-subtle)] text-[10px] font-mono text-[var(--bos-accent)] text-center">
                        Already on this project{emp.existingWorkstream ? ` (${emp.existingWorkstream})` : ""}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => goToStep(1)}
              className="text-[12px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-accent)] cursor-pointer flex items-center gap-1 mt-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to projects
            </button>
          </div>
        )}

        {/* ═══════════ STEP 3: CHOOSE RESPONSIBILITY ═══════════ */}
        {!loading && step === 3 && selectedEmployee && (
          <div className="space-y-5 max-w-2xl">
            <div>
              <h2 className="text-[15px] font-bold text-[var(--bos-text-primary)]">
                What Should {selectedEmployee.fullName.split(" ")[0]} Own?
              </h2>
              <p className="text-[12px] text-[var(--bos-text-secondary)] mt-0.5">
                Only responsibilities compatible with <strong>{selectedEmployee.roleName || "their role"}</strong> are available
              </p>
            </div>

            <div className="space-y-2">
              {(selectedEmployee.responsibilities || []).map((r: any) => (
                <button
                  key={r.workstream}
                  type="button"
                  disabled={!r.isCompatible}
                  onClick={() => r.isCompatible && selectWorkstream(r.workstream)}
                  className={cn(
                    "w-full p-4 rounded-xl border text-left transition-all",
                    r.isCompatible
                      ? "bg-[var(--bos-surface-panel)] border-[var(--bos-border)] hover:border-[var(--bos-accent)]/40 hover:shadow-sm cursor-pointer"
                      : "bg-[var(--bos-surface-sunken)] border-[var(--bos-border-subtle)] opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center",
                        r.isCompatible ? "bg-[var(--bos-accent-subtle)] text-[var(--bos-accent)]" : "bg-[var(--bos-surface)] text-[var(--bos-text-tertiary)]"
                      )}>
                        {r.workstream === "FRONTEND" && <Monitor className="w-4.5 h-4.5" />}
                        {r.workstream === "BACKEND" && <Server className="w-4.5 h-4.5" />}
                        {r.workstream === "DATABASE" && <Database className="w-4.5 h-4.5" />}
                        {r.workstream === "QA" && <TestTube className="w-4.5 h-4.5" />}
                        {r.workstream === "INTEGRATION" && <Link2 className="w-4.5 h-4.5" />}
                      </div>
                      <div>
                        <h3 className="text-[13.5px] font-bold text-[var(--bos-text-primary)]">{r.label}</h3>
                        <p className="text-[11px] text-[var(--bos-text-secondary)] mt-0.5 line-clamp-1">{r.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.isCompatible ? (
                        <span className="text-[10px] font-mono text-emerald-500 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Compatible
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5" /> {r.reason}
                        </span>
                      )}
                      {r.isCompatible && <ChevronRight className="w-4 h-4 text-[var(--bos-text-tertiary)]" />}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => goToStep(2)}
              className="text-[12px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-accent)] cursor-pointer flex items-center gap-1 mt-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to employees
            </button>
          </div>
        )}

        {/* ═══════════ STEP 4: REVIEW DISCOVERED WORK ═══════════ */}
        {!loading && step === 4 && discoveredWork && (
          <div className="space-y-6">
            {/* Work Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono text-[var(--bos-accent)] font-bold uppercase">
                  {discoveredWork.workstreamLabel}
                </span>
                <h2 className="text-[17px] font-bold text-[var(--bos-text-primary)] mt-0.5">
                  {discoveredWork.projectName}
                </h2>
                {discoveredWork.projectDescription && (
                  <p className="text-[12px] text-[var(--bos-text-secondary)] mt-1 max-w-2xl leading-relaxed">
                    {discoveredWork.projectDescription}
                  </p>
                )}
              </div>
            </div>

            {/* Scope Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {[
                { label: "Pages", val: discoveredWork.scope.pages, show: selectedWorkstream === "FRONTEND" },
                { label: "Components", val: discoveredWork.scope.components, show: selectedWorkstream === "FRONTEND" },
                { label: "APIs", val: discoveredWork.scope.apis, show: ["FRONTEND", "BACKEND", "INTEGRATION"].includes(selectedWorkstream) },
                { label: "DB Entities", val: discoveredWork.scope.databaseEntities, show: ["DATABASE", "BACKEND"].includes(selectedWorkstream) },
                { label: "Test Specs", val: discoveredWork.scope.testSpecs, show: selectedWorkstream === "QA" },
                { label: "Deliverables", val: discoveredWork.scope.deliverables, show: true },
                { label: "Tasks", val: discoveredWork.scope.existingTasks, show: true },
              ].filter((s) => s.show).map((s) => (
                <div key={s.label} className="p-3 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-center">
                  <span className="text-[18px] font-bold text-[var(--bos-text-primary)] block">{s.val}</span>
                  <span className="text-[9.5px] font-mono text-[var(--bos-text-tertiary)]">{s.label}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Pages / APIs / Entities */}
              <div className="lg:col-span-2 space-y-5">
                {/* Pages (Frontend) */}
                {discoveredWork.pages.length > 0 && (
                  <div>
                    <h3 className="text-[13px] font-bold text-[var(--bos-text-primary)] mb-3 flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-[var(--bos-accent)]" />
                      Pages & Components
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {discoveredWork.pages.filter((p: any) => p.type === "PAGE").map((page: any) => (
                        <WorkstreamPagePreview key={page.id} page={page} />
                      ))}
                    </div>
                    {discoveredWork.pages.filter((p: any) => p.type !== "PAGE").length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)] font-bold">
                          COMPONENTS & OTHER
                        </span>
                        {discoveredWork.pages.filter((p: any) => p.type !== "PAGE").map((page: any) => (
                          <WorkstreamPagePreview key={page.id} page={page} compact />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* APIs */}
                {discoveredWork.apis.length > 0 && (
                  <div>
                    <h3 className="text-[13px] font-bold text-[var(--bos-text-primary)] mb-3 flex items-center gap-2">
                      <Server className="w-4 h-4 text-violet-500" />
                      API Endpoints
                    </h3>
                    <div className="space-y-1.5">
                      {discoveredWork.apis.map((api: any) => (
                        <div key={api.id} className="p-3 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn(
                              "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0",
                              api.method === "GET" ? "bg-emerald-500/10 text-emerald-600" :
                                api.method === "POST" ? "bg-sky-500/10 text-sky-600" :
                                  api.method === "PUT" || api.method === "PATCH" ? "bg-amber-500/10 text-amber-600" :
                                    "bg-rose-500/10 text-rose-600"
                            )}>
                              {api.method}
                            </span>
                            <span className="text-[12px] font-mono text-[var(--bos-text-primary)] truncate">{api.path}</span>
                          </div>
                          <span className="text-[10px] text-[var(--bos-text-secondary)] truncate ml-3 max-w-[200px]">{api.purpose}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Database Entities */}
                {discoveredWork.databaseEntities.length > 0 && (
                  <div>
                    <h3 className="text-[13px] font-bold text-[var(--bos-text-primary)] mb-3 flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-500" />
                      Database Entities
                    </h3>
                    <div className="space-y-1.5">
                      {discoveredWork.databaseEntities.map((e: any) => (
                        <div key={e.id} className="p-3 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)] flex items-center justify-between">
                          <div>
                            <span className="text-[12.5px] font-bold text-[var(--bos-text-primary)]">{e.name}</span>
                            <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] ml-2">{e.tableName}</span>
                          </div>
                          <span className="text-[10px] font-mono text-[var(--bos-text-secondary)]">{e.fieldCount} fields</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Test Specs */}
                {discoveredWork.testSpecs.length > 0 && (
                  <div>
                    <h3 className="text-[13px] font-bold text-[var(--bos-text-primary)] mb-3 flex items-center gap-2">
                      <TestTube className="w-4 h-4 text-amber-500" />
                      Test Specifications
                    </h3>
                    <div className="space-y-1.5">
                      {discoveredWork.testSpecs.map((t: any) => (
                        <div key={t.id} className="p-3 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)]">
                          <div className="flex items-center justify-between">
                            <span className="text-[12.5px] font-semibold text-[var(--bos-text-primary)]">{t.name}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--bos-surface)] text-[var(--bos-text-tertiary)]">{t.testType}</span>
                          </div>
                          <p className="text-[11px] text-[var(--bos-text-secondary)] mt-0.5 line-clamp-1">{t.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Capabilities */}
                {discoveredWork.capabilities.length > 0 && (
                  <div className="p-4 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)]">
                    <h3 className="text-[12px] font-bold text-[var(--bos-text-primary)] mb-2">
                      YOUR RESPONSIBILITY INCLUDES
                    </h3>
                    <div className="space-y-1.5">
                      {discoveredWork.capabilities.map((cap: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-[12px] text-[var(--bos-text-secondary)]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{cap}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Dependency Chain & Tasks */}
              <div className="space-y-5">
                {/* Dependency Chain */}
                <div className="p-4 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)]">
                  <h3 className="text-[12px] font-bold text-[var(--bos-text-primary)] mb-3 flex items-center gap-2">
                    <Link2 className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
                    CONNECTED WORK
                  </h3>
                  <WorkstreamDependencyGraph
                    chain={discoveredWork.dependencyChain}
                    activeLayer={selectedWorkstream}
                  />
                  {discoveredWork.dependencyChain.length === 0 && (
                    <p className="text-[11px] text-[var(--bos-text-tertiary)] italic">
                      No dependency data configured for this project.
                    </p>
                  )}
                </div>

                {/* Existing Tasks */}
                <div className="p-4 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)]">
                  <h3 className="text-[12px] font-bold text-[var(--bos-text-primary)] mb-3">
                    EXISTING TASKS ({discoveredWork.existingTasks.length})
                  </h3>
                  {discoveredWork.existingTasks.length === 0 ? (
                    <p className="text-[11px] text-[var(--bos-text-tertiary)] italic">No tasks created for this workstream yet.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                      {discoveredWork.existingTasks.map((t: any) => (
                        <div key={t.id} className="p-2.5 rounded-lg bg-[var(--bos-bg)] border border-[var(--bos-border)]">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-[var(--bos-accent)] font-bold">{t.code || "—"}</span>
                            <span className={cn(
                              "text-[9px] font-mono px-1 py-0.5 rounded",
                              t.status === "DONE" || t.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-600" :
                                t.status === "IN_PROGRESS" ? "bg-sky-500/10 text-sky-600" :
                                  t.status === "BLOCKED" ? "bg-rose-500/10 text-rose-600" :
                                    "bg-[var(--bos-surface)] text-[var(--bos-text-tertiary)]"
                            )}>
                              {t.status}
                            </span>
                          </div>
                          <p className="text-[11.5px] text-[var(--bos-text-primary)] mt-0.5 line-clamp-1">{t.title}</p>
                          {t.assigneeName && (
                            <span className="text-[9.5px] font-mono text-[var(--bos-text-tertiary)] mt-0.5 block">
                              Assigned: {t.assigneeName}
                            </span>
                          )}
                          {!t.assigneeId && (
                            <span className="text-[9.5px] font-mono text-amber-500 mt-0.5 block">
                              Unassigned — will be auto-connected
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[var(--bos-border)]">
              <button
                type="button"
                onClick={() => goToStep(3)}
                className="text-[12px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-accent)] cursor-pointer flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to responsibilities
              </button>
              <button
                type="button"
                onClick={proceedToAnalysis}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-[13px] font-semibold transition-all cursor-pointer shadow-md"
              >
                Continue to Analysis <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════ STEP 5: ASSIGNMENT ANALYSIS ═══════════ */}
        {!loading && step === 5 && analysis && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h2 className="text-[15px] font-bold text-[var(--bos-text-primary)]">
                Assignment Analysis
              </h2>
              <p className="text-[12px] text-[var(--bos-text-secondary)] mt-0.5">
                Pre-assignment verification for <strong>{selectedEmployee?.fullName}</strong> on <strong>{selectedWorkstream}</strong>
              </p>
            </div>

            {/* Recommendation Banner */}
            <div className={cn(
              "p-4 rounded-xl border",
              analysis.recommendation.recommended
                ? "bg-emerald-500/5 border-emerald-500/20"
                : "bg-amber-500/5 border-amber-500/20"
            )}>
              <div className="flex items-start gap-3">
                {analysis.recommendation.recommended ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <h3 className={cn(
                    "text-[13px] font-bold",
                    analysis.recommendation.recommended ? "text-emerald-600" : "text-amber-600"
                  )}>
                    {analysis.recommendation.recommended ? "RECOMMENDED" : "REVIEW RECOMMENDED"}
                  </h3>
                  <p className="text-[12px] text-[var(--bos-text-secondary)] mt-0.5">
                    {analysis.recommendation.reason}
                  </p>
                </div>
              </div>
            </div>

            {/* Analysis Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Role Match */}
              <div className="p-4 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)]">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-[var(--bos-accent)]" />
                  <span className="text-[11px] font-mono font-bold text-[var(--bos-text-secondary)] uppercase">Role Match</span>
                </div>
                <span className={cn(
                  "text-[15px] font-bold",
                  analysis.roleMatch.score === "EXCELLENT" ? "text-emerald-500" :
                    analysis.roleMatch.score === "GOOD" ? "text-sky-500" :
                      analysis.roleMatch.score === "PARTIAL" ? "text-amber-500" : "text-rose-500"
                )}>
                  {analysis.roleMatch.score}
                </span>
                <p className="text-[11px] text-[var(--bos-text-secondary)] mt-1">{analysis.roleMatch.reason}</p>
              </div>

              {/* Skill Match */}
              <div className="p-4 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)]">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-[var(--bos-accent)]" />
                  <span className="text-[11px] font-mono font-bold text-[var(--bos-text-secondary)] uppercase">Skill Match</span>
                </div>
                <span className={cn(
                  "text-[15px] font-bold",
                  analysis.skillMatch.score === "EXCELLENT" ? "text-emerald-500" :
                    analysis.skillMatch.score === "GOOD" ? "text-sky-500" :
                      analysis.skillMatch.score === "PARTIAL" ? "text-amber-500" : "text-[var(--bos-text-tertiary)]"
                )}>
                  {analysis.skillMatch.score}
                </span>
                <p className="text-[11px] text-[var(--bos-text-secondary)] mt-1">{analysis.skillMatch.reason}</p>
              </div>

              {/* Current Workload */}
              <div className="p-4 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)]">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-[var(--bos-accent)]" />
                  <span className="text-[11px] font-mono font-bold text-[var(--bos-text-secondary)] uppercase">Current Workload</span>
                </div>
                <span className={cn(
                  "text-[15px] font-bold",
                  analysis.currentWorkload.utilizationPercent > 100 ? "text-rose-500" :
                    analysis.currentWorkload.utilizationPercent > 80 ? "text-amber-500" : "text-emerald-500"
                )}>
                  {analysis.currentWorkload.utilizationPercent}%
                </span>
                <p className="text-[11px] text-[var(--bos-text-secondary)] mt-1">
                  {analysis.currentWorkload.assignedHours}h assigned / {analysis.currentWorkload.capacityHours}h capacity · {analysis.currentWorkload.activeTaskCount} active tasks
                </p>
              </div>

              {/* Available Capacity */}
              <div className="p-4 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)]">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-[var(--bos-accent)]" />
                  <span className="text-[11px] font-mono font-bold text-[var(--bos-text-secondary)] uppercase">Available Capacity</span>
                </div>
                <span className={cn(
                  "text-[15px] font-bold",
                  analysis.availableCapacity.status === "AVAILABLE" ? "text-emerald-500" :
                    analysis.availableCapacity.status === "MODERATE" ? "text-sky-500" :
                      analysis.availableCapacity.status === "LIMITED" ? "text-amber-500" : "text-rose-500"
                )}>
                  {analysis.availableCapacity.hoursAvailable}h available
                </span>
                <p className="text-[11px] text-[var(--bos-text-secondary)] mt-1">
                  {analysis.availableCapacity.status} · {analysis.projectAssignments.activeCount} active project(s)
                </p>
              </div>
            </div>

            {/* Warnings */}
            {analysis.warnings.length > 0 && (
              <div className="space-y-1.5">
                {analysis.warnings.map((w: string, i: number) => (
                  <div key={i} className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-center gap-2 text-[12px] text-amber-600">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {w}
                  </div>
                ))}
              </div>
            )}

            {/* Dependency Risks */}
            {analysis.dependencyRisks.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono font-bold text-[var(--bos-text-secondary)] uppercase">Dependency Risks</span>
                {analysis.dependencyRisks.map((r: string, i: number) => (
                  <div key={i} className="p-2.5 rounded-lg bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[11.5px] text-[var(--bos-text-secondary)]">
                    {r}
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[var(--bos-border)]">
              <button
                type="button"
                onClick={() => goToStep(4)}
                className="text-[12px] text-[var(--bos-text-secondary)] hover:text-[var(--bos-accent)] cursor-pointer flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to work review
              </button>
              <button
                type="button"
                onClick={proceedToConfirm}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-[13px] font-semibold transition-all cursor-pointer shadow-md"
              >
                Proceed to Confirmation <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════ STEP 6: CONFIRM & ASSIGN ═══════════ */}
        {!loading && step === 6 && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="text-center">
              <h2 className="text-[17px] font-bold text-[var(--bos-text-primary)]">
                Confirm Assignment
              </h2>
              <p className="text-[12px] text-[var(--bos-text-secondary)] mt-1">
                Review and confirm the responsibility assignment
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] shadow-lg space-y-5">
              {/* Employee */}
              <div className="flex items-center gap-3 pb-4 border-b border-[var(--bos-border)]">
                <div className="w-12 h-12 rounded-xl bg-[var(--bos-accent-subtle)] flex items-center justify-center text-[var(--bos-accent)] font-bold text-[18px]">
                  {selectedEmployee?.fullName.charAt(0)}
                </div>
                <div>
                  <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase">Employee</span>
                  <h3 className="text-[15px] font-bold text-[var(--bos-text-primary)]">{selectedEmployee?.fullName}</h3>
                  <span className="text-[11px] text-[var(--bos-text-secondary)]">{selectedEmployee?.roleName || "No role"}</span>
                </div>
              </div>

              {/* Project */}
              <div className="pb-4 border-b border-[var(--bos-border)]">
                <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase">Project</span>
                <h3 className="text-[14px] font-bold text-[var(--bos-text-primary)]">{selectedProject?.name}</h3>
                <span className="text-[11px] text-[var(--bos-text-secondary)]">{selectedProject?.clientName}</span>
              </div>

              {/* Responsibility */}
              <div className="pb-4 border-b border-[var(--bos-border)]">
                <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase">Responsibility</span>
                <h3 className="text-[14px] font-bold text-[var(--bos-accent)]">
                  {discoveredWork?.workstreamLabel || selectedWorkstream}
                </h3>
              </div>

              {/* Automatically Connected */}
              {discoveredWork && (
                <div>
                  <span className="text-[10px] font-mono text-[var(--bos-text-tertiary)] uppercase block mb-2">
                    Automatically Connected
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Pages", val: discoveredWork.scope.pages, show: selectedWorkstream === "FRONTEND" },
                      { label: "Components", val: discoveredWork.scope.components, show: selectedWorkstream === "FRONTEND" },
                      { label: "API Connections", val: discoveredWork.scope.apis, show: discoveredWork.scope.apis > 0 },
                      { label: "DB Entities", val: discoveredWork.scope.databaseEntities, show: discoveredWork.scope.databaseEntities > 0 },
                      { label: "Deliverables", val: discoveredWork.scope.deliverables, show: discoveredWork.scope.deliverables > 0 },
                      { label: "Existing Tasks", val: discoveredWork.scope.existingTasks, show: discoveredWork.scope.existingTasks > 0 },
                    ].filter((s) => s.show && s.val > 0).map((s) => (
                      <div key={s.label} className="flex items-center gap-2 text-[12px] text-[var(--bos-text-secondary)]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{s.val} {s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => goToStep(5)}
                className="px-5 py-2.5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[13px] font-medium text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface-sunken)] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={assigning}
                onClick={executeAssignment}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-[13px] font-bold transition-all cursor-pointer shadow-lg disabled:opacity-50"
              >
                {assigning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Assign {discoveredWork?.workstreamLabel || selectedWorkstream} Responsibility
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════ STEP 7: SUCCESS ═══════════ */}
        {step === 7 && assignmentResult && (
          <div className="max-w-lg mx-auto text-center space-y-6 py-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>

            <div>
              <h2 className="text-[19px] font-bold text-[var(--bos-text-primary)]">
                Responsibility Assigned
              </h2>
              <p className="text-[13px] text-[var(--bos-text-secondary)] mt-2 leading-relaxed">
                <strong>{selectedEmployee?.fullName}</strong> has been assigned <strong>{assignmentResult.workstreamLabel}</strong> responsibility on <strong>{selectedProject?.name}</strong>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border)] text-left space-y-2">
              <div className="flex items-center gap-2 text-[12px] text-[var(--bos-text-secondary)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Project staff allocation created</span>
              </div>
              {assignmentResult.memberCreated && (
                <div className="flex items-center gap-2 text-[12px] text-[var(--bos-text-secondary)]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Added to project team</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-[12px] text-[var(--bos-text-secondary)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{assignmentResult.tasksAssigned} existing task(s) auto-assigned</span>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-[var(--bos-text-secondary)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Audit event recorded</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  // Reset state for another assignment
                  setStep(1);
                  setSelectedProject(null);
                  setSelectedEmployee(null);
                  setSelectedWorkstream("");
                  setDiscoveredWork(null);
                  setAnalysis(null);
                  setAssignmentResult(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[13px] font-medium text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface-sunken)] transition-all cursor-pointer"
              >
                Assign Another
              </button>
              <button
                type="button"
                onClick={() => router.push("/employees")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--bos-accent)] hover:bg-[var(--bos-accent-hover)] text-white text-[13px] font-semibold transition-all cursor-pointer shadow-md"
              >
                Back to Employees <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
