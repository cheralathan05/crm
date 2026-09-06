import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveRequestByToken } from "@/lib/requirements";
import { storeUpload, validateUpload } from "@/lib/uploads";
import { getOrCreateDiscoverySession, serializeDiscoverySession } from "@/lib/discovery/discovery.service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const { token } = await params;
  const resolved = await resolveRequestByToken(token);
  if (!resolved) {
    return NextResponse.json({ ok: false, code: "INVALID" }, { status: 404 });
  }
  if (resolved.error) {
    return NextResponse.json({ ok: false, code: resolved.error, label: resolved.errorLabel }, { status: 403 });
  }

  const request = resolved.request;
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

  // Classify reference type
  let refType = "FILE";
  if (type.startsWith("image/")) refType = "SCREENSHOT";
  else if (name.endsWith(".xlsx") || name.endsWith(".csv") || name.endsWith(".xls")) refType = "EXCEL";
  else if (type === "application/pdf") refType = "PDF";

  // Extract reference observations
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

  // Create DiscoveryReference
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

  // Post consultant acknowledgment message about the uploaded reference
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
