import { NextRequest, NextResponse } from "next/server";
import { resetEmployeePasswordWithToken } from "@/lib/employees/employee-auth.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resetToken, password } = body;

    if (!resetToken || !password) {
      return NextResponse.json(
        { ok: false, message: "Reset token and new password are required." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, message: "Password must be at least 8 characters long." },
        { status: 400 },
      );
    }

    const result = await resetEmployeePasswordWithToken({
      resetToken,
      newPassword: password,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[api/auth/employee/reset-password] error:", err);
    return NextResponse.json(
      { ok: false, message: "Failed to reset password. Please try again." },
      { status: 500 },
    );
  }
}
