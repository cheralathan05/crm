import { mkdir, writeFile, readFile, unlink, stat } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";

/* ────────────────────────────────────────────────────────────────
   REQUIREMENT WORKSPACE — SAFE FILE STORAGE
   Files are stored on local disk under <root>/uploads/<requestId>/,
   outside the database, and served only through a token-verified
   route handler. Names on disk are random — the friendly name lives
   in the database. MIME types and sizes are validated server-side.
──────────────────────────────────────────────────────────────── */

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

const ALLOWED_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "text/plain": ".txt",
  "text/csv": ".csv",
  "application/zip": ".zip",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "application/octet-stream": ".bin",
  "application/figma": ".fig",
};

export const ACCEPTED_MIME = Object.keys(ALLOWED_MIME);
export const ACCEPT_LABEL = "PDF, DOCX, XLSX, PPTX, PNG, JPG, WEBP, SVG, ZIP, TXT, CSV";

export function uploadsRoot(): string {
  return path.join(process.cwd(), "uploads");
}

function requestDir(requestId: string): string {
  return path.join(uploadsRoot(), requestId);
}

/** Server-side validation — the browser's hints are never trusted. */
export function validateUpload(file: { name: string; type: string; size: number }): string | null {
  if (file.size <= 0) return "Empty files cannot be uploaded.";
  if (file.size > MAX_BYTES) return "File exceeds the 15 MB limit.";
  if (!ALLOWED_MIME[file.type]) return `File type "${file.type || "unknown"}" is not supported.`;
  return null;
}

export function extensionFor(mime: string): string {
  return ALLOWED_MIME[mime] ?? ".bin";
}

/** Persist bytes to disk; returns the stored path (relative to uploads root). */
export async function storeUpload(
  requestId: string,
  file: { name: string; type: string; size: number; buffer: Buffer },
): Promise<{ storedPath: string; size: number }> {
  const error = validateUpload(file);
  if (error) throw new Error(error);

  const dir = requestDir(requestId);
  await mkdir(dir, { recursive: true });

  const randomName = `${Date.now().toString(36)}-${randomUUID().slice(0, 12)}${extensionFor(file.type)}`;
  const storedPath = path.join(requestId, randomName);
  await writeFile(path.join(dir, randomName), file.buffer, { flag: "wx" });

  return { storedPath: storedPath.replace(/\\/g, "/"), size: file.size };
}

/** Read a stored file back off disk. Returns null if missing. */
export async function readStored(storedPath: string): Promise<{ buffer: Buffer; size: number } | null> {
  // Never allow traversal outside the uploads root.
  const safe = path.normalize(storedPath).replace(/^([.][.][/\\])+/, "");
  const full = path.join(uploadsRoot(), safe);
  if (!full.startsWith(path.resolve(uploadsRoot()))) return null;
  try {
    const buffer = await readFile(full);
    const { size } = await stat(full);
    return { buffer, size };
  } catch {
    return null;
  }
}

export async function deleteStored(storedPath: string): Promise<void> {
  const safe = path.normalize(storedPath).replace(/^([.][.][/\\])+/, "");
  const full = path.join(uploadsRoot(), safe);
  if (!full.startsWith(path.resolve(uploadsRoot()))) return;
  await unlink(full).catch(() => undefined);
}

/** Deterministic id for a file — used to fingerprint duplicates client-side. */
export function fingerprint(buffer: Buffer): string {
  return createHash("sha1").update(buffer).digest("hex");
}
