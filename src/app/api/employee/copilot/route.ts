import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { queryEmployeeCopilot } from "@/lib/employees/employee-copilot.service";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const { question } = await req.json();
    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json({ ok: false, message: "Question is required." }, { status: 400 });
    }

    const employee = await db.employee.findFirst({
      where: {
        OR: [
          { userId: session.user.id },
          { email: session.user.email?.toLowerCase() },
        ],
      },
    });

    if (!employee) {
      return NextResponse.json(
        { ok: false, message: "Employee profile not found." },
        { status: 404 },
      );
    }

    const result = await queryEmployeeCopilot({
      employeeId: employee.id,
      question: question.trim(),
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to process Copilot query." },
      { status: 500 },
    );
  }
}
