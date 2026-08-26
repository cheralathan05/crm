"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Database,
  ExternalLink,
  FileCheck2,
  FileCode2,
  FileText,
  FolderKanban,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Layers,
  Link2,
  ListTodo,
  Plus,
  Server,
  ShieldCheck,
  Sparkles,
  TestTube2,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskProductUnderstanding } from "@/lib/tasks";

export type ProductWorkPackageProps = {
  workPackage: TaskProductUnderstanding["workPackage"];
  taskId: string;
  onEvidenceAdded?: () => void;
};

export function ProductWorkPackage({
  workPackage,
  taskId,
  onEvidenceAdded,
}: ProductWorkPackageProps) {
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceType, setEvidenceType] = useState("GIT_COMMIT");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceDesc, setEvidenceDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!workPackage) return null;

  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceTitle.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/tasks/${taskId}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: evidenceType,
          title: evidenceTitle,
          url: evidenceUrl || undefined,
          description: evidenceDesc || undefined,
        }),
      });
      if (res.ok) {
        setEvidenceTitle("");
        setEvidenceUrl("");
        setEvidenceDesc("");
        setShowEvidenceModal(false);
        onEvidenceAdded?.();
      }
    } catch {
      // Keep resilient
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Work Package Header ───────────────────────────────────── */}
      <div className="p-6 bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl space-y-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--bos-border)]">
          <span className="text-xs font-mono font-bold tracking-wider uppercase text-[var(--bos-accent)] flex items-center gap-1.5">
            <ListTodo className="w-4 h-4" />
            WORK PACKAGE SPECIFICATION
          </span>
          <span className="text-[10px] font-mono text-[var(--bos-text-muted)]">
            Execution Ready &bull; Zero Ambiguity
          </span>
        </div>

        {/* 1. BUILD — Responsibility */}
        <div className="space-y-2">
          <div className="text-[11px] font-mono font-bold text-[var(--bos-text-muted)] uppercase tracking-wider">
            BUILD (YOUR DIRECT RESPONSIBILITY)
          </div>
          <div className="p-4 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl text-sm font-medium text-[var(--bos-text-primary)] leading-relaxed">
            {workPackage.build}
          </div>
        </div>

        {/* 2. INPUTS — Requirements, Design, API, DB, Dependencies */}
        <div className="space-y-2">
          <div className="text-[11px] font-mono font-bold text-[var(--bos-text-muted)] uppercase tracking-wider">
            INPUTS (WHAT YOU RECEIVE)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Requirement Input */}
            <div className="p-3 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--bos-text-muted)] uppercase">
                <FileText className="w-3.5 h-3.5 text-sky-500" />
                Approved Requirement
              </div>
              <p className="text-xs font-bold text-[var(--bos-text-primary)]">
                {workPackage.inputs.requirements || "Standard Project Scope"}
              </p>
            </div>

            {/* Design Input */}
            <div className="p-3 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--bos-text-muted)] uppercase">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                Design System
              </div>
              <div className="flex flex-wrap gap-1">
                {workPackage.inputs.designTokens?.map((tok, i) => (
                  <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bos-surface)] border border-[var(--bos-border)] text-[var(--bos-text-secondary)]">
                    {tok}
                  </span>
                ))}
              </div>
            </div>

            {/* API Input */}
            <div className="p-3 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--bos-text-muted)] uppercase">
                <Server className="w-3.5 h-3.5 text-emerald-500" />
                API Contracts
              </div>
              {workPackage.inputs.apis && workPackage.inputs.apis.length > 0 ? (
                <div className="space-y-1">
                  {workPackage.inputs.apis.map((api, i) => (
                    <div key={i} className="text-[11px] font-mono text-[var(--bos-text-primary)]">
                      <code>{api}</code>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--bos-text-muted)]">No external endpoints bound</p>
              )}
            </div>

            {/* Database Input */}
            <div className="p-3 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--bos-text-muted)] uppercase">
                <Database className="w-3.5 h-3.5 text-amber-500" />
                Database Entities
              </div>
              {workPackage.inputs.databases && workPackage.inputs.databases.length > 0 ? (
                <div className="space-y-1">
                  {workPackage.inputs.databases.map((db, i) => (
                    <div key={i} className="text-[11px] font-mono text-[var(--bos-text-primary)]">
                      {db}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--bos-text-muted)]">Direct memory / stateless</p>
              )}
            </div>
          </div>
        </div>

        {/* 3. OUTPUT — What must exist */}
        <div className="space-y-2">
          <div className="text-[11px] font-mono font-bold text-[var(--bos-text-muted)] uppercase tracking-wider">
            OUTPUT (WHAT MUST EXIST UPON COMPLETION)
          </div>
          <div className="p-4 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl text-xs text-[var(--bos-text-secondary)] font-mono leading-relaxed">
            {workPackage.output}
          </div>
        </div>

        {/* 4. DONE WHEN — Acceptance Criteria */}
        <div className="space-y-2">
          <div className="text-[11px] font-mono font-bold text-[var(--bos-text-muted)] uppercase tracking-wider">
            DONE WHEN (REAL ACCEPTANCE CRITERIA)
          </div>
          <div className="space-y-2">
            {workPackage.doneWhen.map((crit, i) => (
              <div
                key={i}
                className="p-3 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-xl flex items-start gap-3 text-xs text-[var(--bos-text-primary)] font-medium"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{crit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 5. PROOF / EVIDENCE — Connected Verification Records */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-mono font-bold text-[var(--bos-text-muted)] uppercase tracking-wider">
              PROOF OF COMPLETION (CONNECTED EVIDENCE)
            </div>
            <button
              onClick={() => setShowEvidenceModal(true)}
              className="px-2.5 py-1 bg-[var(--bos-bg)] hover:bg-[var(--bos-surface-hover)] border border-[var(--bos-border)] rounded-lg text-xs font-mono text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Attach Proof
            </button>
          </div>

          {workPackage.proof && workPackage.proof.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {workPackage.proof.map((pf) => (
                <div
                  key={pf.id}
                  className="p-3 bg-[var(--bos-bg)] border border-emerald-500/30 rounded-xl space-y-1 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">
                      {pf.type}
                    </span>
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  </div>
                  <h5 className="text-xs font-bold text-[var(--bos-text-primary)]">
                    {pf.title}
                  </h5>
                  {pf.url && (
                    <a
                      href={pf.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-mono text-[var(--bos-accent)] hover:underline flex items-center gap-1 truncate"
                    >
                      <Link2 className="w-3 h-3" />
                      {pf.url}
                    </a>
                  )}
                  {pf.verifiedBy && (
                    <div className="text-[10px] font-mono text-[var(--bos-text-muted)] pt-1">
                      Verified by {pf.verifiedBy}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-[var(--bos-bg)] border border-dashed border-[var(--bos-border)] rounded-xl text-center space-y-1">
              <FileCheck2 className="w-6 h-6 text-[var(--bos-text-muted)] mx-auto opacity-40" />
              <p className="text-xs font-mono text-[var(--bos-text-muted)]">
                No completion evidence attached yet. (Git commit, PR, screenshot, test run)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Attach Evidence Modal */}
      {showEvidenceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bos-surface)] border border-[var(--bos-border)] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-[var(--bos-text-primary)] font-mono">
              ATTACH PROOF OF WORK
            </h3>

            <form onSubmit={handleAddEvidence} className="space-y-3 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-[var(--bos-text-muted)] uppercase">Evidence Type</label>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value)}
                  className="w-full p-2.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-[var(--bos-text-primary)]"
                >
                  <option value="GIT_COMMIT">Git Commit Hash</option>
                  <option value="PULL_REQUEST">Pull Request Link</option>
                  <option value="CI_TEST">Automated Test Report</option>
                  <option value="SCREENSHOT">Visual Screenshot</option>
                  <option value="REVIEW_SIGNOFF">Reviewer Signoff</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[var(--bos-text-muted)] uppercase">Title / Ref</label>
                <input
                  type="text"
                  placeholder="e.g. feat(customer): commit 4f98a2d"
                  value={evidenceTitle}
                  onChange={(e) => setEvidenceTitle(e.target.value)}
                  required
                  className="w-full p-2.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-[var(--bos-text-primary)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[var(--bos-text-muted)] uppercase">URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://github.com/..."
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  className="w-full p-2.5 bg-[var(--bos-bg)] border border-[var(--bos-border)] rounded-lg text-[var(--bos-text-primary)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEvidenceModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:bg-[var(--bos-bg)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-[var(--bos-accent)] text-white font-bold hover:opacity-90 cursor-pointer"
                >
                  {isSubmitting ? "Attaching..." : "Save Proof"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
