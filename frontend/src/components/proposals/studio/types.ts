import type { ProposalDoc } from "@/lib/proposal-doc";
import type { ProposalDeliveryBundle } from "@/lib/proposal-delivery";

/* ────────────────────────────────────────────────────────────────
   SHARED STUDIO TYPES — the contract between the studio orchestrator
   and its panels. Backend is the source of truth; the frontend never
   invents state.
──────────────────────────────────────────────────────────────── */

export type StudioInitial = {
  proposal: {
    id: string;
    title: string;
    amount: number | null;
    currency: string;
    status: string;
    version: number;
    reference: string | null;
    pdfPath: string | null;
    pdfPages: number | null;
    finalizedAt: string | null;
    createdAt: string;
  };
  document: ProposalDoc;
  requirement: {
    id: string;
    reference: string;
    title: string;
    status: string;
    completeness: number;
    readiness: number;
    approvedAt: string | null;
    responderName: string | null;
    features: { name: string; priority: string; status: string }[];
  } | null;
  client: { id: string; companyName: string; industry: string | null; email: string | null } | null;
  workspace: { companyName: string; email: string | null; phone: string | null; website: string | null };
  delivery: ProposalDeliveryBundle;
};

export type SaveState = "saved" | "saving" | "unsaved" | "error";
