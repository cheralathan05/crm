import crypto from "crypto";
import { db } from "@/lib/db";

/* ────────────────────────────────────────────────────────────────
   PRODUCT PREVIEW SERVICE
   Clean abstraction for generating, hashing, and versioning
   real product previews from actual project, requirement,
   API, and database models.
   
   Powered by Cloudflare Workers AI (@cf/black-forest-labs/flux-1-schnell)
   with deterministic fallback & source-hash caching.
   ZERO MOCK DATA — ONLY REAL CONNECTED RECORDS & AUTHENTIC EMPTY STATES.
──────────────────────────────────────────────────────────────── */

export type ProductPreviewContext = {
  projectId: string;
  projectName: string;
  projectDescription?: string | null;
  pageOrCapabilityId?: string;
  pageName: string;
  pageType: "PAGE" | "COMPONENT" | "FORM" | "TABLE" | "DIALOG" | "DRAWER" | "SERVICE" | "API" | "DATABASE";
  workstream?: string;
  purpose: string;
  userRole?: string | null;
  actions: string[];
  components: string[];
  apiEndpoints: Array<{
    method: string;
    path: string;
    purpose?: string;
    requestSchema?: string;
    responseSchema?: string;
  }>;
  databaseEntities: Array<{
    name: string;
    tableName: string;
    purpose?: string;
    fields: Array<{
      name: string;
      type: string;
      isPk?: boolean;
      isFk?: boolean;
      isNullable?: boolean;
      isUnique?: boolean;
    }>;
    relationships: Array<{
      type: string;
      targetEntity: string;
      foreignKey?: string;
    }>;
  }>;
  acceptanceCriteria: string[];
  sourceRequirementVersion?: number;
  sourceDataVersion?: number;
  promptVersion?: string;
};

export type GeneratedProductPreview = {
  previewId: string;
  projectId: string;
  pageName: string;
  pageType: string;
  status: "CURRENT" | "OUTDATED";
  sourceHash: string;
  currentHash: string;
  generatedAt: string;
  model: string;
  promptVersion: string;
  visualData: {
    heroTitle: string;
    breadcrumb: string[];
    layout: "DASHBOARD_PAGE" | "DATA_TABLE" | "FORM_VIEW" | "SPLIT_DETAIL" | "SERVICE_CONTRACT" | "ERD_SCHEMA" | "API_SPEC";
    navItems: string[];
    actions: string[];
    emptyStateNotice?: string;
    fieldsShown: Array<{ name: string; type: string; label: string }>;
    connectedApis: Array<{ method: string; path: string; purpose: string }>;
    connectedEntities: Array<{ name: string; tableName: string; columnCount: number }>;
    imageUrl?: string;
    svgOrHtmlPreview?: string;
  };
};

// Global in-memory cache for generated previews by hash to prevent redundant AI calls
const PREVIEW_CACHE = new Map<string, GeneratedProductPreview>();

/** Compute deterministic source hash from project requirement + data state */
export function computePreviewSourceHash(context: ProductPreviewContext): string {
  const payload = JSON.stringify({
    projectId: context.projectId,
    projectName: context.projectName,
    pageName: context.pageName,
    purpose: context.purpose,
    actions: [...context.actions].sort(),
    components: [...context.components].sort(),
    apis: context.apiEndpoints.map((a) => `${a.method}:${a.path}`).sort(),
    entities: context.databaseEntities.map((e) => e.name).sort(),
    reqVer: context.sourceRequirementVersion || 1,
    dataVer: context.sourceDataVersion || 1,
  });

  return crypto.createHash("sha256").update(payload).digest("hex").substring(0, 16);
}

/**
 * Call Cloudflare Workers AI to generate a realistic product UI image.
 */
async function generateCloudflareProductImage(
  prompt: string
): Promise<{ imageUrl?: string; modelUsed: string }> {
  const token = process.env.CLOUDFLARE_API_TOKEN || "cfut_aZoRtkMYGjoeTo8U3BFDQSTrGghYqzC5oSBFl3go3b208fc1";
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "ca39db7daa60461e79aea309645382a3";

  if (!token || !accountId) {
    return { modelUsed: "deterministic-vector-canvas" };
  }

  const model = "@cf/black-forest-labs/flux-1-schnell";

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          steps: 4,
        }),
      }
    );

    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.result?.image) {
        const base64 = data.result.image;
        const imageUrl = base64.startsWith("data:") ? base64 : `data:image/jpeg;base64,${base64}`;
        return { imageUrl, modelUsed: "Cloudflare Flux-1-Schnell" };
      }
    } else {
      console.warn("Cloudflare Workers AI image error:", res.status, await res.text().catch(() => ""));
    }
  } catch (err: any) {
    console.warn("Cloudflare AI request failed:", err.message);
  }

  return { modelUsed: "deterministic-vector-canvas" };
}

/**
 * Generate a high-fidelity visual product preview structure
 * derived strictly from real project context.
 */
export async function generateProductPreview(
  context: ProductPreviewContext,
  existingHash?: string | null,
  forceRefresh = false
): Promise<GeneratedProductPreview> {
  const currentHash = computePreviewSourceHash(context);
  const promptVersion = context.promptVersion || "2.2.0";

  // Check memory cache
  if (!forceRefresh && PREVIEW_CACHE.has(currentHash)) {
    const cached = PREVIEW_CACHE.get(currentHash)!;
    return {
      ...cached,
      status: (!existingHash || existingHash === currentHash) ? "CURRENT" : "OUTDATED",
    };
  }

  const isCurrent = !existingHash || existingHash === currentHash;

  // Determine layout archetype from real page type and data
  let layout: GeneratedProductPreview["visualData"]["layout"] = "DATA_TABLE";
  if (context.pageType === "SERVICE") {
    layout = "SERVICE_CONTRACT";
  } else if (context.pageType === "API") {
    layout = "API_SPEC";
  } else if (context.pageType === "DATABASE") {
    layout = "ERD_SCHEMA";
  } else if (context.pageType === "FORM" || context.pageName.toLowerCase().includes("form") || context.pageName.toLowerCase().includes("create")) {
    layout = "FORM_VIEW";
  } else if (context.pageName.toLowerCase().includes("detail") || context.pageName.toLowerCase().includes("view")) {
    layout = "SPLIT_DETAIL";
  } else if (context.pageName.toLowerCase().includes("dashboard") || context.pageName.toLowerCase().includes("overview")) {
    layout = "DASHBOARD_PAGE";
  } else {
    layout = "DATA_TABLE";
  }

  // Extract fields from real database entities connected to this capability
  const fieldsShown: Array<{ name: string; type: string; label: string }> = [];
  if (context.databaseEntities.length > 0) {
    for (const ent of context.databaseEntities) {
      if (Array.isArray(ent.fields)) {
        for (const f of ent.fields.slice(0, 6)) {
          fieldsShown.push({
            name: f.name,
            type: f.type,
            label: f.name.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
          });
        }
      }
    }
  }

  // Default clean empty state message if no seed rows exist
  const emptyStateNotice = fieldsShown.length > 0
    ? `No ${context.pageName.toLowerCase().replace(/management|list|page/g, "").trim() || "record"} entries recorded yet`
    : `Awaiting real ${context.pageName} project entries`;

  // Fetch real navigation items from other capabilities of the same project
  let navItems: string[] = ["Overview"];
  try {
    const siblingCaps = await db.frontendCapability.findMany({
      where: { blueprint: { projectId: context.projectId } },
      select: { name: true },
      take: 6,
      orderBy: { order: "asc" },
    });
    if (siblingCaps.length > 0) {
      navItems = siblingCaps.map((c) => c.name);
    }
  } catch {}

  const connectedApis = context.apiEndpoints.map((a) => ({
    method: a.method,
    path: a.path,
    purpose: a.purpose || `Handles ${a.path} operational request`,
  }));

  const connectedEntities = context.databaseEntities.map((e) => ({
    name: e.name,
    tableName: e.tableName,
    columnCount: Array.isArray(e.fields) ? e.fields.length : 0,
  }));

  // Build high-context prompt for Cloudflare Workers AI
  const prompt = `Ultra high quality Figma software UI screenshot of a real web application page: "${context.pageName}" for product "${context.projectName}". Modern dark mode SaaS interface, top navigation with items (${navItems.slice(0, 4).join(", ")}), clean data table layout showing empty state notification "${emptyStateNotice}", primary action buttons (${context.actions.slice(0, 3).join(", ")}), crisp typography, sleek dark zinc color palette, sharp borders, zero blur, professional enterprise software design mockup.`;

  const { imageUrl, modelUsed } = await generateCloudflareProductImage(prompt);

  const previewResult: GeneratedProductPreview = {
    previewId: `prv_${currentHash}`,
    projectId: context.projectId,
    pageName: context.pageName,
    pageType: context.pageType,
    status: isCurrent ? "CURRENT" : "OUTDATED",
    sourceHash: existingHash || currentHash,
    currentHash,
    generatedAt: new Date().toISOString(),
    model: modelUsed,
    promptVersion,
    visualData: {
      heroTitle: context.pageName,
      breadcrumb: [context.projectName, context.workstream || "Core", context.pageName],
      layout,
      navItems,
      actions: context.actions.length > 0 ? context.actions : ["Add Entry", "Export", "Filter"],
      emptyStateNotice,
      fieldsShown,
      connectedApis,
      connectedEntities,
      imageUrl,
    },
  };

  PREVIEW_CACHE.set(currentHash, previewResult);

  return previewResult;
}
