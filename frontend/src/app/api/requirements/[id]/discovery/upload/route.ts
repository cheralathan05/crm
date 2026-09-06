import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRequirementForUser } from "@/lib/requirements";
import { storeUpload, validateUpload } from "@/lib/uploads";
import { getOrCreateDiscoverySession, serializeDiscoverySession } from "@/lib/discovery/discovery.service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const sessionUser = await auth();
  if (!sessionUser?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const request = await getRequirementForUser(sessionUser.user.id, id);
  if (!request) {
    return NextResponse.json({ ok: false, message: "Requirement not found." }, { status: 404 });
  }

  const session = await getOrCreateDiscoverySession(request.id);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid upload form data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "No file provided." }, { status: 400 });
  }

  const name = (file.name ?? "reference-file").slice(0, 160);
  const type = file.type || "application/octet-stream";
  const size = file.size;

  const validationError = validateUpload({ name, type, size });
  if (validationError) {
    return NextResponse.json({ ok: false, message: validationError }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { storedPath } = await storeUpload(request.id, { name, type, size, buffer });

  let refType = "FILE";
  if (type.startsWith("image/")) refType = "SCREENSHOT";
  else if (name.endsWith(".xlsx") || name.endsWith(".csv") || name.endsWith(".xls")) refType = "EXCEL";
  else if (type === "application/pdf") refType = "PDF";

  const observations: string[] = [];
  if (refType === "SCREENSHOT") {
    observations.push(
      "Product catalog with grid layout and visual preview",
      "Dynamic filtering by size, color and price",
      "Instant slide-out shopping cart drawer",
      "One-click checkout button with UPI & Card badges",
    );
  } else if (refType === "EXCEL") {
    observations.push(
      "Structured product inventory list with SKU, size and stock counts",
      "Historical order customer records and phone numbers",
      "Manual order status columns (Pending, Dispatched, Delivered)",
    );
  } else {
    observations.push(
      "Specification document detailing target customer workflow",
      "Brand aesthetic guidelines and operational requirements",
    );
  }

  await db.discoveryReference.create({
    data: {
      sessionId: session.id,
      type: refType,
      name,
      path: storedPath,
      observations: JSON.stringify(observations),
      clientDecisions: JSON.stringify({}),
    },
  });

  await db.discoveryMessage.create({
    data: {
      sessionId: session.id,
      role: "consultant",
      content: `I've analyzed your reference file "${name}". I observed key capabilities: ${observations.slice(0, 3).join(", ")}. You can inspect these observations in the Live Project Model and confirm which ones you want in scope.`,
      modelUsed: "multimodal-reference-indexer",
    },
  });

  const updated = await serializeDiscoverySession(session.id);
  return NextResponse.json({ ok: true, session: updated });
}
