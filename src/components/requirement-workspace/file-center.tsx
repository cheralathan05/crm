"use client";

import { useCallback, useRef, useState } from "react";
import { Check, Download, FileStack, Loader2, Trash2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicAttachment } from "./types";

const ACCEPT_LABEL = "PDF, DOCX, XLSX, PPTX, PNG, JPG, WEBP, SVG, ZIP, TXT, CSV";

/* ────────────────────────────────────────────────────────────────
   PROJECT MATERIALS — FILE CENTER
   Drag & drop or browse. Every upload shows real progress and an
   honest success/error state. Rows display name, size and time.
   Downloads go through the token-verified route only.
──────────────────────────────────────────────────────────────── */

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type UploadItem = {
  id: string;
  name: string;
  progress: number;
  state: "uploading" | "done" | "error";
  error?: string;
};

type Props = {
  token: string;
  attachments: PublicAttachment[];
  onUploaded: (file: PublicAttachment) => void;
  onRemoved: (fileId: string) => void;
  onStateChange: (completeness: number, readiness: number) => void;
};

export function FileCenter({ token, attachments, onUploaded, onRemoved, onStateChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  const setUpload = (id: string, patch: Partial<UploadItem>) =>
    setUploads((list) => list.map((u) => (u.id === id ? { ...u, ...patch } : u)));

  const upload = useCallback(
    (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        const id = `${file.name}-${file.size}-${Date.now()}`;
        setUploads((list) => [...list, { id, name: file.name, progress: 0, state: "uploading" }]);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `/api/public/requirements/${token}/files`);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUpload(id, { progress: Math.round((e.loaded / e.total) * 100) });
          }
        };
        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300 && data.ok) {
              setUpload(id, { state: "done", progress: 100 });
              onUploaded(data.file);
              onStateChange(data.completeness, data.readiness);
            } else {
              setUpload(id, { state: "error", error: data.message ?? "Upload failed." });
            }
          } catch {
            setUpload(id, { state: "error", error: "Upload failed." });
          }
        };
        xhr.onerror = () => setUpload(id, { state: "error", error: "Network error — please retry." });
        xhr.ontimeout = () => setUpload(id, { state: "error", error: "Upload timed out." });
        xhr.timeout = 60_000;

        const form = new FormData();
        form.append("file", file);
        form.append("section", "files");
        xhr.send(form);
      }
    },
    [token, onUploaded, onStateChange],
  );

  const remove = async (fileId: string) => {
    const res = await fetch(`/api/public/requirements/${token}/files/${fileId}`, { method: "DELETE" });
    if (res.ok) {
      onRemoved(fileId);
      const data = await res.json().catch(() => null);
      if (data?.ok) onStateChange(data.completeness, data.readiness);
    }
  };

  const downloadUrl = (fileId: string) => `/api/public/requirement-files/${fileId}?token=${encodeURIComponent(token)}`;

  return (
    <div className="space-y-5">
      {/* Dropzone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload project files"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length > 0) upload(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-sm border-2 border-dashed px-6 py-10 text-center transition-all duration-200 cursor-pointer",
          dragging ? "border-[var(--bos-accent)] bg-[var(--bos-accent-subtle)]" : "border-[var(--bos-border-strong)] hover:border-[var(--bos-accent)] hover:bg-[var(--bos-overlay)]",
        )}
      >
        <UploadCloud className="w-6 h-6 mx-auto text-[var(--bos-text-tertiary)]" aria-hidden="true" />
        <p className="mt-3 text-[14px] font-medium text-[var(--bos-text-primary)]">
          {dragging ? "Drop files to upload" : "Drag & drop files"}
        </p>
        <p className="mt-1 text-[12px] text-[var(--bos-text-tertiary)]">
          or <span className="text-[var(--bos-accent)]">browse files</span>
        </p>
        <p className="mt-3 text-[10px] text-[var(--bos-text-tertiary)]">{ACCEPT_LABEL} · up to 15 MB each</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) upload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* In-flight uploads */}
      {uploads.length > 0 && (
        <ul className="space-y-2" aria-live="polite">
          {uploads.map((u) => (
            <li key={u.id} className="rounded-sm border border-[var(--bos-line-strong)] px-3.5 py-2.5">
              <div className="flex items-center gap-2.5">
                {u.state === "uploading" ? (
                  <Loader2 className="w-4 h-4 text-[var(--bos-accent)] animate-spin shrink-0" aria-hidden="true" />
                ) : u.state === "done" ? (
                  <Check className="w-4 h-4 text-[var(--bos-success)] shrink-0" aria-hidden="true" />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-[var(--bos-error)]/15 shrink-0" aria-hidden="true" />
                )}
                <span className="flex-1 min-w-0 text-[12px] text-[var(--bos-text-primary)] truncate">{u.name}</span>
                <span className={cn("text-[11px] tabular-nums", u.state === "error" ? "text-[var(--bos-error)]" : "text-[var(--bos-text-tertiary)]")}>
                  {u.state === "uploading" ? `${u.progress}%` : u.state === "done" ? "Uploaded" : "Failed"}
                </span>
              </div>
              {u.state === "uploading" && (
                <div className="mt-2 h-1 rounded-full bg-[var(--bos-overlay)] overflow-hidden">
                  <div className="h-full bg-[var(--bos-accent)] transition-[width] duration-200" style={{ width: `${u.progress}%` }} />
                </div>
              )}
              {u.state === "error" && u.error && <p className="mt-1.5 text-[11px] text-[var(--bos-error)]">{u.error}</p>}
            </li>
          ))}
        </ul>
      )}

      {/* Existing files */}
      {attachments.length > 0 && (
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--bos-text-tertiary)] mb-2">
            {attachments.length} uploaded file{attachments.length === 1 ? "" : "s"}
          </div>
          <ul className="space-y-1.5">
            {attachments.map((a) => (
              <li key={a.id} className="group flex items-center gap-3 rounded-sm border border-[var(--bos-line-strong)] px-3.5 py-2.5">
                <span className="flex items-center justify-center w-8 h-8 rounded-sm bg-[var(--bos-overlay)] text-[var(--bos-text-tertiary)] shrink-0">
                  <FileStack className="w-4 h-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-[var(--bos-text-primary)] truncate">{a.name}</div>
                  <div className="flex items-center gap-2 text-[10px] text-[var(--bos-text-tertiary)]">
                    <span>{formatSize(a.size)}</span>
                    <span aria-hidden="true">·</span>
                    <span>Uploaded {timeAgo(a.createdAt)}</span>
                    <span className="inline-flex items-center gap-1 text-[var(--bos-success)]">
                      <Check className="w-3 h-3" aria-hidden="true" /> Uploaded
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
                  <a
                    href={downloadUrl(a.id)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Download ${a.name}`}
                    className="flex items-center justify-center w-8 h-8 rounded-sm text-[var(--bos-text-tertiary)] hover:text-[var(--bos-accent)] hover:bg-[var(--bos-overlay)] transition-colors duration-150"
                  >
                    <Download className="w-4 h-4" aria-hidden="true" />
                  </a>
                  <button
                    type="button"
                    onClick={() => void remove(a.id)}
                    aria-label={`Remove ${a.name}`}
                    className="flex items-center justify-center w-8 h-8 rounded-sm text-[var(--bos-text-tertiary)] hover:text-[var(--bos-error)] hover:bg-[var(--bos-overlay)] transition-colors duration-150"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
