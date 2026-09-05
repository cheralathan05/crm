import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { workspace: true },
  });

  if (!user?.workspace) {
    return NextResponse.json({ ok: false, message: "Workspace not found." }, { status: 404 });
  }

  try {
    const clients = await db.client.findMany({
      where: { workspaceId: user.workspace.id },
      orderBy: { companyName: "asc" },
      include: {
        projects: {
          orderBy: { createdAt: "desc" },
          include: {
            milestones: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    const formatted = clients.map((c) => ({
      id: c.id,
      companyName: c.companyName,
      industry: c.industry,
      email: c.email,
      projects: c.projects.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        budget: p.budget,
        currency: p.currency,
        milestones: p.milestones.map((m) => ({
          id: m.id,
          title: m.title,
          phase: m.phase,
          paymentAmount: m.paymentAmount,
          invoiceStatus: m.invoiceStatus,
          status: m.status,
        })),
      })),
    }));

    return NextResponse.json({ ok: true, clients: formatted });
  } catch (err: any) {
    console.error("[api/payments/options] error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to fetch payment options" },
      { status: 500 }
    );
  }
}
