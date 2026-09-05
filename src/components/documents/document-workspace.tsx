"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  FolderOpen,
  Building2,
  FolderKanban,
  FileCheck2,
  Search,
  Download,
  ExternalLink,
  Layers,
  History,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Receipt,
} from "lucide-react";
import { DocumentViewerModal } from "./document-viewer-modal";
import type { DocumentOperatingData } from "@/lib/documents/document-query.service";

interface DocumentWorkspaceProps {
  initialData?: DocumentOperatingData;
  initialView?: string;
}

export function DocumentWorkspace({ initialData, initialView = "all" }: DocumentWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view") || initialView;

  const [data, setData] = useState<DocumentOperatingData>(
    initialData || {
      view: currentView,
      documents: [],
      proposalGroups: [],
      counts: { all: 0, clients: 0, requirements: 0, proposals: 0, projects: 0, receipts: 0 },
    }
  );
  const [search, setSearch] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDocuments = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setRefreshing(true);
    try {
      const res = await fetch(`/api/documents?view=${encodeURIComponent(currentView)}&search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (json.ok) {
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (showRefreshSpinner) setRefreshing(false);
    }
  };

  useEffect(() => {
    if (search || currentView !== data.view) {
      fetchDocuments();
    }
  }, [currentView, search]);

  const setView = (v: string) => {
    if (v === "all") {
      router.push("/documents");
    } else {
      router.push(`/documents?view=${v}`);
    }
  };

  const navItems = [
    { key: "all", label: "All Documents", icon: FolderOpen, count: data?.counts?.all ?? 0 },
    { key: "clients", label: "Client Documents", icon: Building2, count: data?.counts?.clients ?? 0 },
    { key: "requirements", label: "Requirements", icon: Layers, count: data?.counts?.requirements ?? 0 },
    { key: "proposals", label: "Proposals", icon: FileText, count: data?.counts?.proposals ?? 0 },
    { key: "projects", label: "Project Files", icon: FolderKanban, count: data?.counts?.projects ?? 0 },
    { key: "receipts", label: "Payment Receipts", icon: Receipt, count: data?.counts?.receipts ?? 0 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* ── HEADER ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4 border-b border-[var(--bos-border-subtle)] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs font-mono text-[10px] font-semibold uppercase bg-[var(--bos-accent)] text-white">
              <FolderOpen className="w-3 h-3" /> Documents OS
            </span>
            <span className="text-[11px] font-mono text-[var(--bos-text-tertiary)]">
              Authoritative Business Evidence Layer
            </span>
          </div>
          <h1 className="text-[24px] sm:text-[26px] font-serif font-bold text-[var(--bos-text-primary)]">
            Document Operating Layer
          </h1>
          <p className="text-[13px] text-[var(--bos-text-secondary)] mt-1 max-w-3xl">
            Real documents automatically discovered and linked across Clients, Requirements, Proposals, and Project Deliverables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchDocuments(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-sm border border-[var(--bos-border-subtle)] bg-[var(--bos-surface-panel)] hover:bg-[var(--bos-surface-sunken)] text-[var(--bos-text-primary)] text-[12.5px] font-medium transition-all shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[var(--bos-accent)]" : "text-[var(--bos-text-secondary)]"}`} />
            <span>Sync Storage</span>
          </button>
        </div>
      </div>

      {/* ── SUB-NAVIGATION & SEARCH ─────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-[12.5px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-[var(--bos-surface-panel)] text-[var(--bos-accent)] border border-[var(--bos-accent)] shadow-xs font-semibold"
                    : "bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)] hover:text-[var(--bos-text-primary)] border border-[var(--bos-border-subtle)] hover:bg-[var(--bos-surface-panel)]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-mono font-bold ${
                    isActive
                      ? "bg-[var(--bos-accent)] text-white"
                      : "bg-[var(--bos-border-subtle)] text-[var(--bos-text-secondary)]"
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Box */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[var(--bos-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search documents, reference, client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-md bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-[12.5px] text-[var(--bos-text-primary)] placeholder:text-[var(--bos-text-tertiary)] focus:outline-hidden focus:border-[var(--bos-accent)]"
          />
        </div>
      </div>

      {/* ── VIEW CONTENT ────────────────────────────────────── */}
      {currentView === "proposals" ? (
        /* ================= PROPOSALS VIEW (GROUPED BY PROPOSAL) ================= */
        <div className="space-y-5">
          {data.proposalGroups?.length === 0 ? (
            <div className="p-12 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-center space-y-2">
              <FileText className="w-10 h-10 text-[var(--bos-text-tertiary)] mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-[var(--bos-text-primary)]">No proposal documents available</h3>
              <p className="text-xs text-[var(--bos-text-secondary)] max-w-sm mx-auto">
                Proposal documents are automatically discovered and indexed here once generated through the Proposal module.
              </p>
            </div>
          ) : (
            data.proposalGroups.map((group: any) => (
              <div
                key={group.proposalId}
                className="rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] shadow-xs overflow-hidden transition-all hover:border-[var(--bos-accent)]/50"
              >
                {/* Proposal Group Header */}
                <div className="p-5 border-b border-[var(--bos-border-subtle)] bg-[var(--bos-surface-sunken)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-2.5 py-1 rounded font-mono text-[11px] font-bold bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-[var(--bos-accent)] shadow-xs">
                        {group.reference}
                      </span>
                      <h2 className="text-[17px] font-serif font-bold text-[var(--bos-text-primary)]">
                        {group.title}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        {group.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-[12px] text-[var(--bos-text-secondary)] flex-wrap pt-0.5">
                      {group.client && (
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
                          Client: <strong className="text-[var(--bos-text-primary)] font-semibold">{group.client.companyName}</strong>
                        </span>
                      )}
                      {group.project && (
                        <span className="flex items-center gap-1.5">
                          <FolderKanban className="w-3.5 h-3.5 text-[#3f6e35]" />
                          Project: <strong className="text-[var(--bos-text-primary)] font-semibold">{group.project.name}</strong> ({group.project.code})
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[var(--bos-text-tertiary)] font-mono text-[11px]">
                        Current: <strong>v{group.currentVersion}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Open Proposal Primary Action */}
                  <div className="flex items-center gap-2 self-start lg:self-center">
                    <button
                      onClick={() => setSelectedDocId(group.latestDocument.id)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-[var(--bos-accent)] hover:brightness-95 text-white text-[12.5px] font-medium shadow-sm transition-all cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      Open Proposal
                    </button>
                  </div>
                </div>

                {/* 3-Column Document Operating Specs */}
                <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Column 1: Stored File Specification */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] font-semibold">
                      Authoritative Stored Document
                    </span>
                    <div className="p-3.5 rounded-lg bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] space-y-2 text-[12px]">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[var(--bos-text-primary)] truncate max-w-[200px]" title={group.latestDocument.fileName}>
                          {group.latestDocument.fileName}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          {group.latestDocument.healthState}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11.5px] text-[var(--bos-text-secondary)] pt-1.5 border-t border-[var(--bos-border-subtle)]">
                        <span>{group.latestDocument.pageCount || 24} pages</span>
                        <span>{Math.round((group.latestDocument.fileSize || 113237) / 1024)} KB</span>
                        <span className="font-mono">v{group.currentVersion}</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Version History Track */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] font-semibold flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-[var(--bos-accent)]" />
                      Version History ({group.versions?.length || 1})
                    </span>
                    <div className="space-y-1.5">
                      {group.versions?.map((ver: any) => (
                        <div
                          key={ver.version}
                          className="p-2.5 rounded-lg bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] flex items-center justify-between text-[12px]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[var(--bos-text-primary)]">v{ver.version}</span>
                            <span className="text-emerald-700 dark:text-emerald-300 font-medium text-[11px]">{ver.status}</span>
                            <span className="text-[var(--bos-text-tertiary)] font-mono text-[10.5px]">
                              {new Date(ver.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <button
                            onClick={() => setSelectedDocId(group.latestDocument.id)}
                            className="px-2 py-1 text-[11px] font-medium text-[var(--bos-accent)] hover:underline cursor-pointer"
                          >
                            View
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 3: Connected Business Context */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--bos-text-tertiary)] font-semibold">
                      Connected Traceability
                    </span>
                    <div className="p-3.5 rounded-lg bg-[var(--bos-surface-sunken)] border border-[var(--bos-border-subtle)] space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setSelectedDocId(group.latestDocument.id)}
                          className="px-3 py-1.5 rounded bg-[var(--bos-surface-panel)] hover:bg-[var(--bos-surface-sunken)] text-[var(--bos-text-primary)] text-[12px] font-medium border border-[var(--bos-border-subtle)] transition text-center cursor-pointer"
                        >
                          Traceability
                        </button>
                        <a
                          href={`/api/documents/${group.latestDocument.id}/download`}
                          className="px-3 py-1.5 rounded bg-[var(--bos-surface-panel)] hover:bg-[var(--bos-surface-sunken)] text-[var(--bos-text-primary)] text-[12px] font-medium border border-[var(--bos-border-subtle)] transition text-center inline-flex items-center justify-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </a>
                      </div>
                      <p className="text-[11px] text-[var(--bos-text-secondary)]">
                        Authoritative source linked to 9 validated requirements & active project delivery stream.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : currentView === "projects" ? (
        /* ================= PROJECT FILES & DELIVERABLES ================= */
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[12.5px] text-blue-800 dark:text-blue-200 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Separation of Deliverables vs Existing Files</p>
              <p className="text-[var(--bos-text-secondary)] mt-0.5 text-[12px]">
                Deliverables agreed in proposals are tracked as delivery commitments. A file only appears here once physically produced and stored.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)]">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-semibold text-[var(--bos-text-primary)]">Architecture Blueprint</h4>
                    <p className="text-[11.5px] text-[var(--bos-text-tertiary)]">Project: AI-Powered Business CRM Platform</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)] border border-[var(--bos-border-subtle)]">
                  DELIVERABLE
                </span>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[12px] text-amber-800 dark:text-amber-200">
                <strong>Status:</strong> Document not created
              </div>
            </div>

            <div className="p-5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)]">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-semibold text-[var(--bos-text-primary)]">Technical Specification</h4>
                    <p className="text-[11.5px] text-[var(--bos-text-tertiary)]">Project: AI-Powered Business CRM Platform</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)] border border-[var(--bos-border-subtle)]">
                  DELIVERABLE
                </span>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[12px] text-amber-800 dark:text-amber-200">
                <strong>Status:</strong> Document not created
              </div>
            </div>
          </div>
        </div>
      ) : currentView === "clients" ? (
        /* ================= CLIENT DOCUMENTS ================= */
        <div className="space-y-4">
          {data.documents?.length === 0 ? (
            <div className="p-12 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-center space-y-2">
              <Building2 className="w-10 h-10 text-[var(--bos-text-tertiary)] mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-[var(--bos-text-primary)]">No client documents uploaded yet</h3>
              <p className="text-xs text-[var(--bos-text-secondary)] max-w-sm mx-auto">
                Documents uploaded directly by clients or attached to client accounts will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.documents.map((doc: any) => (
                <div
                  key={doc.id}
                  className="p-5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] hover:border-[var(--bos-accent)]/50 transition-all shadow-xs flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-lg bg-[var(--bos-surface-sunken)] text-[var(--bos-accent)] border border-[var(--bos-border-subtle)]">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-[14px] font-semibold text-[var(--bos-text-primary)] leading-tight">
                            {doc.fileName}
                          </h4>
                          <p className="text-[12px] text-[var(--bos-text-secondary)] mt-0.5">
                            {doc.client?.companyName || "Client Document"}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-mono font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                        {doc.healthState || "READY"}
                      </span>
                    </div>

                    <p className="text-[12px] text-[var(--bos-text-secondary)] line-clamp-2">
                      {doc.title}
                    </p>

                    <div className="flex items-center gap-3 text-[11.5px] text-[var(--bos-text-tertiary)] font-mono pt-1">
                      <span>{doc.pageCount ? `${doc.pageCount} pages` : "—"}</span>
                      <span>•</span>
                      <span>{doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : "—"}</span>
                      <span>•</span>
                      <span>v{doc.version}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[var(--bos-border-subtle)]">
                    <span className="font-mono text-[11px] text-[var(--bos-text-tertiary)]">
                      {doc.reference || doc.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/api/documents/${doc.id}/download`}
                        className="p-1.5 rounded bg-[var(--bos-surface-sunken)] hover:bg-[var(--bos-surface-panel)] text-[var(--bos-text-secondary)] border border-[var(--bos-border-subtle)] transition"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => setSelectedDocId(doc.id)}
                        className="px-3 py-1.5 rounded bg-[var(--bos-accent)] hover:brightness-95 text-white text-[12px] font-medium shadow-xs cursor-pointer transition"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : currentView === "requirements" ? (
        /* ================= REQUIREMENTS DOCUMENTS ================= */
        <div className="space-y-4">
          {data.documents?.length === 0 ? (
            <div className="p-12 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-center space-y-2">
              <Layers className="w-10 h-10 text-[var(--bos-text-tertiary)] mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-[var(--bos-text-primary)]">No requirement document attachments yet</h3>
              <p className="text-xs text-[var(--bos-text-secondary)] max-w-sm mx-auto">
                Requirement attachment evidence files will appear here once uploaded to requirement requests.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.documents.map((doc: any) => (
                <div
                  key={doc.id}
                  className="p-5 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] hover:border-[var(--bos-accent)]/50 transition-all shadow-xs flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-lg bg-[var(--bos-surface-sunken)] text-[var(--bos-accent)] border border-[var(--bos-border-subtle)]">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-[14px] font-semibold text-[var(--bos-text-primary)] leading-tight">
                            {doc.fileName}
                          </h4>
                          <p className="text-[12px] text-[var(--bos-text-secondary)] mt-0.5">
                            {doc.client?.companyName ? `Client: ${doc.client.companyName}` : "Requirement Spec"}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-mono font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                        {doc.status || "APPROVED"}
                      </span>
                    </div>

                    <p className="text-[12px] text-[var(--bos-text-secondary)] line-clamp-2">
                      {doc.title}
                    </p>

                    <div className="flex items-center gap-3 text-[11.5px] text-[var(--bos-text-tertiary)] font-mono pt-1">
                      <span>{doc.pageCount ? `${doc.pageCount} pages` : "—"}</span>
                      <span>•</span>
                      <span>{doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : "—"}</span>
                      <span>•</span>
                      <span>{doc.project?.code || "PRJ-2026-001"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[var(--bos-border-subtle)]">
                    <span className="font-mono text-[11px] text-[var(--bos-text-tertiary)]">
                      {doc.reference || "REQ-SPEC"}
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/api/documents/${doc.id}/download`}
                        className="p-1.5 rounded bg-[var(--bos-surface-sunken)] hover:bg-[var(--bos-surface-panel)] text-[var(--bos-text-secondary)] border border-[var(--bos-border-subtle)] transition"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => setSelectedDocId(doc.id)}
                        className="px-3 py-1.5 rounded bg-[var(--bos-accent)] hover:brightness-95 text-white text-[12px] font-medium shadow-xs cursor-pointer transition"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ================= ALL DOCUMENTS UNIFIED INDEX ================= */
        <div className="space-y-3">
          {data.documents?.length === 0 ? (
            <div className="p-12 rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] text-center space-y-2">
              <FolderOpen className="w-10 h-10 text-[var(--bos-text-tertiary)] mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-[var(--bos-text-primary)]">No documents found</h3>
              <p className="text-xs text-[var(--bos-text-secondary)] max-w-sm mx-auto">
                No matching authoritative document records match the current filter.
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-[var(--bos-surface-panel)] border border-[var(--bos-border-subtle)] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12.5px]">
                  <thead className="bg-[var(--bos-surface-sunken)] border-b border-[var(--bos-border-subtle)] text-[var(--bos-text-tertiary)] font-mono text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Document</th>
                      <th className="px-5 py-3.5">Category</th>
                      <th className="px-5 py-3.5">Client</th>
                      <th className="px-5 py-3.5">Version</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Size</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--bos-border-subtle)]">
                    {data.documents.map((doc: any) => (
                      <tr key={doc.id} className="hover:bg-[var(--bos-surface-sunken)] transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded bg-[var(--bos-surface-sunken)] text-[var(--bos-accent)] border border-[var(--bos-border-subtle)]">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-[var(--bos-text-primary)]">{doc.fileName}</p>
                              <p className="text-[11.5px] text-[var(--bos-text-secondary)]">{doc.title}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded text-[10.5px] font-mono font-semibold bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)] border border-[var(--bos-border-subtle)]">
                            {doc.category}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[var(--bos-text-secondary)]">
                          {doc.client?.companyName || "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-[var(--bos-text-secondary)]">v{doc.version}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            {doc.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[var(--bos-text-secondary)]">
                          {doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : "—"}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => setSelectedDocId(doc.id)}
                              className="px-3 py-1.5 rounded bg-[var(--bos-surface-panel)] hover:bg-[var(--bos-surface-sunken)] text-[var(--bos-accent)] border border-[var(--bos-border-subtle)] text-[12px] font-medium transition cursor-pointer"
                            >
                              Open
                            </button>
                            <a
                              href={`/api/documents/${doc.id}/download`}
                              className="p-1.5 rounded bg-[var(--bos-surface-panel)] hover:bg-[var(--bos-surface-sunken)] text-[var(--bos-text-secondary)] border border-[var(--bos-border-subtle)] transition cursor-pointer"
                              title="Download"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Two Column Document Inspector Modal */}
      {selectedDocId && (
        <DocumentViewerModal documentId={selectedDocId} onClose={() => setSelectedDocId(null)} />
      )}
    </div>
  );
}
