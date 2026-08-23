import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProposalForUser } from "@/lib/proposal";
import { sendProposalToClient } from "@/lib/proposal-delivery";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* ── POST /api/proposals/[id]/send — explicit admin delivery ──
   Sends the finalized proposal PDF to the client via the configured
   email provider, records the delivery, issues the secure client
   token and moves the proposal to SENT. Never automatic — the admin
   must explicitly click Send, and the send is validated server-side. */

export async function POST(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }
  const { id } = await params;
  const proposal = await getProposalForUser(session.user.id, id);
  if (!proposal) {
    return NextResponse.json({ ok: false, message: "Proposal not found." }, { status: 404 });
  }

  try {
    const body = await _req.json().catch(() => ({}));
    const kind = proposal.sentAt ? "RESEND" : "INITIAL";
    const result = await sendProposalToClient({
      proposal,
      kind,
      actorId: session.user.id,
      actorName: session.user.name ?? "Owner",
      recipientEmail: typeof body.recipientEmail === "string" ? body.recipientEmail : undefined,
      recipientName: typeof body.recipientName === "string" ? body.recipientName : undefined,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "The proposal could not be sent.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
