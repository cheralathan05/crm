import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getWorkstreamProgress,
  WORKSTREAM_LABELS,
} from "@/lib/employees/workstream-assignment.service";

/* ── GET /api/employee/my-responsibilities ────────────────────────────
   Returns the logged-in employee's assigned responsibilities
   with full product context, pages, APIs, progress, and tasks.
──────────────────────────────────────────────────────────────────── */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
    }

    // Find employee record for the logged-in user
    const employee = await db.employee.findFirst({
      where: { userId: session.user.id },
      include: {
        role: true,
        team: true,
        projectAllocations: {
          where: { releasedAt: null },
          include: {
            project: {
              include: {
                client: { select: { companyName: true } },
                blueprints: {
                  take: 1,
                  orderBy: { version: "desc" },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ ok: false, message: "No employee record found." }, { status: 404 });
    }

    // Build responsibility data for each project allocation
    const responsibilities = await Promise.all(
      employee.projectAllocations.map(async (alloc) => {
        const workstream = alloc.workstream || "ENGINEERING";
        const blueprintId = alloc.project.blueprints[0]?.id || null;

        // Get progress
        const progress = await getWorkstreamProgress(alloc.projectId, workstream);

        // Get pages (for frontend workstream)
        let pages: any[] = [];
        if (blueprintId && (workstream === "FRONTEND" || workstream === "ENGINEERING")) {
          const caps = await db.frontendCapability.findMany({
            where: { blueprintId },
            orderBy: { order: "asc" },
          });
          pages = caps.map((c) => {
            let components: string[] = [];
            let apiDeps: string[] = [];
            try { components = JSON.parse(c.components || "[]"); } catch {}
            try { apiDeps = JSON.parse(c.apiDependencies || "[]"); } catch {}
            return {
              id: c.id,
              name: c.name,
              type: c.type,
              route: c.route,
              description: c.description,
              status: c.status,
              components,
              apiDependencies: apiDeps,
            };
          });
        }

        // Get APIs (for backend/frontend/integration)
        let apis: any[] = [];
        if (blueprintId && ["BACKEND", "FRONTEND", "INTEGRATION", "ENGINEERING"].includes(workstream)) {
          const backendApis = await db.backendApi.findMany({
            where: { blueprintId },
            orderBy: { order: "asc" },
          });
          apis = backendApis.map((a) => ({
            id: a.id,
            method: a.method,
            path: a.path,
            purpose: a.purpose,
            status: a.status,
          }));
        }

        // Get database entities (for database/backend)
        let dbEntities: any[] = [];
        if (blueprintId && ["DATABASE", "BACKEND", "ENGINEERING"].includes(workstream)) {
          const entities = await db.databaseEntity.findMany({
            where: { blueprintId },
            orderBy: { order: "asc" },
          });
          dbEntities = entities.map((e) => {
            let fields: any[] = [];
            try { fields = JSON.parse(e.fields || "[]"); } catch {}
            return {
              id: e.id,
              name: e.name,
              tableName: e.tableName,
              purpose: e.purpose,
              fieldCount: fields.length,
              status: e.status,
            };
          });
        }

        // Get only tasks assigned to this employee for this project
        const myTasks = await db.clientTask.findMany({
          where: {
            projectId: alloc.projectId,
            assigneeId: employee.id,
          },
          orderBy: [{ status: "asc" }, { dueAt: "asc" }],
          include: {
            deliverable: { select: { id: true, title: true } },
          },
        });

        // Get dependency chain
        let dependencies: any[] = [];
        if (blueprintId) {
          const deps = await db.engineeringDependency.findMany({
            where: { blueprintId },
            take: 50,
          });
          dependencies = deps.map((d) => ({
            sourceLayer: d.sourceLayer,
            sourceName: d.sourceName,
            targetLayer: d.targetLayer,
            targetName: d.targetName,
            dependencyType: d.dependencyType,
          }));
        }

        return {
          projectId: alloc.projectId,
          projectName: alloc.project.name,
          projectCode: alloc.project.code,
          clientName: alloc.project.client.companyName,
          projectDescription: alloc.project.description,
          workstream,
          workstreamLabel: WORKSTREAM_LABELS[workstream] || workstream,
          projectRole: alloc.projectRole,
          allocationPercentage: alloc.allocationPercentage,
          progress,
          pages,
          apis,
          databaseEntities: dbEntities,
          tasks: myTasks.map((t) => ({
            id: t.id,
            code: t.code,
            title: t.title,
            status: t.status,
            priority: t.priority,
            dueAt: t.dueAt,
            estimatedHours: t.estimatedHours,
            deliverableTitle: t.deliverable?.title || null,
            workstream: t.workstream,
          })),
          dependencies,
        };
      })
    );

    return NextResponse.json({
      ok: true,
      employee: {
        id: employee.id,
        fullName: employee.fullName,
        email: employee.email,
        roleName: employee.role?.name || null,
        teamName: employee.team?.name || null,
        avatar: employee.avatar,
      },
      responsibilities,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to load responsibilities." },
      { status: 500 }
    );
  }
}
