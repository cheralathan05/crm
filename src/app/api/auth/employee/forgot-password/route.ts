import { NextRequest, NextResponse } from "next/server";
import { requestEmployeeRecoveryOtp } from "@/lib/employees/employee-auth.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, message: "Please provide a valid work email." },
        { status: 400 },
      );
    }

    const result = await requestEmployeeRecoveryOtp(email);
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[api/auth/employee/forgot-password] error:", err);
    return NextResponse.json(
      { ok: false, message: "Business OS couldn't reach the workspace. Please try again." },
      { status: 500 },
    );
  }
}
