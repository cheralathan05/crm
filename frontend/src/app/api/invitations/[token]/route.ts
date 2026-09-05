import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getInvitationDetails, acceptProjectInvitation } from "@/lib/employees/project-invitation.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ ok: false, message: "Token is required." }, { status: 400 });
    }

    const details = await getInvitationDetails(token);

    return NextResponse.json({
      ok: true,
      data: details,
    });
  } catch (error: any) {
    console.error("[api/invitations/[token]] GET error:", error);
    return NextResponse.json(
      { ok: false, message: error.message || "Failed to load invitation." },
      { status: 400 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth();
    const { token } = await params;
    const body = await req.json().catch(() => ({}));

    const { password, fullName } = body;

    const result = await acceptProjectInvitation({
      rawToken: token,
      password,
      fullName,
      existingUserId: session?.user?.id || null,
    });

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[api/invitations/[token]] POST error:", error);
    return NextResponse.json(
      { ok: false, message: error.message || "Failed to accept invitation." },
      { status: 400 }
    );
  }
}
