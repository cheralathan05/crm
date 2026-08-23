import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getEmployeeActivationContext,
  acknowledgeEmployeePolicy,
  requestEmployeeToolAccess,
  recordOnboardingSectionReview,
  completeEmployeeOnboarding,
} from "@/lib/employees/employee-activation.service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const previewEmployeeId = searchParams.get("previewEmployeeId");

    // Admin can preview specific employee
    let employeeId: string | null = null;
    if (previewEmployeeId && (session.user.role === "OWNER" || session.user.role === "ADMIN")) {
      employeeId = previewEmployeeId;
    } else {
      let employee = await db.employee.findFirst({
        where: {
          OR: [
            { userId: session.user.id },
            { email: session.user.email?.toLowerCase() },
          ],
        },
      });

      if (!employee) {
        // Resolve workspace
        const user = await db.user.findUnique({
          where: { id: session.user.id },
          include: { workspace: true },
        });
        const workspaceId = user?.workspace?.id;

        if (workspaceId) {
          // Check for any unlinked employee in workspace or create one
          employee = await db.employee.findFirst({
            where: { workspaceId, userId: null },
            orderBy: { createdAt: "asc" },
          });

          if (employee) {
            employee = await db.employee.update({
              where: { id: employee.id },
              data: {
                userId: session.user.id,
                email: session.user.email || employee.email,
              },
            });
          } else {
            const count = await db.employee.count({ where: { workspaceId } });
            const empCode = `EMP-${String(count + 1).padStart(3, "0")}`;
            employee = await db.employee.create({
              data: {
                workspaceId,
                userId: session.user.id,
                employeeCode: empCode,
                fullName: session.user.name || "Lead Executive",
                email: session.user.email || `user-${session.user.id}@businessos.internal`,
                primaryResponsibility: session.user.role === "OWNER" ? "Managing Director & Principal Architect" : "Lead Engineering Specialist",
                department: "ENGINEERING",
                employmentType: "FULL_TIME",
                status: "ACTIVE",
                joinedAt: new Date(),
              },
            });
          }
        }
      }

      employeeId = employee?.id || null;
    }

    if (!employeeId) {
      return NextResponse.json(
        { ok: false, message: "Unable to resolve or initialize employee profile." },
        { status: 404 },
      );
    }

    const context = await getEmployeeActivationContext(employeeId);
    if (!context) {
      return NextResponse.json(
        { ok: false, message: "Failed to resolve employee activation context." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, context });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to load onboarding context." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    let employee = await db.employee.findFirst({
      where: {
        OR: [
          { userId: session.user.id },
          { email: session.user.email?.toLowerCase() },
        ],
      },
    });

    if (!employee) {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        include: { workspace: true },
      });
      const workspaceId = user?.workspace?.id;
      if (workspaceId) {
        employee = await db.employee.findFirst({
          where: { workspaceId },
          orderBy: { createdAt: "asc" },
        });
        if (employee && !employee.userId) {
          employee = await db.employee.update({
            where: { id: employee.id },
            data: { userId: session.user.id, email: session.user.email || employee.email },
          });
        }
      }
    }

    if (!employee) {
      return NextResponse.json(
        { ok: false, message: "Employee profile not found." },
        { status: 404 },
      );
    }

    const body = await req.json();
    const { action, policyId, toolId, accountIdentifier, section } = body;

    if (action === "ACKNOWLEDGE_POLICY") {
      if (!policyId) {
        return NextResponse.json({ ok: false, message: "Policy ID is required." }, { status: 400 });
      }
      const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
      const result = await acknowledgeEmployeePolicy({
        employeeId: employee.id,
        policyId,
        ip: clientIp,
        actorName: employee.fullName,
      });
      return NextResponse.json(result);
    }

    if (action === "REQUEST_TOOL_ACCESS") {
      if (!toolId) {
        return NextResponse.json({ ok: false, message: "Tool ID is required." }, { status: 400 });
      }
      const result = await requestEmployeeToolAccess({
        employeeId: employee.id,
        toolId,
        accountIdentifier,
        actorName: employee.fullName,
      });
      return NextResponse.json(result);
    }

    if (action === "REVIEW_SECTION") {
      if (!section) {
        return NextResponse.json({ ok: false, message: "Section is required." }, { status: 400 });
      }
      const result = await recordOnboardingSectionReview({
        employeeId: employee.id,
        section,
      });
      return NextResponse.json(result);
    }

    if (action === "COMPLETE_ONBOARDING") {
      const result = await completeEmployeeOnboarding({
        employeeId: employee.id,
        actorName: employee.fullName,
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ ok: false, message: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to process onboarding request." },
      { status: 500 },
    );
  }
}
