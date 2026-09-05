import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { workspace: true },
  });

  const workspaceId = user?.workspace?.id || (await db.workspace.findFirst())?.id;
  if (!workspaceId) {
    return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
  }

  const commands = await db.savedAnalyticsCommand.findMany({
    where: { workspaceId, userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, data: commands });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { workspace: true },
  });

  const workspaceId = user?.workspace?.id || (await db.workspace.findFirst())?.id;
  if (!workspaceId) {
    return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
  }

  try {
    const { name, description, queryParams, isFavorite } = await req.json();
    if (!name) {
      return NextResponse.json({ ok: false, message: "Name is required." }, { status: 400 });
    }

    const saved = await db.savedAnalyticsCommand.create({
      data: {
        workspaceId,
        userId: session.user.id,
        name,
        description: description || null,
        queryParams: typeof queryParams === "string" ? queryParams : JSON.stringify(queryParams || {}),
        isFavorite: Boolean(isFavorite),
      },
    });

    return NextResponse.json({ ok: true, data: saved });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: "Could not save command.", error: error.message },
      { status: 500 },
    );
  }
}
