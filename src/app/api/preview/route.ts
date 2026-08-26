import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateProductPreview, type ProductPreviewContext } from "@/lib/engineering/product-preview.service";

export const dynamic = "force-dynamic";

/* ── POST /api/preview — Generate / Fetch Product Preview ────────── */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, capabilityId, taskId, existingHash } = body;

    if (!projectId && !taskId) {
      return NextResponse.json({ ok: false, message: "projectId or taskId is required." }, { status: 400 });
    }

    let project: any = null;
    let targetCapability: any = null;
    let targetTask: any = null;

    if (taskId) {
      targetTask = await db.clientTask.findUnique({
        where: { id: taskId },
        include: {
          project: {
            include: {
              deliverables: true,
            },
          },
          deliverable: true,
          acceptanceCriteria: true,
        },
      });
      if (targetTask?.project) {
        project = targetTask.project;
      }
    }

    if (!project && projectId) {
      project = await db.clientProject.findUnique({
        where: { id: projectId },
        include: { deliverables: true },
      });
    }

    if (!project) {
      return NextResponse.json({ ok: false, message: "Project not found." }, { status: 404 });
    }

    // Load active blueprint for this project
    const blueprint = await db.engineeringBlueprint.findFirst({
      where: { projectId: project.id },
      orderBy: { version: "desc" },
      include: {
        frontendCapabilities: { orderBy: { order: "asc" } },
        backendApis: { orderBy: { order: "asc" } },
        databaseEntities: { orderBy: { order: "asc" } },
        backendServices: true,
      },
    });

    // Find specific capability if provided or inferred
    if (capabilityId && blueprint) {
      targetCapability = blueprint.frontendCapabilities.find((c) => c.id === capabilityId);
    } else if (targetTask?.deliverableId && blueprint) {
      targetCapability = blueprint.frontendCapabilities.find((c) => c.deliverableId === targetTask.deliverableId);
    }

    // Default fallback from target task or deliverable if no explicit capability row
    const pageName = targetCapability?.name
      || targetTask?.deliverable?.title
      || targetTask?.title?.replace(/^Implement |^Build |^Design |^Create /i, "")
      || project.name;

    const pageType = targetCapability?.type || (
      targetTask?.workstream === "DATABASE" ? "DATABASE" :
      targetTask?.workstream === "BACKEND" ? "API" :
      "PAGE"
    );

    const purpose = targetCapability?.description
      || targetTask?.deliverable?.description
      || targetTask?.expectedResult
      || targetTask?.description
      || `Deliverable for ${project.name}`;

    // Extract real actions
    let actions: string[] = [];
    if (targetCapability?.components) {
      try {
        const comps = JSON.parse(targetCapability.components);
        if (Array.isArray(comps)) {
          actions = comps.map((c: string) => c.replace(/([A-Z])/g, " $1").trim());
        }
      } catch {}
    }
    if (actions.length === 0) {
      actions = ["View Details", "Search Records", "Export Data"];
    }

    // Extract connected APIs
    const apiEndpoints: ProductPreviewContext["apiEndpoints"] = [];
    if (blueprint?.backendApis) {
      for (const api of blueprint.backendApis) {
        if (
          !targetCapability
          || api.deliverableId === targetCapability.deliverableId
          || (targetCapability.apiDependencies && targetCapability.apiDependencies.includes(api.path))
        ) {
          apiEndpoints.push({
            method: api.method,
            path: api.path,
            purpose: api.purpose,
            requestSchema: api.requestSchema,
            responseSchema: api.responseSchema,
          });
        }
      }
    }

    // Extract connected DB Entities
    const databaseEntities: ProductPreviewContext["databaseEntities"] = [];
    if (blueprint?.databaseEntities) {
      for (const dbEnt of blueprint.databaseEntities) {
        if (
          !targetCapability
          || dbEnt.deliverableId === targetCapability.deliverableId
          || dbEnt.purpose.toLowerCase().includes(pageName.toLowerCase())
        ) {
          let fields: any[] = [];
          let relationships: any[] = [];
          try {
            fields = JSON.parse(dbEnt.fields || "[]");
          } catch {}
          try {
            relationships = JSON.parse(dbEnt.relationships || "[]");
          } catch {}

          databaseEntities.push({
            name: dbEnt.name,
            tableName: dbEnt.tableName,
            purpose: dbEnt.purpose,
            fields,
            relationships,
          });
        }
      }
    }

    // Acceptance criteria
    let acceptanceCriteria: string[] = [];
    if (targetTask?.acceptanceCriteria && targetTask.acceptanceCriteria.length > 0) {
      acceptanceCriteria = targetTask.acceptanceCriteria.map((a: any) => a.criterion);
    } else if (targetTask?.deliverable?.acceptanceCriteria) {
      try {
        acceptanceCriteria = JSON.parse(targetTask.deliverable.acceptanceCriteria);
      } catch {}
    }

    const context: ProductPreviewContext = {
      projectId: project.id,
      projectName: project.name,
      projectDescription: project.description,
      pageOrCapabilityId: targetCapability?.id,
      pageName,
      pageType: pageType as any,
      workstream: targetTask?.workstream || "FRONTEND",
      purpose,
      userRole: targetTask?.teamRole,
      actions,
      components: actions,
      apiEndpoints,
      databaseEntities,
      acceptanceCriteria,
      sourceRequirementVersion: blueprint?.version || 1,
      sourceDataVersion: project.progress || 1,
      promptVersion: blueprint?.promptVersion || "2.1.0",
    };

    const preview = await generateProductPreview(context, existingHash);

    return NextResponse.json({ ok: true, preview, context });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || "Preview generation failed." }, { status: 500 });
  }
}
