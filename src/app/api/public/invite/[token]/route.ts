import { NextRequest, NextResponse } from "next/server";
import {
  activateEmployeeAccount,
  validateInvitationToken,
} from "@/lib/employees/invitation.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const result = await validateInvitationToken(token);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { valid: false, message: err.message || "Failed to validate token." },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const { password } = body;

    if (!password || password.length < 8) {
      return NextResponse.json(
        { ok: false, message: "Password must be at least 8 characters long." },
        { status: 400 },
      );
    }

    const result = await activateEmployeeAccount({
      rawToken: token,
      password,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to activate account." },
      { status: 400 },
    );
  }
}
