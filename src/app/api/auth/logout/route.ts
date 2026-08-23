import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth";

export async function POST() {
  try {
    await signOut({ redirect: false });
    return NextResponse.json({ ok: true, message: "Signed out." });
  } catch (error) {
    console.error("[logout] error:", error);
    return NextResponse.json(
      { ok: false, message: "Sign out failed." },
      { status: 500 },
    );
  }
}