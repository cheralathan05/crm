/* ────────────────────────────────────────────────────────────────
   PUBLIC REQUIREMENT WORKSPACE — SHARED TYPES
   Mirrors the serialized bundle from serializePublicRequest. Kept in
   one place so the shell, panels and admin surfaces agree on shape.
──────────────────────────────────────────────────────────────── */

export type PublicRequest = {
  reference: string;
  title: string;
  projectType: string;
  status: string;
  revision: number;
  companyName: string;
  currentSection: string;
  completeness: number;
  readiness: number;
  submittedAt: string | null;
  canEdit: boolean;
};

export type PublicFeature = {
  id: string;
  name: string;
  priority: string;
  users: string[];
  description: string;
  config: Record<string, unknown>;
  acceptanceCriteria: string[];
  dependencies: string[];
};

export type PublicAttachment = {
  id: string;
  name: string;
  size: number;
  mime: string;
  section: string;
  createdAt: string;
};

export type PublicComment = {
  id: string;
  author: string;
  authorName: string;
  section: string | null;
  message: string;
  createdAt: string;
};

export type PublicContact = {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
};

export type PublicBundle = {
  ok: true;
  request: PublicRequest;
  answers: Record<string, Record<string, unknown>>;
  features: PublicFeature[];
  attachments: PublicAttachment[];
  contacts: PublicContact[];
  comments: PublicComment[];
  states: Record<string, boolean>;
  hasOpenChanges: boolean;
  openChange: { id: string; section: string | null; message: string; createdAt: string } | null;
  responder: { name: string | null; role: string | null; email: string | null };
};

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "offline";
