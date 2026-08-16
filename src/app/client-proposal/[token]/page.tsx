import type { Metadata } from "next";
import { serializeClientProposal } from "@/lib/proposal-delivery";
import { BusinessOSMark } from "@/components/business-os-mark";
import { ProposalReview } from "@/components/client-proposal/proposal-review";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your Proposal",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

/* ── /client-proposal/[token] — the client's secure proposal page ──
   The token resolves one proposal. Internal ids, admin notes and
   workspace data never reach this page. The client reviews the real
   finalized PDF and can approve, request changes, or not proceed. */

function ErrorScreen({ title, heading, body }: { title: string; heading: string; body: string }) {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-16 bg-[var(--bos-bg)]">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-8">
          <BusinessOSMark size="md" />
        </div>
        <div className="section-number mb-3">{title}</div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--bos-text-primary)]">{heading}</h1>
        <p className="mt-4 text-[14px] leading-relaxed text-[var(--bos-text-secondary)]">{body}</p>
      </div>
    </main>
  );
}

export default async function ClientProposalPage({ params }: Props) {
  const { token } = await params;
  const bundle = await serializeClientProposal(token);

  if (!bundle.ok || bundle.error === "NOT_FOUND") {
    return (
      <ErrorScreen
        title="Link not found"
        heading="This link doesn't look right"
        body="The address may be incomplete, or this isn't a valid proposal link. Check the full link from your email, or ask the team who sent it to resend it."
      />
    );
  }
  if (bundle.error === "EXPIRED") {
    return (
      <ErrorScreen
        title="Link expired"
        heading="This proposal link has expired"
        body="Secure links expire automatically to protect your information. Ask the team to send you a fresh proposal link."
      />
    );
  }
  if (bundle.error === "REVOKED") {
    return (
      <ErrorScreen
        title="Link no longer active"
        heading="This proposal is no longer active"
        body="This proposal link has been closed. If this is unexpected, reach out to the team directly."
      />
    );
  }
  if (bundle.error === "REJECTED") {
    return (
      <ErrorScreen
        title="Proposal closed"
        heading="This proposal is no longer under review"
        body="You have already responded to this proposal. If anything changes, the team can send you a new one."
      />
    );
  }
  if (bundle.error) {
    return (
      <ErrorScreen
        title="Link not found"
        heading="This link doesn't look right"
        body="The address may be incomplete, or this isn't a valid proposal link."
      />
    );
  }

  return (
    <main className="min-h-dvh bg-[var(--bos-bg)] px-4 sm:px-6 py-8 sm:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-center mb-7">
          <BusinessOSMark size="md" />
        </div>
        <ProposalReview token={token} initial={bundle.proposal} initialDoc={bundle.document as any} />
      </div>
    </main>
  );
}
