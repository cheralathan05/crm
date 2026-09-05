import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { storeUpload, validateUpload } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
    }

    const { id: taskId } = await params;

    const task = await db.clientTask.findUnique({
      where: { id: taskId },
      select: { id: true, title: true, projectId: true },
    });

    if (!task) {
      return NextResponse.json({ ok: false, message: "Task not found." }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, message: "No file was provided in the upload request." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const validationError = validateUpload({
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
    });

    if (validationError) {
      return NextResponse.json({ ok: false, message: validationError }, { status: 400 });
    }

    // Persist file into uploads/proofs/${taskId}
    const { storedPath, size } = await storeUpload(`proofs/${taskId}`, {
      name: file.name,
      type: file.type || "image/png",
      size: file.size,
      buffer,
    });

    // Public/authenticated access URL for this proof
    const fileUrl = `/api/tasks/proofs/${storedPath}`;

    return NextResponse.json({
      ok: true,
      file: {
        name: file.name,
        size,
        type: file.type || "image/png",
        storedPath,
        url: fileUrl,
      },
    });
  } catch (err: any) {
    console.error("[api/tasks/[id]/upload] error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to upload file." },
      { status: 500 }
    );
  }
}
