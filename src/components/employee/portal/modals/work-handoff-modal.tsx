"use client";

import { useState, useRef, useEffect } from "react";
import {
  CheckCircle2,
  X,
  Loader2,
  ArrowRight,
  UploadCloud,
  Link as LinkIcon,
  ShieldAlert,
  Layers,
  FileCheck2,
  AlertTriangle,
  Image as ImageIcon,
  FileText,
  Trash2,
  Eye,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkHandoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  task: {
    id: string;
    code?: string;
    title: string;
    layer?: string;
    status?: string;
    whyAmIBuildingIt?: string;
    whatShouldFinalResultLookLike?: string;
    acceptanceCriteriaList?: Array<{ id: string; criterion: string; status: string }>;
    whatDoesItDependOn?: string;
    reviewerFeedback?: string | null;
    deliverable?: { title: string } | null;
    submissions?: Array<any>;
  } | null;
  projectName?: string;
  employeeRole?: string;
  employeeDiscipline?: string;
}

export function WorkHandoffModal({
  isOpen,
  onClose,
  onSuccess,
  task,
  projectName,
  employeeRole,
  employeeDiscipline,
}: WorkHandoffModalProps) {
  const [summary, setSummary] = useState("");
  const [proofType, setProofType] = useState("SCREENSHOT");
  const [proofUrl, setProofUrl] = useState("");
  const [knownIssues, setKnownIssues] = useState("");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File Upload State
  const [proofMode, setProofMode] = useState<"FILE" | "LINK">("FILE");
  const [attachedFile, setAttachedFile] = useState<{
    file: File;
    previewUrl?: string;
    serverUrl?: string;
    name: string;
    size: number;
    type: string;
  } | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state on open/close
  useEffect(() => {
    if (!isOpen) {
      setSummary("");
      setProofUrl("");
      setAttachedFile(null);
      setError(null);
      setKnownIssues("");
      setComments("");
      setIsUploadingFile(false);
    }
  }, [isOpen]);

  // Adjust default proofMode based on proofType
  const handleProofTypeChange = (newType: string) => {
    setProofType(newType);
    if (newType === "SCREENSHOT" || newType === "DOCUMENT" || newType === "TEST_RESULTS") {
      setProofMode("FILE");
    } else {
      setProofMode("LINK");
    }
  };

  // Upload handler to server
  const uploadSelectedFile = async (file: File) => {
    if (!task) return;
    try {
      setIsUploadingFile(true);
      setError(null);

      // Create local preview if image
      const isImg = file.type.startsWith("image/");
      const localPreview = isImg ? URL.createObjectURL(file) : undefined;

      setAttachedFile({
        file,
        previewUrl: localPreview,
        name: file.name,
        size: file.size,
        type: file.type,
      });

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/tasks/${task.id}/upload`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || "Failed to upload file.");
      }

      setAttachedFile((prev) => (prev ? { ...prev, serverUrl: json.file.url } : null));
      setProofUrl(json.file.url);
    } catch (err: any) {
      setError(err.message || "Error uploading file.");
      setAttachedFile(null);
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Handle Ctrl+V clipboard paste (instant screenshot support)
  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData && e.clipboardData.items) {
      for (let i = 0; i < e.clipboardData.items.length; i++) {
        const item = e.clipboardData.items[i];
        if (item.type.indexOf("image") !== -1) {
          const file = item.getAsFile();
          if (file) {
            setProofMode("FILE");
            uploadSelectedFile(file);
            break;
          }
        }
      }
    }
  };

  const removeAttachedFile = () => {
    if (attachedFile?.previewUrl) {
      URL.revokeObjectURL(attachedFile.previewUrl);
    }
    setAttachedFile(null);
    setProofUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!isOpen || !task) return null;

  const isResubmitting = task.status === "CHANGES_REQUESTED";
  const iterationNumber = (task.submissions?.length || 0) + 1;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) {
      setError("Please enter a completion summary describing what was built and verified.");
      return;
    }
    if (isUploadingFile) {
      setError("Please wait for the file upload to complete.");
      return;
    }
    if (!proofUrl.trim() && !attachedFile) {
      setError("Please attach a file/photo or provide an external proof link.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const effectiveProofUrl = proofUrl.trim() || attachedFile?.serverUrl || "";

      const res = await fetch(`/api/tasks/${task.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: summary.trim(),
          proofType,
          proofUrl: effectiveProofUrl,
          knownIssues: knownIssues.trim() || undefined,
          comments: comments.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || "Failed to submit work for review.");
      }

      setSummary("");
      setProofUrl("");
      setAttachedFile(null);
      setKnownIssues("");
      setComments("");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Error submitting work.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onPaste={handlePaste}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[var(--bos-surface-panel)] border border-[var(--bos-accent)]/30 p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--bos-border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--bos-accent)]/10 border border-[var(--bos-accent)]/20 flex items-center justify-center text-[var(--bos-accent)]">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--bos-text-primary)]">
                {isResubmitting ? `Fix & Resubmit Work (Iteration #${iterationNumber})` : "Submit Work for Internal Review"}
              </h2>
              <p className="text-xs text-[var(--bos-text-tertiary)] font-mono uppercase tracking-wider">
                Internal Execution Unit · Freezes Proof for Quality Verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Changes Requested Banner if Resubmitting */}
        {isResubmitting && task.reviewerFeedback && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-400 space-y-1">
            <div className="flex items-center gap-2 font-bold uppercase">
              <AlertTriangle className="w-4 h-4" />
              <span>Reviewer Feedback to Resolve:</span>
            </div>
            <p className="text-sm font-sans text-[var(--bos-text-primary)]">{task.reviewerFeedback}</p>
          </div>
        )}

        {/* Auto-populated Context Card */}
        <div className="p-4 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] space-y-3 font-mono text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-2 border-b border-[var(--bos-border)] text-[11px]">
            <div>
              <span className="text-[var(--bos-text-tertiary)] block text-[10px] uppercase">Project</span>
              <span className="font-bold text-[var(--bos-text-primary)] truncate block">{projectName || "Active Project"}</span>
            </div>
            <div>
              <span className="text-[var(--bos-text-tertiary)] block text-[10px] uppercase">Team</span>
              <span className="font-bold text-[var(--bos-accent)] block">{employeeDiscipline || "Engineering"}</span>
            </div>
            <div>
              <span className="text-[var(--bos-text-tertiary)] block text-[10px] uppercase">Role</span>
              <span className="font-bold text-[var(--bos-text-secondary)] truncate block">{employeeRole || "Developer"}</span>
            </div>
            <div>
              <span className="text-[var(--bos-text-tertiary)] block text-[10px] uppercase">Task Code</span>
              <span className="font-bold text-[var(--bos-accent)] block">{task.code || "TSK"}</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">What am I building?</span>
            <div className="text-sm font-bold text-[var(--bos-text-primary)]">{task.title}</div>
          </div>

          {task.whyAmIBuildingIt && (
            <div>
              <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">Requirement Context</span>
              <p className="text-[11px] text-[var(--bos-text-secondary)] font-sans">{task.whyAmIBuildingIt}</p>
            </div>
          )}

          {task.whatShouldFinalResultLookLike && (
            <div>
              <span className="text-[10px] text-[var(--bos-text-tertiary)] uppercase block">Acceptance Criteria</span>
              <p className="text-[11px] text-[var(--bos-text-primary)] font-mono">{task.whatShouldFinalResultLookLike}</p>
            </div>
          )}

          {task.whatDoesItDependOn && (
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[var(--bos-border)]">
              <span className="text-[var(--bos-text-tertiary)]">Dependencies:</span>
              <span className="text-[var(--bos-text-secondary)]">{task.whatDoesItDependOn}</span>
            </div>
          )}
        </div>

        {/* Submission Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* COMPLETION SUMMARY */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold text-[var(--bos-text-primary)] uppercase">
              Completion Summary (What was completed?) *
            </label>
            <textarea
              rows={3}
              required
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Detail the completed behavior, edge cases handled, and how acceptance criteria were satisfied..."
              className="w-full px-4 py-3 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-sm text-[var(--bos-text-primary)] placeholder-[var(--bos-text-tertiary)] focus:outline-none focus:border-[var(--bos-accent)] transition-colors resize-none"
            />
          </div>

          {/* PROOF TYPE & PROOF MODE SELECTOR */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-bold text-[var(--bos-text-primary)] uppercase">
                  Proof Type *
                </label>
                <select
                  value={proofType}
                  onChange={(e) => handleProofTypeChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs font-mono text-[var(--bos-text-primary)] focus:outline-none"
                >
                  <option value="SCREENSHOT">Screenshot / UI Proof</option>
                  <option value="DEPLOYMENT_URL">Deployment / Live Endpoint</option>
                  <option value="PR">Pull Request / Branch Link</option>
                  <option value="COMMIT">Git Commit Hash</option>
                  <option value="TEST_RESULTS">Test Results / Verification Log</option>
                  <option value="DOCUMENT">Schema / Specification Document</option>
                </select>
              </div>

              {/* Mode Toggle: File vs URL */}
              <div className="flex items-center p-1 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setProofMode("FILE")}
                  className={cn(
                    "flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer font-bold",
                    proofMode === "FILE"
                      ? "bg-[var(--bos-accent)] text-white shadow-xs"
                      : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                  )}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Attach File / Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProofMode("LINK")}
                  className={cn(
                    "flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer font-bold",
                    proofMode === "LINK"
                      ? "bg-[var(--bos-accent)] text-white shadow-xs"
                      : "text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                  )}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Link / Commit</span>
                </button>
              </div>
            </div>

            {/* ── MODE 1: ATTACH FILE / PHOTO DROPZONE ── */}
            {proofMode === "FILE" && (
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.zip,.txt,.csv,.json"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!attachedFile ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "p-6 border-2 border-dashed rounded-2xl text-center transition-all cursor-pointer space-y-2 bg-[var(--bos-surface)] group",
                      isDragging
                        ? "border-[var(--bos-accent)] bg-[var(--bos-accent)]/10"
                        : "border-[var(--bos-border)] hover:border-[var(--bos-accent)]/60"
                    )}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[var(--bos-accent)]/10 border border-[var(--bos-accent)]/20 flex items-center justify-center text-[var(--bos-accent)] mx-auto group-hover:scale-105 transition-transform">
                      <ImageIcon className="w-6 h-6" />
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-[var(--bos-text-primary)]">
                        Click to select or drag & drop files / photos here
                      </p>
                      <p className="text-[11px] text-[var(--bos-text-tertiary)] font-mono">
                        PNG, JPG, WEBP, PDF, DOCX (up to 15MB) • Or press <kbd className="px-1.5 py-0.5 rounded bg-[var(--bos-bg)] border border-[var(--bos-border)] text-[10px]">Ctrl+V</kbd> to paste screenshot
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-[var(--bos-surface)] border border-[var(--bos-accent)]/40 flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {attachedFile.previewUrl ? (
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-[var(--bos-border)] bg-black/40 shrink-0">
                          <img
                            src={attachedFile.previewUrl}
                            alt="Proof Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-[var(--bos-accent)]/10 border border-[var(--bos-accent)]/20 flex items-center justify-center text-[var(--bos-accent)] shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}

                      <div className="space-y-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[var(--bos-text-primary)] truncate max-w-xs block">
                            {attachedFile.name}
                          </span>
                          {isUploadingFile ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1 font-bold">
                              <Check className="w-3 h-3" /> Attached
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                          {formatFileSize(attachedFile.size)} • {attachedFile.type || "Document"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={removeAttachedFile}
                      className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── MODE 2: EXTERNAL LINK / COMMIT ── */}
            {proofMode === "LINK" && (
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-bold text-[var(--bos-text-primary)] uppercase">
                  Proof Evidence (URL, Commit or Link) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required={!attachedFile}
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    placeholder="https://... or commit #abc1234 or PR #42"
                    className="w-full px-3 py-2.5 pl-8 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs font-mono text-[var(--bos-text-primary)] placeholder-[var(--bos-text-tertiary)] focus:outline-none focus:border-[var(--bos-accent)]"
                  />
                  <LinkIcon className="w-3.5 h-3.5 text-[var(--bos-text-tertiary)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {/* KNOWN ISSUES (Optional) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-[var(--bos-text-secondary)] uppercase">
              Known Issues (Optional)
            </label>
            <input
              type="text"
              value={knownIssues}
              onChange={(e) => setKnownIssues(e.target.value)}
              placeholder="e.g. Minor edge-case animation latency on mobile Safari..."
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs font-mono text-[var(--bos-text-primary)] placeholder-[var(--bos-text-tertiary)] focus:outline-none"
            />
          </div>

          {/* COMMENTS (Optional) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-[var(--bos-text-secondary)] uppercase">
              Reviewer Notes / Comments (Optional)
            </label>
            <input
              type="text"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="e.g. Unit tests in /tests/components/listing.spec.ts pass 100%..."
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] text-xs font-mono text-[var(--bos-text-primary)] placeholder-[var(--bos-text-tertiary)] focus:outline-none"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3 font-mono text-xs border-t border-[var(--bos-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[var(--bos-border)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isUploadingFile}
              className="px-5 py-2.5 rounded-xl bg-[var(--bos-accent)] text-white font-bold hover:brightness-110 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-[var(--bos-accent)]/20"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Proof...</span>
                </>
              ) : isUploadingFile ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading File...</span>
                </>
              ) : (
                <>
                  <span>{isResubmitting ? "Fix & Resubmit Proof" : "Submit for Review"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
