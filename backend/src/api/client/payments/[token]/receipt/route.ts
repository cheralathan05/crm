import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { token } = await params;

  const request = await db.paymentRequest.findUnique({
    where: { tokenHash: token },
    include: {
      receipts: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!request || request.status !== "CONFIRMED" || !request.receipts[0]) {
    return NextResponse.json({ ok: false, message: "Receipt not available for this payment." }, { status: 404 });
  }

  const receipt = request.receipts[0];
  const filePath = path.join(process.cwd(), "uploads", receipt.pdfPath || `receipts/${receipt.receiptNumber}.pdf`);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ ok: false, message: "Receipt PDF file not found." }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(new Uint8Array(fileBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${receipt.receiptNumber}.pdf"`,
      "Content-Length": String(fileBuffer.length),
    },
  });
}
