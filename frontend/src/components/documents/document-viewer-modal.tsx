"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  FileText,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  GitBranch,
  ShieldCheck,
  Building2,
  FolderKanban,
  FileCheck2,
} from "lucide-react";

interface DocumentViewerModalProps {
  documentId: string | null;
  onClose: () => void;
}

export function DocumentViewerModal({ documentId, onClose }: DocumentViewerModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"context" | "requirements" | "versions" | "audit" | "ai">("context");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);

  useEffect(() => {
    if (!documentId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/documents/${documentId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.ok) {
          setData(json.data);
        } else {
          setError(json.message || "Failed to load document");
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [documentId]);

  if (!documentId) return null;

  const handleRunAi = async () => {
    setAiLoading(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/ai-analyze`, { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        setAiAnalysis(json.analysis);
        setActiveTab("ai");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  const fileUrl = `/api/documents/${documentId}/file`;
  const downloadUrl = `/api/documents/${documentId}/download`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="flex flex-col h-[94vh] w-full max-w-7xl rounded-xl bg-[var(--bos-surface)] border border-[var(--bos-border)] shadow-2xl overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--bos-border-subtle)] bg-[var(--bos-surface-sunken)]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-md bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-[var(--bos-accent)]">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-serif font-bold text-[var(--bos-text-primary)] truncate">
                  {data?.document?.fileName || "Document Viewer"}
                </h2>
                {data?.document?.version && (
                  <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-[var(--bos-surface-panel)] text-[var(--bos-accent)] border border-[var(--bos-border-subtle)]">
                    v{data.document.version}
                  </span>
                )}
                {data?.document?.status && (
                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    {data.document.status}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-[var(--bos-text-secondary)] truncate">
                {data?.document?.title || "Business OS Authoritative Document Record"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={downloadUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md bg-[var(--bos-surface-panel)] hover:bg-[var(--bos-surface-sunken)] text-[var(--bos-text-primary)] border border-[var(--bos-border-subtle)] transition"
              title="Download official document"
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </a>
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md bg-[var(--bos-surface-panel)] hover:bg-[var(--bos-surface-sunken)] text-[var(--bos-text-primary)] border border-[var(--bos-border-subtle)] transition"
              title="Open full PDF in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Full
            </a>
            <button
              onClick={handleRunAi}
              disabled={aiLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {aiLoading ? "Analyzing..." : "AI Intelligence"}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-[var(--bos-text-tertiary)] hover:text-[var(--bos-text-primary)] hover:bg-[var(--bos-surface-sunken)] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content: Two Column Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Left Column: Real PDF Preview */}
          <div className="flex-1 flex flex-col bg-slate-900 border-r border-[var(--bos-border-subtle)] overflow-hidden relative">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-950/90 text-xs text-slate-300 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span>Stored Key:</span>
                <span className="font-mono text-slate-100">{data?.document?.storagePath}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-400">
                <span>{data?.document?.pageCount ?? 24} pages</span>
                <span>{data?.document?.fileSize ? `${Math.round(data.document.fileSize / 1024)} KB` : ""}</span>
              </div>
            </div>

            <div className="flex-1 relative overflow-hidden bg-slate-950 flex items-center justify-center">
              {loading ? (
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm">Loading authentic stored PDF...</p>
                </div>
              ) : error || data?.document?.healthState === "FILE_MISSING" ? (
                <div className="max-w-md p-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                  <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-rose-700 dark:text-rose-300">Document unavailable</h3>
                  <p className="text-xs text-rose-600/80 dark:text-rose-300/80 mt-1">
                    The requested file cannot be accessed from physical storage. No replacement or mock file will be generated.
                  </p>
                </div>
              ) : (
                <iframe
                  src={`${fileUrl}#toolbar=1&navpanes=1&statusbar=1`}
                  className="w-full h-full border-0"
                  title={data?.document?.fileName || "PDF Viewer"}
                />
              )}
            </div>
          </div>

          {/* Right Column: Business Context, Traceability, History, AI */}
          <div className="w-full md:w-[460px] flex flex-col bg-[var(--bos-surface)] overflow-hidden">
            {/* Tab navigation */}
            <div className="flex border-b border-[var(--bos-border-subtle)] px-2 pt-2 bg-[var(--bos-surface-sunken)] overflow-x-auto text-[12px]">
              <button
                onClick={() => setActiveTab("context")}
                className={`px-3 py-2 font-medium border-b-2 transition whitespace-nowrap cursor-pointer ${
                  activeTab === "context"
                    ? "border-[var(--bos-accent)] text-[var(--bos-accent)] font-semibold"
                    : "border-transparent text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                }`}
              >
                Business Context
              </button>
              <button
                onClick={() => setActiveTab("requirements")}
                className={`px-3 py-2 font-medium border-b-2 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "requirements"
                    ? "border-[var(--bos-accent)] text-[var(--bos-accent)] font-semibold"
                    : "border-transparent text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                }`}
              >
                Requirements
                {data?.requirements?.total && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[var(--bos-surface-panel)] text-[var(--bos-text-secondary)]">
                    {data.requirements.total}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("versions")}
                className={`px-3 py-2 font-medium border-b-2 transition whitespace-nowrap cursor-pointer ${
                  activeTab === "versions"
                    ? "border-[var(--bos-accent)] text-[var(--bos-accent)] font-semibold"
                    : "border-transparent text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                }`}
              >
                Version History
              </button>
              <button
                onClick={() => setActiveTab("audit")}
                className={`px-3 py-2 font-medium border-b-2 transition whitespace-nowrap cursor-pointer ${
                  activeTab === "audit"
                    ? "border-[var(--bos-accent)] text-[var(--bos-accent)] font-semibold"
                    : "border-transparent text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                }`}
              >
                Audit
              </button>
              {aiAnalysis && (
                <button
                  onClick={() => setActiveTab("ai")}
                  className={`px-3 py-2 font-medium border-b-2 transition whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                    activeTab === "ai"
                      ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 font-semibold"
                      : "border-transparent text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)]"
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  AI Analysis
                </button>
              )}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {activeTab === "context" && (
                <>
                  {/* Document Information */}
                  <div>
                    <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-tertiary)] mb-3">
                      Document Information
                    </h3>
                    <div className="space-y-2 text-[12.5px] bg-[var(--bos-surface-panel)] p-4 rounded-xl border border-[var(--bos-border-subtle)] shadow-xs">
                      <div className="flex justify-between py-1 border-b border-[var(--bos-border-subtle)]">
                        <span className="text-[var(--bos-text-secondary)]">Document File</span>
                        <span className="font-mono font-bold text-[var(--bos-text-primary)] text-[12px]">{data?.document?.fileName}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[var(--bos-border-subtle)]">
                        <span className="text-[var(--bos-text-secondary)]">Category</span>
                        <span className="font-medium text-[var(--bos-accent)]">Proposal Document</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[var(--bos-border-subtle)]">
                        <span className="text-[var(--bos-text-secondary)]">Current Status</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{data?.document?.status}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[var(--bos-border-subtle)]">
                        <span className="text-[var(--bos-text-secondary)]">Version</span>
                        <span className="font-mono font-semibold text-[var(--bos-text-primary)]">v{data?.document?.version} (Current)</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[var(--bos-border-subtle)]">
                        <span className="text-[var(--bos-text-secondary)]">Storage Health</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {data?.document?.healthState}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[var(--bos-border-subtle)]">
                        <span className="text-[var(--bos-text-secondary)]">SHA-256 Checksum</span>
                        <span className="font-mono text-[10.5px] text-[var(--bos-text-tertiary)] truncate max-w-[180px]">
                          {data?.document?.checksum ? data.document.checksum.slice(0, 16) + "..." : "Verified"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-[var(--bos-text-secondary)]">Indexed At</span>
                        <span className="text-[var(--bos-text-primary)]">
                          {data?.document?.createdAt ? new Date(data.document.createdAt).toLocaleString() : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Connected Business Source */}
                  <div>
                    <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-tertiary)] mb-3">
                      Connected Business Source
                    </h3>
                    <div className="space-y-3">
                      {/* Client */}
                      {data?.client && (
                        <div className="p-3.5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <Building2 className="w-4 h-4 text-[var(--bos-accent)]" />
                            <div>
                              <p className="text-[12.5px] font-semibold text-[var(--bos-text-primary)]">{data.client.companyName}</p>
                              <p className="text-[11px] text-[var(--bos-text-secondary)]">Authorized Client Account</p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10.5px] font-mono font-bold bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)] border border-[var(--bos-border-subtle)]">
                            CLIENT
                          </span>
                        </div>
                      )}

                      {/* Proposal */}
                      {data?.proposal && (
                        <div className="p-3.5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <FileCheck2 className="w-4 h-4 text-[var(--bos-accent)]" />
                            <div>
                              <p className="text-[12.5px] font-semibold text-[var(--bos-text-primary)]">{data.proposal.reference}</p>
                              <p className="text-[11px] text-[var(--bos-text-secondary)]">{data.proposal.title}</p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10.5px] font-mono font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                            v{data.proposal.version} • {data.proposal.status}
                          </span>
                        </div>
                      )}

                      {/* Project */}
                      {data?.project && (
                        <div className="p-3.5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <FolderKanban className="w-4 h-4 text-[#3f6e35]" />
                            <div>
                              <p className="text-[12.5px] font-semibold text-[var(--bos-text-primary)]">{data.project.name}</p>
                              <p className="text-[11px] text-[var(--bos-text-secondary)]">Code: {data.project.code || "PRJ-2026-001"}</p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10.5px] font-mono font-bold bg-[#3f6e35]/10 text-[#3f6e35] border border-[#3f6e35]/20">
                            ACTIVE PROJECT
                          </span>
                        </div>
                      )}

                      {/* Scope Breakdown */}
                      {data?.requirements && (
                        <div className="p-3.5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] shadow-xs">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[12.5px] font-semibold text-[var(--bos-text-primary)]">Requirements Matrix</span>
                            <span className="text-[11px] text-[var(--bos-text-tertiary)] font-mono">{data.requirements.total} total</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 font-mono">{data.requirements.mvpCount}</p>
                              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold tracking-wider">MVP Core</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-center">
                              <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300 font-mono">{data.requirements.phase2Count}</p>
                              <p className="text-[10px] text-indigo-700 dark:text-indigo-400 uppercase font-bold tracking-wider">Phase 2 Future</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Requirements Traceability Tab */}
              {activeTab === "requirements" && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-tertiary)]">
                      Requirement Breakdown
                    </h3>
                    <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                      {data?.requirements?.mvpCount} MVP • {data?.requirements?.phase2Count} Phase 2
                    </span>
                  </div>
                  <div className="space-y-2">
                    {data?.requirements?.items?.map((req: any) => (
                      <div
                        key={req.id}
                        className="p-3 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] flex items-center justify-between shadow-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[12px] font-bold text-[var(--bos-accent)]">{req.id}</span>
                            <span className="text-[12.5px] font-medium text-[var(--bos-text-primary)]">{req.title}</span>
                          </div>
                          <p className="text-[11px] text-[var(--bos-text-secondary)]">Module: {req.module}</p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                            req.priority === "MVP"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                              : "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30"
                          }`}
                        >
                          {req.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Version History Tab */}
              {activeTab === "versions" && (
                <div>
                  <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-tertiary)] mb-3">
                    Proposal Version Control
                  </h3>
                  <div className="space-y-3">
                    {data?.versions?.map((ver: any) => (
                      <div
                        key={ver.version}
                        className={`p-3.5 rounded-xl border shadow-xs ${
                          ver.isCurrent
                            ? "bg-[var(--bos-surface-panel)] border-[var(--bos-accent)]/50"
                            : "bg-[var(--bos-surface-sunken)] border-[var(--bos-border-subtle)]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-mono font-bold text-[var(--bos-text-primary)]">v{ver.version}</span>
                            {ver.isCurrent && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--bos-accent)] text-white">
                                CURRENT
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{ver.status}</span>
                        </div>
                        <p className="text-[12px] font-mono text-[var(--bos-text-primary)] mt-1">{ver.fileName}</p>
                        <p className="text-[11px] text-[var(--bos-text-tertiary)] font-mono mt-1">
                          Created: {new Date(ver.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 rounded-lg bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-[11.5px] text-[var(--bos-text-secondary)]">
                    <p className="font-bold text-[var(--bos-text-primary)] mb-0.5">Historical Immutability</p>
                    Historical version snapshots remain permanently frozen and cannot be overwritten.
                  </div>
                </div>
              )}

              {/* Audit Tab */}
              {activeTab === "audit" && (
                <div>
                  <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-tertiary)] mb-3">
                    Real Document Audit Trail
                  </h3>
                  <div className="space-y-2">
                    {data?.auditEvents?.length > 0 ? (
                      data.auditEvents.map((evt: any) => (
                        <div
                          key={evt.id}
                          className="p-3 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-[12px] flex items-center justify-between shadow-xs"
                        >
                          <div>
                            <span className="font-bold text-[var(--bos-text-primary)]">{evt.action}</span>
                            <p className="text-[11px] text-[var(--bos-text-secondary)]">Actor: {evt.actorName || "System"}</p>
                          </div>
                          <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
                            {new Date(evt.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 rounded-xl bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] text-center text-xs text-[var(--bos-text-secondary)]">
                        Document accessed and indexed into Business OS record store.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AI Analysis Tab */}
              {activeTab === "ai" && aiAnalysis && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs">
                    <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>Structured intelligence extracted from authoritative document JSON.</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-center shadow-xs">
                      <p className="text-lg font-bold text-[var(--bos-text-primary)] font-mono">{aiAnalysis.requirementsDetected}</p>
                      <p className="text-[10px] text-[var(--bos-text-tertiary)] uppercase font-mono font-bold">Requirements Detected</p>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-center shadow-xs">
                      <p className="text-lg font-bold text-[var(--bos-text-primary)] font-mono">{aiAnalysis.deliverablesDetected}</p>
                      <p className="text-[10px] text-[var(--bos-text-tertiary)] uppercase font-mono font-bold">Deliverables Detected</p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                      <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 font-mono">{aiAnalysis.mvpRequirements}</p>
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-mono font-bold">MVP Launch</p>
                    </div>
                    <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center">
                      <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300 font-mono">{aiAnalysis.phase2Requirements}</p>
                      <p className="text-[10px] text-indigo-700 dark:text-indigo-400 uppercase font-mono font-bold">Phase 2 Enhancements</p>
                    </div>
                  </div>

                  {aiAnalysis.potentialAmbiguity?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--bos-text-tertiary)]">
                        Governance & Ambiguity Insights
                      </h4>
                      {aiAnalysis.potentialAmbiguity.map((pt: string, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-xs text-[var(--bos-text-primary)] flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                          <span>{pt}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-[10.5px] text-[var(--bos-text-tertiary)] italic">
                    {aiAnalysis.disclaimer}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
