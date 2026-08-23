import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { ok: false, message: "Not authenticated." },
      { status: 401 },
    );
  }

  // Read authoritative account state from the DB (role, status, lastLoginAt
  // can change server-side between sessions).
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      companyName: true,
      emailVerified: true,
      role: true,
      status: true,
      provider: true,
      lastLoginAt: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Not authenticated." },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      companyName: user.companyName,
      emailVerified: user.emailVerified instanceof Date,
      role: user.role,
      status: user.status,
      provider: user.provider,
      lastLoginAt: user.lastLoginAt,
    },
  });
}
