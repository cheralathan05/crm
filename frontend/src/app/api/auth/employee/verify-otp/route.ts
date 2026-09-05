import { NextRequest, NextResponse } from "next/server";
import { verifyEmployeeRecoveryOtp } from "@/lib/employees/employee-auth.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { ok: false, message: "Work email and 6-digit verification code are required." },
        { status: 400 },
      );
    }

    const result = await verifyEmployeeRecoveryOtp(email, otp);
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[api/auth/employee/verify-otp] error:", err);
    return NextResponse.json(
      { ok: false, message: "Verification failed. Please try again." },
      { status: 500 },
    );
  }
}
